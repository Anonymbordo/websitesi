from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import shutil
import os
from firebase_config import upload_file_to_firebase, init_firebase

from database import get_db
from models import Course, Instructor, User, Lesson, CourseMaterial, Enrollment, Review
from auth import get_current_user

courses_router = APIRouter()

# Pydantic models
class CourseCreate(BaseModel):
    title: str
    description: str
    short_description: Optional[str] = None
    price: float
    discount_price: Optional[float] = None
    duration_hours: int
    level: str = "beginner"
    category: str
    subcategory: Optional[str] = None
    language: str = "Turkish"
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_online: bool = True

class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = None
    price: Optional[float] = None
    discount_price: Optional[float] = None
    duration_hours: Optional[int] = None
    level: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    language: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_online: Optional[bool] = None
    is_published: Optional[bool] = None

class LessonCreate(BaseModel):
    title: str
    description: Optional[str] = None
    duration_minutes: int
    order_index: int
    is_preview: bool = False
    notes: Optional[str] = None

class CourseResponse(BaseModel):
    id: int
    title: str
    description: str
    short_description: Optional[str] = None
    price: float
    discount_price: Optional[float] = None
    duration_hours: int
    level: str
    category: str
    subcategory: Optional[str] = None
    language: str = "Turkish"
    thumbnail: Optional[str] = None
    preview_video: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_online: bool = True
    is_published: bool = False
    enrollment_count: int = 0
    rating: float = 0.0
    total_ratings: int = 0
    created_at: datetime
    instructor: dict

    class Config:
        from_attributes = True

class ReviewCreate(BaseModel):
    rating: int
    comment: Optional[str] = None

class EnrollmentData(BaseModel):
    enrolled_at: datetime
    progress_percentage: int
    completed_at: Optional[datetime] = None

class EnrolledCourseResponse(CourseResponse):
    enrollment: EnrollmentData

class LessonResponse(LessonCreate):
    id: int
    course_id: int
    video_url: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# Utility functions
def get_instructor_or_404(user: User, db: Session):
    # Admin kullanıcılar için özel kontrol
    if user.role == "admin":
        # Admin için varsayılan instructor bul veya oluştur
        instructor = db.query(Instructor).filter(Instructor.user_id == user.id).first()
        if not instructor:
            # Admin için otomatik instructor kaydı oluştur
            instructor = Instructor(
                user_id=user.id,
                bio="Platform Yöneticisi",
                specialization="Tüm Kategoriler",
                experience_years=0,
                rating=5.0,
                total_students=0,
                is_approved=True
            )
            db.add(instructor)
            db.commit()
            db.refresh(instructor)
        return instructor
    
    # Normal instructor kontrolü
    instructor = db.query(Instructor).filter(Instructor.user_id == user.id).first()
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You need to be an approved instructor to perform this action"
        )
    if not instructor.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your instructor account is not approved yet"
        )
    return instructor

# Routes
@courses_router.get("", response_model=List[CourseResponse])
async def get_courses(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    level: Optional[str] = None,
    city: Optional[str] = None,
    district: Optional[str] = None,
    is_online: Optional[bool] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Course).filter(Course.is_published == True)
    
    # Apply filters
    if category:
        query = query.filter(Course.category == category)
    if level:
        query = query.filter(Course.level == level)
    if is_online is not None:
        query = query.filter(Course.is_online == is_online)
    if city:
        query = query.filter(Course.location.ilike(f"%{city}%"))
    if district:
        query = query.filter(Course.location.ilike(f"%{district}%"))
    if search:
        query = query.filter(
            or_(
                Course.title.ilike(f"%{search}%"),
                Course.description.ilike(f"%{search}%"),
                Course.category.ilike(f"%{search}%")
            )
        )
    if min_price is not None:
        query = query.filter(Course.price >= min_price)
    if max_price is not None:
        query = query.filter(Course.price <= max_price)
    
    # Get courses with instructor info
    courses = query.offset(skip).limit(limit).all()
    
    # Format response with instructor info
    result = []
    for course in courses:
        instructor_info = {
            "id": course.instructor.id,
            "name": course.instructor.user.full_name,
            "bio": course.instructor.bio,
            "rating": course.instructor.rating,
            "total_students": course.instructor.total_students,
            "experience_years": course.instructor.experience_years
        }
        
        course_dict = {
            **course.__dict__,
            "instructor": instructor_info,
            "language": course.language or "Turkish",
            "enrollment_count": course.enrollment_count or 0,
            "rating": course.rating or 0.0,
            "total_ratings": course.total_ratings or 0
        }
        result.append(CourseResponse(**course_dict))
    
    return result

@courses_router.get("/featured/list", response_model=List[CourseResponse])
async def get_featured_courses(
    limit: int = Query(6, ge=1, le=20),
    db: Session = Depends(get_db)
):
    """Ana sayfa için öne çıkan kursları getir"""
    courses = db.query(Course).filter(
        Course.is_published == True,
        Course.is_featured == True
    ).order_by(Course.created_at.desc()).limit(limit).all()
    
    result = []
    for course in courses:
        instructor_info = {
            "id": course.instructor.id,
            "name": course.instructor.user.full_name,
            "bio": course.instructor.bio,
            "rating": course.instructor.rating,
            "total_students": course.instructor.total_students,
            "experience_years": course.instructor.experience_years
        }
        
        course_dict = {
            **course.__dict__,
            "instructor": instructor_info,
            "language": course.language or "Turkish",
            "enrollment_count": course.enrollment_count or 0,
            "rating": course.rating or 0.0,
            "total_ratings": course.total_ratings or 0
        }
        result.append(CourseResponse(**course_dict))
    
    return result

@courses_router.get("/{course_id}", response_model=CourseResponse)
async def get_course(course_id: int, db: Session = Depends(get_db)):
    course = db.query(Course).filter(
        Course.id == course_id,
        Course.is_published == True
    ).first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    instructor_info = {
        "id": course.instructor.id,
        "name": course.instructor.user.full_name,
        "bio": course.instructor.bio,
        "rating": course.instructor.rating,
        "total_students": course.instructor.total_students,
        "experience_years": course.instructor.experience_years
    }
    
    course_dict = {
        **course.__dict__,
        "instructor": instructor_info
    }
    
    return CourseResponse(**course_dict)

@courses_router.post("", response_model=CourseResponse)
async def create_course(
    course_create: CourseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    instructor = get_instructor_or_404(current_user, db)
    
    course = Course(
        **course_create.dict(),
        instructor_id=instructor.id
    )
    
    db.add(course)
    db.commit()
    db.refresh(course)
    
    instructor_info = {
        "id": instructor.id,
        "name": instructor.user_full_name,
        "bio": instructor.bio,
        "rating": instructor.rating,
        "total_students": instructor.total_students,
        "experience_years": instructor.experience_years
    }
    
    course_dict = {
        **course.__dict__,
        "instructor": instructor_info
    }
    
    return CourseResponse(**course_dict)

@courses_router.put("/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: int,
    course_update: CourseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    instructor = get_instructor_or_404(current_user, db)
    
    course = db.query(Course).filter(
        Course.id == course_id,
        Course.instructor_id == instructor.id
    ).first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found or you don't have permission to edit it"
        )
    
    # Update course fields
    for field, value in course_update.dict(exclude_unset=True).items():
        setattr(course, field, value)
    
    course.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(course)
    
    instructor_info = {
        "id": instructor.id,
        "name": instructor.user_full_name,
        "bio": instructor.bio,
        "rating": instructor.rating,
        "total_students": instructor.total_students,
        "experience_years": instructor.experience_years
    }
    
    course_dict = {
        **course.__dict__,
        "instructor": instructor_info
    }
    
    return CourseResponse(**course_dict)

@courses_router.post("/{course_id}/upload-thumbnail")
async def upload_thumbnail(
    course_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    instructor = get_instructor_or_404(current_user, db)
    
    course = db.query(Course).filter(
        Course.id == course_id,
        Course.instructor_id == instructor.id
    ).first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found or you don't have permission to edit it"
        )
    
    file_extension = file.filename.split(".")[-1]
    filename = f"course_{course_id}_thumbnail.{file_extension}"
    
    # Try Firebase upload
    try:
        import io
        # Read file content
        content = await file.read()
        file_obj = io.BytesIO(content)
        
        firebase_path = f"course_thumbnails/{filename}"
        public_url = upload_file_to_firebase(file_obj, firebase_path, file.content_type)
        
        course.thumbnail = public_url
        db.commit()
        
        return {"message": "Thumbnail uploaded successfully", "thumbnail_url": course.thumbnail}
        
    except Exception as e:
        print(f"Firebase upload failed: {e}")
        # Fallback to local storage
        upload_dir = "uploads/course_thumbnails"
        if os.environ.get("VERCEL"):
            upload_dir = "/tmp/uploads/course_thumbnails"
            
        os.makedirs(upload_dir, exist_ok=True)
        
        file_path = os.path.join(upload_dir, filename)
        
        # Reset file pointer if we read it
        await file.seek(0)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Update course thumbnail path
        # If on Vercel, we need to ensure the path starts with /uploads so StaticFiles picks it up
        # The StaticFiles is mounted at /uploads serving /tmp/uploads
        # So if we save to /tmp/uploads/course_thumbnails/file.jpg
        # The URL should be /uploads/course_thumbnails/file.jpg
        
        if os.environ.get("VERCEL"):
             course.thumbnail = f"/uploads/course_thumbnails/{filename}"
        else:
             course.thumbnail = f"/{file_path}"
             
        db.commit()
        
        return {"message": "Thumbnail uploaded locally (Firebase failed)", "thumbnail_url": course.thumbnail}

@courses_router.post("/{course_id}/lessons", response_model=LessonResponse)
async def create_lesson(
    course_id: int,
    lesson_create: LessonCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    instructor = get_instructor_or_404(current_user, db)
    
    course = db.query(Course).filter(
        Course.id == course_id,
        Course.instructor_id == instructor.id
    ).first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found or you don't have permission to edit it"
        )
    
    lesson = Lesson(
        **lesson_create.dict(),
        course_id=course_id
    )
    
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    
    return lesson

@courses_router.post("/{course_id}/enroll")
async def enroll_in_course(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(
        Course.id == course_id,
        Course.is_published == True
    ).first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Check if already enrolled
    existing_enrollment = db.query(Enrollment).filter(
        Enrollment.student_id == current_user.id,
        Enrollment.course_id == course_id
    ).first()
    
    if existing_enrollment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already enrolled in this course"
        )
    
    # Create enrollment
    enrollment = Enrollment(
        student_id=current_user.id,
        course_id=course_id
    )
    
    db.add(enrollment)
    
    # Update course enrollment count
    course.enrollment_count += 1
    
    # Update instructor total students
    course.instructor.total_students += 1
    
    db.commit()
    
    return {"message": "Successfully enrolled in course"}

@courses_router.post("/{course_id}/reviews")
async def create_review(
    course_id: int,
    review_create: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if enrolled in course
    enrollment = db.query(Enrollment).filter(
        Enrollment.student_id == current_user.id,
        Enrollment.course_id == course_id
    ).first()
    
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be enrolled in this course to leave a review"
        )
    
    # Check if already reviewed
    existing_review = db.query(Review).filter(
        Review.reviewer_id == current_user.id,
        Review.course_id == course_id
    ).first()
    
    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reviewed this course"
        )
    
    course = db.query(Course).filter(Course.id == course_id).first()
    
    # Create review
    review = Review(
        reviewer_id=current_user.id,
        course_id=course_id,
        instructor_id=course.instructor_id,
        rating=review_create.rating,
        comment=review_create.comment
    )
    
    db.add(review)
    
    # Update course rating
    total_ratings = course.total_ratings + 1
    new_rating = ((course.rating * course.total_ratings) + review_create.rating) / total_ratings
    course.rating = round(new_rating, 2)
    course.total_ratings = total_ratings
    
    # Update instructor rating
    instructor = course.instructor
    instructor_total_ratings = instructor.total_ratings + 1
    new_instructor_rating = ((instructor.rating * instructor.total_ratings) + review_create.rating) / instructor_total_ratings
    instructor.rating = round(new_instructor_rating, 2)
    instructor.total_ratings = instructor_total_ratings
    
    db.commit()
    
    return {"message": "Review created successfully"}

@courses_router.get("/categories/list")
async def get_categories(db: Session = Depends(get_db)):
    """
    Kurs kategorilerini getir:
    1. Önce Category tablosundan course tipinde olanları getir
    2. Yoksa Course tablosundan unique kategorileri getir (geriye dönük uyumluluk)
    """
    from models import Category
    
    # Önce Category tablosuna bak
    db_categories = db.query(Category).filter(
        and_(Category.is_active == True, Category.type == "course")
    ).all()
    
    if db_categories:
        return [cat.name for cat in db_categories]
    
    # Category tablosu boşsa Course'lardan çek
    course_categories = db.query(Course.category).distinct().filter(
        Course.is_published == True
    ).all()
    
    return [cat[0] for cat in course_categories if cat[0]]

@courses_router.get("/my-courses", response_model=List[EnrolledCourseResponse])
async def get_my_courses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    enrollments = db.query(Enrollment).filter(Enrollment.student_id == current_user.id).all()
    
    result = []
    for enrollment in enrollments:
        course = enrollment.course
        instructor_info = {
            "id": course.instructor.id,
            "name": course.instructor.user.full_name,
            "bio": course.instructor.bio,
            "rating": course.instructor.rating,
            "total_students": course.instructor.total_students,
            "experience_years": course.instructor.experience_years
        }
        
        course_dict = {
            **course.__dict__,
            "instructor": instructor_info,
            "enrollment": {
                "enrolled_at": enrollment.enrolled_at,
                "progress_percentage": enrollment.progress_percentage,
                "completed_at": enrollment.completed_at
            }
        }
        result.append(EnrolledCourseResponse(**course_dict))
    
    return result