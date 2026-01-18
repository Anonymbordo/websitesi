from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from database import get_db
from models import Instructor, User, Course, Review, CourseAdminNote
from auth import get_current_user
import os
import shutil
from typing import List
from dotenv import load_dotenv
from firebase_config import upload_file_to_firebase, init_firebase
from s3_utils import upload_file_to_s3
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
@instructors_router.get("/featured/list", response_model=List[InstructorResponse])
async def get_featured_instructors(
    limit: int = Query(6, ge=1, le=20),
    db: Session = Depends(get_db)
):
    """Öne çıkan eğitmenleri listele"""
    try:
        # is_featured kolonu olup olmadığını kontrol et
        instructors = db.query(Instructor).filter(
            Instructor.is_approved == True
        ).order_by(Instructor.rating.desc()).limit(limit).all()
        
        # is_featured varsa filtrele
        featured_instructors = []
        for inst in instructors:
            if hasattr(inst, 'is_featured') and getattr(inst, 'is_featured', False):
                featured_instructors.append(inst)
        
        # Eğer hiç featured yoksa, en iyi rated olanları göster
        instructors_to_show = featured_instructors if featured_instructors else instructors[:limit]
    except Exception as e:
        print(f"Featured instructors error: {e}")
        # Hata durumunda normal query
        instructors_to_show = db.query(Instructor).filter(
            Instructor.is_approved == True
        ).order_by(Instructor.rating.desc()).limit(limit).all()
    
    result = []
    for instructor in instructors_to_show:
        try:
            if not instructor.user:
                continue

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
            result.append(InstructorResponse(**instructor_dict))
        except Exception as e:
            print(f"Error serializing instructor {instructor.id}: {e}")
            continue
    
    return result

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
    try:
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
    except Exception as e:
        print(f"Error fetching instructors: {e}")
        import traceback
        traceback.print_exc()
        return []
    
    # Format response
    result = []
    for instructor in instructors:
        try:
            if not instructor.user:
                print(f"Skipping instructor {instructor.id}: No linked user")
                continue

            user_info = {
                "id": instructor.user.id,
                "full_name": instructor.user.full_name,
                "city": instructor.user.city,
                "district": instructor.user.district,
                "profile_image": instructor.user.profile_image
            }
            
            # Count total courses
            try:
                total_courses = db.query(Course).filter(
                    Course.instructor_id == instructor.id,
                    Course.is_published == True
                ).count()
            except Exception:
                total_courses = 0
            
            instructor_dict = {
                **instructor.__dict__,
                "user": user_info,
                "total_courses": total_courses
            }
            result.append(InstructorResponse(**instructor_dict))
        except Exception as e:
            print(f"Error serializing instructor {instructor.id}: {e}")
            continue
    
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
        filename = f"instructors/{instructor.id}/{prefix}_{file_obj.filename}"
        
        # Upload to S3
        public_url = upload_file_to_s3(file_obj.file, filename, file_obj.content_type)
        
        if public_url:
            return public_url
        else:
            # Fallback to local (optional)
            print(f"S3 upload failed for {filename}")
            return None

    # Save profile image
    if profile_image:
        url = await handle_upload(profile_image, "profile")
        if url:
            current_user.profile_image = url

    # Save CV
    cert_paths = []
    if cv:
        url = await handle_upload(cv, "cv")
        if url:
            cert_paths.append(url)

    # Save certificates (multiple)
    if certificates:
        for cert in certificates:
            url = await handle_upload(cert, "cert")
            if url:
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
    
    instructor_data = instructor.__dict__.copy()
    if "_sa_instance_state" in instructor_data:
        del instructor_data["_sa_instance_state"]

    instructor_dict = {
        **instructor_data,
        "user": user_info,
        "total_courses": len(courses_info),
        "courses": courses_info
    }
    
    return instructor_dict

@instructors_router.get("/my/courses/{course_id}/admin-notes")
async def get_my_course_admin_notes(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Eğitmenin kursuna yapılmış admin notlarını getir"""
    instructor = db.query(Instructor).filter(Instructor.user_id == current_user.id).first()
    
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor profile not found"
        )
    
    # Kursun bu eğitmene ait olduğunu kontrol et
    course = db.query(Course).filter(
        Course.id == course_id,
        Course.instructor_id == instructor.id
    ).first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found or you don't have permission"
        )
    
    # Admin notlarını getir
    admin_notes = db.query(CourseAdminNote).filter(
        CourseAdminNote.course_id == course_id
    ).order_by(CourseAdminNote.created_at.desc()).all()
    
    notes = [
        {
            "id": note.id,
            "note": note.note,
            "note_type": note.note_type,
            "is_resolved": note.is_resolved,
            "admin_name": note.admin.full_name if note.admin else "Admin",
            "created_at": note.created_at.isoformat(),
            "updated_at": note.updated_at.isoformat()
        }
        for note in admin_notes
    ]
    
    return {
        "course_id": course_id,
        "course_title": course.title,
        "notes": notes,
        "total_notes": len(notes),
        "unresolved_notes": len([n for n in admin_notes if not n.is_resolved])
    }

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

@instructors_router.post("/upload-avatar")
async def upload_instructor_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Eğitmen profil fotoğrafı yükle (S3'e)
    """
    instructor = db.query(Instructor).filter(Instructor.user_id == current_user.id).first()
    
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor profile not found"
        )
    
    # Dosya tipi kontrolü
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only image files are allowed"
        )
    
    file_extension = file.filename.split(".")[-1]
    filename = f"instructors/{instructor.id}/avatar_{instructor.id}.{file_extension}"
    
    # Upload to S3
    public_url = upload_file_to_s3(file.file, filename, file.content_type)
    
    if public_url:
        # Kullanıcının profil resmini güncelle
        current_user.profile_image = public_url
        db.commit()
        
        return {
            "message": "Avatar uploaded successfully",
            "avatar_url": public_url
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload avatar to S3"
        )
