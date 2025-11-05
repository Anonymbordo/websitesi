"""
Create a test draft course
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Course, Instructor, User
from datetime import datetime

# Database setup
DATABASE_URL = "sqlite:///./education_platform.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)

def create_draft_course():
    db = SessionLocal()
    
    try:
        # Get first instructor
        instructor = db.query(Instructor).first()
        
        if not instructor:
            print("❌ No instructor found! Please create an instructor first.")
            return
        
        # Create draft course
        draft_course = Course(
            title="TEST TASLAK KURS",
            description="Bu bir test taslak kursudur. Admin panelinde görünmeli.",
            short_description="Test taslak kursu",
            instructor_id=instructor.id,
            price=99.99,
            discount_price=79.99,
            duration_hours=10,
            level="beginner",
            category="Tasarım",
            language="Turkish",
            is_online=True,
            is_published=False,  # DRAFT!
            is_featured=False,
            enrollment_count=0,
            rating=0.0,
            total_ratings=0,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(draft_course)
        db.commit()
        db.refresh(draft_course)
        
        print(f"✅ Draft course created successfully!")
        print(f"   ID: {draft_course.id}")
        print(f"   Title: {draft_course.title}")
        print(f"   Category: {draft_course.category}")
        print(f"   Published: {draft_course.is_published}")
        print(f"\n👉 Now check admin panel - filter by 'Taslak'")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_draft_course()
