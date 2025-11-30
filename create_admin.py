import sqlite3, os, sys
import bcrypt
db = r'backend/education_platform.db'
if not os.path.exists(db):
    print('NO_DB'); sys.exit(1)
email = 'ddemurathan12@gmail.com'   # burayı değiştir
phone = '+9005388300699'       # uygun bir telefon gir
full_name = 'Cengiz Bey'
plain_password = '8338Denme'  # ilk parola, girişten sonra değiştir
conn = sqlite3.connect(db)
cur = conn.cursor()
try:
    # Check existing
    cur.execute('SELECT id FROM users WHERE email=?', (email,))
    if cur.fetchone():
        print('ERR: user with this email already exists')
        sys.exit(1)
    hashed = bcrypt.hashpw(plain_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    cur.execute('INSERT INTO users (email, phone, password_hash, full_name, role, is_active, is_verified) VALUES (?,?,?,?,?,?,?)',
                (email, phone, hashed, full_name, 'admin', 1, 1))
    conn.commit()
    print('OK: admin created with email', email)
except Exception as e:
    print('ERR', e)
finally:
    conn.close()
