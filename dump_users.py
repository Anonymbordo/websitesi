import sqlite3, json, os, sys
db = r'backend/education_platform.db'
if not os.path.exists(db):
    print('NO_DB')
    sys.exit(0)
conn = sqlite3.connect(db)
cur = conn.cursor()
try:
    rows = cur.execute('SELECT id,email,phone,full_name,role,is_active,is_verified FROM users').fetchall()
    for r in rows:
        print(json.dumps({'id':r[0],'email':r[1],'phone':r[2],'full_name':r[3],'role':r[4],'is_active':bool(r[5]),'is_verified':bool(r[6])}))
except Exception as e:
    print('ERR', e)
finally:
    conn.close()
