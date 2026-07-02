from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session, aliased

from auth import get_current_user
from database import get_db
from models import Course, Enrollment, Instructor, LessonProgress, Payment, PaymentOperation, User
from payment_gateway_qnb import execute_qnb_operation
from payment_state import expire_stale_pending_payments
from payment_security import enforce_rate_limit, extract_client_ip, sanitize_external_message


router = APIRouter()


class AdminPaymentOperationRequest(BaseModel):
    reason: str = Field(..., min_length=5, max_length=500)


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


def _serialize_operation(operation: PaymentOperation | None) -> dict[str, Any] | None:
    if not operation:
        return None

    return {
        "id": operation.id,
        "operation_type": operation.operation_type,
        "operation_status": operation.operation_status,
        "amount": float(operation.amount or 0.0) if operation.amount is not None else None,
        "reason": operation.reason,
        "provider_proc_return_code": operation.provider_proc_return_code,
        "provider_txn_result": operation.provider_txn_result,
        "provider_error_message": operation.provider_error_message,
        "provider_trans_id": operation.provider_trans_id,
        "provider_host_ref_num": operation.provider_host_ref_num,
        "created_at": operation.created_at.isoformat() if operation.created_at else None,
        "admin_user_id": operation.admin_user_id,
    }


def _serialize_payment(
    *,
    payment: Payment,
    student: User | None,
    course: Course | None,
    instructor: Instructor | None,
    instructor_user: User | None,
    last_operation: PaymentOperation | None,
    has_active_enrollment: bool,
) -> dict[str, Any]:
    payment_status = (payment.payment_status or "").lower()
    is_qnb_payment = (payment.payment_method or "").strip().lower() == "qnb"
    can_operate = is_qnb_payment and payment_status == "completed"

    return {
        "id": payment.id,
        "transaction_id": payment.transaction_id,
        "amount": float(payment.amount or 0.0),
        "currency": payment.currency or "TRY",
        "payment_method": payment.payment_method,
        "payment_status": payment.payment_status,
        "payment_date": payment.payment_date.isoformat() if payment.payment_date else None,
        "has_active_enrollment": has_active_enrollment,
        "student": {
            "id": student.id if student else payment.user_id,
            "full_name": student.full_name if student else "Öğrenci",
            "email": student.email if student else None,
            "phone": student.phone if student else None,
        },
        "course": {
            "id": course.id if course else payment.course_id,
            "title": course.title if course else "Kurs",
        },
        "instructor": {
            "id": instructor.id if instructor else None,
            "full_name": instructor_user.full_name if instructor_user else None,
            "email": instructor_user.email if instructor_user else None,
        },
        "available_actions": {
            "can_refund": can_operate,
            "can_void": can_operate,
        },
        "last_operation": _serialize_operation(last_operation),
    }


def _load_payments(
    db: Session,
    *,
    skip: int,
    limit: int,
    payment_status: str | None,
    search: str | None,
    payment_id: int | None,
):
    expire_stale_pending_payments(db)
    instructor_user = aliased(User)

    query = (
        db.query(Payment, User, Course, Instructor, instructor_user)
        .join(User, Payment.user_id == User.id)
        .outerjoin(Course, Payment.course_id == Course.id)
        .outerjoin(Instructor, Course.instructor_id == Instructor.id)
        .outerjoin(instructor_user, Instructor.user_id == instructor_user.id)
    )

    if payment_id is not None:
        query = query.filter(Payment.id == payment_id)

    if payment_status:
        query = query.filter(Payment.payment_status == payment_status)

    if search:
        cleaned_search = search.strip()
        search_filters = [
            Payment.transaction_id.ilike(f"%{cleaned_search}%"),
            User.full_name.ilike(f"%{cleaned_search}%"),
            User.email.ilike(f"%{cleaned_search}%"),
            Course.title.ilike(f"%{cleaned_search}%"),
            instructor_user.full_name.ilike(f"%{cleaned_search}%"),
        ]
        if cleaned_search.isdigit():
            search_filters.append(Payment.id == int(cleaned_search))
        query = query.filter(or_(*search_filters))

    rows = (
        query.order_by(Payment.payment_date.desc(), Payment.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    payment_ids = [payment.id for payment, *_ in rows]
    operation_rows = []
    if payment_ids:
        operation_rows = (
            db.query(PaymentOperation)
            .filter(PaymentOperation.payment_id.in_(payment_ids))
            .order_by(PaymentOperation.payment_id.asc(), PaymentOperation.created_at.desc(), PaymentOperation.id.desc())
            .all()
        )

    latest_operations: dict[int, PaymentOperation] = {}
    for operation in operation_rows:
        latest_operations.setdefault(operation.payment_id, operation)

    user_ids = {payment.user_id for payment, *_ in rows}
    course_ids = {payment.course_id for payment, *_ in rows}
    enrollment_pairs = set()
    if user_ids and course_ids:
        enrollment_rows = (
            db.query(Enrollment.student_id, Enrollment.course_id)
            .filter(
                Enrollment.student_id.in_(user_ids),
                Enrollment.course_id.in_(course_ids),
            )
            .all()
        )
        enrollment_pairs = {(student_id, course_id) for student_id, course_id in enrollment_rows}

    items = []
    for payment, student, course, instructor, instructor_user_value in rows:
        items.append(
            _serialize_payment(
                payment=payment,
                student=student,
                course=course,
                instructor=instructor,
                instructor_user=instructor_user_value,
                last_operation=latest_operations.get(payment.id),
                has_active_enrollment=(payment.user_id, payment.course_id) in enrollment_pairs,
            )
        )
    return items


def _get_payment_or_404(db: Session, payment_id: int) -> Payment:
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ödeme bulunamadı.")
    return payment


def _get_successful_or_pending_operation(
    db: Session,
    *,
    payment_id: int,
) -> PaymentOperation | None:
    return (
        db.query(PaymentOperation)
        .filter(
            PaymentOperation.payment_id == payment_id,
            PaymentOperation.operation_status.in_(["pending", "success"]),
            PaymentOperation.operation_type.in_(["refund", "void"]),
        )
        .order_by(PaymentOperation.created_at.desc(), PaymentOperation.id.desc())
        .first()
    )


def _revoke_course_access_if_needed(db: Session, payment: Payment) -> bool:
    remaining_completed_payment = (
        db.query(Payment)
        .filter(
            Payment.user_id == payment.user_id,
            Payment.course_id == payment.course_id,
            Payment.id != payment.id,
            Payment.payment_status == "completed",
        )
        .first()
    )
    if remaining_completed_payment:
        return False

    enrollment = (
        db.query(Enrollment)
        .filter(
            Enrollment.student_id == payment.user_id,
            Enrollment.course_id == payment.course_id,
        )
        .first()
    )
    if not enrollment:
        return False

    db.query(LessonProgress).filter(LessonProgress.enrollment_id == enrollment.id).delete()
    db.delete(enrollment)

    course = db.query(Course).filter(Course.id == payment.course_id).first()
    if course and (course.enrollment_count or 0) > 0:
        course.enrollment_count = max(0, int(course.enrollment_count or 0) - 1)
        if course.instructor and (course.instructor.total_students or 0) > 0:
            course.instructor.total_students = max(0, int(course.instructor.total_students or 0) - 1)

    return True


def _prepare_payment_operation(
    *,
    db: Session,
    payment: Payment,
    admin_user: User,
    operation_type: str,
    reason: str,
) -> PaymentOperation:
    if (payment.payment_method or "").strip().lower() != "qnb":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu sürümde yalnızca QNB ödemeleri için iade/iptal destekleniyor.",
        )
    if (payment.payment_status or "").lower() != "completed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Yalnızca tamamlanmış ödemeler için iade veya iptal yapılabilir.",
        )
    if not payment.transaction_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="İşlem referansı olmayan ödeme için banka operasyonu başlatılamaz.",
        )

    existing_operation = _get_successful_or_pending_operation(db, payment_id=payment.id)
    if existing_operation:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bu ödeme için daha önce iade veya iptal operasyonu başlatılmış.",
        )

    operation = PaymentOperation(
        payment_id=payment.id,
        admin_user_id=admin_user.id,
        operation_type=operation_type,
        amount=float(payment.amount or 0.0) if operation_type == "refund" else None,
        reason=reason.strip(),
        operation_status="pending",
    )
    db.add(operation)
    db.commit()
    db.refresh(operation)
    return operation


def _finalize_operation(
    *,
    db: Session,
    payment: Payment,
    operation: PaymentOperation,
    response_data: dict[str, Any],
) -> dict[str, Any]:
    parsed_response = response_data.get("parsed_response", {})
    operation.provider_proc_return_code = parsed_response.get("ProcReturnCode")
    operation.provider_txn_result = parsed_response.get("TxnResult")
    operation.provider_error_message = sanitize_external_message(parsed_response.get("ErrMsg"))
    operation.provider_trans_id = parsed_response.get("TransId")
    operation.provider_host_ref_num = parsed_response.get("HostRefNum")
    operation.raw_response = response_data.get("raw_response")

    if response_data.get("success"):
        operation.operation_status = "success"
        payment.payment_status = "refunded" if operation.operation_type == "refund" else "voided"
        access_revoked = _revoke_course_access_if_needed(db, payment)
        db.commit()
        return {
            "message": "Banka operasyonu başarıyla tamamlandı.",
            "payment_status": payment.payment_status,
            "access_revoked": access_revoked,
            "operation": _serialize_operation(operation),
        }

    operation.operation_status = "failed"
    db.commit()

    error_message = operation.provider_error_message or "Banka işlemi reddetti."
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=error_message,
    )


@router.get("/payments")
def list_payments(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    payment_status: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    payment_id: Optional[int] = Query(default=None, ge=1),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return _load_payments(
        db,
        skip=skip,
        limit=limit,
        payment_status=payment_status,
        search=search,
        payment_id=payment_id,
    )


@router.get("/payments/{payment_id}")
def get_payment_detail(
    payment_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    items = _load_payments(
        db,
        skip=0,
        limit=1,
        payment_status=None,
        search=None,
        payment_id=payment_id,
    )
    if not items:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ödeme bulunamadı.")

    operations = (
        db.query(PaymentOperation)
        .filter(PaymentOperation.payment_id == payment_id)
        .order_by(PaymentOperation.created_at.desc(), PaymentOperation.id.desc())
        .all()
    )
    detail = items[0]
    detail["operations"] = [_serialize_operation(operation) for operation in operations]
    return detail


@router.post("/payments/{payment_id}/refund")
def refund_payment(
    payment_id: int,
    payload: AdminPaymentOperationRequest,
    request: Request,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    client_ip = extract_client_ip(request)
    enforce_rate_limit(scope="admin-payment-refund-ip", key=client_ip, max_attempts=10, window_seconds=300)
    enforce_rate_limit(
        scope="admin-payment-refund-admin",
        key=f"admin:{admin_user.id}",
        max_attempts=10,
        window_seconds=300,
    )

    payment = _get_payment_or_404(db, payment_id)
    operation = _prepare_payment_operation(
        db=db,
        payment=payment,
        admin_user=admin_user,
        operation_type="refund",
        reason=payload.reason,
    )

    try:
        response_data = execute_qnb_operation(
            base_url=str(request.base_url).rstrip("/"),
            txn_type="Refund",
            order_id=payment.transaction_id or "",
            amount=payment.amount,
        )
    except Exception as exc:
        operation.operation_status = "pending"
        operation.provider_error_message = "Banka yanıtı alınamadı. Manuel kontrol gerekli."
        operation.raw_response = sanitize_external_message(str(exc), max_length=500)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Banka yanıtı alınamadı. Durum manuel kontrol edilmeden aynı ödeme için tekrar iade göndermeyin.",
        ) from exc

    return _finalize_operation(
        db=db,
        payment=payment,
        operation=operation,
        response_data=response_data,
    )


@router.post("/payments/{payment_id}/void")
def void_payment(
    payment_id: int,
    payload: AdminPaymentOperationRequest,
    request: Request,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    client_ip = extract_client_ip(request)
    enforce_rate_limit(scope="admin-payment-void-ip", key=client_ip, max_attempts=10, window_seconds=300)
    enforce_rate_limit(
        scope="admin-payment-void-admin",
        key=f"admin:{admin_user.id}",
        max_attempts=10,
        window_seconds=300,
    )

    payment = _get_payment_or_404(db, payment_id)
    operation = _prepare_payment_operation(
        db=db,
        payment=payment,
        admin_user=admin_user,
        operation_type="void",
        reason=payload.reason,
    )

    try:
        response_data = execute_qnb_operation(
            base_url=str(request.base_url).rstrip("/"),
            txn_type="Void",
            order_id=payment.transaction_id or "",
        )
    except Exception as exc:
        operation.operation_status = "pending"
        operation.provider_error_message = "Banka yanıtı alınamadı. Manuel kontrol gerekli."
        operation.raw_response = sanitize_external_message(str(exc), max_length=500)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Banka yanıtı alınamadı. Durum manuel kontrol edilmeden aynı ödeme için tekrar iptal göndermeyin.",
        ) from exc

    return _finalize_operation(
        db=db,
        payment=payment,
        operation=operation,
        response_data=response_data,
    )
