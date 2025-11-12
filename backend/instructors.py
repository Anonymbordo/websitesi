from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from database import get_db
from models import Instructor, User, Course, Review
from auth import get_current_user
import os
import shutil
from typing import List
from dotenv import load_dotenv

load_dotenv()
UPLOAD_DIRECTORY = os.getenv('UPLOAD_DIRECTORY', 'uploads')

instructors_router = APIRouter()

# Pydantic models
class InstructorCreate(BaseModel):
    bio: Optional[str] = None
    specialization: Optional[str] = None
    experience_years: int = 0
    certification: Optional[str] = None

class InstructorUpdate(BaseModel):
    bio: Optional[str] = None
    specialization: Optional[str] = None
    experience_years: Optional[int] = None
    certification: Optional[str] = None

class InstructorResponse(BaseModel):
    id: int
    bio: Optional[str]
    specialization: Optional[str]
    experience_years: int
    rating: float
    total_ratings: int
    total_students: int
    is_approved: bool
    created_at: datetime
    user: dict
    total_courses: int

    class Config:
        from_attributes = True

class InstructorPublicResponse(BaseModel):
    id: int
    bio: Optional[str]
    specialization: Optional[str]
    experience_years: int
    rating: float
    total_ratings: int
    total_students: int
    created_at: datetime
    user: dict
    total_courses: int
    courses: List[dict]

    class Config:
        from_attributes = True

# Routes
@instructors_router.get("/", response_model=List[InstructorResponse])
async def get_instructors(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    specialization: Optional[str] = None,
    city: Optional[str] = None,
    district: Optional[str] = None,
    search: Optional[str] = None,
    min_rating: Optional[float] = None,
    min_experience: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Instructor).filter(Instructor.is_approved == True)
    
    # Apply filters
    if specialization:
        query = query.filter(Instructor.specialization.ilike(f"%{specialization}%"))
    
    if city or district:
        query = query.join(User).filter(
            or_(
                User.city.ilike(f"%{city}%") if city else True,
                User.district.ilike(f"%{district}%") if district else True
            )
        )
    
    if search:
        query = query.join(User).filter(
            or_(
                User.full_name.ilike(f"%{search}%"),
                Instructor.bio.ilike(f"%{search}%"),
                Instructor.specialization.ilike(f"%{search}%")
            )
        )
    
    if min_rating is not None:
        query = query.filter(Instructor.rating >= min_rating)
    
    if min_experience is not None:
        query = query.filter(Instructor.experience_years >= min_experience)
    
    # Order by rating and total students
    query = query.order_by(Instructor.rating.desc(), Instructor.total_students.desc())
    
    instructors = query.offset(skip).limit(limit).all()
    
    # Format response
    result = []
    for instructor in instructors:
        user_info = {
            "id": instructor.user.id,
            "full_name": instructor.user.full_name,
            "city": instructor.user.city,
            "district": instructor.user.district,
            "profile_image": instructor.user.profile_image
        }
        
        # Count total courses
        total_courses = db.query(Course).filter(
            Course.instructor_id == instructor.id,
            Course.is_published == True
        ).count()
        
        instructor_dict = {
            **instructor.__dict__,
            "user": user_info,
            "total_courses": total_courses
        }
        result.append(InstructorResponse(**instructor_dict))
    
    return result

@instructors_router.get("/{instructor_id}", response_model=InstructorPublicResponse)
async def get_instructor(instructor_id: int, db: Session = Depends(get_db)):
    instructor = db.query(Instructor).filter(
        Instructor.id == instructor_id,
        Instructor.is_approved == True
    ).first()
    
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor not found"
        )
    
    user_info = {
        "id": instructor.user.id,
        "full_name": instructor.user.full_name,
        "city": instructor.user.city,
        "district": instructor.user.district,
        "profile_image": instructor.user.profile_image
    }
    
    # Get instructor's courses
    courses = db.query(Course).filter(
        Course.instructor_id == instructor_id,
        Course.is_published == True
    ).all()
    
    courses_info = []
    for course in courses:
        course_dict = {
            "id": course.id,
            "title": course.title,
            "short_description": course.short_description,
            "price": course.price,
            "discount_price": course.discount_price,
            "duration_hours": course.duration_hours,
            "level": course.level,
            "category": course.category,
            "thumbnail": course.thumbnail,
            "rating": course.rating,
            "enrollment_count": course.enrollment_count,
            "is_online": course.is_online,
            "location": course.location
        }
        courses_info.append(course_dict)
    
    instructor_dict = {
        **instructor.__dict__,
        "user": user_info,
        "total_courses": len(courses_info),
        "courses": courses_info
    }
    
    return InstructorPublicResponse(**instructor_dict)

@instructors_router.post("/apply")
async def apply_as_instructor(
    bio: str = Form(None),
    specialization: str = Form(None),
    experience_years: int = Form(0),
    profile_image: UploadFile = File(None),
    cv: UploadFile = File(None),
    certificates: List[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if user already has an instructor profile
    existing_instructor = db.query(Instructor).filter(Instructor.user_id == current_user.id).first()
    if existing_instructor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an instructor application"
        )

    # Create instructor profile (files will be saved after we have an id)
    instructor = Instructor(
        user_id=current_user.id,
        bio=bio,
        specialization=specialization,
        experience_years=experience_years,
        is_approved=False  # Requires admin approval
    )

    db.add(instructor)
    # Update user role
    current_user.role = "instructor"
    db.commit()
    db.refresh(instructor)

    # Prepare upload dir
    instructor_dir = os.path.join(UPLOAD_DIRECTORY, 'instructors', str(instructor.id))
    os.makedirs(instructor_dir, exist_ok=True)

    # Save profile image
    if profile_image:
        filename = f"profile_{profile_image.filename}"
        dest = os.path.join(instructor_dir, filename)
        with open(dest, 'wb') as buffer:
            shutil.copyfileobj(profile_image.file, buffer)
        # Save relative path to user profile_image
        current_user.profile_image = f"/{dest.replace('\\\\', '/') }"

    # Save CV
    cert_paths = []
    if cv:
        filename = f"cv_{cv.filename}"
        dest = os.path.join(instructor_dir, filename)
        with open(dest, 'wb') as buffer:
            shutil.copyfileobj(cv.file, buffer)
        cert_paths.append(f"/{dest.replace('\\\\', '/') }")

    # Save certificates (multiple)
    if certificates:
        for cert in certificates:
            filename = f"cert_{cert.filename}"
            dest = os.path.join(instructor_dir, filename)
            with open(dest, 'wb') as buffer:
                shutil.copyfileobj(cert.file, buffer)
            cert_paths.append(f"/{dest.replace('\\\\', '/') }")

    # Store certification/cv paths in instructor.certification (JSON-like string)
    if cert_paths:
        instructor.certification = ','.join(cert_paths)

    db.commit()
    db.refresh(instructor)

    return {
        "message": "Instructor application submitted successfully. Please wait for admin approval.",
        "instructor_id": instructor.id,
        "uploaded_files": cert_paths
    }

@instructors_router.put("/profile")
async def update_instructor_profile(
    instructor_update: InstructorUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    instructor = db.query(Instructor).filter(Instructor.user_id == current_user.id).first()
    
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor profile not found"
        )
    
    # Update instructor fields
    for field, value in instructor_update.dict(exclude_unset=True).items():
        setattr(instructor, field, value)
    
    db.commit()
    db.refresh(instructor)
    
    user_info = {
        "id": instructor.user.id,
        "full_name": instructor.user.full_name,
        "city": instructor.user.city,
        "district": instructor.user.district,
        "profile_image": instructor.user.profile_image
    }
    
    total_courses = db.query(Course).filter(
        Course.instructor_id == instructor.id,
        Course.is_published == True
    ).count()
    
    instructor_dict = {
        **instructor.__dict__,
        "user": user_info,
        "total_courses": total_courses
    }
    
    return InstructorResponse(**instructor_dict)

@instructors_router.get("/my/profile")
async def get_my_instructor_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    instructor = db.query(Instructor).filter(Instructor.user_id == current_user.id).first()
    
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor profile not found"
        )
    
    user_info = {
        "id": instructor.user.id,
        "full_name": instructor.user.full_name,
        "email": instructor.user.email,
        "phone": instructor.user.phone,
        "city": instructor.user.city,
        "district": instructor.user.district,
        "profile_image": instructor.user.profile_image
    }
    
    # Get instructor's courses (including unpublished)
    courses = db.query(Course).filter(Course.instructor_id == instructor.id).all()
    
    courses_info = []
    for course in courses:
        course_dict = {
            "id": course.id,
            "title": course.title,
            "short_description": course.short_description,
            "price": course.price,
            "discount_price": course.discount_price,
            "duration_hours": course.duration_hours,
            "level": course.level,
            "category": course.category,
            "thumbnail": course.thumbnail,
            "rating": course.rating,
            "enrollment_count": course.enrollment_count,
            "is_online": course.is_online,
            "is_published": course.is_published,
            "location": course.location,
            "created_at": course.created_at,
            "updated_at": course.updated_at
        }
        courses_info.append(course_dict)
    
    instructor_dict = {
        **instructor.__dict__,
        "user": user_info,
        "total_courses": len(courses_info),
        "courses": courses_info
    }
    
    return instructor_dict

@instructors_router.get("/{instructor_id}/reviews")
async def get_instructor_reviews(
    instructor_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    instructor = db.query(Instructor).filter(
        Instructor.id == instructor_id,
        Instructor.is_approved == True
    ).first()
    
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor not found"
        )
    
    reviews = db.query(Review).filter(
        Review.instructor_id == instructor_id,
        Review.is_approved == True
    ).order_by(Review.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for review in reviews:
        review_dict = {
            "id": review.id,
            "rating": review.rating,
            "comment": review.comment,
            "created_at": review.created_at,
            "reviewer": {
                "full_name": review.reviewer.full_name,
                "profile_image": review.reviewer.profile_image
            },
            "course": {
                "id": review.course.id,
                "title": review.course.title
            } if review.course else None
        }
        result.append(review_dict)
    
    return result

@instructors_router.get("/specializations/list")
async def get_specializations(db: Session = Depends(get_db)):
    specializations = db.query(Instructor.specialization).distinct().filter(
        Instructor.is_approved == True,
        Instructor.specialization.isnot(None)
    ).all()
    return [spec[0] for spec in specializations if spec[0]]