"""Read-only deployment check: python3 scripts/check_payment_routes.py [base_url]."""
import json
import sys
from urllib.request import urlopen


REQUIRED_ROUTES = {
    "/api/payments/create-payment": {"post"},
    "/api/payments/qnb/proxy/{session_id}": {"get", "post"},
    "/api/payments/school-courses/create-payment": {"post"},
    "/api/payments/school-courses/qnb/start/{purchase_id}": {"get"},
    "/api/payments/school-courses/qnb/callback/{outcome}": {"get", "post"},
}


def main():
    base_url = (sys.argv[1] if len(sys.argv) > 1 else "https://pay.mikrokurs.com").rstrip("/")
    with urlopen(f"{base_url}/openapi.json", timeout=20) as response:
        paths = json.load(response).get("paths", {})
    missing = []
    for path, methods in REQUIRED_ROUTES.items():
        for method in sorted(methods):
            present = method in paths.get(path, {})
            print(f"{'OK' if present else 'MISSING'} {method.upper()} {path}")
            if not present:
                missing.append((method, path))
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
