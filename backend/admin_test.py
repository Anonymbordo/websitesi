from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from database import get_db
from models import User, Instructor, Course, Enrollment, Payment
from auth import get_current_user

test_router = APIRouter()

# Pydantic models
class CourseAdmin(BaseModel):
    id: int
    title: str
    short_description: Optional[str] = None
    instructor_name: Optional[str] = None
    instructor_id: Optional[int] = None
    category: str
    level: str
    price: float
    discount_price: Optional[float] = None
    duration_hours: int
    enrollment_count: int = 0
    rating: float = 0.0
    total_ratings: int = 0
    is_published: bool
    is_featured: bool = False
    thumbnail: Optional[str] = None
    created_at: datetime
    total_revenue: float = 0.0
    total_students: int = 0

class AdminStats(BaseModel):
    total_users: int
    total_instructors: int
    total_courses: int
    total_enrollments: int
    total_revenue: float
    pending_instructor_approvals: int
    active_courses: int
    users_this_month: int
    revenue_this_month: float

class InstructorAdmin(BaseModel):
    id: int
    user: dict
    bio: Optional[str]
    specialization: Optional[str]
    experience_years: int
    rating: float
    total_students: int
    total_courses: int
    total_revenue: float
    is_approved: bool
    is_featured: Optional[bool] = False
    created_at: datetime

class UserAdmin(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    is_verified: bool
    city: Optional[str]
    district: Optional[str]
    created_at: datetime
    total_enrollments: int
    total_spent: float

# Dependency to check admin role
def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

@test_router.get("/test")
async def test_endpoint():
    return {"message": "Test admin router works!"}

@test_router.get("/stats", response_model=AdminStats)
async def get_admin_stats(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    try:
        total_users = db.query(User).count()
        total_instructors = db.query(Instructor).filter(Instructor.is_approved == True).count()
        total_courses = db.query(Course).count()
        total_enrollments = db.query(Enrollment).count()
        
        total_revenue = db.query(func.sum(Payment.amount)).filter(
            Payment.payment_status == "completed"
        ).scalar() or 0.0
        
        pending_instructor_approvals = db.query(Instructor).filter(
            or_(Instructor.is_approved == False, Instructor.is_approved.is_(None))
        ).count()
        
        active_courses = db.query(Course).filter(Course.is_published == True).count()
        
        this_month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        users_this_month = db.query(User).filter(
            User.created_at >= this_month_start
        ).count()
        
        revenue_this_month = db.query(func.sum(Payment.amount)).filter(
            and_(
                Payment.payment_status == "completed",
                Payment.payment_date >= this_month_start
            )
        ).scalar() or 0.0
        
        return AdminStats(
            total_users=total_users,
            total_instructors=total_instructors,
            total_courses=total_courses,
            total_enrollments=total_enrollments,
            total_revenue=total_revenue,
            pending_instructor_approvals=pending_instructor_approvals,
            active_courses=active_courses,
            users_this_month=users_this_month,
            revenue_this_month=revenue_this_month
        )
    except Exception as e:
        print(f"Error fetching admin stats: {e}")
        return AdminStats(
            total_users=0, total_instructors=0, total_courses=0, 
            total_enrollments=0, total_revenue=0.0, 
            pending_instructor_approvals=0, active_courses=0, 
            users_this_month=0, revenue_this_month=0.0
        )

@test_router.get("/courses", response_model=List[CourseAdmin])
async def get_courses(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    is_published: Optional[bool] = None,
    search: Optional[str] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    try:
        query = db.query(Course)
        
        if category:
            query = query.filter(Course.category == category)
        
        if is_published is not None:
            query = query.filter(Course.is_published == is_published)
        
        if search:
            query = query.filter(
                or_(
                    Course.title.ilike(f"%{search}%"),
                    Course.description.ilike(f"%{search}%")
                )
            )
        
        courses = query.order_by(Course.created_at.desc()).offset(skip).limit(limit).all()
        
        result = []
        for course in courses:
            try:
                # Instructor bilgisi alırken hata olabilir
                instructor_name = "Unknown"
                instructor_id = None
                if course.instructor:
                    try:
                        if course.instructor.user:
                            instructor_name = course.instructor.user.full_name
                        instructor_id = course.instructor.id
                    except Exception as e:
                        print(f"Error getting instructor for course {course.id}: {e}")
                
                total_revenue = db.query(func.sum(Payment.amount)).filter(
                    and_(
                        Payment.course_id == course.id,
                        Payment.payment_status == "completed"
                    )
                ).scalar() or 0.0
                
                course_admin = CourseAdmin(
                    id=course.id,
                    title=course.title,
                    short_description=course.short_description,
                    instructor_name=instructor_name,
                    instructor_id=instructor_id,
                    category=course.category,
                    level=course.level,
                    price=course.price,
                    discount_price=course.discount_price,
                    duration_hours=course.duration_hours,
                    enrollment_count=course.enrollment_count or 0,
                    rating=course.rating or 0.0,
                    total_ratings=course.total_ratings or 0,
                    is_published=course.is_published,
                    is_featured=getattr(course, 'is_featured', False),
                    thumbnail=course.thumbnail,
                    created_at=course.created_at,
                    total_revenue=total_revenue,
                    total_students=course.enrollment_count or 0
                )
                result.append(course_admin)
            except Exception as e:
                print(f"Error serializing course {course.id}: {e}")
                continue
        
        return result
    except Exception as e:
        print(f"Error fetching courses: {e}")
        import traceback
        traceback.print_exc()
        return []


@test_router.get("/users", response_model=List[UserAdmin])
async def get_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
    city: Optional[str] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(User)
    
    # Apply filters
    if search:
        query = query.filter(
            or_(
                User.full_name.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%")
            )
        )
    
    if role:
        query = query.filter(User.role == role)
    
    if city:
        query = query.filter(User.city.ilike(f"%{city}%"))
    
    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    
    # Get additional stats for each user
    result = []
    for user in users:
        total_enrollments = db.query(Enrollment).filter(Enrollment.student_id == user.id).count()
        total_spent = db.query(func.sum(Payment.amount)).filter(
            and_(
                Payment.user_id == user.id,
                Payment.payment_status == "completed"
            )
        ).scalar() or 0.0
        
        user_admin = UserAdmin(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            is_active=user.is_active,
            is_verified=user.is_verified,
            city=user.city,
            district=user.district,
            created_at=user.created_at,
            total_enrollments=total_enrollments,
            total_spent=total_spent
        )
        result.append(user_admin)
    
    return result

@test_router.get("/instructors", response_model=List[InstructorAdmin])
async def get_instructors(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    is_approved: Optional[bool] = None,
    search: Optional[str] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Instructor)
    
    # Apply filters
    if is_approved is not None:
        if is_approved is False:
            query = query.filter(or_(Instructor.is_approved == False, Instructor.is_approved.is_(None)))
        else:
            query = query.filter(Instructor.is_approved == True)
    
    if search:
        query = query.join(User).filter(
            or_(
                User.full_name.ilike(f"%{search}%"),
                Instructor.specialization.ilike(f"%{search}%")
            )
        )
    
    instructors = query.order_by(Instructor.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for instructor in instructors:
        total_courses = db.query(Course).filter(Course.instructor_id == instructor.id).count()
        
        total_revenue = db.query(func.sum(Payment.amount)).join(Course).filter(
            and_(
                Course.instructor_id == instructor.id,
                Payment.payment_status == "completed"
            )
        ).scalar() or 0.0
        
        user_info = {
            "id": instructor.user.id,
            "email": instructor.user.email,
            "full_name": instructor.user.full_name,
            "city": instructor.user.city,
            "district": instructor.user.district
        }
        
        instructor_admin = InstructorAdmin(
            id=instructor.id,
            user=user_info,
            bio=instructor.bio,
            specialization=instructor.specialization,
            experience_years=instructor.experience_years,
            rating=instructor.rating,
            total_students=instructor.total_students,
            total_courses=total_courses,
            total_revenue=total_revenue,
            is_approved=instructor.is_approved,
            is_featured=getattr(instructor, 'is_featured', False),
            created_at=instructor.created_at
        )
        result.append(instructor_admin)
    
    return result

@test_router.get("/instructors/{instructor_id}")
async def get_instructor_detail(
    instructor_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    instructor = db.query(Instructor).filter(Instructor.id == instructor_id).first()
    
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor not found"
        )
    
    user_info = {
        "id": instructor.user.id,
        "full_name": instructor.user.full_name,
        "email": instructor.user.email,
        "phone": instructor.user.phone,
        "city": instructor.user.city,
        "district": instructor.user.district,
        "profile_image": instructor.user.profile_image,
        "created_at": instructor.user.created_at
    }
    
    courses = db.query(Course).filter(Course.instructor_id == instructor_id).all()
    courses_info = [{
        "id": course.id,
        "title": course.title,
        "is_published": course.is_published,
        "price": course.price,
        "students_count": course.students_count
    } for course in courses]
    
    return {
        "id": instructor.id,
        "bio": instructor.bio,
        "specialization": instructor.specialization,
        "experience_years": instructor.experience_years,
        "certification": instructor.certification,
        "rating": instructor.rating,
        "total_ratings": instructor.total_ratings,
        "total_students": instructor.total_students,
        "is_approved": instructor.is_approved,
        "created_at": instructor.created_at,
        "user": user_info,
        "total_courses": len(courses_info),
        "courses": courses_info
    }

@test_router.put("/instructors/{instructor_id}/approve")
async def approve_instructor(
    instructor_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    instructor = db.query(Instructor).filter(Instructor.id == instructor_id).first()
    
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor not found"
        )
    
    instructor.is_approved = True
    db.commit()
    
    return {"message": "Instructor approved successfully"}

@test_router.put("/instructors/{instructor_id}/reject")
async def reject_instructor(
    instructor_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    instructor = db.query(Instructor).filter(Instructor.id == instructor_id).first()
    
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor not found"
        )
    
    instructor.is_approved = False
    db.commit()
    
    return {"message": "Instructor rejected"}

@test_router.put("/instructors/{instructor_id}/feature")
async def feature_instructor(
    instructor_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    instructor = db.query(Instructor).filter(Instructor.id == instructor_id).first()
    
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor not found"
        )
    
    try:
        if hasattr(instructor, 'is_featured'):
            instructor.is_featured = True
            db.commit()
            return {"message": "Instructor featured successfully"}
        else:
            return {"message": "is_featured column not available yet"}
    except Exception as e:
        db.rollback()
        print(f"Feature instructor error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@test_router.put("/instructors/{instructor_id}/unfeature")
async def unfeature_instructor(
    instructor_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    instructor = db.query(Instructor).filter(Instructor.id == instructor_id).first()
    
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor not found"
        )
    
    try:
        if hasattr(instructor, 'is_featured'):
            instructor.is_featured = False
            db.commit()
            return {"message": "Instructor unfeatured"}
        else:
            return {"message": "is_featured column not available yet"}
    except Exception as e:
        db.rollback()
        print(f"Unfeature instructor error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@test_router.put("/users/{user_id}/activate")
async def activate_user(
    user_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.is_active = True
    db.commit()
    
    return {"message": "User activated successfully"}

@test_router.put("/users/{user_id}/deactivate")
async def deactivate_user(
    user_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.is_active = False
    db.commit()
    
    return {"message": "User deactivated successfully"}

@test_router.put("/courses/{course_id}/publish")
async def publish_course(
    course_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    course.is_published = True
    db.commit()
    
    return {"message": "Course published successfully"}

@test_router.put("/courses/{course_id}/unpublish")
async def unpublish_course(
    course_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    course.is_published = False
    db.commit()
    
    return {"message": "Course unpublished"}

@test_router.put("/courses/{course_id}/feature")
async def feature_course(
    course_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    course.is_featured = True
    db.commit()
    
    return {"message": "Course featured successfully"}

@test_router.put("/courses/{course_id}/unfeature")
async def unfeature_course(
    course_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    course.is_featured = False
    db.commit()
    
    return {"message": "Course unfeatured"}

@test_router.post("/migrate/instructor-featured")
async def migrate_instructor_featured(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Add is_featured column to instructors table if it doesn't exist"""
    try:
        from sqlalchemy import text, inspect
        
        # Check if column exists
        inspector = inspect(db.bind)
        existing_columns = [col['name'] for col in inspector.get_columns('instructors')]
        
        if 'is_featured' not in existing_columns:
            db.execute(text(
                "ALTER TABLE instructors ADD COLUMN is_featured BOOLEAN DEFAULT FALSE"
            ))
            db.commit()
            return {"message": "✅ Added is_featured column to instructors table"}
        else:
            return {"message": "✅ Column is_featured already exists"}
            
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Migration failed: {str(e)}")
