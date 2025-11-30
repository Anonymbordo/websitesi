import sqlite3
import bcrypt

# Firebase'deki admin bilgileri
email = "ddemurathan12@gmail.com"
password = "8338kelebek"
full_name = "Admin"
role = "admin"

# Şifreyi hashle
password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# Veritabanına bağlan
conn = sqlite3.connect('education_platform.db')
cursor = conn.cursor()

# Önce kullanıcının var olup olmadığını kontrol et
cursor.execute("SELECT id, email, role FROM users WHERE email = ?", (email,))
existing_user = cursor.fetchone()

if existing_user:
    print(f"\n⚠️ Kullanıcı zaten var: {existing_user}")
    print("Şifre ve rol güncelleniyor...")
    
    cursor.execute(
        "UPDATE users SET password_hash = ?, role = ?, full_name = ?, is_active = 1 WHERE email = ?",
        (password_hash, role, full_name, email)
    )
    print("✅ Kullanıcı güncellendi!")
else:
    print("Yeni admin oluşturuluyor...")
    cursor.execute(
        """INSERT INTO users (email, password_hash, full_name, role, is_active, is_verified) 
           VALUES (?, ?, ?, ?, 1, 1)""",
        (email, password_hash, full_name, role)
    )
    print("✅ Yeni admin oluşturuldu!")

conn.commit()

# Sonucu kontrol et
cursor.execute("SELECT id, email, full_name, role FROM users WHERE email = ?", (email,))
result = cursor.fetchone()

print(f"\n✅ BACKEND'DE ADMIN KULLANICI:")
print(f"ID: {result[0]}")
print(f"Email: {result[1]}")
print(f"Ad Soyad: {result[2]}")
print(f"Rol: {result[3]}")
print(f"\n🔑 GİRİŞ BİLGİLERİ:")
print(f"Email: {email}")
print(f"Şifre: {password}")

conn.close()
