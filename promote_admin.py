import sqlite3, os, sys
db = r'backend/education_platform.db'
if not os.path.exists(db):
    print('NO_DB'); sys.exit(1)
conn = sqlite3.connect(db)
try:
    conn.execute(\"UPDATE users SET role='admin' WHERE id=1\")
    conn.commit()
    print('OK: user id=1 promoted to admin')
except Exception as e:
    print('ERR', e)
finally:
    conn.close()
