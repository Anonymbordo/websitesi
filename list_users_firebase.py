"""
Firebase + Database Entegreli Kullanıcı Listeleme
Hem veritabanındaki hem de Firebase'deki kullanıcıları listeler
"""
import sys
import os
sys.path.append('backend')

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import User
from database import DATABASE_URL
import json

# Firebase Admin SDK
try:
    import firebase_admin
    from firebase_admin import auth as firebase_auth, credentials as firebase_creds
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    print("⚠️  Firebase Admin SDK yüklü değil. Sadece veritabanı kontrol edilecek.")

def init_firebase():
    """Firebase Admin SDK'yı başlat"""
    if not FIREBASE_AVAILABLE:
        return False
    
    # Firebase service account bilgisi
    FIREBASE_SERVICE_ACCOUNT = os.getenv('FIREBASE_SERVICE_ACCOUNT')
    FIREBASE_SERVICE_ACCOUNT_PATH = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH')
    
    if not (FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH):
        print("⚠️  Firebase yapılandırması bulunamadı (FIREBASE_SERVICE_ACCOUNT veya FIREBASE_SERVICE_ACCOUNT_PATH)")
        return False
    
    try:
        if not firebase_admin._apps:
            if FIREBASE_SERVICE_ACCOUNT:
                cred_dict = json.loads(FIREBASE_SERVICE_ACCOUNT)
                cred = firebase_creds.Certificate(cred_dict)
            else:
                cred = firebase_creds.Certificate(FIREBASE_SERVICE_ACCOUNT_PATH)
            firebase_admin.initialize_app(cred)
        print("✅ Firebase Admin SDK başlatıldı")
        return True
    except Exception as e:
        print(f"❌ Firebase başlatma hatası: {e}")
        return False

def list_firebase_users():
    """Firebase Authentication'daki tüm kullanıcıları listele"""
    if not FIREBASE_AVAILABLE:
        return []
    
    try:
        firebase_users = []
        page = firebase_auth.list_users()
        
        while page:
            for user in page.users:
                firebase_users.append({
                    'uid': user.uid,
                    'email': user.email,
                    'phone': user.phone_number,
                    'display_name': user.display_name,
                    'email_verified': user.email_verified,
                    'disabled': user.disabled,
                    'created_at': user.user_metadata.creation_timestamp if user.user_metadata else None
                })
            
            # Sonraki sayfa
            page = page.get_next_page()
        
        return firebase_users
    except Exception as e:
        print(f"❌ Firebase kullanıcıları alınamadı: {e}")
        return []

def list_database_users():
    """Veritabanındaki tüm kullanıcıları listele"""
    try:
        # SQLite için backend klasöründeki veritabanını kullan
        db_url = DATABASE_URL
        if "sqlite" in DATABASE_URL and not DATABASE_URL.startswith("sqlite:////"):
            # Relative path ise backend klasörünü ekle
            db_url = DATABASE_URL.replace("sqlite:///./", "sqlite:///backend/")
        
        engine = create_engine(db_url, connect_args={"check_same_thread": False} if "sqlite" in db_url else {})
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        users = db.query(User).all()
        db.close()
        
        return users
    except Exception as e:
        print(f"❌ Veritabanı hatası: {e}")
        return []

def main():
    print("=" * 100)
    print("🔍 KULLANICI LİSTELEME - Firebase + Veritabanı")
    print("=" * 100)
    
    # Firebase'i başlat
    firebase_enabled = init_firebase()
    
    print("\n" + "=" * 100)
    print("📊 VERİTABANI KULLANICILARI")
    print("=" * 100)
    
    # Veritabanı kullanıcıları
    db_users = list_database_users()
    
    if not db_users:
        print("❌ Veritabanında kullanıcı bulunamadı.")
    else:
        print(f"✅ Toplam {len(db_users)} kullanıcı bulundu:\n")
        
        for user in db_users:
            print(f"\n{'='*100}")
            print(f"👤 ID: {user.id}")
            print(f"📧 E-posta: {user.email}")
            print(f"📱 Telefon: {user.phone}")
            print(f"👨‍💼 Ad Soyad: {user.full_name}")
            print(f"🔐 Şifre Hash: {user.password_hash[:60]}..." if user.password_hash else "🔐 Şifre: (Firebase ile kayıtlı)")
            print(f"🎭 Rol: {user.role}")
            print(f"✅ Aktif: {'Evet' if user.is_active else 'Hayır'}")
            print(f"🔓 Doğrulanmış: {'Evet' if user.is_verified else 'Hayır'}")
            print(f"📍 Şehir: {user.city or 'Belirtilmemiş'}")
            print(f"🏘️  İlçe: {user.district or 'Belirtilmemiş'}")
            print(f"📅 Kayıt Tarihi: {user.created_at}")
    
    # Firebase kullanıcıları
    if firebase_enabled:
        print("\n" + "=" * 100)
        print("🔥 FIREBASE AUTHENTICATION KULLANICILARI")
        print("=" * 100)
        
        firebase_users = list_firebase_users()
        
        if not firebase_users:
            print("❌ Firebase'de kullanıcı bulunamadı.")
        else:
            print(f"✅ Toplam {len(firebase_users)} Firebase kullanıcısı bulundu:\n")
            
            for fb_user in firebase_users:
                print(f"\n{'='*100}")
                print(f"🔥 Firebase UID: {fb_user['uid']}")
                print(f"📧 E-posta: {fb_user['email']}")
                print(f"📱 Telefon: {fb_user['phone'] or 'Yok'}")
                print(f"👨‍💼 Display Name: {fb_user['display_name'] or 'Belirtilmemiş'}")
                print(f"✉️  Email Doğrulandı: {'Evet' if fb_user['email_verified'] else 'Hayır'}")
                print(f"🚫 Devre Dışı: {'Evet' if fb_user['disabled'] else 'Hayır'}")
                print(f"📅 Oluşturma: {fb_user['created_at']}")
        
        # Karşılaştırma
        print("\n" + "=" * 100)
        print("🔄 KARŞILAŞTIRMA")
        print("=" * 100)
        
        db_emails = {user.email for user in db_users}
        fb_emails = {user['email'] for user in firebase_users if user['email']}
        
        print(f"\n📊 Veritabanında: {len(db_emails)} e-posta")
        print(f"🔥 Firebase'de: {len(fb_emails)} e-posta")
        
        # Sadece veritabanında olanlar
        only_db = db_emails - fb_emails
        if only_db:
            print(f"\n⚠️  Sadece veritabanında ({len(only_db)}):")
            for email in only_db:
                print(f"  - {email}")
        
        # Sadece Firebase'de olanlar
        only_fb = fb_emails - db_emails
        if only_fb:
            print(f"\n⚠️  Sadece Firebase'de ({len(only_fb)}):")
            for email in only_fb:
                print(f"  - {email}")
        
        # Her ikisinde de olanlar
        both = db_emails & fb_emails
        if both:
            print(f"\n✅ Her ikisinde de ({len(both)}):")
            for email in both:
                print(f"  - {email}")
    
    print("\n" + "=" * 100)
    print("⚠️  GÜVENLİK NOTU")
    print("=" * 100)
    print("🔐 Şifreler bcrypt ile hash'lenmiştir ve geri döndürülemez.")
    print("🔥 Firebase kullanıcılarının şifreleri Firebase tarafından yönetilir.")
    print("=" * 100)

if __name__ == "__main__":
    main()
