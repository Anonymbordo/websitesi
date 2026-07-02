import uuid
from datetime import datetime
from html import escape
from typing import Literal, Optional
from urllib.parse import quote_plus
import json
import re

from decouple import config
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import Course, Enrollment, Payment, User
from payment_gateway_qnb import (
    build_qnb_gateway_payload,
    callback_is_success,
    extract_order_id,
    get_eci_auth_level,
    get_qnb_config,
    start_qnb_3dhost_session,
)
from payment_security import (
    create_callback_token,
    create_checkout_token,
    enforce_rate_limit,
    extract_client_ip,
    sanitize_external_message,
    verify_payment_token,
)

payments_router = APIRouter()


class PaymentCreate(BaseModel):
    course_id: int
    payment_method: Literal["qnb"] = "qnb"
    discount_code: str = Field(default="", max_length=64)
    slug: str = Field(default="", max_length=180)


class PaymentResponse(BaseModel):
    id: int
    amount: float
    currency: str
    payment_method: str
    payment_status: str
    transaction_id: Optional[str]
    payment_date: datetime
    course: dict

    class Config:
        from_attributes = True


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
    normalized = re.sub(r"[^a-z0-9 -]", "", normalized)
    normalized = re.sub(r"\s+", "-", normalized)
    normalized = re.sub(r"-{2,}", "-", normalized)
    return normalized.strip("-")


def _legacy_slugify(value: str) -> str:
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
    normalized = re.sub(r"[^a-z0-9\s-]", "-", normalized)
    normalized = re.sub(r"\s+", "-", normalized)
    normalized = re.sub(r"-{2,}", "-", normalized)
    return normalized.strip("-")


def _slug_candidates(value: str) -> set[str]:
    candidates = {
        _slugify(value),
        _legacy_slugify(value),
    }
    return {candidate for candidate in candidates if candidate}


def _build_checkout_url(base_url: str, payment: Payment, slug: str, checkout_token: str) -> str:
    safe_slug = quote_plus(slug or "")
    safe_checkout_token = quote_plus(checkout_token)
    return f"{base_url}/api/payments/qnb/start/{payment.id}?checkout_token={safe_checkout_token}&slug={safe_slug}"


def _normalize_public_base_url(value: str) -> str:
    normalized = (value or "").strip().rstrip("/")
    if normalized.startswith("http://") or normalized.startswith("https://"):
        return normalized
    return ""


def _default_result_base_url(base_url: str) -> str:
    return (
        _normalize_public_base_url(config("PAYMENT_FRONTEND_BASE_URL", default=""))
        or _normalize_public_base_url(base_url)
        or base_url.rstrip("/")
    )


def _resolve_checkout_base_url(base_url: str) -> str:
    configured_value = _normalize_public_base_url(config("PAYMENT_PUBLIC_BASE_URL", default=""))
    return configured_value or base_url.rstrip("/")


def _resolve_result_base_url(request: Request, base_url: str) -> str:
    configured_value = _normalize_public_base_url(config("PAYMENT_FRONTEND_BASE_URL", default=""))
    if configured_value:
        return configured_value

    return _default_result_base_url(base_url)


def _build_gateway_form_html(*, gateway_url: str, form_fields: dict[str, str], course_title: str) -> str:
    hidden_inputs = "\n".join(
        f'<input type="hidden" name="{escape(key)}" value="{escape(str(value))}" />'
        for key, value in form_fields.items()
    )
    safe_title = escape(course_title or "Kurs")
    safe_gateway_url = escape(gateway_url)

    return f"""<!DOCTYPE html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>QNB 3D Host Yönlendirmesi</title>
    <style>
      body {{
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: Arial, sans-serif;
        background: linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%);
        color: #0f172a;
      }}
      .card {{
        max-width: 480px;
        padding: 32px;
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.96);
        box-shadow: 0 25px 50px rgba(15, 23, 42, 0.12);
        text-align: center;
      }}
      .spinner {{
        width: 48px;
        height: 48px;
        margin: 0 auto 20px;
        border-radius: 9999px;
        border: 4px solid #cbd5e1;
        border-top-color: #2563eb;
        animation: spin 1s linear infinite;
      }}
      @keyframes spin {{
        to {{ transform: rotate(360deg); }}
      }}
      button {{
        border: 0;
        border-radius: 9999px;
        padding: 12px 24px;
        background: #2563eb;
        color: white;
        cursor: pointer;
        font-size: 16px;
      }}
    </style>
  </head>
  <body>
    <div class="card">
      <div class="spinner"></div>
      <h1>Ödeme Sayfasına Yönlendiriliyorsunuz</h1>
      <p><strong>{safe_title}</strong> için QNB 3D Host ekranı açılıyor.</p>
      <p>Yönlendirme otomatik başlamazsa aşağıdaki butonu kullanın.</p>
      <form id="qnb-3dhost-form" method="post" action="{safe_gateway_url}">
        {hidden_inputs}
        <noscript>
          <button type="submit">QNB Ödeme Sayfasını Aç</button>
        </noscript>
      </form>
    </div>
    <script>
      window.addEventListener('load', function () {{
        document.getElementById('qnb-3dhost-form')?.submit();
      }});
    </script>
  </body>
</html>"""


def _secure_payment_html_response(content: str) -> HTMLResponse:
    response = HTMLResponse(content=content, status_code=200)
    response.headers["Cache-Control"] = "no-store, no-cache, max-age=0, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Content-Security-Policy"] = (
        "default-src 'none'; "
        "script-src 'unsafe-inline'; "
        "style-src 'unsafe-inline'; "
        "img-src 'self' data:; "
        "form-action *; "
        "base-uri 'none'; "
        "frame-ancestors 'none'; "
        "object-src 'none'"
    )
    return response


def _qnb_gateway_html_response(content: str) -> HTMLResponse:
    response = HTMLResponse(content=content, status_code=200)
    response.headers["Cache-Control"] = "no-store, no-cache, max-age=0, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


def _inject_qnb_base_href(html: str, final_url: str) -> str:
    cleaned_html = html or ""
    safe_final_url = escape((final_url or "").strip(), quote=True)
    if not cleaned_html or not safe_final_url:
        return cleaned_html

    base_tag = f'<base href="{safe_final_url}" />'
    lowered = cleaned_html.lower()

    head_index = lowered.find("<head")
    if head_index != -1:
        head_close_index = lowered.find(">", head_index)
        if head_close_index != -1:
            insertion_index = head_close_index + 1
            return f"{cleaned_html[:insertion_index]}{base_tag}{cleaned_html[insertion_index:]}"

    html_index = lowered.find("<html")
    if html_index != -1:
        html_close_index = lowered.find(">", html_index)
        if html_close_index != -1:
            insertion_index = html_close_index + 1
            return f"{cleaned_html[:insertion_index]}<head>{base_tag}</head>{cleaned_html[insertion_index:]}"

    return f"<head>{base_tag}</head>{cleaned_html}"


def _serialize_payment(payment: Payment, course: Optional[Course]) -> PaymentResponse:
    course_info = {
        "id": course.id if course else payment.course_id,
        "title": course.title if course else "Kurs",
        "thumbnail": course.thumbnail if course else None,
        "instructor_name": course.instructor.user.full_name if course and course.instructor and course.instructor.user else None,
        "price": course.price if course else None,
        "discount_price": course.discount_price if course else None,
    }
    return PaymentResponse(
        id=payment.id,
        amount=payment.amount,
        currency=payment.currency,
        payment_method=payment.payment_method,
        payment_status=payment.payment_status,
        transaction_id=payment.transaction_id,
        payment_date=payment.payment_date,
        course=course_info,
    )


def _calculate_amount(course: Course, discount_code: str, db: Session) -> float:
    amount = course.discount_price if course.discount_price is not None else course.price
    if not discount_code:
        return amount

    from models import DiscountCode

    code_obj = (
        db.query(DiscountCode)
        .filter(DiscountCode.code == discount_code, DiscountCode.active == True)
        .first()
    )
    if not code_obj:
        raise HTTPException(status_code=400, detail="Geçersiz veya pasif indirim kodu.")
    return round(amount * (1 - code_obj.percent / 100), 2)


def _find_or_create_pending_payment(
    *,
    db: Session,
    current_user: User,
    course: Course,
    amount: float,
    payment_method: str,
) -> Payment:
    existing_payment = (
        db.query(Payment)
        .filter(
            Payment.user_id == current_user.id,
            Payment.course_id == course.id,
            Payment.payment_status.in_(["pending", "completed"]),
        )
        .first()
    )

    if existing_payment and existing_payment.payment_status == "completed":
        raise HTTPException(status_code=400, detail="Bu kurs için ödeme zaten tamamlanmış.")

    if existing_payment and existing_payment.payment_status == "pending":
        existing_payment.amount = amount
        existing_payment.payment_method = payment_method
        existing_payment.payment_date = datetime.utcnow()
        # Always rotate the gateway order id for a fresh 3D Host session on retry.
        existing_payment.transaction_id = f"QNB-{existing_payment.id}-{uuid.uuid4().hex[:10].upper()}"
        db.commit()
        db.refresh(existing_payment)
        return existing_payment

    payment = Payment(
        user_id=current_user.id,
        course_id=course.id,
        amount=amount,
        currency="TRY",
        payment_method=payment_method,
        payment_status="pending",
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    payment.transaction_id = f"QNB-{payment.id}-{uuid.uuid4().hex[:10].upper()}"
    db.commit()
    db.refresh(payment)
    return payment


def _complete_payment(db: Session, payment: Payment) -> None:
    if payment.payment_status == "completed":
        return

    payment.payment_status = "completed"
    payment.payment_date = datetime.utcnow()
    existing_enrollment = (
        db.query(Enrollment)
        .filter(
            Enrollment.student_id == payment.user_id,
            Enrollment.course_id == payment.course_id,
        )
        .first()
    )

    if not existing_enrollment:
        enrollment = Enrollment(student_id=payment.user_id, course_id=payment.course_id)
        db.add(enrollment)

        course = db.query(Course).filter(Course.id == payment.course_id).first()
        if course:
            course.enrollment_count = (course.enrollment_count or 0) + 1
            if course.instructor:
                course.instructor.total_students = (course.instructor.total_students or 0) + 1

    db.commit()


def _payment_result_url(result_base_url: str, slug: str, status_value: str) -> str:
    safe_slug = quote_plus(slug or "")
    return f"{result_base_url.rstrip('/')}/purchase/result?status={status_value}&slug={safe_slug}"


def _frontend_redirect(url: str) -> RedirectResponse:
    return RedirectResponse(url=url, status_code=status.HTTP_303_SEE_OTHER)


def _log_qnb_callback(event: str, **fields: object) -> None:
    safe_fields = {key: value for key, value in fields.items() if value not in (None, "", [], {}, ())}
    try:
        print(f"[qnb_callback] {event} {json.dumps(safe_fields, ensure_ascii=False, default=str)}")
    except Exception:
        print(f"[qnb_callback] {event} {safe_fields}")


def _preview_keys(payload: dict[str, str], *, limit: int = 16) -> list[str]:
    return sorted(payload.keys())[:limit]


def _qnb_payload_diagnostics(payload: dict[str, str]) -> dict[str, str]:
    allowed_keys = [
        "payment_id",
        "order_id",
        "OrderId",
        "MrcOrderId",
        "MerchantOrderId",
        "OkUrl",
        "FailUrl",
        "ReturnUrl",
        "SecureType",
        "TxnType",
        "ProcReturnCode",
        "Response",
        "mdStatus",
        "mdErrorMsg",
        "ErrMsg",
        "TxnResult",
        "TxnStatus",
        "Eci",
        "ECI",
        "AuthCode",
        "HostRefNum",
        "TransId",
    ]
    return {
        key: sanitize_external_message(str(payload.get(key) or ""), max_length=120)
        for key in allowed_keys
        if payload.get(key)
    }


def _qnb_3d_diagnostics(payload: dict[str, str]) -> dict[str, str]:
    allowed_keys = [
        "3DStatus",
        "D3Stat",
        "ParesVerified",
        "ParesSyntaxOk",
        "CavvResult",
        "CavvAlg",
        "PayerAuthenticationCode",
        "BankInternalResponseCode",
        "BankInternalResponseMessage",
        "BankInternalResponseSubcode",
        "BankInternalResponseSubmessage",
        "RequestStat",
        "DsBrand",
        "Eci",
        "MobileECI",
        "ProcReturnCode",
        "ErrMsg",
        "TxnResult",
        "TxnStatus",
        "Response",
        "mdStatus",
        "mdErrorMsg",
    ]
    return {
        key: sanitize_external_message(str(payload.get(key) or ""), max_length=160)
        for key in allowed_keys
        if payload.get(key)
    }


@payments_router.get("/course-lookup")
async def lookup_course_by_slug(slug: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    normalized_candidates = _slug_candidates(slug)
    courses = db.query(Course).filter(Course.is_published == True).all()

    for course in courses:
        if _slug_candidates(course.title) & normalized_candidates:
            return {
                "id": course.id,
                "title": course.title,
                "description": course.description,
                "price": course.price,
                "discount_price": course.discount_price,
            }

    raise HTTPException(status_code=404, detail="Bu slug için kurs bulunamadı.")


@payments_router.post("/create-payment")
async def create_payment(
    payload: PaymentCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    client_ip = extract_client_ip(request)
    enforce_rate_limit(scope="payment-create-ip", key=client_ip, max_attempts=20, window_seconds=300)
    enforce_rate_limit(
        scope="payment-create-user",
        key=f"user:{current_user.id}",
        max_attempts=10,
        window_seconds=300,
    )

    course = (
        db.query(Course)
        .filter(Course.id == payload.course_id, Course.is_published == True)
        .first()
    )
    if not course:
        raise HTTPException(status_code=404, detail="Kurs bulunamadı.")

    if course.instructor and course.instructor.user_id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Egitmen kendi kursunu satin alamaz. Odeme testi icin ogrenci hesabi kullanin.",
        )

    existing_enrollment = (
        db.query(Enrollment)
        .filter(
            Enrollment.student_id == current_user.id,
            Enrollment.course_id == course.id,
        )
        .first()
    )
    if existing_enrollment:
        raise HTTPException(status_code=400, detail="Bu kursa zaten kayıtlısınız.")

    base_url = str(request.base_url).rstrip("/")
    qnb_config = get_qnb_config(base_url)
    if qnb_config["missing_fields"]:
        print(f"⚠️ QNB configuration missing fields: {', '.join(qnb_config['missing_fields'])}")
        raise HTTPException(
            status_code=503,
            detail="Ödeme altyapısı şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.",
        )

    amount = _calculate_amount(course, payload.discount_code.strip(), db)
    payment = _find_or_create_pending_payment(
        db=db,
        current_user=current_user,
        course=course,
        amount=amount,
        payment_method=(payload.payment_method or "qnb").strip().lower(),
    )
    slug = (payload.slug or course.title or f"course-{course.id}").strip()
    result_base_url = _resolve_result_base_url(request, base_url)
    checkout_token = create_checkout_token(
        payment_id=payment.id,
        order_id=payment.transaction_id or "",
        user_id=current_user.id,
        slug=slug,
        result_base_url=result_base_url,
    )

    checkout_base_url = _resolve_checkout_base_url(base_url)

    return {
        "payment_id": payment.id,
        "status": "pending",
        "provider": payment.payment_method,
        "order_id": payment.transaction_id,
        "checkout_url": _build_checkout_url(checkout_base_url, payment, slug, checkout_token),
    }


@payments_router.get("/qnb/start/{payment_id}")
async def start_qnb_payment(
    payment_id: int,
    checkout_token: str,
    slug: str = "",
    request: Request = None,
    db: Session = Depends(get_db),
):
    client_ip = extract_client_ip(request)
    enforce_rate_limit(scope="payment-start-ip", key=client_ip, max_attempts=30, window_seconds=300)

    payment = (
        db.query(Payment)
        .filter(
            Payment.id == payment_id,
        )
        .first()
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Ödeme kaydı bulunamadı.")

    verified_checkout_token = verify_payment_token(
        checkout_token,
        expected_purpose="checkout_start",
        payment_id=payment.id,
        order_id=payment.transaction_id or "",
        user_id=payment.user_id,
    )
    if not verified_checkout_token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ödeme oturumu doğrulanamadı.")

    result_base_url = _normalize_public_base_url(verified_checkout_token.get("result_base_url", "")) or _default_result_base_url(str(request.base_url).rstrip("/"))

    if payment.payment_status == "completed":
        return _frontend_redirect(_payment_result_url(result_base_url, slug, "success"))

    user = db.query(User).filter(User.id == payment.user_id).first()
    course = db.query(Course).filter(Course.id == payment.course_id).first()
    if not user or not course:
        raise HTTPException(status_code=404, detail="Ödeme için kullanıcı veya kurs bulunamadı.")

    base_url = str(request.base_url).rstrip("/")
    callback_token = create_callback_token(
        payment_id=payment.id,
        order_id=payment.transaction_id or "",
        user_id=payment.user_id,
        slug=slug or course.title,
        result_base_url=result_base_url,
    )
    gateway_request = build_qnb_gateway_payload(
        base_url=base_url,
        payment_id=payment.id,
        order_id=payment.transaction_id or "",
        amount=payment.amount,
        slug=slug or course.title,
        course_title=course.title,
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        callback_params={"cb_token": callback_token},
    )

    if not gateway_request["ready"]:
        payment.payment_status = "failed"
        db.commit()
        missing = ", ".join(gateway_request["missing_fields"])
        print(f"⚠️ QNB gateway request blocked due to missing fields: {missing}")
        return _frontend_redirect(_payment_result_url(result_base_url, slug or course.title, "failed"))

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
        gateway_response = start_qnb_3dhost_session(
            gateway_url=gateway_request["gateway_url"],
            form_fields=gateway_request["form_fields"],
        )
    except Exception as exc:
        print(f"⚠️ QNB server-side start failed for payment {payment.id}: {exc}")
        return _frontend_redirect(_payment_result_url(result_base_url, slug or course.title, "failed"))

    if (
        gateway_response["status_code"] >= 400
        or not gateway_response["body"]
        or not gateway_response["is_html"]
    ):
        print(
            "⚠️ QNB server-side start returned unexpected response "
            f"for payment {payment.id}: status={gateway_response['status_code']} "
            f"content_type={gateway_response['content_type']} final_url={gateway_response['final_url']}"
        )
        return _frontend_redirect(_payment_result_url(result_base_url, slug or course.title, "failed"))

    return _qnb_gateway_html_response(
        _inject_qnb_base_href(
            gateway_response["body"],
            gateway_response["final_url"],
        )
    )


@payments_router.api_route("/qnb/callback/{outcome}", methods=["GET", "POST"])
async def qnb_callback(
    outcome: str,
    request: Request,
    db: Session = Depends(get_db),
):
    client_ip = extract_client_ip(request)
    enforce_rate_limit(scope="payment-callback-ip", key=client_ip, max_attempts=120, window_seconds=300)

    query_data = {key: value for key, value in request.query_params.items()}
    form_data: dict[str, str] = {}

    if request.method == "POST":
        submitted_form = await request.form()
        form_data = {key: str(value) for key, value in submitted_form.items()}

    payload = {**form_data, **query_data}
    _log_qnb_callback(
        "received",
        outcome=outcome,
        method=request.method,
        client_ip=client_ip,
        query_key_count=len(query_data),
        form_key_count=len(form_data),
        query_keys_preview=_preview_keys(query_data),
        form_keys_preview=_preview_keys(form_data),
        diagnostics=_qnb_payload_diagnostics(payload),
        three_ds=_qnb_3d_diagnostics(payload),
        has_cb_token=bool(payload.get("cb_token")),
    )
    base_url = str(request.base_url).rstrip("/")
    fallback_result_base_url = _default_result_base_url(base_url)
    callback_token = payload.get("cb_token", "")
    verified_callback_token = verify_payment_token(callback_token, expected_purpose="qnb_callback") if callback_token else None
    if not verified_callback_token:
        _log_qnb_callback(
            "rejected_invalid_token",
            outcome=outcome,
            diagnostics=_qnb_payload_diagnostics(payload),
            three_ds=_qnb_3d_diagnostics(payload),
        )
        return _frontend_redirect(f"{fallback_result_base_url}/purchase/result?status=failed")

    payment_id_value = payload.get("payment_id") or verified_callback_token.get("payment_id")
    order_id = payload.get("order_id") or extract_order_id(payload, base_url) or verified_callback_token.get("order_id")

    payment: Optional[Payment] = None
    if payment_id_value and str(payment_id_value).isdigit():
        payment = db.query(Payment).filter(Payment.id == int(payment_id_value)).first()
    if not payment and order_id:
        payment = db.query(Payment).filter(Payment.transaction_id == str(order_id)).first()

    if not payment:
        _log_qnb_callback(
            "rejected_payment_not_found",
            outcome=outcome,
            payment_id_value=payment_id_value,
            order_id=order_id,
            diagnostics=_qnb_payload_diagnostics(payload),
            three_ds=_qnb_3d_diagnostics(payload),
        )
        return _frontend_redirect(f"{fallback_result_base_url}/purchase/result?status=failed")

    verified_callback_token = verify_payment_token(
        callback_token,
        expected_purpose="qnb_callback",
        payment_id=payment.id,
        order_id=payment.transaction_id or "",
        user_id=payment.user_id,
    )
    if not verified_callback_token:
        _log_qnb_callback(
            "rejected_token_mismatch",
            outcome=outcome,
            payment_id=payment.id,
            order_id=payment.transaction_id,
            diagnostics=_qnb_payload_diagnostics(payload),
            three_ds=_qnb_3d_diagnostics(payload),
        )
        return _frontend_redirect(f"{fallback_result_base_url}/purchase/result?status=failed")

    slug = payload.get("slug") or verified_callback_token.get("slug") or f"course-{payment.course_id}"
    result_base_url = _normalize_public_base_url(verified_callback_token.get("result_base_url", "")) or fallback_result_base_url
    success = callback_is_success(payload, outcome, base_url)
    eci_auth_level = get_eci_auth_level(payload, base_url)
    if outcome == "success" and payload.get("Eci") and eci_auth_level not in {"full", "half"}:
        success = False

    _log_qnb_callback(
        "evaluated",
        outcome=outcome,
        payment_id=payment.id,
        order_id=payment.transaction_id,
        success=success,
        eci_auth_level=eci_auth_level,
        diagnostics=_qnb_payload_diagnostics(payload),
        three_ds=_qnb_3d_diagnostics(payload),
    )

    if success:
        _complete_payment(db, payment)
        _log_qnb_callback(
            "completed",
            outcome=outcome,
            payment_id=payment.id,
            order_id=payment.transaction_id,
            slug=slug,
        )
        return _frontend_redirect(_payment_result_url(result_base_url, slug, "success"))

    if payment.payment_status != "completed":
        payment.payment_status = "failed"
        payment.payment_date = datetime.utcnow()
        db.commit()

    failure_message = sanitize_external_message(
        payload.get("ErrMsg") or payload.get("mdErrorMsg") or payload.get("Response") or ""
    )
    _log_qnb_callback(
        "failed",
        outcome=outcome,
        payment_id=payment.id,
        order_id=payment.transaction_id,
        slug=slug,
        failure_message=failure_message,
        diagnostics=_qnb_payload_diagnostics(payload),
        three_ds=_qnb_3d_diagnostics(payload),
    )
    return _frontend_redirect(_payment_result_url(result_base_url, slug, "failed"))


@payments_router.post("/verify-payment/{payment_id}")
async def verify_payment(
    payment_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    client_ip = extract_client_ip(request)
    enforce_rate_limit(scope="payment-verify-ip", key=client_ip, max_attempts=60, window_seconds=300)
    enforce_rate_limit(
        scope="payment-verify-user",
        key=f"user:{current_user.id}",
        max_attempts=60,
        window_seconds=300,
    )

    payment = (
        db.query(Payment)
        .filter(Payment.id == payment_id, Payment.user_id == current_user.id)
        .first()
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Ödeme bulunamadı.")

    if payment.payment_status == "completed":
        return {"status": "completed", "message": "Ödeme tamamlandı."}
    if payment.payment_status == "failed":
        return {"status": "failed", "message": "Ödeme başarısız."}
    return {"status": "pending", "message": "Ödeme sonucu bekleniyor."}


@payments_router.get("/my-payments")
async def get_my_payments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payments = (
        db.query(Payment)
        .filter(Payment.user_id == current_user.id)
        .order_by(Payment.payment_date.desc())
        .all()
    )
    result = []
    for payment in payments:
        course = db.query(Course).filter(Course.id == payment.course_id).first()
        result.append(_serialize_payment(payment, course))
    return result


@payments_router.get("/payment/{payment_id}")
async def get_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payment = (
        db.query(Payment)
        .filter(Payment.id == payment_id, Payment.user_id == current_user.id)
        .first()
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Ödeme bulunamadı.")

    course = db.query(Course).filter(Course.id == payment.course_id).first()
    return _serialize_payment(payment, course)
