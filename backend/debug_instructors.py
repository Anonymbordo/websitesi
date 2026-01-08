
import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from decouple import config

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

try:
    from models import Instructor, User, Course
    from database import SessionLocal
except ImportError:
    # Fallback import attempt
    sys.path.append(os.getcwd())
    from backend.models import Instructor, User, Course
    from backend.database import SessionLocal

def debug_instructors():
    print("Debugging /api/instructors endpoint logic...")
    
    db = SessionLocal()
    try:
        # 1. Fetch instructors
        print("Fetching instructors...")
        instructors = db.query(Instructor).filter(Instructor.is_approved == True).limit(4).all()
        print(f"Found {len(instructors)} approved instructors.")
        
        for i, instructor in enumerate(instructors):
            print(f"[{i}] Instructor ID: {instructor.id}, User ID: {instructor.user_id}")
            
            # 2. Access User
            try:
                user = instructor.user
                if user:
                    print(f"    User found: {user.full_name}")
                    user_info = {
                        "id": instructor.user.id,
                        "full_name": instructor.user.full_name,
                        "city": instructor.user.city,
                        "district": instructor.user.district,
                        "profile_image": instructor.user.profile_image
                    }
                    print("    User info extracted successfully.")
                else:
                    print("    ❌ ERROR: instructor.user is None!")
            except Exception as e:
                print(f"    ❌ Error accessing user: {e}")
                
            # 3. Count courses
            try:
                total_courses = db.query(Course).filter(
                    Course.instructor_id == instructor.id,
                    Course.is_published == True
                ).count()
                print(f"    Total courses: {total_courses}")
            except Exception as e:
                 print(f"    ❌ Error counting courses: {e}")
                 
            # 4. Construct response dict
            try:
                instructor_dict = {
                    **instructor.__dict__,
                    "user": user_info if 'user_info' in locals() else {},
                    "total_courses": total_courses if 'total_courses' in locals() else 0
                }
                # Remove internal SA state
                if "_sa_instance_state" in instructor_dict:
                    del instructor_dict["_sa_instance_state"]
                    
                print("    Response dict constructed.")
            except Exception as e:
                 print(f"    ❌ Error constructing response dict: {e}")

    except Exception as e:
        print(f"❌ General error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    debug_instructors()
