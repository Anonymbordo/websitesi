#!/usr/bin/env python3
"""
Reset an existing user's password in both Firebase Auth and the app database.

Usage:
    python backend/reset_user_password.py \
      --email user@example.com \
      --password "TempPass123!"
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Optional

try:
    import firebase_admin
    from firebase_admin import auth as firebase_auth
    from firebase_admin import credentials as firebase_creds
except Exception:
    firebase_admin = None
    firebase_auth = None
    firebase_creds = None

from dotenv import load_dotenv


def normalize_jsonish_env_value(value: str) -> str:
    result: list[str] = []
    in_string = False
    escape = False
    index = 0

    while index < len(value):
        char = value[index]

        if escape:
            result.append(char)
            escape = False
            index += 1
            continue

        if char == "\\":
            if index + 1 < len(value) and value[index + 1] == "n" and not in_string:
                result.append("\n")
                index += 2
                continue

            result.append(char)
            escape = True
            index += 1
            continue

        if char == '"':
            in_string = not in_string

        result.append(char)
        index += 1

    return "".join(result)


def load_problematic_env_line(env_path: Path, key: str) -> None:
    if os.getenv(key) or not env_path.exists():
        return

    prefix = f"{key}="
    for raw_line in env_path.read_text().splitlines():
        if not raw_line.startswith(prefix):
            continue

        value = raw_line[len(prefix):].strip()
        if value.startswith('"') and value.endswith('"') and len(value) >= 2:
            value = value[1:-1]

        if key == "FIREBASE_SERVICE_ACCOUNT":
            value = normalize_jsonish_env_value(value)

        os.environ[key] = value
        return


def load_runtime_env() -> None:
    root = Path(__file__).resolve().parent.parent
    env_candidates = [
        root / ".env",
        root / ".env.production",
        root / "websitesi" / ".env.production",
    ]

    for env_path in env_candidates:
        if env_path.exists():
            load_dotenv(env_path, override=False)
            load_problematic_env_line(env_path, "FIREBASE_SERVICE_ACCOUNT")


def hash_password(password: str) -> str:
    try:
        import bcrypt
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "bcrypt modulu bulunamadi. Script'i backend bagimliliklari kurulu ortamda calistirin."
        ) from exc

    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def normalize_firebase_phone(phone: Optional[str]) -> Optional[str]:
    if not phone:
        return None

    raw = phone.strip().replace(" ", "")
    if raw.startswith("+"):
        return raw

    digits = "".join(ch for ch in raw if ch.isdigit())
    if not digits:
        return None

    if digits.startswith("90") and len(digits) == 12:
        return f"+{digits}"
    if digits.startswith("0") and len(digits) == 11:
        return f"+90{digits[1:]}"
    if len(digits) == 10:
        return f"+90{digits}"

    return None


def init_firebase() -> None:
    if not firebase_admin or not firebase_auth or not firebase_creds:
        raise RuntimeError("firebase-admin kurulu degil.")

    if firebase_admin._apps:
        return

    service_account = os.getenv("FIREBASE_SERVICE_ACCOUNT")
    service_account_path = (
        os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
        or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    )

    if service_account:
        cred = firebase_creds.Certificate(json.loads(service_account))
    elif service_account_path:
        cred = firebase_creds.Certificate(service_account_path)
    else:
        raise RuntimeError(
            "Firebase service account bulunamadi. FIREBASE_SERVICE_ACCOUNT, "
            "FIREBASE_SERVICE_ACCOUNT_PATH veya GOOGLE_APPLICATION_CREDENTIALS tanimlayin."
        )

    firebase_admin.initialize_app(cred)


def reset_firebase_password(email: str, password: str, full_name: str, phone: Optional[str]) -> tuple[str, bool]:
    init_firebase()

    firebase_phone = normalize_firebase_phone(phone)

    try:
        user = firebase_auth.get_user_by_email(email)
        update_kwargs = {
            "email": email,
            "password": password,
            "display_name": full_name,
            "email_verified": True,
            "disabled": False,
        }
        if firebase_phone:
            update_kwargs["phone_number"] = firebase_phone
        user = firebase_auth.update_user(user.uid, **update_kwargs)
        return user.uid, False
    except Exception as exc:
        if exc.__class__.__name__ != "UserNotFoundError":
            raise

    create_kwargs = {
        "email": email,
        "password": password,
        "display_name": full_name,
        "email_verified": True,
        "disabled": False,
    }
    if firebase_phone:
        create_kwargs["phone_number"] = firebase_phone

    user = firebase_auth.create_user(**create_kwargs)
    return user.uid, True


def reset_db_password(email: str, password: str):
    from database import SessionLocal
    from models import User

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise RuntimeError(f"Kullanici bulunamadi: {email}")

        user.password_hash = hash_password(password)
        user.is_active = True
        user.is_verified = True
        db.commit()
        db.refresh(user)
        return user
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Mevcut kullanicinin sifresini Firebase ve DB tarafinda resetler."
    )
    parser.add_argument("--email", required=True, help="Kullanici e-postasi")
    parser.add_argument("--password", required=True, help="Gecici veya kalici sifre")
    return parser


def main() -> int:
    load_runtime_env()
    parser = build_parser()
    args = parser.parse_args()

    try:
        user = reset_db_password(args.email, args.password)
        firebase_uid, firebase_created = reset_firebase_password(
            email=user.email,
            password=args.password,
            full_name=user.full_name,
            phone=user.phone,
        )
    except Exception as exc:
        print(f"❌ Islem basarisiz: {exc}")
        return 1

    print("")
    print("✅ Sifre reset tamamlandi")
    print(f"DB user id: {user.id}")
    print(f"E-posta: {user.email}")
    print(f"Rol: {user.role}")
    print(f"Firebase UID: {firebase_uid}")
    print(f"Firebase: {'olusturuldu' if firebase_created else 'guncellendi'}")
    print("")
    print("Kullanici artik yeni sifresiyle giris yapabilir.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
