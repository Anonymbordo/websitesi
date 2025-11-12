import sqlite3
from datetime import datetime

conn = sqlite3.connect('education_platform.db')
cursor = conn.cursor()

# Önce bir eğitmen oluştur (ID 2 - dewdmahmtu@gmail.com için)
cursor.execute("SELECT id FROM instructors WHERE user_id = 2")
if not cursor.fetchone():
    cursor.execute("""
        INSERT INTO instructors (user_id, bio, specialization, rating, total_students, created_at)
        VALUES (2, 'Deneyimli eğitmen', 'Web Geliştirme', 4.5, 0, ?)
    """, (datetime.now().isoformat(),))
    print("✅ Eğitmen oluşturuldu (user_id: 2)")

cursor.execute("SELECT id FROM instructors WHERE user_id = 2")
instructor_id = cursor.fetchone()[0]

# Test kursları oluştur
test_courses = [
    {
        "title": "Python Programlama",
        "description": "Sıfırdan ileri seviye Python eğitimi",
        "short_description": "Python'u öğrenin",
        "price": 299.99,
        "duration_hours": 40,
        "level": "beginner",
        "category": "Programlama",
        "is_published": 1,
        "is_online": 1
    },
    {
        "title": "Web Geliştirme Bootcamp",
        "description": "HTML, CSS, JavaScript ile web sitesi yapımı",
        "short_description": "Web geliştirmeyi öğrenin",
        "price": 399.99,
        "duration_hours": 60,
        "level": "beginner",
        "category": "Web Geliştirme",
        "is_published": 1,
        "is_online": 1
    }
]

course_ids = []
for course in test_courses:
    cursor.execute("SELECT id FROM courses WHERE title = ?", (course["title"],))
    existing = cursor.fetchone()
    
    if existing:
        print(f"⚠️ Kurs zaten var: {course['title']}")
        course_ids.append(existing[0])
    else:
        cursor.execute("""
            INSERT INTO courses (
                instructor_id, title, description, short_description, price,
                duration_hours, level, category, is_published, is_online,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            instructor_id, course["title"], course["description"],
            course["short_description"], course["price"], course["duration_hours"],
            course["level"], course["category"], course["is_published"],
            course["is_online"], datetime.now().isoformat(), datetime.now().isoformat()
        ))
        course_ids.append(cursor.lastrowid)
        print(f"✅ Kurs oluşturuldu: {course['title']} (ID: {cursor.lastrowid})")

# Öğrenci 3 ve 4'ü kurslara kaydet
students = [3, 4]  # Test öğrenciler
for student_id in students:
    for course_id in course_ids:
        cursor.execute("""
            SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?
        """, (student_id, course_id))
        
        if cursor.fetchone():
            print(f"⚠️ Öğrenci {student_id} zaten kursa {course_id} kayıtlı")
        else:
            cursor.execute("""
                INSERT INTO enrollments (
                    student_id, course_id, enrolled_at, progress_percentage
                ) VALUES (?, ?, ?, ?)
            """, (student_id, course_id, datetime.now().isoformat(), 0))
            print(f"✅ Öğrenci {student_id} kursa {course_id} kaydedildi")

conn.commit()

# Sonuçları göster
print("\n" + "="*80)
print("📊 ÖZET:")
print("="*80)

cursor.execute("SELECT COUNT(*) FROM courses")
print(f"Toplam Kurs: {cursor.fetchone()[0]}")

cursor.execute("SELECT COUNT(*) FROM enrollments")
print(f"Toplam Kayıt: {cursor.fetchone()[0]}")

cursor.execute("""
    SELECT u.full_name, u.email, COUNT(e.id) as kurs_sayisi
    FROM users u
    LEFT JOIN enrollments e ON u.id = e.student_id
    WHERE u.role = 'student'
    GROUP BY u.id
""")

print("\n📋 Öğrenci Kurs Durumu:")
for row in cursor.fetchall():
    print(f"  {row[0]} ({row[1]}): {row[2]} kurs")

print("\n🔑 Test Giriş:")
print("  ogrenci@test.com / 123456")

conn.close()
