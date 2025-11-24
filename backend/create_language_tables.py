"""
Script to create language courses tables in the database
"""
import sys
sys.path.append('.')

from database import engine
from models import Base, LanguageCourse, LanguageCourseTopic, LanguageCourseNote, LanguageCourseVideo, LanguageCourseExam, LanguageExamQuestion, LanguageCourseInstructor, LanguageCoursePurchase, LiveClassRequest

def create_tables():
    """Create all language course related tables"""
    try:
        print("🔄 Creating language courses tables...")
        
        # Create all tables defined in Base.metadata
        Base.metadata.create_all(bind=engine)
        
        print("✅ Language courses tables created successfully!")
        print("""
        Created tables:
        - language_courses
        - language_course_topics
        - language_course_notes
        - language_course_videos
        - language_course_exams
        - language_exam_questions
        - language_course_instructors
        - language_course_purchases
        - live_class_requests
        """)
        
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        raise

if __name__ == "__main__":
    create_tables()
