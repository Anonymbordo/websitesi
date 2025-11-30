"""
Check all courses in database
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Course, Instructor, User

# Database setup
DATABASE_URL = "sqlite:///./education_platform.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)

def check_courses():
    db = SessionLocal()
    
    try:
        courses = db.query(Course).all()
        
        print(f"\n📚 Total courses in database: {len(courses)}\n")
        print("=" * 80)
        
        for course in courses:
            instructor = db.query(Instructor).filter(Instructor.id == course.instructor_id).first()
            user = db.query(User).filter(User.id == instructor.user_id).first() if instructor else None
            
            status = "✅ PUBLISHED" if course.is_published else "📝 DRAFT"
            featured = "⭐ FEATURED" if course.is_featured else ""
            
            print(f"\nID: {course.id} | {status} {featured}")
            print(f"Title: {course.title}")
            print(f"Category: {course.category}")
            print(f"Level: {course.level}")
            print(f"Price: ${course.price}")
            if course.discount_price:
                print(f"Discount Price: ${course.discount_price}")
            print(f"Duration: {course.duration_hours} hours")
            print(f"Instructor: {user.full_name if user else 'Unknown'}")
            print(f"Students: {course.enrollment_count}")
            print(f"Rating: {course.rating} ({course.total_ratings} reviews)")
            print(f"Created: {course.created_at}")
            print("-" * 80)
        
        # Summary
        published_count = sum(1 for c in courses if c.is_published)
        draft_count = sum(1 for c in courses if not c.is_published)
        featured_count = sum(1 for c in courses if c.is_featured)
        
        print(f"\n📊 Summary:")
        print(f"   Published: {published_count}")
        print(f"   Draft: {draft_count}")
        print(f"   Featured: {featured_count}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_courses()
