from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, text
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

from database import get_db
from models import (
    User,
    Instructor,
    Course,
    Enrollment,
    Payment,
    CourseMaterial,
    CourseAdminNote,
    Review,
    AIInteraction,
    Lesson,
    LessonProgress,
    LiveSession,
    Message,
    MessageAttachment,
    MessageParticipant,
    UserCourseBoxPurchase,
    LanguageCoursePurchase,
    LiveClassRequest,
    SchoolCoursePurchase,
    Institution,
    InstitutionInstructorRequest,
    StudentApplication,
)
from auth import get_current_user
from s3_utils import build_secure_media_stream_path
from sales_reporting import build_admin_instructor_snapshot, build_instructor_dashboard

test_router = APIRouter()
ADMIN_PREVIEW_STREAM_EXPIRES_IN = 1800
ADMIN_MATERIAL_STREAM_EXPIRES_IN = 600


def _ensure_instructor_is_featured_column(db: Session):
    """Ensure instructors.is_featured exists in production DB."""
    from sqlalchemy import inspect

    inspector = inspect(db.bind)
    existing_columns = [col["name"] for col in inspector.get_columns("instructors")]
    if "is_featured" not in existing_columns:
        db.execute(text("ALTER TABLE instructors ADD COLUMN is_featured BOOLEAN DEFAULT FALSE"))
        db.commit()


def _secure_admin_media_url(file_url: Optional[str], expires_in: int) -> Optional[str]:
    return build_secure_media_stream_path(file_url, expires_in=expires_in)

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
    preview_video: Optional[str] = None
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
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    portfolio: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    website: Optional[str] = None
    previous_teaching: Optional[str] = None
    course_topics: Optional[str] = None
    teaching_motivation: Optional[str] = None
    certification: Optional[str] = None
    experience_years: int
    rating: float
    total_ratings: int = 0
    total_students: int
    total_courses: int
    published_courses: int = 0
    draft_courses: int = 0
    total_sales_count: int = 0
    total_revenue: float
    monthly_revenue: float = 0.0
    average_sale_value: float = 0.0
    last_sale_at: Optional[str] = None
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
    instructor_profile_exists: bool = False
    instructor_is_approved: Optional[bool] = None
    public_instructor_visible: bool = False

class StudentApplicationAdmin(BaseModel):
    id: int
    student_full_name: str
    parent_full_name: str
    phone: str
    is_checked: bool
    checked_at: Optional[datetime] = None
    created_at: datetime

class StudentApplicationCheckUpdate(BaseModel):
    is_checked: bool

class AdminNoteCreate(BaseModel):
    # Frontend sends `note`; accept `content` for compatibility.
    note: str = Field(..., alias="content")
    note_type: str = "general"

    class Config:
        populate_by_name = True

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

# Dependency to check admin role
def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

@test_router.get("/student-applications", response_model=List[StudentApplicationAdmin])
async def get_student_applications(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    applications = (
        db.query(StudentApplication)
        .order_by(StudentApplication.created_at.desc())
        .all()
    )
    return applications

@test_router.put("/student-applications/{application_id}/check", response_model=StudentApplicationAdmin)
async def check_student_application(
    application_id: int,
    payload: StudentApplicationCheckUpdate,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    application = db.query(StudentApplication).filter(StudentApplication.id == application_id).first()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Başvuru bulunamadı")

    application.is_checked = payload.is_checked
    application.checked_at = datetime.utcnow() if payload.is_checked else None
    db.commit()
    db.refresh(application)
    return application

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
                    preview_video=_secure_admin_media_url(course.preview_video, ADMIN_PREVIEW_STREAM_EXPIRES_IN),
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

@test_router.get("/courses/{course_id}/notes")
async def get_course_notes(
    course_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

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
            "admin_name": admin.full_name if admin else "Admin",
            "created_at": note.created_at.isoformat() if note.created_at else None
        })

    return result

@test_router.post("/courses/{course_id}/notes")
async def create_course_note(
    course_id: int,
    note_data: AdminNoteCreate,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    note = CourseAdminNote(
        course_id=course_id,
        admin_id=admin_user.id,
        note=note_data.note,
        note_type=note_data.note_type,
        is_resolved=False
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    return {
        "id": note.id,
        "note": note.note,
        "note_type": note.note_type,
        "is_resolved": note.is_resolved,
        "admin_name": admin_user.full_name,
        "created_at": note.created_at.isoformat() if note.created_at else None
    }

@test_router.put("/courses/{course_id}/notes/{note_id}/resolve")
async def resolve_course_note(
    course_id: int,
    note_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    note = db.query(CourseAdminNote).filter(
        CourseAdminNote.id == note_id,
        CourseAdminNote.course_id == course_id
    ).first()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    note.is_resolved = True
    db.commit()
    return {"message": "Note resolved", "note_id": note.id}

@test_router.delete("/courses/{course_id}/notes/{note_id}")
async def delete_course_note(
    course_id: int,
    note_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    note = db.query(CourseAdminNote).filter(
        CourseAdminNote.id == note_id,
        CourseAdminNote.course_id == course_id
    ).first()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    db.delete(note)
    db.commit()
    return {"message": "Note deleted"}

@test_router.delete("/courses/{course_id}")
async def delete_course(
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

    try:
        # Try to delete related records; tolerate missing tables in some envs.
        try:
            db.query(CourseMaterial).filter(CourseMaterial.course_id == course_id).delete()
        except Exception as e:
            print(f"Delete CourseMaterial failed for course_id={course_id}: {e}")
        try:
            db.query(Enrollment).filter(Enrollment.course_id == course_id).delete()
        except Exception as e:
            print(f"Delete Enrollment failed for course_id={course_id}: {e}")
        try:
            db.query(Review).filter(Review.course_id == course_id).delete()
        except Exception as e:
            print(f"Delete Review failed for course_id={course_id}: {e}")
        try:
            db.query(CourseAdminNote).filter(CourseAdminNote.course_id == course_id).delete()
        except Exception as e:
            print(f"Delete CourseAdminNote failed for course_id={course_id}: {e}")

        db.delete(course)
        db.commit()
        return {"message": "Course deleted successfully"}
    except Exception as e:
        db.rollback()
        print(f"Error deleting course {course_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete course: {str(e)}"
        )

@test_router.get("/courses/{course_id}/details")
async def get_course_details(
    course_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Kurs detaylarını, materyalleri ve notları getir (admin)"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    # These tables may be missing/out-of-sync; keep endpoint resilient.
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
        item["file_url"] = _secure_admin_media_url(item["file_url"], ADMIN_MATERIAL_STREAM_EXPIRES_IN)
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
        if getattr(course, "instructor", None) and getattr(course.instructor, "user", None):
            instructor_id = course.instructor.id
            instructor_full_name = course.instructor.user.full_name
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
            "instructor": {
                "id": instructor_id,
                "user": {
                    "full_name": instructor_full_name
                }
            },
            "is_published": course.is_published,
            "thumbnail": course.thumbnail,
            "preview_video": _secure_admin_media_url(course.preview_video, ADMIN_PREVIEW_STREAM_EXPIRES_IN)
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
        instructor_profile = None
        if user.role == "instructor":
            instructor_profile = db.query(Instructor).filter(Instructor.user_id == user.id).first()
        
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
            total_spent=total_spent,
            instructor_profile_exists=instructor_profile is not None,
            instructor_is_approved=instructor_profile.is_approved if instructor_profile else None,
            public_instructor_visible=bool(instructor_profile and instructor_profile.is_approved is True),
        )
        result.append(user_admin)
    
    return result

@test_router.get("/instructors", response_model=List[InstructorAdmin])
async def get_instructors(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    is_approved: Optional[bool] = None,
    search: Optional[str] = None,
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = (
        db.query(Instructor)
        .join(User)
        .filter(
            User.role == "instructor",
            ~User.email.ilike("%@example.com"),
        )
    )
    
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
    
    instructors = query.all()
    
    result = []
    for instructor in instructors:
        snapshot = build_admin_instructor_snapshot(db, instructor)
        total_courses = snapshot["published_courses"] + snapshot["draft_courses"]
        
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
            title=getattr(instructor, "title", None),
            company=getattr(instructor, "company", None),
            location=getattr(instructor, "location", None),
            portfolio=getattr(instructor, "portfolio", None),
            linkedin=getattr(instructor, "linkedin", None),
            github=getattr(instructor, "github", None),
            website=getattr(instructor, "website", None),
            previous_teaching=getattr(instructor, "previous_teaching", None),
            course_topics=getattr(instructor, "course_topics", None),
            teaching_motivation=getattr(instructor, "teaching_motivation", None),
            certification=getattr(instructor, "certification", None),
            experience_years=instructor.experience_years,
            rating=instructor.rating,
            total_ratings=instructor.total_ratings,
            total_students=instructor.total_students,
            total_courses=total_courses,
            published_courses=snapshot["published_courses"],
            draft_courses=snapshot["draft_courses"],
            total_sales_count=snapshot["total_sales_count"],
            total_revenue=snapshot["total_revenue"],
            monthly_revenue=snapshot["monthly_revenue"],
            average_sale_value=snapshot["average_sale_value"],
            last_sale_at=snapshot["last_sale_at"],
            is_approved=instructor.is_approved,
            is_featured=getattr(instructor, 'is_featured', False),
            created_at=instructor.created_at
        )
        result.append(instructor_admin)

    reverse = sort_order.lower() != "asc"

    def _sort_value(item: InstructorAdmin):
        if sort_by == "total_revenue":
            return item.total_revenue
        if sort_by == "monthly_revenue":
            return item.monthly_revenue
        if sort_by == "total_sales_count":
            return item.total_sales_count
        if sort_by == "total_students":
            return item.total_students
        if sort_by == "rating":
            return item.rating
        if sort_by == "total_courses":
            return item.total_courses
        if sort_by == "last_sale_at":
            return item.last_sale_at or ""
        if sort_by == "full_name":
            return (item.user.get("full_name") or "").lower()
        return item.created_at.isoformat() if item.created_at else ""

    result.sort(key=_sort_value, reverse=reverse)
    return result[skip:skip + limit]

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
    dashboard = build_instructor_dashboard(db, instructor)
    summary = dashboard["summary"]
    courses_info = [
        {
            "id": course["id"],
            "title": course["title"],
            "is_published": course["is_published"],
            "price": course["price"],
            "students_count": course["enrollment_count"],
            "completed_sales_count": course["completed_sales_count"],
            "total_revenue": course["total_revenue"],
            "monthly_revenue": course["monthly_revenue"],
            "last_sale_at": course["last_sale_at"],
            "average_progress": course["average_progress"],
            "lesson_count": course["lesson_count"],
            "material_count": course["material_count"],
        }
        for course in dashboard["courses"]
    ]
    
    return {
        "id": instructor.id,
        "bio": instructor.bio,
        "specialization": instructor.specialization,
        "title": getattr(instructor, "title", None),
        "company": getattr(instructor, "company", None),
        "location": getattr(instructor, "location", None),
        "portfolio": getattr(instructor, "portfolio", None),
        "linkedin": getattr(instructor, "linkedin", None),
        "github": getattr(instructor, "github", None),
        "website": getattr(instructor, "website", None),
        "previous_teaching": getattr(instructor, "previous_teaching", None),
        "course_topics": getattr(instructor, "course_topics", None),
        "teaching_motivation": getattr(instructor, "teaching_motivation", None),
        "experience_years": instructor.experience_years,
        "certification": instructor.certification,
        "rating": instructor.rating,
        "total_ratings": instructor.total_ratings,
        "total_students": instructor.total_students,
        "published_courses": summary["published_courses"],
        "draft_courses": summary["draft_courses"],
        "total_sales_count": summary["total_sales_count"],
        "total_revenue": summary["total_revenue"],
        "monthly_revenue": summary["monthly_revenue"],
        "average_sale_value": summary["average_sale_value"],
        "last_sale_at": summary["last_sale_at"],
        "is_approved": instructor.is_approved,
        "is_featured": getattr(instructor, "is_featured", False),
        "created_at": instructor.created_at,
        "user": user_info,
        "total_courses": len(courses_info),
        "courses": courses_info,
        "recent_sales": dashboard["recent_sales"],
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
        _ensure_instructor_is_featured_column(db)
        db.execute(
            text("UPDATE instructors SET is_featured = TRUE WHERE id = :instructor_id"),
            {"instructor_id": instructor_id},
        )
        db.commit()
        featured_value = db.execute(
            text("SELECT is_featured FROM instructors WHERE id = :instructor_id"),
            {"instructor_id": instructor_id},
        ).scalar()
        return {
            "success": True,
            "message": "Instructor featured successfully",
            "is_featured": bool(featured_value),
        }
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
        _ensure_instructor_is_featured_column(db)
        db.execute(
            text("UPDATE instructors SET is_featured = FALSE WHERE id = :instructor_id"),
            {"instructor_id": instructor_id},
        )
        db.commit()
        featured_value = db.execute(
            text("SELECT is_featured FROM instructors WHERE id = :instructor_id"),
            {"instructor_id": instructor_id},
        ).scalar()
        return {
            "success": True,
            "message": "Instructor unfeatured",
            "is_featured": bool(featured_value),
        }
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

@test_router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    target_user = db.query(User).filter(User.id == user_id).first()

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if target_user.role == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete admin user"
        )

    if admin_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account"
        )

    try:
        db.query(Institution).filter(Institution.owner_user_id == user_id).update(
            {Institution.owner_user_id: None},
            synchronize_session=False,
        )
        db.query(InstitutionInstructorRequest).filter(
            InstitutionInstructorRequest.decided_by_admin_id == user_id
        ).update(
            {InstitutionInstructorRequest.decided_by_admin_id: None},
            synchronize_session=False,
        )

        instructor_profile = db.query(Instructor).filter(Instructor.user_id == user_id).first()
        if instructor_profile:
            course_ids = [
                course_id
                for (course_id,) in db.query(Course.id).filter(Course.instructor_id == instructor_profile.id).all()
            ]

            if course_ids:
                course_enrollment_ids = [
                    enrollment_id
                    for (enrollment_id,) in db.query(Enrollment.id).filter(Enrollment.course_id.in_(course_ids)).all()
                ]
                if course_enrollment_ids:
                    db.query(LessonProgress).filter(
                        LessonProgress.enrollment_id.in_(course_enrollment_ids)
                    ).delete(synchronize_session=False)

                db.query(CourseMaterial).filter(CourseMaterial.course_id.in_(course_ids)).delete(
                    synchronize_session=False
                )
                db.query(CourseAdminNote).filter(CourseAdminNote.course_id.in_(course_ids)).delete(
                    synchronize_session=False
                )
                db.query(Review).filter(Review.course_id.in_(course_ids)).delete(synchronize_session=False)
                db.query(Enrollment).filter(Enrollment.course_id.in_(course_ids)).delete(
                    synchronize_session=False
                )
                db.query(Lesson).filter(Lesson.course_id.in_(course_ids)).delete(synchronize_session=False)
                db.query(LiveSession).filter(
                    or_(
                        LiveSession.instructor_id == instructor_profile.id,
                        LiveSession.course_id.in_(course_ids),
                    )
                ).delete(synchronize_session=False)
                db.query(Payment).filter(Payment.course_id.in_(course_ids)).update(
                    {Payment.course_id: None},
                    synchronize_session=False,
                )
                db.query(Course).filter(Course.id.in_(course_ids)).delete(synchronize_session=False)

            db.query(Review).filter(Review.instructor_id == instructor_profile.id).delete(
                synchronize_session=False
            )
            db.query(InstitutionInstructorRequest).filter(
                InstitutionInstructorRequest.instructor_id == instructor_profile.id
            ).delete(synchronize_session=False)
            db.delete(instructor_profile)

        student_enrollment_ids = [
            enrollment_id
            for (enrollment_id,) in db.query(Enrollment.id).filter(Enrollment.student_id == user_id).all()
        ]
        if student_enrollment_ids:
            db.query(LessonProgress).filter(
                LessonProgress.enrollment_id.in_(student_enrollment_ids)
            ).delete(synchronize_session=False)
        db.query(Enrollment).filter(Enrollment.student_id == user_id).delete(synchronize_session=False)

        db.query(Review).filter(Review.reviewer_id == user_id).delete(synchronize_session=False)
        db.query(Payment).filter(Payment.user_id == user_id).delete(synchronize_session=False)
        db.query(AIInteraction).filter(AIInteraction.user_id == user_id).delete(synchronize_session=False)
        db.query(UserCourseBoxPurchase).filter(UserCourseBoxPurchase.user_id == user_id).delete(
            synchronize_session=False
        )
        db.query(LanguageCoursePurchase).filter(LanguageCoursePurchase.user_id == user_id).delete(
            synchronize_session=False
        )
        db.query(LiveClassRequest).filter(LiveClassRequest.user_id == user_id).delete(
            synchronize_session=False
        )
        db.query(SchoolCoursePurchase).filter(SchoolCoursePurchase.user_id == user_id).delete(
            synchronize_session=False
        )
        db.query(CourseAdminNote).filter(CourseAdminNote.admin_id == user_id).delete(
            synchronize_session=False
        )

        sent_message_ids = [
            message_id
            for (message_id,) in db.query(Message.id).filter(Message.sender_id == user_id).all()
        ]
        if sent_message_ids:
            db.query(MessageAttachment).filter(MessageAttachment.message_id.in_(sent_message_ids)).delete(
                synchronize_session=False
            )
        db.query(Message).filter(Message.sender_id == user_id).delete(synchronize_session=False)
        db.query(MessageParticipant).filter(MessageParticipant.user_id == user_id).delete(
            synchronize_session=False
        )

        db.delete(target_user)
        db.commit()
        return {"message": "User deleted successfully"}
    except Exception as e:
        db.rollback()
        print(f"Error deleting user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user: {str(e)}"
        )

@test_router.put("/users/{user_id}/make-instructor")
async def make_user_instructor(
    user_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Kullanıcıyı eğitmen yap ve profil oluştur."""
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if user.role == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin user cannot be converted to instructor"
        )

    instructor = db.query(Instructor).filter(Instructor.user_id == user_id).first()
    if not instructor:
        instructor = Instructor(
            user_id=user_id,
            is_approved=True
        )
        db.add(instructor)
    else:
        instructor.is_approved = True

    user.role = "instructor"
    db.commit()
    db.refresh(instructor)

    return {
        "message": "User promoted to instructor",
        "instructor_id": instructor.id
    }

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

@test_router.post("/migrate/add-instructor-featured")
async def migrate_add_instructor_featured(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Production database'e is_featured kolonu ekle"""
    try:
        _ensure_instructor_is_featured_column(db)
        return {
            "success": True,
            "message": "✅ is_featured kolonu hazır"
        }
    except Exception as e:
        db.rollback()
        import traceback
        error_details = traceback.format_exc()
        print(f"Migration error: {error_details}")
        return {
            "success": False,
            "message": f"❌ Hata: {str(e)}"
        }

@test_router.post("/migrate/add-instructor-application-columns")
async def migrate_add_instructor_application_columns(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Instructor başvuru alanları için kolonları ekle"""
    try:
        from sqlalchemy import text, inspect

        inspector = inspect(db.bind)
        existing_columns = [col['name'] for col in inspector.get_columns('instructors')]

        columns_to_add = {
            "title": "VARCHAR",
            "company": "VARCHAR",
            "location": "VARCHAR",
            "portfolio": "VARCHAR",
            "linkedin": "VARCHAR",
            "github": "VARCHAR",
            "website": "VARCHAR",
            "previous_teaching": "TEXT",
            "course_topics": "TEXT",
            "teaching_motivation": "TEXT",
        }

        added = []
        for column_name, column_type in columns_to_add.items():
            if column_name not in existing_columns:
                db.execute(text(f"ALTER TABLE instructors ADD COLUMN {column_name} {column_type}"))
                added.append(column_name)

        db.commit()
        return {
            "success": True,
            "message": "✅ Instructor başvuru kolonları eklendi",
            "added_columns": added,
        }
    except Exception as e:
        db.rollback()
        import traceback
        error_details = traceback.format_exc()
        print(f"Migration error: {error_details}")
        return {
            "success": False,
            "message": f"❌ Hata: {str(e)}"
        }
