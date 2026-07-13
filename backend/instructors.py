from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from types import SimpleNamespace

from database import get_db
from models import Instructor, User, Course, Review, CourseAdminNote, Enrollment, Institution, Payment
from auth import get_current_user
from instructor_completion import get_instructor_application_missing_fields, get_instructor_application_status
import os
import shutil
from typing import List
from dotenv import load_dotenv
from firebase_config import upload_file_to_firebase, init_firebase
from s3_utils import build_secure_media_stream_path, upload_file_to_s3
from sales_reporting import PAYMENT_STATUS_PRIORITY, build_instructor_dashboard, serialize_payment
import io

load_dotenv()
UPLOAD_DIRECTORY = os.getenv('UPLOAD_DIRECTORY', 'uploads')

instructors_router = APIRouter()

# Helpers
def _institution_info(instructor: Instructor) -> Optional[dict]:
    try:
        inst = instructor.institution
        if not inst:
            return None
        return {
            "id": inst.id,
            "name": inst.name,
            "city": inst.city,
            "district": inst.district,
            "logo": inst.logo,
        }
    except Exception:
        return None

# Pydantic models
class InstructorCreate(BaseModel):
    bio: Optional[str] = None
    specialization: Optional[str] = None
    experience_years: int = 0
    certification: Optional[str] = None

class InstructorUpdate(BaseModel):
    bio: Optional[str] = None
    specialization: Optional[str] = None
    title: Optional[str] = None
    experience_years: Optional[int] = None
    certification: Optional[str] = None

class InstructorResponse(BaseModel):
    id: int
    bio: Optional[str]
    specialization: Optional[str]
    title: Optional[str] = None
    experience_years: int
    rating: float
    total_ratings: int
    total_students: int
    is_approved: bool
    is_featured: Optional[bool] = False
    created_at: datetime
    user: dict
    total_courses: int
    institution: Optional[dict] = None

    class Config:
        from_attributes = True

class InstructorPublicResponse(BaseModel):
    id: int
    bio: Optional[str]
    specialization: Optional[str]
    title: Optional[str] = None
    experience_years: int
    rating: float
    total_ratings: int
    total_students: int
    created_at: datetime
    user: dict
    total_courses: int
    courses: List[dict]
    institution: Optional[dict] = None

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
        # Önce gerçekten is_featured = True olanları getir
        featured_instructors = (
            db.query(Instructor)
            .join(User)
            .filter(
                Instructor.is_approved == True,
                Instructor.is_featured == True,
                User.role == "instructor",
                ~User.email.ilike("%@example.com"),
            )
            .order_by(Instructor.rating.desc(), Instructor.total_students.desc())
            .limit(limit)
            .all()
        )

        # Hiç featured yoksa fallback: en iyi puanlı onaylı eğitmenler
        if featured_instructors:
            instructors_to_show = featured_instructors
        else:
            instructors_to_show = (
                db.query(Instructor)
                .join(User)
                .filter(
                    Instructor.is_approved == True,
                    User.role == "instructor",
                    ~User.email.ilike("%@example.com"),
                )
                .order_by(Instructor.rating.desc(), Instructor.total_students.desc())
                .limit(limit)
                .all()
            )
    except Exception as e:
        print(f"Featured instructors error: {e}")
        # Hata durumunda normal query
        instructors_to_show = (
            db.query(Instructor)
            .join(User)
            .filter(
                Instructor.is_approved == True,
                User.role == "instructor",
                ~User.email.ilike("%@example.com"),
            )
            .order_by(Instructor.rating.desc())
            .limit(limit)
            .all()
        )
    
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
                "total_courses": total_courses,
                "is_featured": getattr(instructor, 'is_featured', False),
                "institution": _institution_info(instructor)
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
        query = (
            db.query(Instructor)
            .join(User)
            .filter(
                Instructor.is_approved == True,
                User.role == "instructor",
                ~User.email.ilike("%@example.com"),
            )
        )
        
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
        
        # Öne çıkanlar her zaman üstte görünsün
        query = query.order_by(Instructor.is_featured.desc(), Instructor.rating.desc(), Instructor.total_students.desc())
        
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
                "total_courses": total_courses,
                "is_featured": getattr(instructor, 'is_featured', False),
                "institution": _institution_info(instructor)
            }
            result.append(InstructorResponse(**instructor_dict))
        except Exception as e:
            print(f"Error serializing instructor {instructor.id}: {e}")
            continue
    
    return result

@instructors_router.get("/{instructor_id}", response_model=InstructorPublicResponse)
async def get_instructor(instructor_id: int, db: Session = Depends(get_db)):
    instructor = (
        db.query(Instructor)
        .join(User)
        .filter(
            Instructor.id == instructor_id,
            Instructor.is_approved == True,
            User.role == "instructor",
            ~User.email.ilike("%@example.com"),
        )
        .first()
    )
    
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
        "courses": courses_info,
        "institution": _institution_info(instructor)
    }
    
    return InstructorPublicResponse(**instructor_dict)

@instructors_router.post("/apply")
async def apply_as_instructor(
    bio: str = Form(None),
    specialization: str = Form(None),
    experience_years: str = Form(None),
    title: str = Form(None),
    company: str = Form(None),
    location: str = Form(None),
    portfolio: str = Form(None),
    linkedin: str = Form(None),
    github: str = Form(None),
    website: str = Form(None),
    previous_teaching: str = Form(None),
    course_topics: str = Form(None),
    teaching_motivation: str = Form(None),
    agreement_accepted: Optional[str] = Form(None),
    agreementAccepted: Optional[str] = Form(None),
    full_name: str = Form(None),
    phone: str = Form(None),
    profile_image: UploadFile = File(None),
    cv: UploadFile = File(None),
    certificates: List[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    def _parse_form_bool(*values: Optional[str]) -> bool:
        truthy = {"1", "true", "t", "yes", "y", "on"}
        for value in values:
            if value is None:
                continue
            if isinstance(value, bool):
                return value
            normalized = str(value).strip().lower()
            if not normalized:
                continue
            return normalized in truthy
        return False

    def _clean_str(value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = value.strip()
        return value or None

    def _parse_experience(value: Optional[str]) -> int:
        if value is None:
            return 0
        try:
            if isinstance(value, int):
                return value
        except Exception:
            pass
        text = str(value).strip()
        if not text:
            return 0
        if "-" in text:
            text = text.split("-", 1)[-1]
        if text.endswith("+"):
            text = text[:-1]
        try:
            return int(text)
        except ValueError:
            digits = "".join(ch for ch in text if ch.isdigit())
            return int(digits) if digits else 0

    # Eğitmen başvurusu için ayrı eğitmen kaydı gerekir
    if current_user.role != "instructor":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Eğitmen başvurusu için ayrı eğitmen kaydı oluşturmalısınız."
        )

    agreement_is_accepted = _parse_form_bool(agreement_accepted, agreementAccepted)

    if not agreement_is_accepted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Öğretmen Hizmeti İşbirliği Sözleşmesi kabul edilmelidir."
        )

    cleaned_full_name = _clean_str(full_name)
    cleaned_phone = _clean_str(phone)
    cleaned_bio = _clean_str(bio)
    cleaned_specialization = _clean_str(specialization)
    cleaned_title = _clean_str(title)
    cleaned_company = _clean_str(company)
    cleaned_location = _clean_str(location)
    cleaned_portfolio = _clean_str(portfolio)
    cleaned_linkedin = _clean_str(linkedin)
    cleaned_github = _clean_str(github)
    cleaned_website = _clean_str(website)
    cleaned_previous_teaching = _clean_str(previous_teaching)
    cleaned_course_topics = _clean_str(course_topics)
    cleaned_teaching_motivation = _clean_str(teaching_motivation)
    exp_years = _parse_experience(experience_years)

    validation_user = SimpleNamespace(
        full_name=cleaned_full_name or current_user.full_name,
        phone=cleaned_phone or current_user.phone,
    )
    validation_instructor = SimpleNamespace(
        title=cleaned_title,
        experience_years=exp_years,
        bio=cleaned_bio,
        specialization=cleaned_specialization,
        course_topics=cleaned_course_topics,
        teaching_motivation=cleaned_teaching_motivation,
    )
    missing_fields = get_instructor_application_missing_fields(validation_user, validation_instructor)
    if missing_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lütfen başvuruyu eksiksiz doldurun: {', '.join(missing_fields)}."
        )

    # Update basic user profile info if provided
    if cleaned_full_name:
        current_user.full_name = cleaned_full_name
    if cleaned_phone:
        current_user.phone = cleaned_phone

    # Check if user already has an instructor profile
    existing_instructor = db.query(Instructor).filter(Instructor.user_id == current_user.id).first()
    if existing_instructor:
        instructor = existing_instructor
        # Update existing profile fields
        if bio is not None:
            instructor.bio = cleaned_bio
        if specialization is not None:
            instructor.specialization = cleaned_specialization
        if experience_years is not None:
            instructor.experience_years = exp_years
        if title is not None:
            instructor.title = cleaned_title
        if company is not None:
            instructor.company = cleaned_company
        if location is not None:
            instructor.location = cleaned_location
        if portfolio is not None:
            instructor.portfolio = cleaned_portfolio
        if linkedin is not None:
            instructor.linkedin = cleaned_linkedin
        if github is not None:
            instructor.github = cleaned_github
        if website is not None:
            instructor.website = cleaned_website
        if previous_teaching is not None:
            instructor.previous_teaching = cleaned_previous_teaching
        if course_topics is not None:
            instructor.course_topics = cleaned_course_topics
        if teaching_motivation is not None:
            instructor.teaching_motivation = cleaned_teaching_motivation
    else:
        # Create instructor profile (files will be saved after we have an id)
        instructor = Instructor(
            user_id=current_user.id,
            bio=cleaned_bio,
            specialization=cleaned_specialization,
            title=cleaned_title,
            company=cleaned_company,
            location=cleaned_location,
            portfolio=cleaned_portfolio,
            linkedin=cleaned_linkedin,
            github=cleaned_github,
            website=cleaned_website,
            previous_teaching=cleaned_previous_teaching,
            course_topics=cleaned_course_topics,
            teaching_motivation=cleaned_teaching_motivation,
            experience_years=exp_years,
            is_approved=False  # Requires admin approval
        )
        db.add(instructor)
        db.flush()

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
        if instructor.certification:
            instructor.certification = f"{instructor.certification},{','.join(cert_paths)}"
        else:
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

    if "bio" in instructor_update.dict(exclude_unset=True):
        bio_value = (instructor_update.bio or "").strip()
        if not bio_value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Biyografi alanı zorunludur."
            )
        instructor_update.bio = bio_value

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
        "total_courses": total_courses,
        "institution": _institution_info(instructor)
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
            "description": course.description,
            "short_description": course.short_description,
            "price": course.price,
            "discount_price": course.discount_price,
            "duration_hours": course.duration_hours,
            "level": course.level,
            "category": course.category,
            "preview_video": build_secure_media_stream_path(course.preview_video, expires_in=1800),
            "thumbnail": course.thumbnail,
            "what_you_will_learn": course.what_you_will_learn,
            "requirements": course.requirements,
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
        "courses": courses_info,
        "institution": _institution_info(instructor),
        **get_instructor_application_status(current_user, instructor),
    }
    
    return instructor_dict


@instructors_router.get("/my/dashboard")
async def get_my_instructor_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    instructor = db.query(Instructor).filter(Instructor.user_id == current_user.id).first()

    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor profile not found"
        )

    return build_instructor_dashboard(db, instructor)

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

@instructors_router.get("/my/courses/{course_id}/enrollments")
async def get_my_course_enrollments(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Eğitmenin kursuna kayıtlı öğrencileri getir"""
    instructor = db.query(Instructor).filter(Instructor.user_id == current_user.id).first()

    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor profile not found"
        )

    course = db.query(Course).filter(
        Course.id == course_id,
        Course.instructor_id == instructor.id
    ).first()

    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found or you don't have permission"
        )

    enrollments = db.query(Enrollment).filter(
        Enrollment.course_id == course_id
    ).order_by(Enrollment.enrolled_at.desc()).all()

    student_ids = [enrollment.student_id for enrollment in enrollments if enrollment.student_id]
    payment_map: dict[int, Payment] = {}
    if student_ids:
        payments = (
            db.query(Payment)
            .filter(
                Payment.course_id == course_id,
                Payment.user_id.in_(student_ids),
            )
            .order_by(Payment.payment_date.desc(), Payment.id.desc())
            .all()
        )
        for payment in payments:
            current_payment = payment_map.get(payment.user_id)
            if current_payment is None:
                payment_map[payment.user_id] = payment
                continue

            current_priority = PAYMENT_STATUS_PRIORITY.get(current_payment.payment_status or "", -1)
            next_priority = PAYMENT_STATUS_PRIORITY.get(payment.payment_status or "", -1)
            current_time = current_payment.payment_date or datetime.min
            next_time = payment.payment_date or datetime.min

            if next_priority > current_priority or (
                next_priority == current_priority and next_time > current_time
            ):
                payment_map[payment.user_id] = payment

    result = []
    for enrollment in enrollments:
        student = enrollment.student
        payment = payment_map.get(enrollment.student_id)
        result.append({
            "id": enrollment.id,
            "student": {
                "id": student.id if student else None,
                "full_name": student.full_name if student else "Bilinmiyor",
                "email": student.email if student else None,
                "phone": student.phone if student else None,
                "profile_image": student.profile_image if student else None,
            },
            "enrolled_at": enrollment.enrolled_at.isoformat() if enrollment.enrolled_at else None,
            "progress_percentage": float(enrollment.progress_percentage or 0.0),
            "completed_at": enrollment.completed_at.isoformat() if enrollment.completed_at else None,
            "payment": serialize_payment(payment),
        })

    return {
        "course_id": course_id,
        "course_title": course.title,
        "total_enrollments": len(result),
        "enrollments": result
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
