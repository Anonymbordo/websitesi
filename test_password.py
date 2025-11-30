import sqlite3
import bcrypt

# Test şifresi
test_password = "8338Denme"

# Veritabanından hash'i al
conn = sqlite3.connect('backend/education_platform.db')
cur = conn.cursor()
cur.execute('SELECT password_hash FROM users WHERE email = ?', ('ddemurathan12@gmail.com',))
result = cur.fetchone()
conn.close()

if result:
    stored_hash = result[0]
    print(f"Stored hash: {stored_hash[:60]}...")
    print(f"Test password: {test_password}")
    
    # Şifreyi doğrula
    is_valid = bcrypt.checkpw(test_password.encode('utf-8'), stored_hash.encode('utf-8'))
    print(f"Password valid: {is_valid}")
    
    if not is_valid:
        print("\n❌ Şifre eşleşmiyor! Yeni hash oluşturuluyor...")
        new_hash = bcrypt.hashpw(test_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        print(f"New hash: {new_hash}")
        
        # Yeni hash'i veritabanına kaydet
        conn = sqlite3.connect('backend/education_platform.db')
        cur = conn.cursor()
        cur.execute('UPDATE users SET password_hash = ? WHERE email = ?', (new_hash, 'ddemurathan12@gmail.com'))
        conn.commit()
        conn.close()
        print("✅ Şifre güncellendi!")
        
        # Tekrar test et
        is_valid_new = bcrypt.checkpw(test_password.encode('utf-8'), new_hash.encode('utf-8'))
        print(f"New password valid: {is_valid_new}")
    else:
        print("\n✅ Şifre doğru!")
else:
    print("❌ Kullanıcı bulunamadı!")
