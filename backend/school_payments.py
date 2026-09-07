from datetime import datetime, timedelta
from typing import Literal
from urllib.parse import quote_plus, urlencode
import json
import uuid

from decouple import config
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import DiscountCode, SchoolCourse, SchoolCoursePurchase, User
from payment_gateway_qnb import (
    audit_qnb_request_hash,
    build_qnb_gateway_payload,
    callback_is_success,
    extract_order_id,
    get_eci_auth_level,
    get_qnb_config,
)
from payment_security import (
    create_callback_token,
    create_checkout_token,
    enforce_rate_limit,
    extract_client_ip,
    sanitize_external_message,
    verify_callback_token,
    verify_payment_token,
)
from payments import (
    _build_gateway_form_html,
    _default_result_base_url,
    _frontend_redirect,
    _log_qnb_callback,
    _normalize_public_base_url,
    _preview_keys,
    _qnb_3d_diagnostics,
    _qnb_gateway_html_response,
    _resolve_checkout_base_url,
    _resolve_result_base_url,
    _secure_payment_html_response,
)
from qnb_session_proxy import create_qnb_proxy_session


router = APIRouter()

PENDING_TIMEOUT_SECONDS = int(config("PAYMENT_PENDING_TIMEOUT_SECONDS", default="900"))


class SchoolCoursePaymentCreate(BaseModel):
    course_id: int
    payment_method: Literal["qnb"] = "qnb"
    discount_code: str = Field(default="", max_length=64)
    slug: str = Field(default="", max_length=180)
    return_path: str = Field(default="", max_length=255)


def _slugify(value: str) -> str:
    normalized = (
        (value or "")
        .lower()
        .replace("ğ", "g")
        .replace("ü", "u")
        .replace("ş", "s")
        .replace("ı", "i")
        .replace("ö", "o")
        .replace("ç", "c")
    )
    cleaned = []
    previous_dash = False

    for char in normalized:
        if char.isalnum():
            cleaned.append(char)
            previous_dash = False
        elif char in {" ", "-"} and not previous_dash:
            cleaned.append("-")
            previous_dash = True

    return "".join(cleaned).strip("-")


def _school_course_path(course: SchoolCourse | None) -> str:
    if not course:
        return "/courses"
    return f"/courses/{course.level}/sinif-{course.grade}/{course.subject}"


def _normalize_internal_return_path(value: str, *, fallback: str) -> str:
    cleaned = (value or "").strip()
    if not cleaned:
        return fallback
    if not cleaned.startswith("/") or cleaned.startswith("//"):
        return fallback
    return cleaned


def _build_school_checkout_url(
    base_url: str,
    purchase: SchoolCoursePurchase,
    slug: str,
    checkout_token: str,
    return_path: str,
) -> str:
    safe_slug = quote_plus(slug or "")
    safe_checkout_token = quote_plus(checkout_token)
    safe_return_path = quote_plus(return_path or "")
    return (
        f"{base_url}/api/payments/school-courses/qnb/start/{purchase.id}"
        f"?checkout_token={safe_checkout_token}&slug={safe_slug}&return_path={safe_return_path}"
    )


def _callback_base_url(base_url: str) -> str:
    configured = config("PAYMENT_BASE_URL", default=base_url).strip()
    return configured or base_url


def _school_payment_result_url(
    result_base_url: str,
    *,
    slug: str,
    status_value: str,
    course_title: str,
    course_id: int,
    return_path: str,
) -> str:
    query = urlencode(
        {
            "status": status_value,
            "slug": slug or "",
            "course": course_title or "",
            "itemType": "school_course",
            "courseId": str(course_id),
            "returnPath": return_path or "",
        }
    )
    return f"{result_base_url.rstrip('/')}/purchase/result?{query}"


def _calculate_school_course_amount(course: SchoolCourse, discount_code: str, db: Session) -> float:
    amount = float(course.price or 0.0)
    if not discount_code:
        return amount

    code_obj = (
        db.query(DiscountCode)
        .filter(DiscountCode.code == discount_code, DiscountCode.active == True)
        .first()
    )
    if not code_obj:
        raise HTTPException(status_code=400, detail="Geçersiz veya pasif indirim kodu.")

    return round(amount * (1 - float(code_obj.percent or 0) / 100), 2)


def _expire_stale_pending_school_purchases(
    db: Session,
    *,
    purchase_ids: list[int] | None = None,
    user_id: int | None = None,
    course_id: int | None = None,
) -> int:
    if PENDING_TIMEOUT_SECONDS <= 0:
        return 0

    threshold = datetime.utcnow() - timedelta(seconds=PENDING_TIMEOUT_SECONDS)
    query = db.query(SchoolCoursePurchase).filter(
        SchoolCoursePurchase.payment_status == "pending",
        SchoolCoursePurchase.purchase_date <= threshold,
    )

    if purchase_ids:
        query = query.filter(SchoolCoursePurchase.id.in_([int(item) for item in purchase_ids]))
    if user_id is not None:
        query = query.filter(SchoolCoursePurchase.user_id == int(user_id))
    if course_id is not None:
        query = query.filter(SchoolCoursePurchase.course_id == int(course_id))

    stale_purchases = query.all()
    if not stale_purchases:
        return 0

    for purchase in stale_purchases:
        purchase.payment_status = "failed"
        purchase.updated_at = datetime.utcnow()

    db.commit()
    return len(stale_purchases)


def _find_or_create_pending_school_purchase(
    *,
    db: Session,
    current_user: User,
    course: SchoolCourse,
    amount: float,
    payment_method: str,
) -> SchoolCoursePurchase:
    existing_purchase = (
        db.query(SchoolCoursePurchase)
        .filter(
            SchoolCoursePurchase.user_id == current_user.id,
            SchoolCoursePurchase.course_id == course.id,
            SchoolCoursePurchase.payment_status.in_(["pending", "completed"]),
        )
        .first()
    )

    if existing_purchase and existing_purchase.payment_status == "completed":
        raise HTTPException(status_code=400, detail="Bu okul dersi için ödeme zaten tamamlanmış.")

    if existing_purchase and existing_purchase.payment_status == "pending":
        existing_purchase.amount_paid = amount
        existing_purchase.payment_method = payment_method
        existing_purchase.purchase_date = datetime.utcnow()
        existing_purchase.updated_at = datetime.utcnow()
        existing_purchase.transaction_id = f"SCHOOL-{existing_purchase.id}-{uuid.uuid4().hex[:10].upper()}"
        db.commit()
        db.refresh(existing_purchase)
        return existing_purchase

    purchase = SchoolCoursePurchase(
        user_id=current_user.id,
        course_id=course.id,
        amount_paid=amount,
        payment_method=payment_method,
        payment_status="pending",
    )
    db.add(purchase)
    db.commit()
    db.refresh(purchase)

    purchase.transaction_id = f"SCHOOL-{purchase.id}-{uuid.uuid4().hex[:10].upper()}"
    purchase.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(purchase)
    return purchase


def _complete_school_purchase(db: Session, purchase: SchoolCoursePurchase) -> None:
    if purchase.payment_status == "completed":
        return

    purchase.payment_status = "completed"
    purchase.purchase_date = datetime.utcnow()
    purchase.updated_at = datetime.utcnow()
    db.commit()


@router.post("/school-courses/create-payment")
async def create_school_course_payment(
    payload: SchoolCoursePaymentCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    client_ip = extract_client_ip(request)
    enforce_rate_limit(scope="school-payment-create-ip", key=client_ip, max_attempts=20, window_seconds=300)
    enforce_rate_limit(
        scope="school-payment-create-user",
        key=f"user:{current_user.id}",
        max_attempts=10,
        window_seconds=300,
    )

    course = (
        db.query(SchoolCourse)
        .filter(SchoolCourse.id == payload.course_id, SchoolCourse.is_active == True)
        .first()
    )
    if not course:
        raise HTTPException(status_code=404, detail="Okul dersi bulunamadı.")

    if current_user.role == "admin":
        raise HTTPException(status_code=400, detail="Admin hesabı ile okul dersi satın alınamaz.")

    existing_purchase = (
        db.query(SchoolCoursePurchase)
        .filter(
            SchoolCoursePurchase.user_id == current_user.id,
            SchoolCoursePurchase.course_id == course.id,
            SchoolCoursePurchase.payment_status == "completed",
        )
        .first()
    )
    if existing_purchase:
        raise HTTPException(status_code=400, detail="Bu okul dersine zaten erişiminiz var.")

    base_url = str(request.base_url).rstrip("/")
    qnb_config = get_qnb_config(base_url)
    if qnb_config["missing_fields"]:
        raise HTTPException(
            status_code=503,
            detail="Ödeme altyapısı şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.",
        )

    amount = _calculate_school_course_amount(course, payload.discount_code.strip(), db)
    _expire_stale_pending_school_purchases(db, user_id=current_user.id, course_id=course.id)
    purchase = _find_or_create_pending_school_purchase(
        db=db,
        current_user=current_user,
        course=course,
        amount=amount,
        payment_method=(payload.payment_method or "qnb").strip().lower(),
    )

    slug = (payload.slug or course.title or f"school-course-{course.id}").strip()
    result_base_url = _resolve_result_base_url(request, base_url)
    checkout_token = create_checkout_token(
        payment_id=purchase.id,
        order_id=purchase.transaction_id or "",
        user_id=current_user.id,
        slug=slug,
        result_base_url=result_base_url,
    )
    checkout_base_url = _resolve_checkout_base_url(base_url)
    return_path = _normalize_internal_return_path(payload.return_path, fallback=_school_course_path(course))

    return {
        "payment_id": purchase.id,
        "status": "pending",
        "provider": purchase.payment_method,
        "order_id": purchase.transaction_id,
        "checkout_url": _build_school_checkout_url(
            checkout_base_url,
            purchase,
            slug,
            checkout_token,
            return_path,
        ),
    }


@router.get("/school-courses/qnb/start/{purchase_id}")
async def start_school_course_payment(
    purchase_id: int,
    checkout_token: str,
    slug: str = "",
    return_path: str = "",
    request: Request = None,
    db: Session = Depends(get_db),
):
    client_ip = extract_client_ip(request)
    enforce_rate_limit(scope="school-payment-start-ip", key=client_ip, max_attempts=30, window_seconds=300)

    purchase = db.query(SchoolCoursePurchase).filter(SchoolCoursePurchase.id == purchase_id).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Ödeme kaydı bulunamadı.")

    verified_checkout_token = verify_payment_token(
        checkout_token,
        expected_purpose="checkout_start",
        payment_id=purchase.id,
        order_id=purchase.transaction_id or "",
        user_id=purchase.user_id,
    )
    if not verified_checkout_token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ödeme oturumu doğrulanamadı.")

    result_base_url = _normalize_public_base_url(
        verified_checkout_token.get("result_base_url", "")
    ) or _default_result_base_url(str(request.base_url).rstrip("/"))

    course = db.query(SchoolCourse).filter(SchoolCourse.id == purchase.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Okul dersi bulunamadı.")

    safe_return_path = _normalize_internal_return_path(return_path, fallback=_school_course_path(course))
    resolved_slug = slug or course.title or f"school-course-{course.id}"

    if purchase.payment_status == "completed":
        return _frontend_redirect(
            _school_payment_result_url(
                result_base_url,
                slug=resolved_slug,
                status_value="success",
                course_title=course.title,
                course_id=course.id,
                return_path=safe_return_path,
            )
        )

    user = db.query(User).filter(User.id == purchase.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Ödeme için kullanıcı bulunamadı.")

    base_url = str(request.base_url).rstrip("/")
    callback_token = create_callback_token(
        payment_id=purchase.id,
        order_id=purchase.transaction_id or "",
        user_id=purchase.user_id,
        slug=resolved_slug,
        result_base_url=result_base_url,
    )
    gateway_request = build_qnb_gateway_payload(
        base_url=base_url,
        payment_id=purchase.id,
        order_id=purchase.transaction_id or "",
        amount=float(purchase.amount_paid or 0.0),
        slug=resolved_slug,
        course_title=course.title,
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        callback_params={
            "cb_token": callback_token,
        },
        success_url_override=f"{_callback_base_url(base_url).rstrip('/')}/api/payments/school-courses/qnb/callback/success",
        failure_url_override=f"{_callback_base_url(base_url).rstrip('/')}/api/payments/school-courses/qnb/callback/fail",
    )
    print(
        "[school_qnb_start] prepared "
        f"purchase_id={purchase.id} order_id={purchase.transaction_id} "
        f"ok_url_len={len(gateway_request.get('success_url', ''))} "
        f"fail_url_len={len(gateway_request.get('failure_url', ''))} "
        f"cb_token_len={len(callback_token)} "
        f"hash_preview={json.dumps(gateway_request.get('hash_preview', {}), ensure_ascii=False)}"
    )

    if not gateway_request["ready"]:
        purchase.payment_status = "failed"
        purchase.updated_at = datetime.utcnow()
        db.commit()
        return _frontend_redirect(
            _school_payment_result_url(
                result_base_url,
                slug=resolved_slug,
                status_value="failed",
                course_title=course.title,
                course_id=course.id,
                return_path=safe_return_path,
            )
        )

    start_mode = config("QNB_START_MODE", default="proxy").strip().lower()
    if start_mode == "browser":
        return _secure_payment_html_response(
            content=_build_gateway_form_html(
                gateway_url=gateway_request["gateway_url"],
                form_fields=gateway_request["form_fields"],
                course_title=course.title,
            )
        )

    try:
        gateway_response = create_qnb_proxy_session(
            gateway_url=gateway_request["gateway_url"],
            form_fields=gateway_request["form_fields"],
            proxy_base_url=_resolve_checkout_base_url(base_url),
        )
    except Exception as exc:
        print(f"⚠️ School QNB server-side start failed for purchase {purchase.id}: {exc}")
        return _frontend_redirect(
            _school_payment_result_url(
                result_base_url,
                slug=resolved_slug,
                status_value="failed",
                course_title=course.title,
                course_id=course.id,
                return_path=safe_return_path,
            )
        )

    if (
        gateway_response["status_code"] >= 400
        or not gateway_response["body"]
        or not gateway_response["is_html"]
    ):
        return _frontend_redirect(
            _school_payment_result_url(
                result_base_url,
                slug=resolved_slug,
                status_value="failed",
                course_title=course.title,
                course_id=course.id,
                return_path=safe_return_path,
            )
        )

    return _qnb_gateway_html_response(gateway_response["body"])


@router.api_route("/school-courses/qnb/callback/{outcome}", methods=["GET", "POST"])
async def qnb_school_callback(
    outcome: str,
    request: Request,
    db: Session = Depends(get_db),
):
    client_ip = extract_client_ip(request)
    enforce_rate_limit(scope="school-payment-callback-ip", key=client_ip, max_attempts=120, window_seconds=300)

    query_data = {key: value for key, value in request.query_params.items()}
    form_data: dict[str, str] = {}

    if request.method == "POST":
        submitted_form = await request.form()
        form_data = {key: str(value) for key, value in submitted_form.items()}

    payload = {**form_data, **query_data}
    base_url = str(request.base_url).rstrip("/")
    hash_audit = audit_qnb_request_hash(payload, base_url)
    _log_qnb_callback(
        "school_received",
        outcome=outcome,
        method=request.method,
        client_ip=client_ip,
        query_key_count=len(query_data),
        form_key_count=len(form_data),
        query_keys_preview=_preview_keys(query_data),
        form_keys_preview=_preview_keys(form_data),
        diagnostics={
            key: sanitize_external_message(str(payload.get(key) or ""), max_length=120)
            for key in [
                "payment_id",
                "order_id",
                "ProcReturnCode",
                "Response",
                "mdStatus",
                "mdErrorMsg",
                "ErrMsg",
                "TxnResult",
                "TxnStatus",
                "Eci",
            ]
            if payload.get(key)
        },
        three_ds=_qnb_3d_diagnostics(payload),
        hash_audit=hash_audit,
        has_cb_token=bool(payload.get("cb_token")),
    )

    fallback_result_base_url = _default_result_base_url(base_url)
    callback_token = payload.get("cb_token", "")
    purchase_id_value = payload.get("payment_id")
    received_order_id = payload.get("order_id") or extract_order_id(payload, base_url)

    if not purchase_id_value or not str(purchase_id_value).isdigit():
        return _frontend_redirect(f"{fallback_result_base_url}/purchase/result?status=failed")

    purchase = db.query(SchoolCoursePurchase).filter(SchoolCoursePurchase.id == int(purchase_id_value)).first()
    if not purchase:
        return _frontend_redirect(f"{fallback_result_base_url}/purchase/result?status=failed")

    verified_callback_token = verify_callback_token(
        callback_token,
        payment_id=purchase.id,
        order_id=purchase.transaction_id or "",
        user_id=purchase.user_id,
    )
    if not verified_callback_token:
        return _frontend_redirect(f"{fallback_result_base_url}/purchase/result?status=failed")

    order_id = received_order_id or purchase.transaction_id
    if order_id and purchase.transaction_id and str(order_id) != str(purchase.transaction_id):
        return _frontend_redirect(f"{fallback_result_base_url}/purchase/result?status=failed")

    course = db.query(SchoolCourse).filter(SchoolCourse.id == purchase.course_id).first()
    course_title = course.title if course else "Okul Dersi"
    slug = payload.get("slug") or _slugify(course_title) or f"school-course-{purchase.course_id}"
    result_base_url = (
        _normalize_public_base_url(verified_callback_token.get("result_base_url", ""))
        or fallback_result_base_url
    )
    return_path = _normalize_internal_return_path(
        payload.get("return_path", ""),
        fallback=_school_course_path(course),
    )
    success = callback_is_success(payload, outcome, base_url)
    eci_auth_level = get_eci_auth_level(payload, base_url)
    if outcome == "success" and payload.get("Eci") and eci_auth_level not in {"full", "half"}:
        success = False

    if success:
        _complete_school_purchase(db, purchase)
        return _frontend_redirect(
            _school_payment_result_url(
                result_base_url,
                slug=slug,
                status_value="success",
                course_title=course_title,
                course_id=purchase.course_id,
                return_path=return_path,
            )
        )

    if purchase.payment_status != "completed":
        purchase.payment_status = "failed"
        purchase.purchase_date = datetime.utcnow()
        purchase.updated_at = datetime.utcnow()
        db.commit()

    return _frontend_redirect(
        _school_payment_result_url(
            result_base_url,
            slug=slug,
            status_value="failed",
            course_title=course_title,
            course_id=purchase.course_id,
            return_path=return_path,
        )
    )
