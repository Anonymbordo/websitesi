import sqlite3
from datetime import datetime

conn = sqlite3.connect('education_platform.db')
cursor = conn.cursor()

# dewdmahmtu@gmail.com kullanıcısını bul
cursor.execute("SELECT id, email, full_name FROM users WHERE email = ?", ("dewdmahmtu@gmail.com",))
user = cursor.fetchone()

if not user:
    print("❌ Kullanıcı bulunamadı!")
    exit()

user_id = user[0]
print(f"✅ Kullanıcı bulundu: {user[2]} (ID: {user_id})")

# Mevcut kursları al
cursor.execute("SELECT id, title FROM courses")
courses = cursor.fetchall()

if not courses:
    print("❌ Hiç kurs yok!")
    exit()

print(f"\n📚 Mevcut Kurslar: {len(courses)}")
for course in courses:
    print(f"  - ID: {course[0]} | {course[1]}")

# Kullanıcıyı tüm kurslara kaydet
for course in courses:
    course_id = course[0]
    
    # Zaten kayıtlı mı kontrol et
    cursor.execute("""
        SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?
    """, (user_id, course_id))
    
    if cursor.fetchone():
        print(f"⚠️ Zaten kayıtlı: {course[1]}")
    else:
        cursor.execute("""
            INSERT INTO enrollments (
                student_id, course_id, enrolled_at, progress_percentage
            ) VALUES (?, ?, ?, ?)
        """, (user_id, course_id, datetime.now().isoformat(), 0))
        print(f"✅ Kayıt yapıldı: {course[1]}")

conn.commit()

# Sonuç
cursor.execute("""
    SELECT COUNT(*) FROM enrollments WHERE student_id = ?
""", (user_id,))
count = cursor.fetchone()[0]

print(f"\n✅ {user[2]} şu an {count} kursa kayıtlı!")
print("\nŞimdi öğrenci paneline giriş yapabilirsin:")
print(f"  Email: {user[1]}")
print("  Şifre: (senin belirlediğin)")

conn.close()
