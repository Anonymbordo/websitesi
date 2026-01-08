import sys
import os
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import Base, CourseBox

# Tabloları oluştur (Eğer yoksa)
Base.metadata.create_all(bind=engine)

def align_course_boxes():
    db = SessionLocal()
    try:
        # 1. Remove old grade-based boxes (9, 10, 11, 12)
        grades_to_remove = ["grade_9", "grade_10", "grade_11", "grade_12"]
        db.query(CourseBox).filter(CourseBox.category.in_(grades_to_remove)).delete(synchronize_session=False)
        print("🗑️  Removed old grade 9-12 boxes.")

        # 2. Define the target boxes matching the frontend
        target_boxes = [
            {
                "title_tr": "İlkokul Dersleri",
                "title_en": "Primary School Courses",
                "category": "primary_school",
                "icon": "Backpack",
                "color_from": "#F59E0B",
                "color_to": "#D97706",
                "order_index": 1
            },
            {
                "title_tr": "Ortaokul Dersleri",
                "title_en": "Middle School Courses",
                "category": "middle_school",
                "icon": "BookOpen",
                "color_from": "#10B981",
                "color_to": "#059669",
                "order_index": 2
            },
            {
                "title_tr": "Lise Dersleri",
                "title_en": "High School Courses",
                "category": "high_school",
                "icon": "GraduationCap",
                "color_from": "#8B5CF6",
                "color_to": "#7C3AED",
                "order_index": 3
            },
            {
                "title_tr": "Yabancı Dil Dersleri",
                "title_en": "Foreign Languages",
                "category": "foreign_languages",
                "icon": "Languages",
                "color_from": "#EC4899",
                "color_to": "#DB2777",
                "order_index": 4
            },
            {
                "title_tr": "Kişisel Gelişim",
                "title_en": "Personal Development",
                "category": "personal_development",
                "icon": "BrainCircuit",
                "color_from": "#14B8A6",
                "color_to": "#0D9488",
                "order_index": 5
            },
            {
                "title_tr": "Yazılım Eğitimleri",
                "title_en": "Software Training",
                "category": "software",
                "icon": "Code",
                "color_from": "#3B82F6",
                "color_to": "#2563EB",
                "order_index": 6
            }
        ]

        for box_data in target_boxes:
            existing_box = db.query(CourseBox).filter(CourseBox.category == box_data["category"]).first()
            if not existing_box:
                print(f"➕ Adding course box: {box_data['title_tr']}")
                new_box = CourseBox(**box_data)
                db.add(new_box)
            else:
                print(f"🔄 Updating course box: {box_data['title_tr']}")
                # Update fields to match exactly
                existing_box.title_tr = box_data["title_tr"]
                existing_box.title_en = box_data["title_en"]
                existing_box.icon = box_data["icon"]
                existing_box.color_from = box_data["color_from"]
                existing_box.color_to = box_data["color_to"]
                existing_box.order_index = box_data["order_index"]
        
        db.commit()
        print("✅ Course boxes aligned with frontend successfully.")
    except Exception as e:
        print(f"❌ Error aligning course boxes: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    align_course_boxes()
