"""Tüm yayınlanmış kursları öne çıkan olarak işaretle"""
from database import SessionLocal
from models import Course

def feature_all_published_courses():
    db = SessionLocal()
    try:
        # Tüm yayınlanmış kursları bul
        published_courses = db.query(Course).filter(
            Course.is_published == True
        ).all()
        
        print(f"\n{len(published_courses)} yayınlanmış kurs bulundu.")
        
        # Hepsini öne çıkan yap
        for course in published_courses:
            course.is_featured = True
            print(f"✓ {course.title} - öne çıkan olarak işaretlendi")
        
        db.commit()
        print(f"\n✅ Toplam {len(published_courses)} kurs öne çıkan olarak işaretlendi!")
        
    except Exception as e:
        print(f"❌ Hata: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    feature_all_published_courses()
