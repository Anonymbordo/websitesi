import os
import random
import string
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
import jwt
import requests
from decouple import config
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from twilio.rest import Client

from database import get_db
from models import User, OTPVerification
import json
try:
    import firebase_admin
    from firebase_admin import auth as firebase_auth, credentials as firebase_creds
except Exception:
    firebase_admin = None
    firebase_auth = None
    firebase_creds = None

# -----------------------------
# Router & Security
# -----------------------------
auth_router = APIRouter()
security = HTTPBearer()

# -----------------------------
# Config
# -----------------------------
SECRET_KEY = config("SECRET_KEY", default="your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

TWILIO_ACCOUNT_SID = config("TWILIO_ACCOUNT_SID", default="")
TWILIO_AUTH_TOKEN = config("TWILIO_AUTH_TOKEN", default="")
TWILIO_PHONE_NUMBER = config("TWILIO_PHONE_NUMBER", default="")
DEFAULT_COUNTRY_CODE = config("DEFAULT_COUNTRY_CODE", default="")

# Twilio client (opsiyonel)
twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN else None

# -----------------------------
# Utilities
# -----------------------------
def send_mailgun_email(to_email: str, subject: str, text: str):
    MAILGUN_DOMAIN = os.getenv("MAILGUN_DOMAIN")
    MAILGUN_API_KEY = os.getenv("MAILGUN_API_KEY")
    if not MAILGUN_DOMAIN or not MAILGUN_API_KEY:
        raise Exception("Mailgun yapılandırması eksik")
    return requests.post(
        f"https://api.mailgun.net/v3/{MAILGUN_DOMAIN}/messages",
        auth=("api", MAILGUN_API_KEY),
        data={
            "from": f"EğitimPlatformu <mailgun@{MAILGUN_DOMAIN}>",
            "to": [to_email],
            "subject": subject,
            "text": text,
        },
        timeout=15,
    )

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# Initialize Firebase Admin if service account provided
FIREBASE_SERVICE_ACCOUNT = os.getenv('FIREBASE_SERVICE_ACCOUNT')
FIREBASE_SERVICE_ACCOUNT_PATH = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH')
if firebase_admin and (FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH):
    try:
        if FIREBASE_SERVICE_ACCOUNT:
            cred_dict = json.loads(FIREBASE_SERVICE_ACCOUNT)
            cred = firebase_creds.Certificate(cred_dict)
        else:
            cred = firebase_creds.Certificate(FIREBASE_SERVICE_ACCOUNT_PATH)
        firebase_admin.initialize_app(cred)
    except Exception as e:
        print(f"Failed to initialize Firebase Admin: {e}")

def generate_otp() -> str:
    return "".join(random.choices(string.digits, k=6))

# -----------------------------
# Schemas
# -----------------------------
class UserCreate(BaseModel):
    email: EmailStr
    phone: str
    password: str
    full_name: str
    city: Optional[str] = None
    district: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class OTPRequest(BaseModel):
    phone: str

class OTPVerify(BaseModel):
    phone: str
    otp_code: str

class UserResponse(BaseModel):
    id: int
    email: str
    phone: str
    full_name: str
    role: str
    is_active: bool
    is_verified: bool
    city: Optional[str]
    district: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True  # Pydantic v2

# -----------------------------
# Auth dependencies
# -----------------------------
async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db),
):
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            return None
        return db.query(User).filter(User.id == int(user_id)).first()
    except jwt.PyJWTError:
        return None

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

async def verify_admin(
    current_user: User = Depends(get_current_user)
):
    """
    Sadece admin kullanıcılar için erişim kontrolü
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu işlem için admin yetkisi gereklidir"
        )
    return current_user

# -----------------------------
# Routes
# -----------------------------
@auth_router.post("/send-otp")
async def send_otp(otp_request: OTPRequest, db: Session = Depends(get_db)):
    # OTP üret
    otp_code = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=5)

    # DB kaydet
    otp_record = OTPVerification(
        phone=otp_request.phone,
        otp_code=otp_code,
        expires_at=expires_at,
    )
    db.add(otp_record)
    db.commit()

    if twilio_client and TWILIO_PHONE_NUMBER:
        # Normalize phone to E.164 if default country code is provided
        to_number = otp_request.phone.strip()
        if not to_number.startswith("+") and DEFAULT_COUNTRY_CODE:
            # ensure DEFAULT_COUNTRY_CODE starts with +
            cc = DEFAULT_COUNTRY_CODE if DEFAULT_COUNTRY_CODE.startswith("+") else f"+{DEFAULT_COUNTRY_CODE}"
            to_number = f"{cc}{to_number}"

        try:
            message = twilio_client.messages.create(
                body=f"Eğitim Platformu doğrulama kodunuz: {otp_code}",
                from_=TWILIO_PHONE_NUMBER,
                to=to_number,
            )
            return {"message": "OTP sent successfully", "sid": message.sid}
        except Exception as e:
                # Log and optionally fallback for development
                print(f"Twilio send error: {e}")
                # DEV_SMS_FALLBACK env var allows returning OTP on Twilio failure for local testing.
                dev_fallback = os.getenv("DEV_SMS_FALLBACK", "true").lower() in ("1", "true", "yes")
                if dev_fallback:
                    return {"message": "OTP generated (twilio failed, fallback)", "otp": otp_code, "error": str(e)}
                else:
                    raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Failed to send SMS via Twilio: {e}")

    # If Twilio not configured, return OTP for development/testing
    return {"message": "OTP generated (development mode)", "otp": otp_code}

@auth_router.post("/verify-otp")
async def verify_otp(otp_verify: OTPVerify, db: Session = Depends(get_db)):
    otp_record = (
        db.query(OTPVerification)
        .filter(
            OTPVerification.phone == otp_verify.phone,
            OTPVerification.otp_code == otp_verify.otp_code,
            OTPVerification.is_verified == False,
            OTPVerification.expires_at > datetime.utcnow(),
        )
        .first()
    )
    if not otp_record:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP")

    otp_record.is_verified = True
    db.commit()
    return {"message": "OTP verified successfully"}

@auth_router.post("/register", response_model=UserResponse)
async def register(user_create: UserCreate, db: Session = Depends(get_db)):
    # Kullanıcı var mı?
    existing_user = (
        db.query(User)
        .filter((User.email == user_create.email) | (User.phone == user_create.phone))
        .first()
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email or phone already exists",
        )

    # Telefon doğrulanmış mı?
    verified_otp = (
        db.query(OTPVerification)
        .filter(OTPVerification.phone == user_create.phone, OTPVerification.is_verified == True)
        .first()
    )
    if not verified_otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number not verified. Please verify OTP first.",
        )

    # Kullanıcı oluştur
    hashed_password = hash_password(user_create.password)
    user = User(
        email=user_create.email,
        phone=user_create.phone,
        password_hash=hashed_password,
        full_name=user_create.full_name,
        city=user_create.city,
        district=user_create.district,
        is_verified=True,  # OTP ile doğrulandı
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Firebase'e de ekle (varsa)
    if firebase_auth:
        try:
            firebase_user = firebase_auth.create_user(
                email=user.email,
                password=user_create.password,
                display_name=user.full_name,
                phone_number=user.phone if user.phone.startswith('+') else f'+90{user.phone}',
                email_verified=True
            )
            print(f"✅ Firebase kullanıcısı oluşturuldu: {firebase_user.uid}")
        except Exception as e:
            # Firebase hatası kayıt işlemini engellemez
            print(f"⚠️ Firebase kullanıcı oluşturma hatası: {e}")

    # Hoş geldin e-postası
    try:
        send_mailgun_email(
            user.email,
            "EğitimPlatformu'na Hoş Geldiniz!",
            f"Merhaba {user.full_name},\n\nEğitimPlatformu'na kaydınız başarıyla tamamlandı. Hemen giriş yaparak öğrenmeye başlayabilirsiniz!",
        )
    except Exception as e:
        # Prod'da logla; kullanıcıya hatayı göstermiyoruz
        print(f"Mailgun e-posta gönderimi başarısız: {e}")

    # Pydantic v2: from_orm yerine model_validate
    return UserResponse.model_validate(user)


@auth_router.post('/register-firebase', response_model=UserResponse)
async def register_firebase(payload: dict, db: Session = Depends(get_db)):
    """Register user using Firebase ID token. Expects payload: { id_token, full_name, phone, city?, district? }"""
    if not firebase_auth:
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail='Firebase Admin not configured')

    id_token = payload.get('id_token')
    if not id_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Missing id_token')

    try:
        decoded = firebase_auth.verify_id_token(id_token)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f'Invalid Firebase token: {e}')

    if not decoded.get('email_verified'):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Email not verified in Firebase')

    email = decoded.get('email')
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Firebase token has no email')

    # Check existing
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        # Return existing user (or error) — we'll return token for login
        access_token = create_access_token({'sub': str(existing_user.id)}, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
        return {"access_token": access_token, "token_type": "bearer", "user": UserResponse.model_validate(existing_user)}

    # Create new user
    full_name = payload.get('full_name') or decoded.get('name') or ''
    phone = payload.get('phone') or decoded.get('phone_number') or ''

    user = User(
        email=email,
        phone=phone,
        password_hash='',
        full_name=full_name,
        is_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token({'sub': str(user.id)}, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    return {"access_token": access_token, "token_type": "bearer", "user": UserResponse.model_validate(user)}

@auth_router.post('/login-firebase')
async def login_firebase(payload: dict, db: Session = Depends(get_db)):
    """Login using Firebase ID token. Expects payload: { id_token }"""
    if not firebase_auth:
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail='Firebase Admin not configured')

    id_token = payload.get('id_token')
    if not id_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Missing id_token')

    try:
        decoded = firebase_auth.verify_id_token(id_token)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f'Invalid Firebase token: {e}')

    email = decoded.get('email')
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Email not found in token')

    # Kullanıcıyı veritabanında bul
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='User not found. Please register first.')

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Account is deactivated')

    # JWT token oluştur
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": str(user.id)}, expires_delta=access_token_expires)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(user),
    }

@auth_router.post("/login")
async def login(user_login: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_login.email).first()
    if not user or not verify_password(user_login.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account is deactivated")

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": str(user.id)}, expires_delta=access_token_expires)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(user),
    }

@auth_router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)

@auth_router.put("/profile", response_model=UserResponse)
async def update_profile(
    full_name: Optional[str] = None,
    city: Optional[str] = None,
    district: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if full_name is not None:
        current_user.full_name = full_name
    if city is not None:
        current_user.city = city
    if district is not None:
        current_user.district = district

    current_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)
