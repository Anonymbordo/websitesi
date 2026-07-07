import base64
import hashlib
import json
import re
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Any
from urllib.parse import urlencode

from decouple import config
import httpx


DEFAULT_FIELD_MAP = {
    "mbr_id": "MbrId",
    "merchant_id": "MerchantID",
    "user_code": "UserCode",
    "user_password": "UserPass",
    "order_id": "OrderId",
    "amount": "PurchAmount",
    "currency": "Currency",
    "ok_url": "OkUrl",
    "fail_url": "FailUrl",
    "lang": "Lang",
    "secure_type": "SecureType",
    "txn_type": "TxnType",
    "installment_count": "InstallmentCount",
    "rnd": "Rnd",
    "hash": "Hash",
}

QNB_OPERATION_SUCCESS_CODES = {"00"}

DEFAULT_ORDER_ID_KEYS = ["OrderId", "MrcOrderId", "MerchantOrderId", "oid"]
DEFAULT_REFERENCE_KEYS = ["AuthCode", "TransId", "TransactionId", "HostRefNum"]
DEFAULT_SUCCESS_MATCH = {"ProcReturnCode": "00"}
DEFAULT_ECI_AUTH_LEVELS = {
    "05": "full",
    "02": "full",
    "06": "half",
    "01": "half",
}


def _load_json_env(name: str, default: Any) -> Any:
    raw_value = config(name, default="")
    if not raw_value:
        return default
    try:
        parsed = json.loads(raw_value)
    except json.JSONDecodeError:
        return default
    return parsed if isinstance(parsed, type(default)) else default


def _bool_env(name: str, default: bool = False) -> bool:
    return config(name, default=str(default)).strip().lower() in {"1", "true", "yes", "on"}


def _normalize_phone(phone: str | None) -> str:
    digits = "".join(ch for ch in (phone or "") if ch.isdigit())
    if digits.startswith("90"):
        return digits
    if digits.startswith("0"):
        return f"9{digits}"
    return f"90{digits}" if digits else ""


def _format_amount(amount: float | Decimal) -> str:
    quantized = Decimal(str(amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return format(quantized, "f")


def _join_base_url(base_url: str, path: str) -> str:
    return f"{base_url.rstrip('/')}/{path.lstrip('/')}"


def _current_dotnet_ticks() -> int:
    # QNB docs/examples use a DateTime.Now.Ticks-style numeric rnd value.
    delta = datetime.utcnow() - datetime(1, 1, 1)
    return ((delta.days * 24 * 60 * 60 + delta.seconds) * 10_000_000) + (delta.microseconds * 10)


def _generate_rnd() -> str:
    return str(_current_dotnet_ticks())


def _encode_hash(
    raw_value: str,
    *,
    algorithm: str,
    output_encoding: str,
    input_encoding: str,
    uppercase: bool,
) -> str:
    digest = hashlib.new(algorithm)
    digest.update(raw_value.encode(input_encoding, errors="ignore"))

    normalized_output_encoding = output_encoding.strip().lower()
    if normalized_output_encoding == "base64":
        hash_value = base64.b64encode(digest.digest()).decode("ascii")
    else:
        hash_value = digest.hexdigest()

    return hash_value.upper() if uppercase else hash_value


def _replace_template_placeholders(template: str, logical_fields: dict[str, str], actual_fields: dict[str, str]) -> str:
    def _replacement(match: re.Match[str]) -> str:
        key = match.group(1)
        if key in logical_fields:
            return logical_fields[key]
        return actual_fields.get(key, "")

    return re.sub(r"\{([a-zA-Z0-9_]+)\}", _replacement, template)


def get_qnb_config(base_url: str) -> dict[str, Any]:
    field_map = _load_json_env("QNB_FIELD_MAP_JSON", DEFAULT_FIELD_MAP)
    extra_fields = _load_json_env("QNB_EXTRA_FIELDS_JSON", {})
    order_id_keys = _load_json_env("QNB_ORDER_ID_KEYS_JSON", DEFAULT_ORDER_ID_KEYS)
    reference_keys = _load_json_env("QNB_REFERENCE_KEYS_JSON", DEFAULT_REFERENCE_KEYS)
    success_match = _load_json_env("QNB_SUCCESS_MATCH_JSON", DEFAULT_SUCCESS_MATCH)
    eci_auth_levels = _load_json_env("QNB_ECI_AUTH_LEVELS_JSON", DEFAULT_ECI_AUTH_LEVELS)

    gateway_url = config("QNB_GATEWAY_URL", default="https://vpos.qnb.com.tr/Gateway/3DHost.aspx").strip()
    callback_base = config("PAYMENT_BASE_URL", default=base_url).strip() or base_url

    required_values = {
        "QNB_GATEWAY_URL": gateway_url,
        "QNB_MBR_ID": config("QNB_MBR_ID", default="5").strip(),
        "QNB_MERCHANT_ID": config("QNB_MERCHANT_ID", default="").strip(),
        "QNB_USER_CODE": config("QNB_USER_CODE", default="").strip(),
        "QNB_USER_PASSWORD": config("QNB_USER_PASSWORD", default="").strip(),
        "QNB_MERCHANT_PASS": config("QNB_MERCHANT_PASS", default="").strip(),
    }

    missing_fields = [name for name, value in required_values.items() if not value]

    return {
        "gateway_url": gateway_url,
        "mbr_id": required_values["QNB_MBR_ID"],
        "merchant_id": required_values["QNB_MERCHANT_ID"],
        "terminal_id": config("QNB_TERMINAL_ID", default="").strip(),
        "user_code": required_values["QNB_USER_CODE"],
        "user_password": required_values["QNB_USER_PASSWORD"],
        "merchant_pass": required_values["QNB_MERCHANT_PASS"],
        "field_map": field_map,
        "extra_fields": extra_fields,
        "secure_type": config("QNB_SECURE_TYPE", default="3DHost").strip(),
        "txn_type": config("QNB_TXN_TYPE", default="Auth").strip(),
        "currency_code": config("QNB_CURRENCY_CODE", default="949").strip(),
        "language": (config("QNB_LANGUAGE", default="TR").strip() or "TR").upper(),
        "installment_count": config("QNB_INSTALLMENT_COUNT", default="0").strip(),
        "hash_field": config("QNB_HASH_FIELD", default="Hash").strip(),
        "hash_template": config(
            "QNB_HASH_TEMPLATE",
            default="{mbr_id}{mrc_order_id}{amount}{ok_url}{fail_url}{txn_type}{installment_count}{rnd}{merchant_pass}",
        ).strip(),
        "hash_algorithm": config("QNB_HASH_ALGORITHM", default="sha1").strip().lower(),
        "hash_output_encoding": config("QNB_HASH_OUTPUT_ENCODING", default="base64").strip().lower(),
        "hash_input_encoding": config("QNB_HASH_INPUT_ENCODING", default="ascii").strip().lower(),
        "hash_uppercase": _bool_env("QNB_HASH_UPPERCASE", default=False),
        "success_match": success_match,
        "eci_auth_levels": eci_auth_levels,
        "order_id_keys": order_id_keys,
        "reference_keys": reference_keys,
        "success_url": _join_base_url(callback_base, "/api/payments/qnb/callback/success"),
        "failure_url": _join_base_url(callback_base, "/api/payments/qnb/callback/fail"),
        "missing_fields": missing_fields,
    }


def get_qnb_operation_gateway_url(base_url: str) -> str:
    configured_value = config("QNB_OPERATION_GATEWAY_URL", default="").strip()
    if configured_value:
        return configured_value

    gateway_url = get_qnb_config(base_url).get("gateway_url", "").strip()
    if gateway_url.endswith("/3DHost.aspx"):
        return gateway_url[: -len("/3DHost.aspx")] + "/Default.aspx"
    if gateway_url.endswith("3DHost.aspx"):
        return gateway_url.replace("3DHost.aspx", "Default.aspx")
    return "https://vpos.qnb.com.tr/Gateway/Default.aspx"


def build_qnb_gateway_payload(
    *,
    base_url: str,
    payment_id: int,
    order_id: str,
    amount: float,
    slug: str,
    course_title: str,
    full_name: str,
    email: str,
    phone: str | None,
    callback_params: dict[str, str] | None = None,
) -> dict[str, Any]:
    config_data = get_qnb_config(base_url)
    if config_data["missing_fields"]:
        return {
            "ready": False,
            "missing_fields": config_data["missing_fields"],
            "gateway_url": config_data["gateway_url"],
        }

    shared_callback_params = {
        "payment_id": str(payment_id),
        "order_id": order_id,
        "slug": slug,
    }
    if callback_params:
        shared_callback_params.update({key: str(value) for key, value in callback_params.items() if value is not None})

    success_query = urlencode(shared_callback_params)
    failure_query = urlencode(shared_callback_params)

    logical_fields = {
        "mbr_id": config_data["mbr_id"],
        "merchant_id": config_data["merchant_id"],
        "terminal_id": config_data["terminal_id"],
        "user_code": config_data["user_code"],
        "user_password": config_data["user_password"],
        "merchant_pass": config_data["merchant_pass"],
        "order_id": order_id,
        "mrc_order_id": order_id,
        "amount": _format_amount(amount),
        "currency": config_data["currency_code"],
        "ok_url": f"{config_data['success_url']}?{success_query}",
        "fail_url": f"{config_data['failure_url']}?{failure_query}",
        "lang": config_data["language"],
        "secure_type": config_data["secure_type"],
        "txn_type": config_data["txn_type"],
        "installment_count": config_data["installment_count"],
        "rnd": _generate_rnd(),
        "course_title": course_title,
        "slug": slug,
        "customer_name": full_name,
        "customer_email": email,
        "customer_phone": _normalize_phone(phone),
    }

    form_fields: dict[str, str] = {}
    for logical_key, actual_key in config_data["field_map"].items():
        value = logical_fields.get(logical_key, "")
        if value is not None and value != "":
            form_fields[str(actual_key)] = str(value)

    for key, value in config_data["extra_fields"].items():
        if value is not None and value != "":
            form_fields[str(key)] = str(value)

    hash_field = config_data["hash_field"]
    hash_template = config_data["hash_template"]
    if hash_field and hash_template:
        hash_source = _replace_template_placeholders(hash_template, logical_fields, form_fields)
        hash_value = _encode_hash(
            hash_source,
            algorithm=config_data["hash_algorithm"],
            output_encoding=config_data["hash_output_encoding"],
            input_encoding=config_data["hash_input_encoding"],
            uppercase=config_data["hash_uppercase"],
        )
        form_fields[hash_field] = hash_value

    return {
        "ready": True,
        "gateway_url": config_data["gateway_url"],
        "form_fields": form_fields,
        "order_id": order_id,
        "success_url": logical_fields["ok_url"],
        "failure_url": logical_fields["fail_url"],
    }


def start_qnb_3dhost_session(
    *,
    gateway_url: str,
    form_fields: dict[str, str],
    timeout_seconds: float = 30.0,
) -> dict[str, Any]:
    with httpx.Client(timeout=timeout_seconds, follow_redirects=True) as client:
        response = client.post(
            gateway_url,
            data=form_fields,
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "User-Agent": "Mikrokurs-Payment-Service/1.0",
            },
        )

    content_type = response.headers.get("content-type", "")
    return {
        "status_code": response.status_code,
        "content_type": content_type,
        "body": response.text or "",
        "final_url": str(response.url),
        "is_html": "html" in content_type.lower() or "<html" in (response.text or "").lower(),
    }


def build_qnb_operation_payload(
    *,
    base_url: str,
    txn_type: str,
    order_id: str,
    amount: float | Decimal | None = None,
) -> dict[str, str]:
    config_data = get_qnb_config(base_url)
    if config_data["missing_fields"]:
        missing = ", ".join(config_data["missing_fields"])
        raise ValueError(f"QNB configuration missing fields: {missing}")

    payload = {
        "MbrId": str(config_data["mbr_id"]),
        "MerchantID": str(config_data["merchant_id"]),
        "UserCode": str(config_data["user_code"]),
        "UserPass": str(config_data["user_password"]),
        "OrderId": str(order_id),
        "SecureType": "NonSecure",
        "TxnType": str(txn_type),
        "Currency": str(config_data["currency_code"] or "949"),
        "Lang": str(config_data["language"] or "TR").upper(),
    }
    if txn_type.lower() == "refund":
        if amount is None:
            raise ValueError("Refund operation requires amount.")
        payload["PurchAmount"] = _format_amount(amount)
    return payload


def parse_qnb_operation_response(raw_response: str) -> dict[str, str]:
    parsed: dict[str, str] = {}
    for chunk in (raw_response or "").split(";;"):
        if "=" not in chunk:
            continue
        key, value = chunk.split("=", 1)
        parsed[key.strip()] = value.strip()
    return parsed


def qnb_operation_is_success(parsed_response: dict[str, str]) -> bool:
    proc_return_code = str(parsed_response.get("ProcReturnCode") or "").strip()
    txn_result = str(parsed_response.get("TxnResult") or "").strip().lower()
    txn_status = str(parsed_response.get("TxnStatus") or "").strip().lower()

    if proc_return_code in QNB_OPERATION_SUCCESS_CODES:
        return True
    if txn_result in {"success", "approved"}:
        return True
    if txn_status in {"y", "success"}:
        return True
    return False


def execute_qnb_operation(
    *,
    base_url: str,
    txn_type: str,
    order_id: str,
    amount: float | Decimal | None = None,
    timeout_seconds: float = 30.0,
) -> dict[str, Any]:
    gateway_url = get_qnb_operation_gateway_url(base_url)
    payload = build_qnb_operation_payload(
        base_url=base_url,
        txn_type=txn_type,
        order_id=order_id,
        amount=amount,
    )

    with httpx.Client(timeout=timeout_seconds, follow_redirects=True) as client:
        response = client.post(
            gateway_url,
            data=payload,
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "text/plain, text/html, */*",
            },
        )
        response.raise_for_status()

    raw_response = response.text or ""
    parsed_response = parse_qnb_operation_response(raw_response)
    return {
        "success": qnb_operation_is_success(parsed_response),
        "gateway_url": gateway_url,
        "request_payload": payload,
        "status_code": response.status_code,
        "raw_response": raw_response[:16000],
        "parsed_response": parsed_response,
    }


def extract_order_id(payload: dict[str, Any], base_url: str = "") -> str | None:
    config_data = get_qnb_config(base_url or "http://localhost")
    for key in config_data["order_id_keys"]:
        value = payload.get(key)
        if value:
            return str(value)
    return None


def extract_reference(payload: dict[str, Any], base_url: str = "") -> str | None:
    config_data = get_qnb_config(base_url or "http://localhost")
    for key in config_data["reference_keys"]:
        value = payload.get(key)
        if value:
            return str(value)
    return None


def callback_is_success(payload: dict[str, Any], outcome: str, base_url: str = "") -> bool:
    if outcome != "success":
        return False

    config_data = get_qnb_config(base_url or "http://localhost")
    success_match = config_data["success_match"]
    if not success_match:
        return True

    matched_any_key = False
    for key, expected_value in success_match.items():
        if key not in payload:
            continue
        matched_any_key = True
        if str(payload.get(key)) != str(expected_value):
            return False

    return True if matched_any_key else True


def get_eci_auth_level(payload: dict[str, Any], base_url: str = "") -> str | None:
    config_data = get_qnb_config(base_url or "http://localhost")
    eci_value = payload.get("Eci") or payload.get("ECI") or payload.get("eci")
    if not eci_value:
        return None
    return config_data["eci_auth_levels"].get(str(eci_value))
