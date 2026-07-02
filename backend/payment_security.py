import os
import threading
import time
from datetime import datetime, timedelta, timezone
from typing import Any

from decouple import config
from fastapi import HTTPException, Request, status
from jose import JWTError, jwt


PAYMENT_SECURITY_SECRET = (
    os.getenv("PAYMENT_SECURITY_SECRET")
    or config("PAYMENT_SECURITY_SECRET", default="")
    or os.getenv("SECRET_KEY")
    or config("SECRET_KEY", default="payment-security-default")
)
PAYMENT_SECURITY_ALGORITHM = config("PAYMENT_SECURITY_ALGORITHM", default="HS256").strip()
CHECKOUT_TOKEN_TTL_SECONDS = int(config("PAYMENT_CHECKOUT_TOKEN_TTL_SECONDS", default="900"))
CALLBACK_TOKEN_TTL_SECONDS = int(config("PAYMENT_CALLBACK_TOKEN_TTL_SECONDS", default="1800"))

_RATE_LIMIT_BUCKETS: dict[str, list[float]] = {}
_RATE_LIMIT_LOCK = threading.Lock()


def extract_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def enforce_rate_limit(
    *,
    scope: str,
    key: str,
    max_attempts: int,
    window_seconds: int,
    message: str = "Çok fazla istek gönderildi. Lütfen biraz sonra tekrar deneyin.",
) -> None:
    bucket_key = f"{scope}:{key}"
    now = time.monotonic()
    floor = now - window_seconds

    with _RATE_LIMIT_LOCK:
        recent_attempts = [attempt for attempt in _RATE_LIMIT_BUCKETS.get(bucket_key, []) if attempt >= floor]
        if len(recent_attempts) >= max_attempts:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=message)

        recent_attempts.append(now)
        _RATE_LIMIT_BUCKETS[bucket_key] = recent_attempts


def create_payment_token(
    *,
    purpose: str,
    payment_id: int,
    order_id: str,
    user_id: int | None = None,
    slug: str = "",
    result_base_url: str = "",
    expires_in_seconds: int,
) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "purpose": purpose,
        "payment_id": int(payment_id),
        "order_id": str(order_id),
        "slug": str(slug or ""),
        "iat": now,
        "exp": now + timedelta(seconds=expires_in_seconds),
    }
    if user_id is not None:
        payload["user_id"] = int(user_id)
    if result_base_url:
        payload["result_base_url"] = str(result_base_url)

    return jwt.encode(payload, PAYMENT_SECURITY_SECRET, algorithm=PAYMENT_SECURITY_ALGORITHM)


def create_checkout_token(
    *,
    payment_id: int,
    order_id: str,
    user_id: int,
    slug: str = "",
    result_base_url: str = "",
) -> str:
    return create_payment_token(
        purpose="checkout_start",
        payment_id=payment_id,
        order_id=order_id,
        user_id=user_id,
        slug=slug,
        result_base_url=result_base_url,
        expires_in_seconds=CHECKOUT_TOKEN_TTL_SECONDS,
    )


def create_callback_token(
    *,
    payment_id: int,
    order_id: str,
    user_id: int,
    slug: str = "",
    result_base_url: str = "",
) -> str:
    return create_payment_token(
        purpose="qnb_callback",
        payment_id=payment_id,
        order_id=order_id,
        user_id=user_id,
        slug=slug,
        result_base_url=result_base_url,
        expires_in_seconds=CALLBACK_TOKEN_TTL_SECONDS,
    )


def verify_payment_token(
    token: str,
    *,
    expected_purpose: str,
    payment_id: int | None = None,
    order_id: str | None = None,
    user_id: int | None = None,
) -> dict[str, Any] | None:
    try:
        payload = jwt.decode(token, PAYMENT_SECURITY_SECRET, algorithms=[PAYMENT_SECURITY_ALGORITHM])
    except JWTError:
        return None

    if payload.get("purpose") != expected_purpose:
        return None
    if payment_id is not None and int(payload.get("payment_id", -1)) != int(payment_id):
        return None
    if order_id is not None and str(payload.get("order_id", "")) != str(order_id):
        return None
    if user_id is not None and int(payload.get("user_id", -1)) != int(user_id):
        return None
    return payload


def sanitize_external_message(message: str | None, *, max_length: int = 160) -> str:
    if not message:
        return ""
    cleaned = " ".join(str(message).replace("\n", " ").replace("\r", " ").split())
    return cleaned[:max_length]
