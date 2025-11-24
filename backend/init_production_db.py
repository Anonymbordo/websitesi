"""
Initialize school courses tables in production database
This should be run once after deployment
"""
import os
import sys

# Set environment to use production database
os.environ['DATABASE_URL'] = os.environ.get('DATABASE_URL', '')

from database import engine
from models import Base, SchoolCourse, SchoolCourseTopic, SchoolCourseNote, SchoolCourseVideo, SchoolCourseExam, SchoolExamQuestion, SchoolCourseInstructor, SchoolCoursePurchase

def init_production_tables():
    """Create all school course tables in production"""
    print("Initializing school course tables in production...")
    
    try:
        # Create only school course tables
        tables = [
            SchoolCourse.__table__,
            SchoolCourseTopic.__table__,
            SchoolCourseNote.__table__,
            SchoolCourseVideo.__table__,
            SchoolCourseExam.__table__,
            SchoolExamQuestion.__table__,
            SchoolCourseInstructor.__table__,
            SchoolCoursePurchase.__table__
        ]
        
        for table in tables:
            table.create(bind=engine, checkfirst=True)
            print(f"✅ Table {table.name} ready")
        
        print("✅ All school course tables initialized successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error initializing tables: {e}")
        return False

if __name__ == "__main__":
    success = init_production_tables()
    sys.exit(0 if success else 1)
