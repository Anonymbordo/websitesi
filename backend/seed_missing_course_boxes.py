import sys
import os
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import Base, CourseBox

# Tabloları oluştur (Eğer yoksa)
Base.metadata.create_all(bind=engine)

def seed_missing_course_boxes():
    db = SessionLocal()
    try:
        # Mevcut kutuları kontrol et
        existing_categories = [box.category for box in db.query(CourseBox).all()]
        
        boxes_to_add = [
            {
                "title_tr": "İlkokul Dersleri",
                "title_en": "Primary School Courses",
                "category": "primary_school",
                "icon": "Backpack",
                "color_from": "#F59E0B",
                "color_to": "#D97706",
                "order_index": -3
            },
            {
                "title_tr": "Ortaokul Dersleri",
                "title_en": "Middle School Courses",
                "category": "middle_school",
                "icon": "BookOpen",
                "color_from": "#10B981",
                "color_to": "#059669",
                "order_index": -2
            },
            {
                "title_tr": "Yabancı Dil",
                "title_en": "Foreign Languages",
                "category": "foreign_languages",
                "icon": "Languages",
                "color_from": "#EC4899",
                "color_to": "#DB2777",
                "order_index": 5
            },
            {
                "title_tr": "Kişisel Gelişim",
                "title_en": "Personal Development",
                "category": "personal_development",
                "icon": "BrainCircuit",
                "color_from": "#8B5CF6",
                "color_to": "#7C3AED",
                "order_index": 6
            },
            {
                "title_tr": "Yazılım Eğitimleri",
                "title_en": "Software Training",
                "category": "software",
                "icon": "Code",
                "color_from": "#3B82F6",
                "color_to": "#2563EB",
                "order_index": 7
            }
        ]

        for box_data in boxes_to_add:
            if box_data["category"] not in existing_categories:
                print(f"Adding course box: {box_data['title_tr']}")
                new_box = CourseBox(**box_data)
                db.add(new_box)
            else:
                print(f"Course box already exists: {box_data['title_tr']}")
        
        db.commit()
        print("✅ Missing course boxes added successfully.")
    except Exception as e:
        print(f"❌ Error adding course boxes: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_missing_course_boxes()
