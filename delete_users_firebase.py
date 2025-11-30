"""
Firebase + Database Entegreli Kullanıcı Silme
Hem veritabanından hem de Firebase'den kullanıcıları siler
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
    print("⚠️  Firebase Admin SDK yüklü değil. Sadece veritabanı temizlenecek.")

def init_firebase():
    """Firebase Admin SDK'yı başlat"""
    if not FIREBASE_AVAILABLE:
        return False
    
    FIREBASE_SERVICE_ACCOUNT = os.getenv('FIREBASE_SERVICE_ACCOUNT')
    FIREBASE_SERVICE_ACCOUNT_PATH = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH')
    
    if not (FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH):
        print("⚠️  Firebase yapılandırması bulunamadı")
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

def delete_all_firebase_users():
    """Firebase Authentication'daki tüm kullanıcıları sil"""
    if not FIREBASE_AVAILABLE:
        return 0
    
    try:
        deleted_count = 0
        page = firebase_auth.list_users()
        
        while page:
            uids_to_delete = [user.uid for user in page.users]
            
            # Toplu silme (max 1000)
            if uids_to_delete:
                result = firebase_auth.delete_users(uids_to_delete)
                deleted_count += result.success_count
                
                if result.errors:
                    print(f"⚠️  {len(result.errors)} kullanıcı silinemedi")
                    for error in result.errors[:5]:  # İlk 5 hatayı göster
                        print(f"   - {error.reason}")
            
            page = page.get_next_page()
        
        return deleted_count
    except Exception as e:
        print(f"❌ Firebase kullanıcıları silinemedi: {e}")
        return 0

def delete_all_database_users():
    """Veritabanındaki tüm kullanıcıları ve ilişkili verileri sil"""
    try:
        # SQLite için backend klasöründeki veritabanını kullan
        db_url = DATABASE_URL
        if "sqlite" in DATABASE_URL and not DATABASE_URL.startswith("sqlite:////"):
            db_url = DATABASE_URL.replace("sqlite:///./", "sqlite:///backend/")
        
        engine = create_engine(db_url, connect_args={"check_same_thread": False} if "sqlite" in db_url else {})
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        # Önce kullanıcı sayısını al
        user_count = db.query(User).count()
        
        if user_count == 0:
            db.close()
            return 0, {}
        
        # İlişkili tabloları temizle
        from models import (
            AIInteraction, Payment, LessonProgress, Enrollment,
            Review, Instructor, OTPVerification
        )
        
        tables_deleted = {}
        
        # AI etkileşimleri
        ai_count = db.query(AIInteraction).count()
        if ai_count > 0:
            db.query(AIInteraction).delete()
            tables_deleted['ai_interactions'] = ai_count
        
        # Ödemeler
        payment_count = db.query(Payment).count()
        if payment_count > 0:
            db.query(Payment).delete()
            tables_deleted['payments'] = payment_count
        
        # Ders ilerlemeleri
        progress_count = db.query(LessonProgress).count()
        if progress_count > 0:
            db.query(LessonProgress).delete()
            tables_deleted['lesson_progress'] = progress_count
        
        # Kayıtlar
        enrollment_count = db.query(Enrollment).count()
        if enrollment_count > 0:
            db.query(Enrollment).delete()
            tables_deleted['enrollments'] = enrollment_count
        
        # Yorumlar
        review_count = db.query(Review).count()
        if review_count > 0:
            db.query(Review).delete()
            tables_deleted['reviews'] = review_count
        
        # Eğitmen profilleri
        instructor_count = db.query(Instructor).count()
        if instructor_count > 0:
            db.query(Instructor).delete()
            tables_deleted['instructors'] = instructor_count
        
        # OTP kayıtları
        otp_count = db.query(OTPVerification).count()
        if otp_count > 0:
            db.query(OTPVerification).delete()
            tables_deleted['otp_verifications'] = otp_count
        
        # Son olarak kullanıcıları sil
        db.query(User).delete()
        tables_deleted['users'] = user_count
        
        db.commit()
        db.close()
        
        return user_count, tables_deleted
        
    except Exception as e:
        print(f"❌ Veritabanı hatası: {e}")
        return 0, {}

def main():
    print("=" * 100)
    print("🗑️  KULLANICI SİLME - Firebase + Veritabanı")
    print("=" * 100)
    
    # Firebase'i başlat
    firebase_enabled = init_firebase()
    
    # Mevcut durumu göster
    if firebase_enabled:
        print("\n📊 Firebase kullanıcı sayısı kontrol ediliyor...")
        try:
            page = firebase_auth.list_users()
            firebase_count = sum(1 for _ in page.users)
            print(f"🔥 Firebase'de {firebase_count} kullanıcı bulundu")
        except:
            firebase_count = 0
            print("❌ Firebase kullanıcıları kontrol edilemedi")
    else:
        firebase_count = 0
    
    print("\n📊 Veritabanı kullanıcı sayısı kontrol ediliyor...")
    try:
        # SQLite için backend klasöründeki veritabanını kullan
        db_url = DATABASE_URL
        if "sqlite" in DATABASE_URL and not DATABASE_URL.startswith("sqlite:////"):
            db_url = DATABASE_URL.replace("sqlite:///./", "sqlite:///backend/")
        
        engine = create_engine(db_url, connect_args={"check_same_thread": False} if "sqlite" in db_url else {})
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        db_count = db.query(User).count()
        db.close()
        print(f"💾 Veritabanında {db_count} kullanıcı bulundu")
    except:
        db_count = 0
        print("❌ Veritabanı kontrol edilemedi")
    
    if firebase_count == 0 and db_count == 0:
        print("\n✅ Zaten hiç kullanıcı yok.")
        return
    
    # Onay iste
    print("\n" + "=" * 100)
    print("⚠️  UYARI: BU İŞLEM GERİ ALINAMAZ!")
    print("=" * 100)
    
    if firebase_enabled:
        print(f"🔥 Firebase'den {firebase_count} kullanıcı silinecek")
    print(f"💾 Veritabanından {db_count} kullanıcı ve tüm ilişkili veriler silinecek")
    print("\nSilinecek veriler:")
    print("  - Kullanıcı hesapları")
    print("  - Eğitmen profilleri")
    print("  - Kurs kayıtları")
    print("  - Ders ilerlemeleri")
    print("  - Yorumlar")
    print("  - Ödemeler")
    print("  - OTP kayıtları")
    print("  - AI etkileşimleri")
    
    confirmation = input(f"\n🗑️  TÜM KULLANICILAR VE VERİLER SİLİNECEK! Devam etmek için 'EVET' yazın: ")
    
    if confirmation.strip().upper() != "EVET":
        print("\n❌ İşlem iptal edildi.")
        return
    
    # İkinci onay
    confirmation2 = input(f"\n⚠️  Son onay: Emin misiniz? 'SIL' yazın: ")
    
    if confirmation2.strip().upper() != "SIL":
        print("\n❌ İşlem iptal edildi.")
        return
    
    print("\n" + "=" * 100)
    print("🗑️  SİLME İŞLEMİ BAŞLIYOR...")
    print("=" * 100)
    
    # Firebase'den sil
    if firebase_enabled and firebase_count > 0:
        print("\n🔥 Firebase kullanıcıları siliniyor...")
        fb_deleted = delete_all_firebase_users()
        if fb_deleted > 0:
            print(f"✅ Firebase'den {fb_deleted} kullanıcı silindi")
        else:
            print("⚠️  Firebase'den kullanıcı silinemedi")
    
    # Veritabanından sil
    if db_count > 0:
        print("\n💾 Veritabanı temizleniyor...")
        db_deleted, tables = delete_all_database_users()
        
        if db_deleted > 0:
            print(f"✅ Veritabanından {db_deleted} kullanıcı silindi")
            print("\n📊 Silinen kayıtlar:")
            for table, count in tables.items():
                print(f"  - {table}: {count} kayıt")
        else:
            print("⚠️  Veritabanından kullanıcı silinemedi")
    
    print("\n" + "=" * 100)
    print("✅ İŞLEM TAMAMLANDI")
    print("=" * 100)

if __name__ == "__main__":
    main()
