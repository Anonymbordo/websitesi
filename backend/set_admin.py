#!/usr/bin/env python3
"""Set or create an admin user in the local SQLite database.

Usage: python backend/set_admin.py

This script is intentionally idempotent: it will update an existing user (by email)
or create a new one if not found. Passwords are hashed using bcrypt to match
the application's authentication logic.

Note: run `python -m pip install bcrypt` first if bcrypt is not installed.
"""
import os
import sys
import sqlite3

try:
    import bcrypt
except Exception as e:
    print('MISSING_BCRYPT')
    print('Please run: python -m pip install bcrypt')
    sys.exit(2)

# === Edit these values as requested ===
ADMIN_EMAIL = 'ddemurathan12@gmail.com'
ADMIN_PHONE = '05388300699'
ADMIN_PASSWORD = '8338kelebek'
ADMIN_FULL_NAME = 'Murathan Dede'
# =====================================

DB_PATH = os.path.join(os.path.dirname(__file__), 'education_platform.db')

if not os.path.exists(DB_PATH):
    print('NO_DB')
    sys.exit(1)

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    try:
        cur.execute('SELECT id,email,phone,full_name,role FROM users WHERE email=?', (ADMIN_EMAIL,))
        row = cur.fetchone()
        hashed = hash_password(ADMIN_PASSWORD)
        if row:
            user_id = row[0]
            cur.execute(
                'UPDATE users SET phone=?, password_hash=?, role=?, is_active=1, is_verified=1, full_name=? WHERE id=?',
                (ADMIN_PHONE, hashed, 'admin', ADMIN_FULL_NAME, user_id),
            )
            conn.commit()
            print(f'OK: updated existing user id={user_id} to admin')
        else:
            # Insert new user
            cur.execute(
                'INSERT INTO users (email, phone, password_hash, full_name, role, is_active, is_verified) VALUES (?,?,?,?,?,?,?)',
                (ADMIN_EMAIL, ADMIN_PHONE, hashed, ADMIN_FULL_NAME, 'admin', 1, 1),
            )
            conn.commit()
            print('OK: created new admin with email', ADMIN_EMAIL)
    except Exception as e:
        print('ERR', e)
        sys.exit(3)
    finally:
        conn.close()

if __name__ == '__main__':
    main()
