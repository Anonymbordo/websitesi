from __future__ import annotations

from datetime import datetime, timedelta
from typing import Iterable

from decouple import config
from sqlalchemy.orm import Session

from models import Payment


PAYMENT_PENDING_TIMEOUT_SECONDS = int(config("PAYMENT_PENDING_TIMEOUT_SECONDS", default="900"))


def expire_stale_pending_payments(
    db: Session,
    *,
    payment_ids: Iterable[int] | None = None,
    user_id: int | None = None,
    course_id: int | None = None,
) -> int:
    if PAYMENT_PENDING_TIMEOUT_SECONDS <= 0:
        return 0

    threshold = datetime.utcnow() - timedelta(seconds=PAYMENT_PENDING_TIMEOUT_SECONDS)
    query = db.query(Payment).filter(
        Payment.payment_status == "pending",
        Payment.payment_date <= threshold,
    )

    if payment_ids:
        normalized_ids = [int(payment_id) for payment_id in payment_ids]
        query = query.filter(Payment.id.in_(normalized_ids))

    if user_id is not None:
        query = query.filter(Payment.user_id == int(user_id))

    if course_id is not None:
        query = query.filter(Payment.course_id == int(course_id))

    stale_payments = query.all()
    if not stale_payments:
        return 0

    for payment in stale_payments:
        payment.payment_status = "failed"

    db.commit()
    return len(stale_payments)
