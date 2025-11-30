import sqlite3
import bcrypt

email = "ddemurathan12@gmail.com"
test_password = "8338kelebek"

# Veritabanından kullanıcıyı al
conn = sqlite3.connect('education_platform.db')
cursor = conn.cursor()

cursor.execute("SELECT id, email, password_hash, role FROM users WHERE email = ?", (email,))
user = cursor.fetchone()

if user:
    print(f"\n✅ Kullanıcı bulundu:")
    print(f"ID: {user[0]}")
    print(f"Email: {user[1]}")
    print(f"Role: {user[3]}")
    print(f"Hash: {user[2][:60]}...")
    
    # Şifreyi test et
    if bcrypt.checkpw(test_password.encode('utf-8'), user[2].encode('utf-8')):
        print(f"\n✅✅✅ Şifre '{test_password}' DOĞRU!")
    else:
        print(f"\n❌ Şifre '{test_password}' YANLIŞ!")
        
        # Diğer şifreleri de test edelim
        test_passwords = ["8338Denme", "8338denme", "8338KELEBEK"]
        for pwd in test_passwords:
            if bcrypt.checkpw(pwd.encode('utf-8'), user[2].encode('utf-8')):
                print(f"✅ Doğru şifre: '{pwd}'")
else:
    print(f"❌ '{email}' bulunamadı!")

conn.close()
