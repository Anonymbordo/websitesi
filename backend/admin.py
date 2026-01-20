from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, text
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta

from database import get_db
from models import User, Instructor, Course, Enrollment, Payment, Review, AIInteraction, CourseMaterial, CourseAdminNote
from auth import get_current_user

admin_router = APIRouter()

# Admin Panel Routes - Courses Management
# Pydantic models
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

def _format_dt(value):
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value

def _normalize_material_type(material_type: Optional[str], file_url: Optional[str]) -> str:
    value = (material_type or "").strip().lower()
    if value:
        if value in {"video", "document"}:
            return value
        if value == "pdf":
            return "document"
        if value.startswith("video/") or "video" in value:
            return "video"
        if value.startswith("application/"):
            return "document"
    if file_url:
        clean_url = file_url.split("?")[0].split("#")[0]
        ext = clean_url.rsplit(".", 1)[-1].lower() if "." in clean_url else ""
        if ext in {"mp4", "mov", "m4v", "webm", "avi", "mkv"}:
            return "video"
        if ext in {"pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx"}:
            return "document"
    return "document"

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
    created_at: datetime

class CourseAdmin(BaseModel):
    id: int
    title: str
    short_description: Optional[str] = None
    instructor_name: str
    instructor_id: int
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
    preview_video: Optional[str] = None
    created_at: datetime
    total_revenue: float = 0.0
    total_students: int = 0

# Dependency to check admin role
def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

# Routes
@admin_router.get("/stats", response_model=AdminStats)
async def get_admin_stats(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    try:
        # Basic counts
        total_users = db.query(User).count()
        total_instructors = db.query(Instructor).filter(Instructor.is_approved == True).count()
        total_courses = db.query(Course).count()
        total_enrollments = db.query(Enrollment).count()
        
        # Revenue calculation
        total_revenue = db.query(func.sum(Payment.amount)).filter(
            Payment.payment_status == "completed"
        ).scalar() or 0.0
        
        # Treat NULL is_approved as pending as well (some rows were created with NULL)
        pending_instructor_approvals = db.query(Instructor).filter(
            or_(Instructor.is_approved == False, Instructor.is_approved.is_(None))
        ).count()
        
        active_courses = db.query(Course).filter(Course.is_published == True).count()
        
        # This month stats
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
        # Return zeroed stats instead of 500
        return AdminStats(
            total_users=0,
            total_instructors=0,
            total_courses=0,
            total_enrollments=0,
            total_revenue=0.0,
            pending_instructor_approvals=0,
            active_courses=0,
            users_this_month=0,
            revenue_this_month=0.0
        )

@admin_router.get("/users", response_model=List[UserAdmin])
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

@admin_router.get("/instructors", response_model=List[InstructorAdmin])
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
        # If caller requested is_approved == False, include NULL values as pending as well
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
    
    # Get additional stats for each instructor
    result = []
    for instructor in instructors:
        total_courses = db.query(Course).filter(Course.instructor_id == instructor.id).count()
        
        # Calculate total revenue for instructor
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
            created_at=instructor.created_at
        )
        result.append(instructor_admin)
    
    return result

@admin_router.get("/instructors/{instructor_id}")
async def get_instructor_detail(
    instructor_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin için tek bir eğitmenin detaylarını getir (onay durumu fark etmez)"""
    instructor = db.query(Instructor).filter(Instructor.id == instructor_id).first()
    
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor not found"
        )
    
    # Kullanıcı bilgileri
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
    
    # Kursları getir
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

@admin_router.put("/instructors/{instructor_id}/approve")
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

@admin_router.put("/instructors/{instructor_id}/reject")
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

@admin_router.get("/courses", response_model=List[CourseAdmin])
async def get_courses(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    is_published: Optional[bool] = None,
    search: Optional[str] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Course)
    
    # Apply filters
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
    
    # Get additional stats for each course
    result = []
    for course in courses:
        # Calculate total revenue for course
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
            instructor_name=course.instructor.user.full_name,
            instructor_id=course.instructor.id,
            category=course.category,
            level=course.level,
            price=course.price,
            discount_price=course.discount_price,
            duration_hours=course.duration_hours,
            enrollment_count=course.enrollment_count or 0,
            rating=course.rating or 0.0,
            total_ratings=course.total_ratings or 0,
            is_published=course.is_published,
            is_featured=course.is_featured or False,
            thumbnail=course.thumbnail,
            preview_video=course.preview_video,
            created_at=course.created_at,
            total_revenue=total_revenue,
            total_students=course.enrollment_count or 0
        )
        result.append(course_admin)
    
    return result

@admin_router.put("/courses/{course_id}/publish")
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

@admin_router.put("/courses/{course_id}/unpublish")
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

@admin_router.put("/courses/{course_id}/feature")
async def feature_course(
    course_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Kursu ana sayfada öne çıkar"""
    course = db.query(Course).filter(Course.id == course_id).first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    course.is_featured = True
    db.commit()
    
    return {"message": "Course featured successfully"}

@admin_router.put("/courses/{course_id}/unfeature")
async def unfeature_course(
    course_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Kursu ana sayfadan kaldır"""
    course = db.query(Course).filter(Course.id == course_id).first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    course.is_featured = False
    db.commit()
    
    return {"message": "Course unfeatured"}

@admin_router.delete("/courses/{course_id}")
async def delete_course(
    course_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin tarafından kursu sil"""
    course = db.query(Course).filter(Course.id == course_id).first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    try:
        # İlişkili kayıtları sil
        db.query(CourseMaterial).filter(CourseMaterial.course_id == course_id).delete()
        db.query(Enrollment).filter(Enrollment.course_id == course_id).delete()
        db.query(Review).filter(Review.course_id == course_id).delete()
        db.query(CourseAdminNote).filter(CourseAdminNote.course_id == course_id).delete()
        
        # Kursu sil
        db.delete(course)
        db.commit()
        
        return {"message": "Course deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete course: {str(e)}"
        )

# Course Details and Materials
@admin_router.get("/courses/{course_id}/details")
async def get_course_details(
    course_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Kurs detaylarını, materyalleri ve notları getir"""
    course = db.query(Course).filter(Course.id == course_id).first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # These tables may be missing or out-of-sync in some environments.
    # Do not fail the whole request; return empty lists instead of 500.
    try:
        materials = db.query(CourseMaterial).filter(
            CourseMaterial.course_id == course_id
        ).all()
    except Exception as e:
        print(f"Error fetching course materials for course_id={course_id}: {e}")
        materials = []
        try:
            result = db.execute(
                text(
                    "SELECT id, course_id, title, file_url, file_size, created_at "
                    "FROM course_materials WHERE course_id = :course_id"
                ),
                {"course_id": course_id},
            )
            materials = result.mappings().all()
        except Exception as inner_error:
            print(f"Fallback material query failed for course_id={course_id}: {inner_error}")
            materials = []

    try:
        admin_notes = db.query(CourseAdminNote).filter(
            CourseAdminNote.course_id == course_id
        ).order_by(CourseAdminNote.created_at.desc()).all()
    except Exception as e:
        print(f"Error fetching course admin notes for course_id={course_id}: {e}")
        admin_notes = []

    try:
        enrollments = db.query(Enrollment).filter(
            Enrollment.course_id == course_id
        ).order_by(Enrollment.enrolled_at.desc()).all()
    except Exception as e:
        print(f"Error fetching enrollments for course_id={course_id}: {e}")
        enrollments = []
    
    material_items = []
    for material in materials:
        if isinstance(material, dict):
            item = {
                "id": material.get("id"),
                "title": material.get("title"),
                "file_url": material.get("file_url"),
                "file_size": material.get("file_size"),
                "created_at": _format_dt(material.get("created_at")),
            }
            raw_type = material.get("material_type") or material.get("file_type")
        else:
            item = {
                "id": material.id,
                "title": material.title,
                "file_url": material.file_url,
                "file_size": material.file_size,
                "created_at": _format_dt(material.created_at),
            }
            raw_type = getattr(material, "material_type", None)
        item["material_type"] = _normalize_material_type(raw_type, item["file_url"])
        material_items.append(item)

    videos = [m for m in material_items if m["material_type"] == "video"]
    documents = [m for m in material_items if m["material_type"] == "document"]
    
    notes = [
        {
            "id": n.id,
            "note": n.note,
            "note_type": n.note_type,
            "is_resolved": n.is_resolved,
            "admin_name": n.admin.full_name if n.admin else "Admin",
            "created_at": n.created_at.isoformat() if n.created_at else None,
            "updated_at": n.updated_at.isoformat() if n.updated_at else None
        }
        for n in admin_notes
    ]

    enrollment_items = []
    for e in enrollments:
        student = e.student
        enrollment_items.append({
            "id": e.id,
            "student": {
                "id": student.id if student else None,
                "full_name": student.full_name if student else "Bilinmiyor",
                "email": student.email if student else None,
                "phone": student.phone if student else None,
            },
            "enrolled_at": e.enrolled_at.isoformat() if e.enrolled_at else None,
            "progress_percentage": float(e.progress_percentage or 0.0),
            "completed_at": e.completed_at.isoformat() if e.completed_at else None,
        })
    
    instructor_full_name = None
    instructor_id = None
    try:
        # Prefer relationship if available
        if getattr(course, "instructor", None) and getattr(course.instructor, "user", None):
            instructor_id = course.instructor.id
            instructor_full_name = course.instructor.user.full_name
        # Fallback to direct join if relationship isn't loaded/available
        elif getattr(course, "instructor_id", None):
            instructor_id = course.instructor_id
            instructor_row = (
                db.query(Instructor, User)
                .join(User, Instructor.user_id == User.id)
                .filter(Instructor.id == instructor_id)
                .first()
            )
            if instructor_row:
                _, instructor_user = instructor_row
                instructor_full_name = instructor_user.full_name
    except Exception as e:
        print(f"Error resolving instructor for course_id={course_id}: {e}")
        instructor_full_name = None
        instructor_id = None

    instructor_full_name = instructor_full_name or "Bilinmiyor"

    return {
        "course": {
            "id": course.id,
            "title": course.title,
            "description": course.description,
            "short_description": getattr(course, "short_description", None),
            "category": getattr(course, "category", None),
            "level": getattr(course, "level", None),
            "price": getattr(course, "price", None),
            "discount_price": getattr(course, "discount_price", None),
            "duration_hours": getattr(course, "duration_hours", None),
            "enrollment_count": getattr(course, "enrollment_count", 0) or 0,
            "rating": getattr(course, "rating", 0.0) or 0.0,
            "total_ratings": getattr(course, "total_ratings", 0) or 0,
            "created_at": course.created_at.isoformat() if getattr(course, "created_at", None) else None,
            "updated_at": course.updated_at.isoformat() if getattr(course, "updated_at", None) else None,
            "instructor_name": instructor_full_name,
            "instructor_id": instructor_id,
            # Provide a nested shape too (some UI screens expect it)
            "instructor": {
                "id": instructor_id,
                "user": {
                    "full_name": instructor_full_name
                }
            },
            "is_published": course.is_published,
            "thumbnail": course.thumbnail,
            "preview_video": course.preview_video
        },
        "videos": videos,
        "documents": documents,
        "admin_notes": notes,
        "enrollments": enrollment_items,
        "stats": {
            "total_videos": len(videos),
            "total_documents": len(documents),
            "total_notes": len(notes),
            "unresolved_notes": len([n for n in admin_notes if not n.is_resolved]),
            "total_enrollments": len(enrollments),
            "completed_enrollments": len([e for e in enrollments if e.completed_at])
        }
    }

# Admin Notes
class AdminNoteCreate(BaseModel):
    # Frontend sends `note`, older code used `content`.
    # Accept both for backwards compatibility.
    note: str = Field(..., alias="content")
    note_type: str = "general"  # general, feedback, todo

    class Config:
        populate_by_name = True

@admin_router.get("/courses/{course_id}/notes")
async def get_course_notes(
    course_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Kursun tüm admin notlarını getir"""
    course = db.query(Course).filter(Course.id == course_id).first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    notes = db.query(CourseAdminNote).filter(
        CourseAdminNote.course_id == course_id
    ).order_by(CourseAdminNote.created_at.desc()).all()
    
    result = []
    for note in notes:
        admin = db.query(User).filter(User.id == note.admin_id).first()
        result.append({
            "id": note.id,
            "note": note.note,
            "content": note.note,
            "note_type": note.note_type,
            "is_resolved": note.is_resolved,
            "admin_name": admin.full_name if admin else "Unknown",
            "created_at": note.created_at.isoformat()
        })
    
    return result

@admin_router.post("/courses/{course_id}/notes")
async def create_admin_note(
    course_id: int,
    note_data: AdminNoteCreate,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Kursa admin notu ekle"""
    course = db.query(Course).filter(Course.id == course_id).first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    admin_note = CourseAdminNote(
        course_id=course_id,
        admin_id=admin_user.id,
        note=note_data.note,
        note_type=note_data.note_type
    )
    
    db.add(admin_note)
    db.commit()
    db.refresh(admin_note)
    
    return {
        "id": admin_note.id,
        "note": admin_note.note,
        "content": admin_note.note,
        "note_type": admin_note.note_type,
        "is_resolved": admin_note.is_resolved,
        "admin_name": admin_user.full_name,
        "created_at": admin_note.created_at.isoformat()
    }

@admin_router.put("/courses/{course_id}/notes/{note_id}/resolve")
async def resolve_admin_note(
    course_id: int,
    note_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin notunu çözümlenmiş olarak işaretle"""
    note = db.query(CourseAdminNote).filter(
        CourseAdminNote.id == note_id,
        CourseAdminNote.course_id == course_id
    ).first()
    
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    
    note.is_resolved = True
    db.commit()
    
    return {"message": "Note marked as resolved"}

@admin_router.delete("/courses/{course_id}/notes/{note_id}")
async def delete_admin_note(
    course_id: int,
    note_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin notunu sil"""
    note = db.query(CourseAdminNote).filter(
        CourseAdminNote.id == note_id,
        CourseAdminNote.course_id == course_id
    ).first()
    
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    
    db.delete(note)
    db.commit()
    
    return {"message": "Note deleted successfully"}

@admin_router.delete("/course-notes/{note_id}")
async def delete_course_note_by_id(
    note_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin notunu ID ile sil"""
    note = db.query(CourseAdminNote).filter(
        CourseAdminNote.id == note_id
    ).first()
    
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    
    db.delete(note)
    db.commit()
    
    return {"message": "Note deleted successfully"}
    
    return {"message": "Course unfeatured"}

@admin_router.put("/users/{user_id}/activate")
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

@admin_router.put("/users/{user_id}/deactivate")
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
    
    if user.role == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate admin user"
        )
    
    user.is_active = False
    db.commit()
    
    return {"message": "User deactivated"}

@admin_router.get("/analytics/revenue")
async def get_revenue_analytics(
    days: int = Query(30, ge=1, le=365),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Daily revenue
    daily_revenue = db.query(
        func.date(Payment.payment_date).label('date'),
        func.sum(Payment.amount).label('revenue')
    ).filter(
        and_(
            Payment.payment_status == "completed",
            Payment.payment_date >= start_date
        )
    ).group_by(func.date(Payment.payment_date)).all()
    
    # Revenue by category
    category_revenue = db.query(
        Course.category,
        func.sum(Payment.amount).label('revenue')
    ).join(Payment).filter(
        and_(
            Payment.payment_status == "completed",
            Payment.payment_date >= start_date
        )
    ).group_by(Course.category).all()
    
    return {
        "period_days": days,
        "daily_revenue": [
            {"date": str(row.date), "revenue": float(row.revenue)}
            for row in daily_revenue
        ],
        "category_revenue": [
            {"category": row.category, "revenue": float(row.revenue)}
            for row in category_revenue
        ]
    }

@admin_router.get("/analytics/users")
async def get_user_analytics(
    days: int = Query(30, ge=1, le=365),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Daily user registrations
    daily_registrations = db.query(
        func.date(User.created_at).label('date'),
        func.count(User.id).label('registrations')
    ).filter(
        User.created_at >= start_date
    ).group_by(func.date(User.created_at)).all()
    
    # Users by city
    users_by_city = db.query(
        User.city,
        func.count(User.id).label('count')
    ).filter(
        and_(
            User.city.isnot(None),
            User.created_at >= start_date
        )
    ).group_by(User.city).order_by(func.count(User.id).desc()).limit(10).all()
    
    return {
        "period_days": days,
        "daily_registrations": [
            {"date": str(row.date), "registrations": row.registrations}
            for row in daily_registrations
        ],
        "users_by_city": [
            {"city": row.city, "count": row.count}
            for row in users_by_city
        ]
    }

@admin_router.get("/reviews/pending")
async def get_pending_reviews(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    reviews = db.query(Review).filter(
        Review.is_approved == False
    ).order_by(Review.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for review in reviews:
        review_dict = {
            "id": review.id,
            "rating": review.rating,
            "comment": review.comment,
            "created_at": review.created_at,
            "reviewer": {
                "id": review.reviewer.id,
                "full_name": review.reviewer.full_name
            },
            "course": {
                "id": review.course.id,
                "title": review.course.title
            } if review.course else None,
            "instructor": {
                "id": review.instructor.id,
                "name": review.instructor.user.full_name
            } if review.instructor else None
        }
        result.append(review_dict)
    
    return result

@admin_router.put("/reviews/{review_id}/approve")
async def approve_review(
    review_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    review = db.query(Review).filter(Review.id == review_id).first()
    
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    review.is_approved = True
    db.commit()
    
    return {"message": "Review approved successfully"}

@admin_router.delete("/reviews/{review_id}")
async def delete_review(
    review_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    review = db.query(Review).filter(Review.id == review_id).first()
    
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    db.delete(review)
    db.commit()
    
    return {"message": "Review deleted successfully"}

# ==================== CATEGORY MANAGEMENT ====================

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    type: str = "course"  # course, blog, general
    color: str = "#3B82F6"
    parent_id: Optional[int] = None

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    color: Optional[str] = None
    parent_id: Optional[int] = None
    is_active: Optional[bool] = None

@admin_router.get("/categories")
async def get_all_categories(
    type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Tüm kategorileri getir"""
    from models import Category
    
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    
    query = db.query(Category)
    
    if type:
        query = query.filter(Category.type == type)
    
    categories = query.order_by(Category.created_at.desc()).all()
    
    result = []
    for cat in categories:
        # Count items in this category
        item_count = 0
        if cat.type == "course":
            item_count = db.query(Course).filter(Course.category == cat.name).count()
        
        result.append({
            "id": cat.id,
            "name": cat.name,
            "slug": cat.slug,
            "description": cat.description,
            "type": cat.type,
            "color": cat.color,
            "parent_id": cat.parent_id,
            "is_active": cat.is_active,
            "item_count": item_count,
            "created_at": cat.created_at,
            "updated_at": cat.updated_at
        })
    
    return result

@admin_router.post("/categories")
async def create_category(
    category_data: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Yeni kategori oluştur"""
    from models import Category
    
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    
    # Check if category with same name exists
    existing = db.query(Category).filter(Category.name == category_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category with this name already exists")
    
    # Generate slug
    slug = category_data.name.lower().replace(' ', '-')
    # Remove non-alphanumeric characters (except dashes)
    import re
    slug = re.sub(r'[^a-z0-9-]', '', slug)
    
    category = Category(
        name=category_data.name,
        slug=slug,
        description=category_data.description,
        type=category_data.type,
        color=category_data.color,
        parent_id=category_data.parent_id
    )
    
    db.add(category)
    db.commit()
    db.refresh(category)
    
    return {
        "id": category.id,
        "name": category.name,
        "slug": category.slug,
        "description": category.description,
        "type": category.type,
        "color": category.color,
        "parent_id": category.parent_id,
        "is_active": category.is_active,
        "created_at": category.created_at
    }

@admin_router.put("/categories/{category_id}")
async def update_category(
    category_id: int,
    category_data: CategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Kategoriyi güncelle"""
    from models import Category
    
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Update fields
    if category_data.name:
        category.name = category_data.name
        # Regenerate slug
        slug = category_data.name.lower().replace(' ', '-')
        import re
        category.slug = re.sub(r'[^a-z0-9-]', '', slug)
    
    if category_data.description is not None:
        category.description = category_data.description
    
    if category_data.type:
        category.type = category_data.type
    
    if category_data.color:
        category.color = category_data.color
    
    if category_data.parent_id is not None:
        category.parent_id = category_data.parent_id
    
    if category_data.is_active is not None:
        category.is_active = category_data.is_active
    
    category.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(category)
    
    return {
        "id": category.id,
        "name": category.name,
        "slug": category.slug,
        "description": category.description,
        "type": category.type,
        "color": category.color,
        "parent_id": category.parent_id,
        "is_active": category.is_active,
        "updated_at": category.updated_at
    }

@admin_router.delete("/categories/{category_id}")
async def delete_category(
    category_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Kategoriyi sil"""
    from models import Category
    
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Check if category is used
    if category.type == "course":
        course_count = db.query(Course).filter(Course.category == category.name).count()
        if course_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete category. {course_count} courses are using it."
            )
    
    db.delete(category)
    db.commit()
    
    return {"message": "Category deleted successfully"}

@admin_router.post("/migrate/add-material-type-column")
async def migrate_add_material_type_column(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add material_type column to course_materials table"""
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    
    try:
        from sqlalchemy import text
        
        # Check if material_type column exists
        result = db.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='course_materials' 
            AND column_name='material_type'
        """))
        
        if not result.fetchone():
            # Add material_type column
            db.execute(text("""
                ALTER TABLE course_materials 
                ADD COLUMN material_type VARCHAR NOT NULL DEFAULT 'video'
            """))
        
        # Check if file_type column exists
        result = db.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='course_materials' 
            AND column_name='file_type'
        """))
        
        if result.fetchone():
            # Drop file_type column if it exists
            db.execute(text("""
                ALTER TABLE course_materials 
                DROP COLUMN IF EXISTS file_type
            """))
        
        db.commit()
        
        return {"message": "Successfully migrated course_materials table", "status": "success"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Migration failed: {str(e)}"
        )

@admin_router.post("/migrate/add-school-course-columns")
async def migrate_add_school_course_columns(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add thumbnail and preview_video columns to school_courses table"""
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    
    try:
        from sqlalchemy import text
        
        # Check if thumbnail column exists
        result = db.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='school_courses' 
            AND column_name='thumbnail'
        """))
        
        if not result.fetchone():
            db.execute(text("""
                ALTER TABLE school_courses 
                ADD COLUMN thumbnail VARCHAR NULL
            """))
        
        # Check if preview_video column exists
        result = db.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='school_courses' 
            AND column_name='preview_video'
        """))
        
        if not result.fetchone():
            db.execute(text("""
                ALTER TABLE school_courses 
                ADD COLUMN preview_video VARCHAR NULL
            """))
        
        db.commit()
        
        return {"message": "Successfully added thumbnail and preview_video columns", "status": "success"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Migration failed: {str(e)}"
        )

@admin_router.post("/migrate/create-institutions-tables")
async def migrate_create_institutions_tables(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["admin"]))
):
    """Create institutions and institution_courses tables"""
    try:
        # Create institutions table
        db.execute("""
            CREATE TABLE IF NOT EXISTS institutions (
                id SERIAL PRIMARY KEY,
                name VARCHAR NOT NULL,
                description TEXT NOT NULL,
                logo VARCHAR,
                cover_image VARCHAR,
                intro_video VARCHAR,
                brochure_pdf VARCHAR,
                city VARCHAR NOT NULL,
                district VARCHAR,
                address TEXT,
                latitude FLOAT,
                longitude FLOAT,
                phone VARCHAR,
                email VARCHAR,
                website VARCHAR,
                rating FLOAT DEFAULT 0.0,
                total_ratings INTEGER DEFAULT 0,
                total_students INTEGER DEFAULT 0,
                total_courses INTEGER DEFAULT 0,
                image_color VARCHAR DEFAULT 'from-blue-500 to-purple-600',
                is_active BOOLEAN DEFAULT TRUE,
                is_featured BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create institution_courses table
        db.execute("""
            CREATE TABLE IF NOT EXISTS institution_courses (
                id SERIAL PRIMARY KEY,
                institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
                title VARCHAR NOT NULL,
                description TEXT,
                price FLOAT DEFAULT 0,
                discount_price FLOAT,
                duration VARCHAR,
                level VARCHAR,
                thumbnail VARCHAR,
                order_index INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create indexes
        db.execute("CREATE INDEX IF NOT EXISTS idx_institutions_city ON institutions(city)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_institutions_name ON institutions(name)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_institution_courses_institution_id ON institution_courses(institution_id)")
        
        db.commit()
        
        return {
            "message": "Successfully created institutions tables",
            "status": "success",
            "tables_created": ["institutions", "institution_courses"]
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Migration failed: {str(e)}"
        )
