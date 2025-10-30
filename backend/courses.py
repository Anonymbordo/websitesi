from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import shutil
import os

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
    short_description: Optional[str]
    price: float
    discount_price: Optional[float]
    duration_hours: int
    level: str
    category: str
    subcategory: Optional[str]
    language: str
    thumbnail: Optional[str]
    preview_video: Optional[str]
    location: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    is_online: bool
    is_published: bool
    enrollment_count: int
    rating: float
    total_ratings: int
    created_at: datetime
    instructor: dict

    class Config:
        from_attributes = True

class ReviewCreate(BaseModel):
    rating: int
    comment: Optional[str] = None

# Utility functions
def get_instructor_or_404(user: User, db: Session):
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
@courses_router.get("/", response_model=List[CourseResponse])
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
            "instructor": instructor_info
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

@courses_router.post("/", response_model=CourseResponse)
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
        "name": instructor.user.full_name,
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
        "name": instructor.user.full_name,
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
    
    # Create upload directory if it doesn't exist
    upload_dir = "uploads/course_thumbnails"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Save file
    file_extension = file.filename.split(".")[-1]
    filename = f"course_{course_id}_thumbnail.{file_extension}"
    file_path = os.path.join(upload_dir, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Update course thumbnail path
    course.thumbnail = f"/{file_path}"
    db.commit()
    
    return {"message": "Thumbnail uploaded successfully", "thumbnail_url": course.thumbnail}

@courses_router.post("/{course_id}/lessons")
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
    categories = db.query(Course.category).distinct().filter(Course.is_published == True).all()
    return [cat[0] for cat in categories if cat[0]]

@courses_router.get("/my-courses")
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
            "rating": course.instructor.rating
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
        result.append(course_dict)
    
    return result