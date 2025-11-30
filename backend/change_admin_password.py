import sqlite3
import bcrypt

# Yeni şifre
new_password = "8338kelebek"

# Şifreyi hashle
password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# Veritabanına bağlan
conn = sqlite3.connect('education_platform.db')
cursor = conn.cursor()

# Admin şifresini güncelle
cursor.execute(
    "UPDATE users SET password_hash = ? WHERE email = ?",
    (password_hash, "ddemurathan12@gmail.com")
)

conn.commit()

# Kontrol et
cursor.execute("SELECT email, password_hash FROM users WHERE email = ?", ("ddemurathan12@gmail.com",))
result = cursor.fetchone()

print("\n✅ Admin şifresi güncellendi!")
print(f"Email: {result[0]}")
print(f"Yeni şifre: {new_password}")
print(f"Hash: {result[1][:60]}...")

# Şifreyi test et
if bcrypt.checkpw(new_password.encode('utf-8'), result[1].encode('utf-8')):
    print("\n✅ Şifre doğrulama başarılı!")
else:
    print("\n❌ Şifre doğrulama başarısız!")

conn.close()
