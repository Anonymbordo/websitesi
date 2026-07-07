import argparse
import os
import sys
from pathlib import Path


CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.append(str(CURRENT_DIR))

from payment_gateway_qnb import build_qnb_gateway_payload, get_qnb_config  # noqa: E402


def _mask(value: str, *, secret: bool = False) -> str:
    if not value:
        return "<missing>"
    if secret:
        return f"<set:{len(value)}>"
    return value


def _mask_partial(value: str, *, keep: int = 4) -> str:
    if not value:
        return "<missing>"
    if len(value) <= keep * 2:
        return f"{value[:keep]}...{value[-keep:]}"
    return f"{value[:keep]}...{value[-keep:]}"


def _strip_optional_quotes(value: str) -> str:
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
        return value[1:-1]
    return value


def _load_env_file(env_path: Path) -> None:
    for raw_line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        if not key or key in os.environ:
            continue

        os.environ[key] = _strip_optional_quotes(value.strip())


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate QNB 3D Host payment configuration.")
    parser.add_argument(
        "--env-file",
        default="",
        help="Optional dotenv file to load before validation, for example backend/.env.qnb-test",
    )
    parser.add_argument(
        "--base-url",
        default="http://localhost:8000",
        help="Public backend base URL used to build callback addresses.",
    )
    parser.add_argument("--payment-id", type=int, default=99999, help="Sample payment id for payload preview.")
    parser.add_argument("--order-id", default="QNB-DEBUG-ORDER", help="Sample order id for payload preview.")
    parser.add_argument("--amount", type=float, default=1.0, help="Sample amount for payload preview.")
    parser.add_argument("--slug", default="debug-slug", help="Sample slug for payload preview.")
    parser.add_argument("--course-title", default="Debug Kurs", help="Sample course title for payload preview.")
    parser.add_argument("--full-name", default="Debug User", help="Sample full name for payload preview.")
    parser.add_argument("--email", default="debug@example.com", help="Sample email for payload preview.")
    parser.add_argument("--phone", default="05330000000", help="Sample phone for payload preview.")
    args = parser.parse_args()

    if args.env_file:
        env_path = Path(args.env_file).expanduser()
        if not env_path.is_file():
            print(f"ENV_FILE_NOT_FOUND={env_path}")
            return 2
        _load_env_file(env_path)

    config_data = get_qnb_config(args.base_url.rstrip("/"))
    payment_base_url = os.getenv("PAYMENT_BASE_URL", "").strip()
    payment_frontend_base_url = os.getenv("PAYMENT_FRONTEND_BASE_URL", "").strip()
    payment_security_secret = os.getenv("PAYMENT_SECURITY_SECRET", "").strip()

    print(f"READY={'yes' if not config_data['missing_fields'] else 'no'}")
    print(f"GATEWAY_URL={_mask(config_data['gateway_url'])}")
    print(f"SECURE_TYPE={_mask(config_data['secure_type'])}")
    print(f"TXN_TYPE={_mask(config_data['txn_type'])}")
    print(f"CURRENCY_CODE={_mask(config_data['currency_code'])}")
    print(f"LANGUAGE={_mask(config_data['language'])}")
    print(f"INSTALLMENT_COUNT={_mask(config_data['installment_count'])}")
    print(f"HASH_TEMPLATE={_mask(config_data['hash_template'])}")
    print(f"CONFIGURED_HASH_TEMPLATE={_mask(config_data.get('configured_hash_template', ''))}")
    print(f"HASH_ALGORITHM={_mask(config_data['hash_algorithm'])}")
    print(f"HASH_OUTPUT_ENCODING={_mask(config_data['hash_output_encoding'])}")
    print(f"HASH_INPUT_ENCODING={_mask(config_data['hash_input_encoding'])}")
    print(f"QNB_MBR_ID={_mask(config_data['mbr_id'])}")
    print(f"QNB_MERCHANT_ID={_mask(config_data['merchant_id'])}")
    print(f"QNB_USER_CODE={_mask(config_data['user_code'])}")
    print(f"QNB_USER_PASSWORD={_mask(config_data['user_password'], secret=True)}")
    print(f"QNB_MERCHANT_PASS={_mask(config_data['merchant_pass'], secret=True)}")
    print(f"PAYMENT_BASE_URL={_mask(payment_base_url)}")
    print(f"PAYMENT_FRONTEND_BASE_URL={_mask(payment_frontend_base_url)}")
    print(f"PAYMENT_SECURITY_SECRET={_mask(payment_security_secret, secret=True)}")
    print(f"SUCCESS_URL={config_data['success_url']}")
    print(f"FAILURE_URL={config_data['failure_url']}")

    preview_payload = build_qnb_gateway_payload(
        base_url=args.base_url.rstrip("/"),
        payment_id=args.payment_id,
        order_id=args.order_id,
        amount=args.amount,
        slug=args.slug,
        course_title=args.course_title,
        full_name=args.full_name,
        email=args.email,
        phone=args.phone,
    )
    preview_fields = preview_payload.get("form_fields", {})
    if preview_payload.get("ready"):
        print(f"SAMPLE_FIELD_MbrId={_mask(preview_fields.get('MbrId', ''))}")
        print(f"SAMPLE_FIELD_MerchantID={_mask(preview_fields.get('MerchantID', ''))}")
        print(f"SAMPLE_FIELD_UserCode={_mask(preview_fields.get('UserCode', ''))}")
        print(f"SAMPLE_FIELD_OrderId={_mask(preview_fields.get('OrderId', ''))}")
        print(f"SAMPLE_FIELD_MrcOrderId={_mask(preview_fields.get('MrcOrderId', ''))}")
        print(f"SAMPLE_FIELD_PurchAmount={_mask(preview_fields.get('PurchAmount', ''))}")
        print(f"SAMPLE_FIELD_Lang={_mask(preview_fields.get('Lang', ''))}")
        print(f"SAMPLE_FIELD_InstallmentCount={_mask(preview_fields.get('InstallmentCount', ''))}")
        print(f"SAMPLE_FIELD_Rnd={_mask(preview_fields.get('Rnd', ''))}")
        print(f"SAMPLE_FIELD_Hash={_mask(preview_fields.get('Hash', ''), secret=True)}")
        print(f"SAMPLE_OK_URL={_mask_partial(preview_payload.get('success_url', ''), keep=20)}")
        print(f"SAMPLE_FAIL_URL={_mask_partial(preview_payload.get('failure_url', ''), keep=20)}")

    if config_data["missing_fields"]:
        print(f"MISSING_FIELDS={','.join(config_data['missing_fields'])}")

    warnings: list[str] = []
    if "vpos.qnb.com.tr/Gateway/3DHost.aspx" in config_data["gateway_url"]:
        warnings.append("QNB_GATEWAY_URL currently points to live environment; use vpostest endpoint for test payments.")
    if not payment_base_url:
        warnings.append("PAYMENT_BASE_URL missing; bank callback should use public backend domain in production/test.")
    if not payment_frontend_base_url:
        warnings.append("PAYMENT_FRONTEND_BASE_URL missing; result page will fall back to backend domain.")
    if not payment_security_secret:
        warnings.append("PAYMENT_SECURITY_SECRET missing; code will fall back to SECRET_KEY.")
    if not str(args.base_url).startswith("http"):
        warnings.append("base_url should be a full URL.")

    for warning in warnings:
        print(f"WARNING={warning}")

    return 0 if not config_data["missing_fields"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
