import sqlite3
import bcrypt
from datetime import datetime

# Öğrenci bilgileri
students = [
    {
        "email": "ogrenci@test.com",
        "password": "123456",
        "full_name": "Test Öğrenci",
        "role": "student",
        "phone": "+90 555 111 2233",
        "city": "İstanbul",
        "district": "Kadıköy"
    },
    {
        "email": "ogrenci2@test.com",
        "password": "123456",
        "full_name": "Ahmet Yılmaz",
        "role": "student",
        "phone": "+90 555 222 3344",
        "city": "Ankara",
        "district": "Çankaya"
    }
]

conn = sqlite3.connect('education_platform.db')
cursor = conn.cursor()

now = datetime.now().isoformat()

for student in students:
    # Şifreyi hashle
    password_hash = bcrypt.hashpw(student["password"].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Kontrol et
    cursor.execute("SELECT id FROM users WHERE email = ?", (student["email"],))
    if cursor.fetchone():
        print(f"⚠️ {student['email']} zaten mevcut, atlanıyor...")
        continue
    
    # Ekle
    cursor.execute("""
        INSERT INTO users (email, password_hash, full_name, role, phone, city, district, is_active, is_verified, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
    """, (
        student["email"],
        password_hash,
        student["full_name"],
        student["role"],
        student["phone"],
        student["city"],
        student["district"],
        now,
        now
    ))
    
    print(f"✅ {student['full_name']} ({student['email']}) oluşturuldu!")

conn.commit()

# Sonuçları göster
cursor.execute("SELECT id, email, full_name, role FROM users ORDER BY created_at DESC")
users = cursor.fetchall()

print(f"\n📋 TOPLAM KULLANICI: {len(users)}")
for user in users:
    print(f"  ID: {user[0]} | {user[2]} | {user[1]} | Rol: {user[3]}")

print(f"\n🔑 GİRİŞ BİLGİLERİ:")
print(f"  Admin: ddemurathan12@gmail.com / 8338kelebek")
print(f"  Öğrenci: ogrenci@test.com / 123456")

conn.close()
