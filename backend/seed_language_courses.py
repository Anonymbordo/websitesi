"""
Seed initial language courses data
"""
import sys
sys.path.append('.')

from database import SessionLocal
from models import LanguageCourse

def seed_courses():
    """Create initial language courses for all languages and levels"""
    db = SessionLocal()
    
    try:
        # Check if courses already exist
        existing = db.query(LanguageCourse).first()
        if existing:
            print("⚠️ Language courses already exist. Skipping seed...")
            return
        
        print("🌱 Seeding language courses...")
        
        languages = [
            {'code': 'ingilizce', 'name': 'İngilizce'},
            {'code': 'almanca', 'name': 'Almanca'},
            {'code': 'fransizca', 'name': 'Fransızca'},
            {'code': 'ispanyolca', 'name': 'İspanyolca'}
        ]
        
        levels = [
            {'code': 'a1', 'name': 'A-1 (Başlangıç)', 'desc': 'Temel düzey dil öğrenmeye başlayın'},
            {'code': 'a2', 'name': 'A-2 (Temel)', 'desc': 'Temel dil becerilerinizi geliştirin'},
            {'code': 'b1', 'name': 'B-1 (Orta)', 'desc': 'Orta düzey dil yetkinliği kazanın'},
            {'code': 'b2', 'name': 'B-2 (Orta Üstü)', 'desc': 'İleri düzey konuşma becerisi edinin'},
            {'code': 'c1', 'name': 'C-1 (İleri)', 'desc': 'Profesyonel seviye dil kullanımı'},
            {'code': 'c2', 'name': 'C-2 (Profesyonel)', 'desc': 'Ana dili konuşan seviyesinde yetkinlik'}
        ]
        
        count = 0
        for lang in languages:
            for level in levels:
                course = LanguageCourse(
                    language=lang['code'],
                    level=level['code'],
                    title=f"{lang['name']} {level['name']}",
                    description=f"{lang['name']} dilinde {level['name']} seviyesi kurs içeriği. {level['desc']}.",
                    price=299.0,
                    currency="TRY",
                    is_active=True
                )
                db.add(course)
                count += 1
                print(f"  ✓ {lang['name']} {level['name']}")
        
        db.commit()
        print(f"\n✅ {count} language courses seeded successfully!")
        
    except Exception as e:
        print(f"❌ Error seeding courses: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_courses()
