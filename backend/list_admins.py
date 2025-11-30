import sqlite3

# Veritabanına bağlan
conn = sqlite3.connect('education_platform.db')
cursor = conn.cursor()

# Tüm admin kullanıcıları göster
cursor.execute("SELECT id, email, full_name, role, password_hash FROM users WHERE role = 'admin'")
admins = cursor.fetchall()

print("\n=== ADMIN KULLANICILAR ===")
print(f"Toplam admin sayısı: {len(admins)}\n")

for admin in admins:
    print(f"ID: {admin[0]}")
    print(f"Email: {admin[1]}")
    print(f"Ad Soyad: {admin[2]}")
    print(f"Rol: {admin[3]}")
    print(f"Şifre Hash: {admin[4][:60]}...")
    print("-" * 50)

# Tüm kullanıcıları da göster
cursor.execute("SELECT id, email, full_name, role FROM users")
all_users = cursor.fetchall()

print(f"\n=== TÜM KULLANICILAR ===")
print(f"Toplam kullanıcı sayısı: {len(all_users)}\n")

for user in all_users:
    print(f"ID: {user[0]} | Email: {user[1]} | Ad: {user[2]} | Rol: {user[3]}")

conn.close()
