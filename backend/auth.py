import os
import random
import string
import io
import uuid
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
# Use jose.jwt instead of jwt to match requirements.txt (python-jose)
from jose import jwt, JWTError
import requests
from decouple import config
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from twilio.rest import Client
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from database import get_db
from models import User, OTPVerification
from s3_utils import upload_file_to_s3
from firebase_config import init_firebase, upload_file_to_firebase
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
SECRET_KEY = os.getenv("SECRET_KEY") or config("SECRET_KEY", default="your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID") or config("TWILIO_ACCOUNT_SID", default="")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN") or config("TWILIO_AUTH_TOKEN", default="")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER") or config("TWILIO_PHONE_NUMBER", default="")
DEFAULT_COUNTRY_CODE = os.getenv("DEFAULT_COUNTRY_CODE") or config("DEFAULT_COUNTRY_CODE", default="")

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

def send_smtp_email(to_email: str, subject: str, body: str):
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")

    if not smtp_user or not smtp_password:
        print(f"SMTP not configured. Email to {to_email}: {subject}\n{body}")
        return

    try:
        msg = MIMEMultipart()
        msg['From'] = smtp_user
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_password)
        text = msg.as_string()
        server.sendmail(smtp_user, to_email, text)
        server.quit()
    except Exception as e:
        print(f"SMTP Error: {e}")
        # Don't raise, just log, so we can fallback or continue

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
    phone: Optional[str] = None
    password: str
    full_name: str
    city: Optional[str] = None
    district: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class OTPRequest(BaseModel):
    phone: Optional[str] = None
    email: Optional[EmailStr] = None

class OTPVerify(BaseModel):
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
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
    profile_image: Optional[str] = None
    created_at: Optional[datetime]

    class Config:
        from_attributes = True  # Pydantic v2

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    profile_image: Optional[str] = None

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

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
    except JWTError:
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
    except JWTError:
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

# Alias for admin_required (used in routers)
admin_required = verify_admin

def require_role(roles: list):
    """
    Decorator for requiring specific roles
    """
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Bu işlem için {', '.join(roles)} yetkisi gereklidir"
            )
        return current_user
    return role_checker

# -----------------------------
# Routes
# -----------------------------
@auth_router.post("/send-otp")
async def send_otp(otp_request: OTPRequest, db: Session = Depends(get_db)):
    if not otp_request.phone and not otp_request.email:
        raise HTTPException(status_code=400, detail="Phone or Email required")

    # OTP üret
    otp_code = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=5)

    # DB kaydet
    otp_record = OTPVerification(
        phone=otp_request.phone,
        email=otp_request.email,
        otp_code=otp_code,
        expires_at=expires_at,
    )
    db.add(otp_record)
    db.commit()

    # Email OTP
    if otp_request.email:
        try:
            # Try Mailgun first if configured
            if os.getenv("MAILGUN_API_KEY"):
                send_mailgun_email(otp_request.email, "Doğrulama Kodu", f"Kodunuz: {otp_code}")
            else:
                send_smtp_email(otp_request.email, "Doğrulama Kodu", f"Eğitim Platformu doğrulama kodunuz: {otp_code}")
            return {"message": "OTP sent to email"}
        except Exception as e:
            print(f"Email send error: {e}")
            # Fallback for dev
            return {"message": "OTP generated (email failed)", "otp": otp_code}

    # Phone OTP
    if otp_request.phone and twilio_client and TWILIO_PHONE_NUMBER:
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
    query = db.query(OTPVerification).filter(
        OTPVerification.otp_code == otp_verify.otp_code,
        OTPVerification.is_verified == False,
        OTPVerification.expires_at > datetime.utcnow(),
    )
    
    if otp_verify.email:
        query = query.filter(OTPVerification.email == otp_verify.email)
    elif otp_verify.phone:
        query = query.filter(OTPVerification.phone == otp_verify.phone)
    else:
        raise HTTPException(status_code=400, detail="Phone or Email required")

    otp_record = query.first()
    if not otp_record:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP")

    otp_record.is_verified = True
    db.commit()
    return {"message": "OTP verified successfully"}

@auth_router.post("/register", response_model=UserResponse)
async def register(user_create: UserCreate, db: Session = Depends(get_db)):
    # Kullanıcı var mı?
    query = db.query(User).filter(User.email == user_create.email)
    if user_create.phone:
        query = query.filter((User.email == user_create.email) | (User.phone == user_create.phone))
    
    existing_user = query.first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email or phone already exists",
        )

    # Doğrulama kontrolü (Email veya Telefon)
    is_verified = False
    
    if user_create.phone:
        verified_phone_otp = (
            db.query(OTPVerification)
            .filter(OTPVerification.phone == user_create.phone, OTPVerification.is_verified == True)
            .first()
        )
        if verified_phone_otp:
            is_verified = True

    if not is_verified:
        verified_email_otp = (
            db.query(OTPVerification)
            .filter(OTPVerification.email == user_create.email, OTPVerification.is_verified == True)
            .first()
        )
        if verified_email_otp:
            is_verified = True

    if not is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or Phone number not verified. Please verify OTP first.",
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
                phone_number=(user.phone if user.phone.startswith('+') else f'+90{user.phone}') if user.phone else None,
                email_verified=True
            )
            print(f"✅ Firebase kullanıcısı oluşturuldu: {firebase_user.uid}")
        except Exception as e:
            # Firebase hatası kayıt işlemini engellemez
            print(f"⚠️ Firebase kullanıcı oluşturma hatası: {e}")

    # Hoş geldin e-postası
    try:
        if os.getenv("MAILGUN_API_KEY"):
            send_mailgun_email(
                user.email,
                "EğitimPlatformu'na Hoş Geldiniz!",
                f"Merhaba {user.full_name},\n\nEğitimPlatformu'na kaydınız başarıyla tamamlandı. Hemen giriş yaparak öğrenmeye başlayabilirsiniz!",
            )
        else:
            send_smtp_email(
                user.email,
                "EğitimPlatformu'na Hoş Geldiniz!",
                f"Merhaba {user.full_name},\n\nEğitimPlatformu'na kaydınız başarıyla tamamlandı. Hemen giriş yaparak öğrenmeye başlayabilirsiniz!",
            )
    except Exception as e:
        # Prod'da logla; kullanıcıya hatayı göstermiyoruz
        print(f"Email gönderimi başarısız: {e}")

    # Pydantic v2: from_orm yerine model_validate
    return UserResponse.model_validate(user)


@auth_router.post('/register-firebase', response_model=LoginResponse)
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

    # E-posta doğrulama kontrolü devre dışı (kayıt sırasında henüz doğrulanmamış olabilir)
    # if not decoded.get('email_verified'):
    #     raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Email not verified in Firebase')

    email = decoded.get('email')
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Firebase token has no email')

    # Extract some info
    full_name = payload.get('full_name') or decoded.get('name') or ''
    phone = payload.get('phone') or decoded.get('phone_number') or ''

    # Try to get firebase uid from token so we can cleanup if needed
    firebase_uid = decoded.get('uid') or decoded.get('sub') or decoded.get('user_id')

    # Check existing by email OR phone to avoid unique constraint errors
    existing_user = None
    if phone:
        existing_user = db.query(User).filter((User.email == email) | (User.phone == phone)).first()
    else:
        existing_user = db.query(User).filter(User.email == email).first()

    if existing_user:
        # If there is an existing user, return token for login
        # But if existing user has different email/phone, be explicit
        if existing_user.email != email and existing_user.phone == phone:
            # Phone already used by another account
            # Cleanup: delete the firebase user we just verified to avoid orphaned accounts
            if firebase_auth and firebase_uid:
                try:
                    firebase_auth.delete_user(firebase_uid)
                    print(f"⚠️ Deleted orphan Firebase user {firebase_uid} due to phone conflict")
                except Exception as e:
                    print(f"⚠️ Failed to delete Firebase user {firebase_uid}: {e}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Bu telefon numarası başka bir hesapta kullanılmış. Lütfen destek ile iletişime geçin.')

        access_token = create_access_token({'sub': str(existing_user.id)}, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
        return {"access_token": access_token, "token_type": "bearer", "user": UserResponse.model_validate(existing_user)}

    # Create new user (wrap DB commit to catch integrity errors)
    from sqlalchemy.exc import IntegrityError

    user = User(
        email=email,
        phone=phone,
        password_hash='',
        full_name=full_name,
        is_verified=True,
    )
    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except IntegrityError as ie:
        # Rollback and attempt to cleanup Firebase user to avoid orphaned accounts
        db.rollback()
        print(f"❌ IntegrityError when creating user from Firebase register: {ie}")
        if firebase_auth and firebase_uid:
            try:
                firebase_auth.delete_user(firebase_uid)
                print(f"⚠️ Deleted orphan Firebase user {firebase_uid} due to DB integrity error")
            except Exception as e:
                print(f"⚠️ Failed to delete Firebase user {firebase_uid}: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Kayıt sırasında veritabanı hatası oluştu (ör: e-posta veya telefon zaten kayıtlı). Lütfen kontrol edin veya destek ile iletişime geçin.')
    except Exception as e:
        db.rollback()
        print(f"❌ Unexpected error creating user: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Kullanıcı oluşturulamadı')

    access_token = create_access_token({'sub': str(user.id)}, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    return {"access_token": access_token, "token_type": "bearer", "user": UserResponse.model_validate(user)}

@auth_router.post('/login-firebase', response_model=LoginResponse)
async def login_firebase(payload: dict, db: Session = Depends(get_db)):
    """Login using Firebase ID token. Expects payload: { id_token }"""
    if not firebase_auth:
        print("❌ Firebase Admin is not initialized")
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail='Firebase Admin not configured on server')

    id_token = payload.get('id_token')
    if not id_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Missing id_token')

    try:
        # Verify the token
        decoded = firebase_auth.verify_id_token(id_token)
    except Exception as e:
        print(f"❌ Firebase token verification failed: {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f'Invalid Firebase token: {str(e)}')

    email = decoded.get('email')
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Email not found in token')

    # Kullanıcıyı veritabanında bul
    user = db.query(User).filter(User.email == email).first()
    
    # Auto-register logic (Optional: if user doesn't exist, create them?)
    # For now, stick to existing logic but improve error
    if not user:
        print(f"User with email {email} not found in DB")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='User not found. Please register first.')

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Account is deactivated')

    # JWT token oluştur
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": str(user.id)}, expires_delta=access_token_expires)

    try:
        user_response = UserResponse.model_validate(user)
    except Exception as e:
        print(f"❌ UserResponse validation failed: {e}")
        # Fallback manual creation if validation fails
        user_response = UserResponse(
            id=user.id,
            email=user.email,
            phone=user.phone,
            full_name=user.full_name,
            role=user.role,
            is_active=user.is_active,
            is_verified=user.is_verified,
            city=user.city,
            district=user.district,
            profile_image=user.profile_image,
            created_at=user.created_at
        )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response
    }

@auth_router.post("/login", response_model=LoginResponse)
async def login(user_login: UserLogin, db: Session = Depends(get_db)):
    try:
        print(f"Login attempt for: {user_login.email}")
        user = db.query(User).filter(User.email == user_login.email).first()
        
        if not user:
            print(f"User not found: {user_login.email}")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
            
        print(f"User found: {user.id}, Role: {user.role}")
        
        # Verify password safely
        try:
            is_valid = verify_password(user_login.password, user.password_hash)
        except Exception as e:
            print(f"Password verification error: {e}")
            # If hash is invalid, we can't verify. Treat as wrong password.
            # But for debugging, let's return the error
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Password hash error: {str(e)}")

        if not is_valid:
            print("Invalid password")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

        if not user.is_active:
            print("User inactive")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account is deactivated")

        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(data={"sub": str(user.id)}, expires_delta=access_token_expires)

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": UserResponse.model_validate(user),
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Login 500 Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Login failed: {str(e)}")

@auth_router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)

@auth_router.put("/profile", response_model=UserResponse)
async def update_profile(
    payload: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    if payload.city is not None:
        current_user.city = payload.city
    if payload.district is not None:
        current_user.district = payload.district
    if payload.profile_image is not None:
        current_user.profile_image = payload.profile_image

    current_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)

@auth_router.post("/upload-avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    max_bytes = 5 * 1024 * 1024  # 5MB
    if len(file_bytes) > max_bytes:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")

    filename = file.filename or "avatar.jpg"
    ext = filename.split(".")[-1].lower() if "." in filename else "jpg"
    unique_id = uuid.uuid4().hex[:8]
    object_name = f"avatars/user_{current_user.id}_{unique_id}.{ext}"

    # Try S3 first
    public_url = upload_file_to_s3(io.BytesIO(file_bytes), object_name, file.content_type)

    # Fallback to Firebase Storage
    if not public_url:
        try:
            if init_firebase():
                public_url = upload_file_to_firebase(
                    io.BytesIO(file_bytes),
                    f"uploads/{object_name}",
                    file.content_type
                )
        except Exception as e:
            print(f"Avatar upload firebase fallback failed: {e}")
            public_url = None

    # Local fallback (dev)
    if not public_url:
        upload_dir = Path("/tmp/uploads") if os.environ.get("VERCEL") else Path(os.getenv("UPLOAD_DIRECTORY", "uploads"))
        target_dir = upload_dir / "avatars"
        target_dir.mkdir(parents=True, exist_ok=True)
        file_path = target_dir / f"user_{current_user.id}_{unique_id}.{ext}"
        with open(file_path, "wb") as f:
            f.write(file_bytes)
        relative_path = file_path.relative_to(upload_dir).as_posix()
        public_url = f"/uploads/{relative_path}"

    current_user.profile_image = public_url
    db.commit()
    db.refresh(current_user)

    return {"message": "Avatar uploaded successfully", "avatar_url": public_url}
