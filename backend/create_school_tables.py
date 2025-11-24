"""
Create school courses tables in the database
"""
from database import engine
from models import Base, SchoolCourse, SchoolCourseTopic, SchoolCourseNote, SchoolCourseVideo, SchoolCourseExam, SchoolExamQuestion, SchoolCourseInstructor, SchoolCoursePurchase

def create_school_tables():
    """Create all school course related tables"""
    print("Creating school course tables...")
    
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
        try:
            table.create(bind=engine, checkfirst=True)
            print(f"✅ Created table: {table.name}")
        except Exception as e:
            print(f"❌ Error creating {table.name}: {e}")
    
    print("School course tables created successfully!")

if __name__ == "__main__":
    create_school_tables()
