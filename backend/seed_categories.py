#!/usr/bin/env python3
"""
Production veritabanına kategorileri ekleyen script
"""
import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Category

# Production DATABASE_URL'ini environment variable'dan al
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ DATABASE_URL environment variable bulunamadı!")
    print("Kullanım: DATABASE_URL='your_production_db_url' python3 seed_categories.py")
    sys.exit(1)

# PostgreSQL URL düzeltmesi (Vercel postgresql:// yerine postgresql+psycopg2:// kullanır)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

print(f"🔗 Veritabanına bağlanılıyor...")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

# Eklenecek kategoriler
categories_data = [
    {"name": "Tüm Dersler", "slug": "tum-dersler", "description": "Tüm dersler"},
    {"name": "Türkçe", "slug": "turkce", "description": "Türkçe dersi"},
    {"name": "Matematik", "slug": "matematik", "description": "Matematik dersi"},
    {"name": "İngilizce", "slug": "ingilizce", "description": "İngilizce dersi"},
    {"name": "Fen Bilimleri", "slug": "fen-bilimleri", "description": "Fen Bilimleri dersi"},
    {"name": "Hayat Bilgisi", "slug": "hayat-bilgisi", "description": "Hayat Bilgisi dersi"},
    {"name": "Din Kültürü", "slug": "din-kulturu", "description": "Din Kültürü ve Ahlak Bilgisi dersi"},
    {"name": "Sosyal Bilgiler", "slug": "sosyal-bilgiler", "description": "Sosyal Bilgiler dersi"},
    {"name": "Fizik", "slug": "fizik", "description": "Fizik dersi"},
    {"name": "Kimya", "slug": "kimya", "description": "Kimya dersi"},
    {"name": "Biyoloji", "slug": "biyoloji", "description": "Biyoloji dersi"},
    {"name": "Tarih", "slug": "tarih", "description": "Tarih dersi"},
    {"name": "Coğrafya", "slug": "cografya", "description": "Coğrafya dersi"},
    {"name": "Almanca", "slug": "almanca", "description": "Almanca dersi"},
    {"name": "Fransızca", "slug": "fransizca", "description": "Fransızca dersi"},
    {"name": "İspanyolca", "slug": "ispanyolca", "description": "İspanyolca dersi"},
    {"name": "Rusça", "slug": "rusca", "description": "Rusça dersi"},
]

try:
    added_count = 0
    updated_count = 0
    
    for cat_data in categories_data:
        # Kategori zaten var mı kontrol et
        existing = db.query(Category).filter(Category.slug == cat_data["slug"]).first()
        
        if existing:
            # Var olan kategoriyi güncelle
            existing.name = cat_data["name"]
            existing.description = cat_data["description"]
            updated_count += 1
            print(f"✏️  Güncellendi: {cat_data['name']}")
        else:
            # Yeni kategori ekle
            new_category = Category(
                name=cat_data["name"],
                slug=cat_data["slug"],
                description=cat_data["description"]
            )
            db.add(new_category)
            added_count += 1
            print(f"✅ Eklendi: {cat_data['name']}")
    
    db.commit()
    print(f"\n🎉 Başarılı! {added_count} kategori eklendi, {updated_count} kategori güncellendi.")
    
except Exception as e:
    db.rollback()
    print(f"\n❌ Hata oluştu: {e}")
    sys.exit(1)
finally:
    db.close()
