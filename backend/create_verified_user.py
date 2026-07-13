#!/usr/bin/env python3
"""
Manually create or update a verified user in both Firebase Auth and the app database.

Usage:
    python backend/create_verified_user.py \
      --email user@example.com \
      --password "TempPass123!" \
      --full-name "Kullanici Adi" \
      --phone 5551234567
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Optional

try:
    import firebase_admin
    from firebase_admin import auth as firebase_auth
    from firebase_admin import credentials as firebase_creds
except Exception:
    firebase_admin = None
    firebase_auth = None
    firebase_creds = None


def hash_password(password: str) -> str:
    try:
        import bcrypt
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "bcrypt modulu bulunamadi. Script'i backend bagimliliklari kurulu ortamda calistirin "
            "veya `pip install -r backend/requirements.txt` uygulayin."
        ) from exc

    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def normalize_db_phone(phone: Optional[str]) -> str:
    if not phone:
        return ""
    return phone.strip().replace(" ", "")


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

    raise ValueError("Telefon numarasi Firebase icin gecerli degil. Ornek: 5551234567 veya +905551234567")


def init_firebase() -> None:
    if not firebase_admin or not firebase_auth or not firebase_creds:
        raise RuntimeError("firebase-admin kurulu degil. Once `pip install firebase-admin` calistirin.")

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


def create_or_update_firebase_user(args: argparse.Namespace) -> tuple[object, bool]:
    init_firebase()

    firebase_phone = normalize_firebase_phone(args.phone)
    update_kwargs = {
        "email": args.email,
        "password": args.password,
        "display_name": args.full_name,
        "email_verified": True,
    }
    if firebase_phone:
        update_kwargs["phone_number"] = firebase_phone

    existing_user = None
    try:
        existing_user = firebase_auth.get_user_by_email(args.email)
    except Exception as exc:
        if exc.__class__.__name__ != "UserNotFoundError":
            raise

    if existing_user:
        user = firebase_auth.update_user(existing_user.uid, **update_kwargs)
        return user, False

    create_kwargs = dict(update_kwargs)
    user = firebase_auth.create_user(**create_kwargs)
    return user, True


def create_or_update_db_user(args: argparse.Namespace) -> tuple[User, bool]:
    from database import SessionLocal
    from models import Instructor, User

    db = SessionLocal()
    created = False

    try:
        phone = normalize_db_phone(args.phone)
        password_hash = hash_password(args.password)

        if phone:
            phone_owner = db.query(User).filter(User.phone == phone, User.email != args.email).first()
            if phone_owner:
                raise RuntimeError(f"Bu telefon zaten baska bir hesapta kullaniliyor: {phone_owner.email}")

        user = db.query(User).filter(User.email == args.email).first()
        if user:
            user.full_name = args.full_name
            user.password_hash = password_hash
            user.role = args.role
            user.is_active = True
            user.is_verified = True
            if args.city is not None:
                user.city = args.city
            if args.district is not None:
                user.district = args.district
            user.phone = phone
        else:
            user = User(
                email=args.email,
                phone=phone,
                password_hash=password_hash,
                full_name=args.full_name,
                role=args.role,
                is_active=True,
                is_verified=True,
                city=args.city,
                district=args.district,
            )
            db.add(user)
            db.flush()
            created = True

        if args.role == "instructor":
            instructor = db.query(Instructor).filter(Instructor.user_id == user.id).first()
            if not instructor:
                db.add(
                    Instructor(
                        user_id=user.id,
                        experience_years=0,
                        is_approved=False,
                    )
                )

        db.commit()
        db.refresh(user)
        return user, created
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Firebase ve veritabanina dogrulanmis kullanici ekler/gunceller."
    )
    parser.add_argument("--email", required=True, help="Kullanici e-postasi")
    parser.add_argument("--password", required=True, help="Gecici veya kalici sifre")
    parser.add_argument("--full-name", required=True, help="Ad soyad")
    parser.add_argument("--phone", required=True, help="Telefon. Ornek: 5551234567 veya +905551234567")
    parser.add_argument("--role", choices=["student", "instructor", "admin"], default="student")
    parser.add_argument("--city", default=None, help="Sehir")
    parser.add_argument("--district", default=None, help="Ilce")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    try:
        firebase_user, firebase_created = create_or_update_firebase_user(args)
        db_user, db_created = create_or_update_db_user(args)
    except Exception as exc:
        print(f"❌ Islem basarisiz: {exc}")
        return 1

    print("")
    print("✅ Islem tamamlandi")
    print(f"Firebase: {'olusturuldu' if firebase_created else 'guncellendi'}")
    print(f"Firebase UID: {firebase_user.uid}")
    print(f"Firebase emailVerified: {getattr(firebase_user, 'email_verified', True)}")
    print(f"Veritabani: {'olusturuldu' if db_created else 'guncellendi'}")
    print(f"DB user id: {db_user.id}")
    print(f"Rol: {db_user.role}")
    print(f"E-posta: {db_user.email}")
    print(f"Telefon: {db_user.phone or '-'}")
    print("")
    print("Bu kullanici artik e-posta dogrulama beklemeden giris yapabilir.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
