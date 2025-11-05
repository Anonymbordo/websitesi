import sqlite3
import bcrypt
from datetime import datetime

# Firebase'deki kullanıcılar (Firebase Authentication Users listesinden)
firebase_users = [
    {
        "email": "ddemurathan12@gmail.com",
        "full_name": "Admin User",
        "role": "admin"
    }
]

conn = sqlite3.connect('education_platform.db')
cursor = conn.cursor()

print("🔍 Firebase'deki kullanıcılar backend'e aktarılıyor...\n")

# Firebase'de olan ama backend'de olmayan kullanıcıları bul
for fb_user in firebase_users:
    cursor.execute("SELECT id, role FROM users WHERE email = ?", (fb_user["email"],))
    existing = cursor.fetchone()
    
    if existing:
        print(f"✅ {fb_user['email']} zaten mevcut (ID: {existing[0]}, Rol: {existing[1]})")
    else:
        print(f"⚠️ {fb_user['email']} backend'de YOK - eklenemiyor (Firebase'de şifre bilinmiyor)")

print("\n" + "="*80)
print("📋 BACKEND'DEKİ TÜM KULLANICILAR:")
print("="*80)

cursor.execute("SELECT id, email, full_name, role, created_at FROM users ORDER BY id")
users = cursor.fetchall()

for user in users:
    print(f"ID: {user[0]}")
    print(f"  Email: {user[1]}")
    print(f"  Ad Soyad: {user[2]}")
    print(f"  Rol: {user[3]}")
    print(f"  Kayıt: {user[4]}")
    print("-" * 80)

print(f"\n✅ Toplam: {len(users)} kullanıcı")

print("\n" + "="*80)
print("💡 NOT:")
print("="*80)
print("Firebase'de kayıt olan kullanıcılar backend'e OTOMATIK eklenmez.")
print("Register sayfasında kayıt olduğunda AYNI ANDA hem Firebase'e hem backend'e kaydedilir.")
print("Eğer sadece Firebase'de kayıt olduysan, backend'e manuel eklenmeli.\n")

conn.close()
