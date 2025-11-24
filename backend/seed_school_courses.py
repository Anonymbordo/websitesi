"""
Seed school courses data
Creates all İlkokul, Ortaokul, and Lise courses
"""
from sqlalchemy.orm import Session
from database import SessionLocal
from models import SchoolCourse

def seed_school_courses():
    db = SessionLocal()
    
    try:
        # İlkokul courses (grades 3-4)
        ilkokul_subjects = [
            {"subject": "turkce", "title": "Türkçe"},
            {"subject": "matematik", "title": "Matematik"},
            {"subject": "ingilizce", "title": "İngilizce"}
        ]
        
        for grade in [3, 4]:
            for subj in ilkokul_subjects:
                course = SchoolCourse(
                    level="ilkokul",
                    grade=grade,
                    subject=subj["subject"],
                    title=f"{grade}. Sınıf {subj['title']}",
                    description=f"İlkokul {grade}. sınıf {subj['title']} dersi müfredatı",
                    price=299.0,
                    is_active=True
                )
                db.add(course)
        
        # Ortaokul courses (grades 5-8)
        ortaokul_subjects = [
            {"subject": "turkce", "title": "Türkçe"},
            {"subject": "matematik", "title": "Matematik"},
            {"subject": "fen-bilimleri", "title": "Fen Bilimleri"},
            {"subject": "sosyal-bilgiler", "title": "Sosyal Bilgiler"},
            {"subject": "ingilizce", "title": "İngilizce"},
            {"subject": "din-kulturu", "title": "Din Kültürü"},
            {"subject": "gorsel-sanatlar", "title": "Görsel Sanatlar"},
            {"subject": "muzik", "title": "Müzik"},
            {"subject": "beden-egitimi", "title": "Beden Eğitimi"}
        ]
        
        for grade in [5, 6, 7, 8]:
            for subj in ortaokul_subjects:
                course = SchoolCourse(
                    level="ortaokul",
                    grade=grade,
                    subject=subj["subject"],
                    title=f"{grade}. Sınıf {subj['title']}",
                    description=f"Ortaokul {grade}. sınıf {subj['title']} dersi müfredatı",
                    price=299.0,
                    is_active=True
                )
                db.add(course)
        
        # Lise courses (grades 9-12)
        lise_subjects = [
            {"subject": "turk-dili-edebiyat", "title": "Türk Dili ve Edebiyatı"},
            {"subject": "matematik", "title": "Matematik"},
            {"subject": "fizik", "title": "Fizik"},
            {"subject": "kimya", "title": "Kimya"},
            {"subject": "biyoloji", "title": "Biyoloji"},
            {"subject": "tarih", "title": "Tarih"},
            {"subject": "cografya", "title": "Coğrafya"},
            {"subject": "ingilizce", "title": "İngilizce"}
        ]
        
        for grade in [9, 10, 11, 12]:
            for subj in lise_subjects:
                course = SchoolCourse(
                    level="lise",
                    grade=grade,
                    subject=subj["subject"],
                    title=f"{grade}. Sınıf {subj['title']}",
                    description=f"Lise {grade}. sınıf {subj['title']} dersi müfredatı",
                    price=299.0,
                    is_active=True
                )
                db.add(course)
        
        db.commit()
        
        # Count courses
        total = db.query(SchoolCourse).count()
        print(f"✅ Seeded {total} school courses successfully!")
        print(f"   - İlkokul: {len(ilkokul_subjects) * 2} courses (grades 3-4)")
        print(f"   - Ortaokul: {len(ortaokul_subjects) * 4} courses (grades 5-8)")
        print(f"   - Lise: {len(lise_subjects) * 4} courses (grades 9-12)")
        
    except Exception as e:
        print(f"❌ Error seeding school courses: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_school_courses()
