import sys
import os
sys.path.append('backend')

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import User
from database import DATABASE_URL

try:
    # Create engine and session
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    # Get all users
    users = db.query(User).all()
    
    if not users:
        print("❌ Henüz kayıtlı kullanıcı yok.")
    else:
        print(f"📊 Toplam {len(users)} kullanıcı bulundu:\n")
        print("=" * 80)
        
        for user in users:
            print(f"\n👤 Kullanıcı ID: {user.id}")
            print(f"📧 E-posta: {user.email}")
            print(f"📱 Telefon: {user.phone}")
            print(f"👨‍💼 Ad Soyad: {user.full_name}")
            print(f"🔐 Şifre Hash: {user.password_hash[:50]}...")  # İlk 50 karakter
            print(f"🎭 Rol: {user.role}")
            print(f"✅ Aktif: {'Evet' if user.is_active else 'Hayır'}")
            print(f"🔓 Doğrulanmış: {'Evet' if user.is_verified else 'Hayır'}")
            print(f"📍 Şehir: {user.city or 'Belirtilmemiş'}")
            print(f"📅 Kayıt Tarihi: {user.created_at}")
            print("-" * 80)
    
    db.close()
    
except Exception as e:
    print(f"❌ Hata: {str(e)}")
    print(f"💡 Veritabanı yolu: {DATABASE_URL}")
