from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from models import Course, CourseMaterial, Enrollment, Instructor, Lesson, LessonProgress, Payment, User


PAYMENT_STATUS_PRIORITY = {
    "completed": 3,
    "pending": 2,
    "failed": 1,
    "refunded": 0,
    "voided": 0,
}


def start_of_current_month(now: datetime | None = None) -> datetime:
    current = now or datetime.utcnow()
    return current.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def serialize_payment(payment: Payment | None) -> dict[str, Any] | None:
    if not payment:
        return None

    return {
        "id": payment.id,
        "amount": float(payment.amount or 0.0),
        "currency": payment.currency or "TRY",
        "payment_method": payment.payment_method,
        "payment_status": payment.payment_status,
        "transaction_id": payment.transaction_id,
        "payment_date": payment.payment_date.isoformat() if payment.payment_date else None,
    }


def get_course_content_counts(db: Session, course_ids: list[int]) -> dict[int, dict[str, int]]:
    if not course_ids:
        return {}

    counts = {
        course_id: {
            "lesson_count": 0,
            "material_count": 0,
        }
        for course_id in course_ids
    }

    lesson_rows = (
        db.query(Lesson.course_id, func.count(Lesson.id))
        .filter(Lesson.course_id.in_(course_ids))
        .group_by(Lesson.course_id)
        .all()
    )
    for course_id, count in lesson_rows:
        counts[int(course_id)]["lesson_count"] = int(count or 0)

    material_rows = (
        db.query(CourseMaterial.course_id, func.count(CourseMaterial.id))
        .filter(CourseMaterial.course_id.in_(course_ids))
        .group_by(CourseMaterial.course_id)
        .all()
    )
    for course_id, count in material_rows:
        counts[int(course_id)]["material_count"] = int(count or 0)

    return counts


def get_completed_lesson_counts_by_enrollment(db: Session, enrollment_ids: list[int]) -> dict[int, int]:
    if not enrollment_ids:
        return {}

    rows = (
        db.query(LessonProgress.enrollment_id, func.count(LessonProgress.id))
        .filter(
            LessonProgress.enrollment_id.in_(enrollment_ids),
            LessonProgress.is_completed == True,
        )
        .group_by(LessonProgress.enrollment_id)
        .all()
    )

    return {int(enrollment_id): int(count or 0) for enrollment_id, count in rows}


def select_representative_payments(payments: list[Payment]) -> dict[int, Payment]:
    selected: dict[int, Payment] = {}
    for payment in payments:
        current = selected.get(payment.course_id)
        if current is None:
            selected[payment.course_id] = payment
            continue

        current_priority = PAYMENT_STATUS_PRIORITY.get(current.payment_status or "", -1)
        next_priority = PAYMENT_STATUS_PRIORITY.get(payment.payment_status or "", -1)
        current_time = current.payment_date or datetime.min
        next_time = payment.payment_date or datetime.min

        if next_priority > current_priority or (
            next_priority == current_priority and next_time > current_time
        ):
            selected[payment.course_id] = payment

    return selected


def get_user_course_payments(db: Session, user_id: int, course_ids: list[int]) -> tuple[dict[int, Payment], list[Payment]]:
    if not course_ids:
        return {}, []

    payments = (
        db.query(Payment)
        .filter(
            Payment.user_id == user_id,
            Payment.course_id.in_(course_ids),
        )
        .order_by(Payment.payment_date.desc(), Payment.id.desc())
        .all()
    )

    return select_representative_payments(payments), payments


def get_course_enrollment_metrics(db: Session, course_ids: list[int]) -> dict[int, dict[str, Any]]:
    if not course_ids:
        return {}

    metrics = {
        course_id: {
            "enrollment_count": 0,
            "completed_enrollments": 0,
            "average_progress": 0.0,
            "_progress_sum": 0.0,
            "_student_ids": set(),
        }
        for course_id in course_ids
    }

    enrollments = (
        db.query(Enrollment)
        .filter(Enrollment.course_id.in_(course_ids))
        .all()
    )

    for enrollment in enrollments:
        course_metric = metrics.setdefault(
            enrollment.course_id,
            {
                "enrollment_count": 0,
                "completed_enrollments": 0,
                "average_progress": 0.0,
                "_progress_sum": 0.0,
                "_student_ids": set(),
            },
        )
        course_metric["enrollment_count"] += 1
        course_metric["_progress_sum"] += float(enrollment.progress_percentage or 0.0)
        if enrollment.completed_at:
            course_metric["completed_enrollments"] += 1
        if enrollment.student_id:
            course_metric["_student_ids"].add(enrollment.student_id)

    for course_metric in metrics.values():
        enrollment_count = course_metric["enrollment_count"]
        course_metric["average_progress"] = (
            round(course_metric["_progress_sum"] / enrollment_count, 2)
            if enrollment_count
            else 0.0
        )
        course_metric["unique_students"] = len(course_metric["_student_ids"])
        del course_metric["_progress_sum"]
        del course_metric["_student_ids"]

    return metrics


def get_course_sales_metrics(
    db: Session,
    course_ids: list[int],
    month_start: datetime | None = None,
) -> dict[int, dict[str, Any]]:
    if not course_ids:
        return {}

    month_floor = month_start or start_of_current_month()
    metrics = {
        course_id: {
            "completed_sales_count": 0,
            "total_revenue": 0.0,
            "monthly_revenue": 0.0,
            "last_sale_at": None,
            "average_sale_value": 0.0,
        }
        for course_id in course_ids
    }

    payments = (
        db.query(Payment)
        .filter(
            Payment.course_id.in_(course_ids),
            Payment.payment_status == "completed",
        )
        .order_by(Payment.payment_date.desc(), Payment.id.desc())
        .all()
    )

    for payment in payments:
        payment_metric = metrics.setdefault(
            payment.course_id,
            {
                "completed_sales_count": 0,
                "total_revenue": 0.0,
                "monthly_revenue": 0.0,
                "last_sale_at": None,
                "average_sale_value": 0.0,
            },
        )
        amount = float(payment.amount or 0.0)
        payment_metric["completed_sales_count"] += 1
        payment_metric["total_revenue"] += amount
        if payment.payment_date and payment.payment_date >= month_floor:
            payment_metric["monthly_revenue"] += amount
        if payment.payment_date and (
            payment_metric["last_sale_at"] is None
            or payment.payment_date > payment_metric["last_sale_at"]
        ):
            payment_metric["last_sale_at"] = payment.payment_date

    for payment_metric in metrics.values():
        count = payment_metric["completed_sales_count"]
        payment_metric["total_revenue"] = round(payment_metric["total_revenue"], 2)
        payment_metric["monthly_revenue"] = round(payment_metric["monthly_revenue"], 2)
        payment_metric["average_sale_value"] = round(
            payment_metric["total_revenue"] / count,
            2,
        ) if count else 0.0

    return metrics


def build_student_inventory(db: Session, user: User) -> dict[str, Any]:
    enrollments = (
        db.query(Enrollment)
        .filter(Enrollment.student_id == user.id)
        .order_by(Enrollment.enrolled_at.desc(), Enrollment.id.desc())
        .all()
    )

    course_ids = [enrollment.course_id for enrollment in enrollments if enrollment.course_id]
    enrollment_ids = [enrollment.id for enrollment in enrollments if enrollment.id]
    course_map = {
        enrollment.course_id: enrollment.course
        for enrollment in enrollments
        if enrollment.course_id and enrollment.course
    }
    content_counts = get_course_content_counts(db, course_ids)
    completed_lesson_counts = get_completed_lesson_counts_by_enrollment(db, enrollment_ids)
    selected_payments, all_payments = get_user_course_payments(db, user.id, course_ids)

    items: list[dict[str, Any]] = []
    completed_courses = 0
    in_progress_courses = 0
    average_progress_sum = 0.0
    total_learning_hours = 0
    total_spent = 0.0

    for enrollment in enrollments:
        course = enrollment.course
        if not course:
            continue

        course_counts = content_counts.get(course.id, {})
        lesson_count = int(course_counts.get("lesson_count", 0))
        material_count = int(course_counts.get("material_count", 0))
        completed_lessons = int(completed_lesson_counts.get(enrollment.id, 0))
        progress_percentage = float(enrollment.progress_percentage or 0.0)
        payment = selected_payments.get(course.id)

        if progress_percentage >= 100:
            completed_courses += 1
        elif progress_percentage > 0:
            in_progress_courses += 1

        average_progress_sum += progress_percentage
        total_learning_hours += int(course.duration_hours or 0)

        if payment and payment.payment_status == "completed":
            total_spent += float(payment.amount or 0.0)

        instructor_user = course.instructor.user if course.instructor and course.instructor.user else None
        items.append(
            {
                "course_id": course.id,
                "enrollment_id": enrollment.id,
                "title": course.title,
                "description": course.description,
                "thumbnail": course.thumbnail,
                "category": course.category,
                "level": course.level,
                "duration_hours": int(course.duration_hours or 0),
                "rating": float(course.rating or 0.0),
                "lesson_count": lesson_count,
                "material_count": material_count,
                "completed_lessons": completed_lessons,
                "progress_percentage": progress_percentage,
                "enrolled_at": enrollment.enrolled_at.isoformat() if enrollment.enrolled_at else None,
                "completed_at": enrollment.completed_at.isoformat() if enrollment.completed_at else None,
                "instructor": {
                    "id": course.instructor.id if course.instructor else None,
                    "name": instructor_user.full_name if instructor_user else "Eğitmen",
                    "avatar": instructor_user.profile_image if instructor_user else None,
                },
                "payment": serialize_payment(payment),
            }
        )

    recent_payments = [
        {
            **serialize_payment(payment),
            "course_id": payment.course_id,
            "course_title": course_map.get(payment.course_id).title if course_map.get(payment.course_id) else "Kurs",
        }
        for payment in all_payments[:10]
    ]

    item_count = len(items)
    return {
        "summary": {
            "total_courses": item_count,
            "completed_courses": completed_courses,
            "in_progress_courses": in_progress_courses,
            "total_learning_hours": total_learning_hours,
            "total_spent": round(total_spent, 2),
            "average_progress": round(average_progress_sum / item_count, 2) if item_count else 0.0,
        },
        "items": items,
        "recent_payments": recent_payments,
    }


def build_recent_sales_for_instructor(
    db: Session,
    instructor_id: int,
    limit: int = 10,
) -> list[dict[str, Any]]:
    rows = (
        db.query(Payment, Course, User)
        .join(Course, Payment.course_id == Course.id)
        .join(User, Payment.user_id == User.id)
        .filter(
            Course.instructor_id == instructor_id,
            Payment.payment_status == "completed",
        )
        .order_by(Payment.payment_date.desc(), Payment.id.desc())
        .limit(limit)
        .all()
    )

    recent_sales: list[dict[str, Any]] = []
    for payment, course, student in rows:
        recent_sales.append(
            {
                "payment_id": payment.id,
                "course_id": course.id if course else payment.course_id,
                "course_title": course.title if course else "Kurs",
                "amount": float(payment.amount or 0.0),
                "currency": payment.currency or "TRY",
                "payment_method": payment.payment_method,
                "payment_status": payment.payment_status,
                "transaction_id": payment.transaction_id,
                "payment_date": payment.payment_date.isoformat() if payment.payment_date else None,
                "student": {
                    "id": student.id if student else payment.user_id,
                    "full_name": student.full_name if student else "Öğrenci",
                    "email": student.email if student else None,
                    "phone": student.phone if student else None,
                    "profile_image": student.profile_image if student else None,
                },
            }
        )

    return recent_sales


def build_instructor_dashboard(db: Session, instructor: Instructor) -> dict[str, Any]:
    courses = (
        db.query(Course)
        .filter(Course.instructor_id == instructor.id)
        .order_by(Course.created_at.desc(), Course.id.desc())
        .all()
    )
    course_ids = [course.id for course in courses]
    content_counts = get_course_content_counts(db, course_ids)
    sales_metrics = get_course_sales_metrics(db, course_ids)
    enrollment_metrics = get_course_enrollment_metrics(db, course_ids)
    recent_sales = build_recent_sales_for_instructor(db, instructor.id, limit=10)

    published_courses = 0
    draft_courses = 0
    total_revenue = 0.0
    total_sales_count = 0
    monthly_revenue = 0.0
    overall_last_sale_at: datetime | None = None

    course_items: list[dict[str, Any]] = []
    for course in courses:
        if course.is_published:
            published_courses += 1
        else:
            draft_courses += 1

        course_sales = sales_metrics.get(course.id, {})
        course_enrollment = enrollment_metrics.get(course.id, {})
        course_counts = content_counts.get(course.id, {})

        course_total_revenue = float(course_sales.get("total_revenue", 0.0))
        course_monthly_revenue = float(course_sales.get("monthly_revenue", 0.0))
        course_sales_count = int(course_sales.get("completed_sales_count", 0))
        last_sale_at = course_sales.get("last_sale_at")

        total_revenue += course_total_revenue
        total_sales_count += course_sales_count
        monthly_revenue += course_monthly_revenue
        if last_sale_at and (overall_last_sale_at is None or last_sale_at > overall_last_sale_at):
            overall_last_sale_at = last_sale_at

        course_items.append(
            {
                "id": course.id,
                "title": course.title,
                "description": course.description,
                "short_description": course.short_description,
                "price": float(course.price or 0.0),
                "discount_price": float(course.discount_price) if course.discount_price is not None else None,
                "duration_hours": int(course.duration_hours or 0),
                "category": course.category,
                "level": course.level,
                "thumbnail": course.thumbnail,
                "preview_video": course.preview_video,
                "rating": float(course.rating or 0.0),
                "enrollment_count": int(course.enrollment_count or 0),
                "is_online": bool(course.is_online),
                "is_published": bool(course.is_published),
                "location": course.location,
                "created_at": course.created_at.isoformat() if course.created_at else None,
                "updated_at": course.updated_at.isoformat() if course.updated_at else None,
                "lesson_count": int(course_counts.get("lesson_count", 0)),
                "material_count": int(course_counts.get("material_count", 0)),
                "completed_sales_count": course_sales_count,
                "total_revenue": round(course_total_revenue, 2),
                "monthly_revenue": round(course_monthly_revenue, 2),
                "average_sale_value": float(course_sales.get("average_sale_value", 0.0)),
                "last_sale_at": last_sale_at.isoformat() if last_sale_at else None,
                "completed_enrollments": int(course_enrollment.get("completed_enrollments", 0)),
                "average_progress": float(course_enrollment.get("average_progress", 0.0)),
                "unique_students": int(course_enrollment.get("unique_students", 0)),
            }
        )

    unique_students = db.query(func.count(func.distinct(Enrollment.student_id))).filter(
        Enrollment.course_id.in_(course_ids)
    ).scalar() if course_ids else 0

    total_enrollments = db.query(func.count(Enrollment.id)).filter(
        Enrollment.course_id.in_(course_ids)
    ).scalar() if course_ids else 0

    return {
        "summary": {
            "total_courses": len(course_items),
            "published_courses": published_courses,
            "draft_courses": draft_courses,
            "total_students": int(unique_students or 0),
            "total_enrollments": int(total_enrollments or 0),
            "total_sales_count": total_sales_count,
            "total_revenue": round(total_revenue, 2),
            "monthly_revenue": round(monthly_revenue, 2),
            "average_sale_value": round(total_revenue / total_sales_count, 2) if total_sales_count else 0.0,
            "last_sale_at": overall_last_sale_at.isoformat() if overall_last_sale_at else None,
        },
        "courses": course_items,
        "recent_sales": recent_sales,
    }


def build_admin_instructor_snapshot(db: Session, instructor: Instructor) -> dict[str, Any]:
    dashboard = build_instructor_dashboard(db, instructor)
    summary = dashboard["summary"]

    return {
        "published_courses": int(summary["published_courses"]),
        "draft_courses": int(summary["draft_courses"]),
        "total_sales_count": int(summary["total_sales_count"]),
        "total_revenue": float(summary["total_revenue"]),
        "monthly_revenue": float(summary["monthly_revenue"]),
        "average_sale_value": float(summary["average_sale_value"]),
        "last_sale_at": summary["last_sale_at"],
    }
