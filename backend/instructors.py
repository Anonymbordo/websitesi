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
from firebase_config import upload_file_to_firebase, init_firebase
import io

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
@instructors_router.get("", response_model=List[InstructorResponse])
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

    # Prepare upload paths
    instructor_dir_local = os.path.join(UPLOAD_DIRECTORY, 'instructors', str(instructor.id))
    instructor_dir_firebase = f"instructors/{instructor.id}"
    
    # Helper for upload
    async def handle_upload(file_obj: UploadFile, prefix: str):
        filename = f"{prefix}_{file_obj.filename}"
        firebase_path = f"{instructor_dir_firebase}/{filename}"
        
        try:
            content = await file_obj.read()
            file_io = io.BytesIO(content)
            return upload_file_to_firebase(file_io, firebase_path, file_obj.content_type)
        except Exception as e:
            print(f"Firebase upload failed for {filename}: {e}")
            # Fallback to local
            local_dir = instructor_dir_local
            if os.environ.get("VERCEL"):
                local_dir = f"/tmp/uploads/instructors/{instructor.id}"
            
            os.makedirs(local_dir, exist_ok=True)
            dest = os.path.join(local_dir, filename)
            
            # Reset pointer if needed (though we read into content)
            with open(dest, 'wb') as buffer:
                buffer.write(content)
            
            if os.environ.get("VERCEL"):
                return f"/uploads/instructors/{instructor.id}/{filename}"
            return f"/{dest.replace('\\\\', '/')}"

    # Save profile image
    if profile_image:
        url = await handle_upload(profile_image, "profile")
        current_user.profile_image = url

    # Save CV
    cert_paths = []
    if cv:
        url = await handle_upload(cv, "cv")
        cert_paths.append(url)

    # Save certificates (multiple)
    if certificates:
        for cert in certificates:
            url = await handle_upload(cert, "cert")
            cert_paths.append(url)

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