import sqlite3
from datetime import datetime

# Veritabanına bağlan
conn = sqlite3.connect('education_platform.db')
cursor = conn.cursor()

# created_at ve updated_at alanlarını güncelle
now = datetime.now().isoformat()

cursor.execute("""
    UPDATE users 
    SET created_at = ?, updated_at = ?
    WHERE created_at IS NULL OR updated_at IS NULL
""", (now, now))

affected = cursor.rowcount
conn.commit()

print(f"✅ {affected} kullanıcının tarih alanları güncellendi!")

# Kontrol et
cursor.execute("SELECT id, email, created_at, updated_at FROM users")
users = cursor.fetchall()

print("\n📋 Kullanıcı Durumu:")
for user in users:
    print(f"ID: {user[0]} | Email: {user[1]} | Created: {user[2]} | Updated: {user[3]}")

conn.close()
