from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from sqlalchemy import inspect, text
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime
import auth
from database import get_db
from models import Institution, InstitutionCourse, InstitutionInstructorRequest, Instructor, User
from s3_utils import generate_presigned_put_url, get_public_s3_url, build_secure_media_stream_path
import secrets

router = APIRouter()
BROCHURE_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png"}
BROCHURE_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png"}

# Schemas
class InstitutionBase(BaseModel):
    name: str
    description: str
    city: str
    district: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    logo: Optional[str] = None
    cover_image: Optional[str] = None
    intro_video: Optional[str] = None
    brochure_pdf: Optional[str] = None
    image_color: Optional[str] = "from-blue-500 to-purple-600"
    is_active: Optional[bool] = True
    is_featured: Optional[bool] = False

class InstitutionCreate(InstitutionBase):
    pass

class InstitutionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    logo: Optional[str] = None
    cover_image: Optional[str] = None
    intro_video: Optional[str] = None
    brochure_pdf: Optional[str] = None
    image_color: Optional[str] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    total_students: Optional[int] = None
    total_courses: Optional[int] = None
    rating: Optional[float] = None
    total_ratings: Optional[int] = None

class InstitutionCourseCreate(BaseModel):
    title: str
    description: Optional[str] = None
    price: Optional[float] = 0
    discount_price: Optional[float] = None
    duration: Optional[str] = None
    level: Optional[str] = None
    thumbnail: Optional[str] = None
    order_index: Optional[int] = 0
    is_active: Optional[bool] = True

class InstitutionResponse(InstitutionBase):
    id: int
    rating: float
    total_ratings: int
    total_students: int
    total_courses: int
    brochure_is_image: Optional[bool] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class InstitutionApprovalResponse(BaseModel):
    id: int
    name: str
    description: str
    city: str
    district: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    is_active: bool
    created_at: datetime
    owner_user_id: Optional[int] = None
    owner_user: Optional[dict] = None

    class Config:
        from_attributes = True

class PresignUploadRequest(BaseModel):
    kind: str  # 'logo', 'cover_image', 'intro_video', 'brochure_pdf'
    filename: str
    content_type: str


def _validate_brochure_upload(filename: str, content_type: str) -> None:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    normalized_content_type = (content_type or "").split(";", 1)[0].strip().lower()

    if ext not in BROCHURE_IMAGE_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Broşür yalnızca JPG, JPEG veya PNG olabilir")
    if normalized_content_type and normalized_content_type not in BROCHURE_IMAGE_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Broşür yalnızca JPG, JPEG veya PNG olabilir")

class InstitutionInstructorRequestResponse(BaseModel):
    id: int
    institution: dict
    instructor: dict
    status: str
    created_at: datetime
    decided_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InstitutionInstructorCreateRequest(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    password: str
    city: Optional[str] = None
    district: Optional[str] = None
    bio: Optional[str] = None
    specialization: Optional[str] = None
    title: Optional[str] = None
    experience_years: Optional[int] = 0
    certification: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    portfolio: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    website: Optional[str] = None
    previous_teaching: Optional[str] = None
    course_topics: Optional[str] = None
    teaching_motivation: Optional[str] = None


class InstitutionInstructorResponse(BaseModel):
    id: int
    user_id: int
    full_name: str
    email: str
    phone: str
    title: Optional[str] = None
    specialization: Optional[str] = None
    bio: Optional[str] = None
    experience_years: int
    is_approved: bool
    status: str

    class Config:
        from_attributes = True


def _serialize_institution_instructor(instructor: Instructor) -> InstitutionInstructorResponse:
    if not instructor.user:
        raise HTTPException(status_code=500, detail="Eğitmen kullanıcısı bulunamadı")

    return InstitutionInstructorResponse(
        id=instructor.id,
        user_id=instructor.user.id,
        full_name=instructor.user.full_name,
        email=instructor.user.email,
        phone=instructor.user.phone,
        title=instructor.title,
        specialization=instructor.specialization,
        bio=instructor.bio,
        experience_years=instructor.experience_years or 0,
        is_approved=bool(instructor.is_approved),
        status="approved" if instructor.is_approved else "pending",
    )


def _ensure_institutions_table_columns(db: Session) -> None:
    inspector = inspect(db.bind)
    if "institutions" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("institutions")}
    statements = []
    if "owner_user_id" not in existing_columns:
        statements.append("ALTER TABLE institutions ADD COLUMN owner_user_id INTEGER")
    if "brochure_pdf" not in existing_columns:
        statements.append("ALTER TABLE institutions ADD COLUMN brochure_pdf VARCHAR")

    if not statements:
        return

    try:
        for statement in statements:
            db.execute(text(statement))
        db.commit()
    except Exception as exc:
        db.rollback()
        message = str(exc).lower()
        if "duplicate column" not in message and "already exists" not in message:
            raise


def _institution_query(db: Session):
    _ensure_institutions_table_columns(db)
    return db.query(Institution)


def _is_brochure_image_url(file_url: Optional[str]) -> bool:
    if not file_url:
        return False
    clean_url = file_url.split("?", 1)[0].split("#", 1)[0].lower()
    return clean_url.endswith((".jpg", ".jpeg", ".png"))


def _serialize_institution_response(institution: Institution) -> dict:
    payload = jsonable_encoder(institution)
    payload["brochure_is_image"] = _is_brochure_image_url(payload.get("brochure_pdf"))
    payload["intro_video"] = build_secure_media_stream_path(payload.get("intro_video"), expires_in=1800)
    payload["brochure_pdf"] = build_secure_media_stream_path(payload.get("brochure_pdf"), expires_in=1800)
    return payload

# List Institutions
@router.get("/institutions", response_model=List[InstitutionResponse])
async def list_institutions(
    skip: int = 0,
    limit: int = 100,
    city: Optional[str] = None,
    is_active: Optional[bool] = None,
    is_featured: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth.require_role(["admin"]))
):
    """List all institutions with filters"""
    query = _institution_query(db)
    
    if city:
        query = query.filter(Institution.city == city)
    if is_active is not None:
        query = query.filter(Institution.is_active == is_active)
    if is_featured is not None:
        query = query.filter(Institution.is_featured == is_featured)
    if search:
        query = query.filter(Institution.name.ilike(f"%{search}%"))
    
    institutions = query.offset(skip).limit(limit).all()
    return [_serialize_institution_response(institution) for institution in institutions]

# Create Institution
@router.post("/institutions", response_model=InstitutionResponse)
async def create_institution(
    institution_data: InstitutionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth.require_role(["admin"]))
):
    """Create new institution"""
    _ensure_institutions_table_columns(db)
    institution = Institution(**institution_data.dict())
    db.add(institution)
    db.commit()
    db.refresh(institution)
    return _serialize_institution_response(institution)

# Update Institution
@router.put("/institutions/{institution_id}", response_model=InstitutionResponse)
async def update_institution(
    institution_id: int,
    institution_data: InstitutionUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth.require_role(["admin"]))
):
    """Update institution"""
    institution = _institution_query(db).filter(Institution.id == institution_id).first()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found")
    
    # Update fields
    update_data = institution_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(institution, field, value)
    
    institution.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(institution)
    return _serialize_institution_response(institution)

# Delete Institution
@router.delete("/institutions/{institution_id}")
async def delete_institution(
    institution_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth.require_role(["admin"]))
):
    """Delete institution"""
    institution = _institution_query(db).filter(Institution.id == institution_id).first()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found")
    
    # Delete related courses first
    db.query(InstitutionCourse).filter(
        InstitutionCourse.institution_id == institution_id
    ).delete()
    
    db.delete(institution)
    db.commit()
    return {"message": "Institution deleted successfully"}

# Add Course to Institution
@router.post("/institutions/{institution_id}/courses")
async def add_institution_course(
    institution_id: int,
    course_data: InstitutionCourseCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth.require_role(["admin"]))
):
    """Add course to institution"""
    institution = _institution_query(db).filter(Institution.id == institution_id).first()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found")
    
    course = InstitutionCourse(
        institution_id=institution_id,
        **course_data.dict()
    )
    db.add(course)
    
    # Update institution total_courses
    institution.total_courses += 1
    
    db.commit()
    db.refresh(course)
    return course

# Delete Institution Course
@router.delete("/institutions/{institution_id}/courses/{course_id}")
async def delete_institution_course(
    institution_id: int,
    course_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth.require_role(["admin"]))
):
    """Delete course from institution"""
    course = db.query(InstitutionCourse).filter(
        InstitutionCourse.id == course_id,
        InstitutionCourse.institution_id == institution_id
    ).first()
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Update institution total_courses
    institution = _institution_query(db).filter(Institution.id == institution_id).first()
    if institution and institution.total_courses > 0:
        institution.total_courses -= 1
    
    db.delete(course)
    db.commit()
    return {"message": "Course deleted successfully"}

# Presign Upload for Institution Files
@router.post("/institutions/{institution_id}/presign-upload")
async def presign_institution_upload(
    institution_id: int,
    req: PresignUploadRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth.require_role(["admin"]))
):
    """Generate presigned S3 URL for uploading institution files"""
    institution = _institution_query(db).filter(Institution.id == institution_id).first()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found")
    
    # Validate kind
    if req.kind not in ['logo', 'cover_image', 'intro_video', 'brochure_pdf']:
        raise HTTPException(status_code=400, detail="Invalid file kind")
    if req.kind == "brochure_pdf":
        _validate_brochure_upload(req.filename, req.content_type)
    
    try:
        # Generate unique filename
        random_str = secrets.token_hex(8)
        ext = req.filename.split('.')[-1] if '.' in req.filename else 'jpg'
        object_name = f"institutions/{institution_id}/{req.kind}/{random_str}.{ext}"
        
        # Generate presigned URL
        upload_url = generate_presigned_put_url(object_name, req.content_type, expires_in=3600)
        public_url = get_public_s3_url(object_name)
        
        return {
            "upload_url": upload_url,
            "public_url": public_url,
            "object_name": object_name
        }
    except Exception as e:
        print(f"Error generating presigned URL: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate upload URL: {str(e)}")

# Set File URLs
@router.post("/institutions/{institution_id}/set-logo")
async def set_institution_logo(
    institution_id: int,
    url: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth.require_role(["admin"]))
):
    """Set logo URL after successful S3 upload"""
    institution = _institution_query(db).filter(Institution.id == institution_id).first()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found")
    
    institution.logo = url
    institution.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Logo updated successfully"}

@router.post("/institutions/{institution_id}/set-cover")
async def set_institution_cover(
    institution_id: int,
    url: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth.require_role(["admin"]))
):
    """Set cover image URL after successful S3 upload"""
    institution = _institution_query(db).filter(Institution.id == institution_id).first()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found")
    
    institution.cover_image = url
    institution.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Cover image updated successfully"}

@router.post("/institutions/{institution_id}/set-video")
async def set_institution_video(
    institution_id: int,
    url: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth.require_role(["admin"]))
):
    """Set intro video URL after successful S3 upload"""
    institution = _institution_query(db).filter(Institution.id == institution_id).first()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found")
    
    institution.intro_video = url
    institution.updated_at = datetime.utcnow()
    db.commit()
    return {
        "message": "Intro video updated successfully",
        "intro_video": build_secure_media_stream_path(institution.intro_video, expires_in=1800),
    }


@router.post("/institutions/{institution_id}/set-brochure")
async def set_institution_brochure(
    institution_id: int,
    url: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth.require_role(["admin"]))
):
    """Set brochure image URL after successful S3 upload"""
    institution = _institution_query(db).filter(Institution.id == institution_id).first()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found")

    institution.brochure_pdf = url
    institution.updated_at = datetime.utcnow()
    db.commit()
    return {
        "message": "Brochure updated successfully",
        "brochure_pdf": build_secure_media_stream_path(institution.brochure_pdf, expires_in=1800),
        "brochure_is_image": _is_brochure_image_url(institution.brochure_pdf),
    }

# Public endpoint for frontend
@router.get("/public/institutions", response_model=List[InstitutionResponse])
async def get_public_institutions(
    skip: int = 0,
    limit: int = 100,
    city: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Public endpoint to get active institutions"""
    query = (
        _institution_query(db)
        .filter(Institution.is_active == True)
        .order_by(
            Institution.is_featured.desc(),
            Institution.rating.desc(),
            Institution.total_students.desc(),
            Institution.total_courses.desc(),
            Institution.created_at.desc(),
        )
    )
    
    if city:
        query = query.filter(Institution.city == city)
    if search:
        query = query.filter(Institution.name.ilike(f"%{search}%"))
    
    institutions = query.offset(skip).limit(limit).all()
    return [_serialize_institution_response(institution) for institution in institutions]


# Manual migration helper (Admin only)
@router.post("/migrate/institutions-columns")
async def migrate_institution_columns(
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth.require_role(["admin"]))
):
    try:
        db.execute(text("ALTER TABLE instructors ADD COLUMN IF NOT EXISTS institution_id INTEGER"))
        db.execute(text("ALTER TABLE institutions ADD COLUMN IF NOT EXISTS owner_user_id INTEGER"))
        db.execute(text("ALTER TABLE institutions ADD COLUMN IF NOT EXISTS brochure_pdf VARCHAR"))
        db.execute(text(
            """
            CREATE TABLE IF NOT EXISTS institution_instructor_requests (
              id SERIAL PRIMARY KEY,
              institution_id INTEGER NOT NULL,
              instructor_id INTEGER NOT NULL,
              status VARCHAR(32) DEFAULT 'pending',
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              decided_at TIMESTAMP NULL,
              decided_by_admin_id INTEGER NULL
            )
            """
        ))
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Migration failed: {e}")

    return {"message": "Migration complete"}


# Institution Applications (Admin)
@router.get("/institutions/applications", response_model=List[InstitutionApprovalResponse])
async def list_institution_applications(
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth.require_role(["admin"]))
):
    institutions = _institution_query(db).filter(Institution.is_active == False).order_by(Institution.created_at.desc()).all()
    result: List[InstitutionApprovalResponse] = []
    for inst in institutions:
        owner = db.query(User).filter(User.id == inst.owner_user_id).first() if inst.owner_user_id else None
        result.append(
            InstitutionApprovalResponse(
                id=inst.id,
                name=inst.name,
                description=inst.description,
                city=inst.city,
                district=inst.district,
                phone=inst.phone,
                email=inst.email,
                website=inst.website,
                is_active=inst.is_active,
                created_at=inst.created_at,
                owner_user_id=inst.owner_user_id,
                owner_user={
                    "id": owner.id if owner else None,
                    "full_name": owner.full_name if owner else None,
                    "email": owner.email if owner else None,
                    "phone": owner.phone if owner else None,
                } if owner else None
            )
        )
    return result


@router.post("/institutions/{institution_id}/approve")
async def approve_institution_application(
    institution_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth.require_role(["admin"]))
):
    institution = _institution_query(db).filter(Institution.id == institution_id).first()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found")
    institution.is_active = True
    institution.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Kurum başvurusu onaylandı"}


@router.post("/institutions/{institution_id}/reject")
async def reject_institution_application(
    institution_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth.require_role(["admin"]))
):
    institution = _institution_query(db).filter(Institution.id == institution_id).first()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found")
    institution.is_active = False
    institution.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Kurum başvurusu reddedildi"}


# Institution Instructor Requests (Admin approval)
@router.get("/institutions/instructor-requests", response_model=List[InstitutionInstructorRequestResponse])
async def list_institution_instructor_requests(
    status: Optional[str] = "pending",
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth.require_role(["admin"]))
):
    query = db.query(InstitutionInstructorRequest)
    if status:
        query = query.filter(InstitutionInstructorRequest.status == status)
    requests = query.order_by(InstitutionInstructorRequest.created_at.desc()).all()

    result: List[InstitutionInstructorRequestResponse] = []
    for req in requests:
        inst = _institution_query(db).filter(Institution.id == req.institution_id).first()
        instructor = db.query(Instructor).filter(Instructor.id == req.instructor_id).first()
        user = instructor.user if instructor else None
        result.append(
            InstitutionInstructorRequestResponse(
                id=req.id,
                institution={
                    "id": inst.id if inst else None,
                    "name": inst.name if inst else "Bilinmiyor",
                    "city": inst.city if inst else None,
                    "district": inst.district if inst else None,
                },
                instructor={
                    "id": instructor.id if instructor else None,
                    "user_id": user.id if user else None,
                    "full_name": user.full_name if user else "Bilinmiyor",
                    "email": user.email if user else None,
                    "phone": user.phone if user else None,
                },
                status=req.status,
                created_at=req.created_at,
                decided_at=req.decided_at,
            )
        )
    return result


@router.post("/institutions/instructor-requests/{request_id}/approve")
async def approve_institution_instructor_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth.require_role(["admin"]))
):
    req = db.query(InstitutionInstructorRequest).filter(InstitutionInstructorRequest.id == request_id).first()
    if not req or req.status != "pending":
        raise HTTPException(status_code=404, detail="Talep bulunamadı")

    instructor = db.query(Instructor).filter(Instructor.id == req.instructor_id).first()
    if not instructor:
        raise HTTPException(status_code=404, detail="Eğitmen bulunamadı")

    # If instructor is already in another institution, block
    if instructor.institution_id and instructor.institution_id != req.institution_id:
        raise HTTPException(status_code=400, detail="Eğitmen başka bir kuruma bağlı")

    instructor.institution_id = req.institution_id
    req.status = "approved"
    req.decided_at = datetime.utcnow()
    req.decided_by_admin_id = current_user.id if hasattr(current_user, "id") else None
    db.commit()
    return {"message": "Eğitmen kuruma bağlandı"}


@router.post("/institutions/instructor-requests/{request_id}/reject")
async def reject_institution_instructor_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth.require_role(["admin"]))
):
    req = db.query(InstitutionInstructorRequest).filter(InstitutionInstructorRequest.id == request_id).first()
    if not req or req.status != "pending":
        raise HTTPException(status_code=404, detail="Talep bulunamadı")

    req.status = "rejected"
    req.decided_at = datetime.utcnow()
    req.decided_by_admin_id = current_user.id if hasattr(current_user, "id") else None
    db.commit()
    return {"message": "Talep reddedildi"}


@router.post(
    "/institutions/{institution_id}/instructors/create",
    response_model=InstitutionInstructorResponse,
)
async def create_instructor_for_institution_by_admin(
    institution_id: int,
    payload: InstitutionInstructorCreateRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth.require_role(["admin"])),
):
    institution = _institution_query(db).filter(Institution.id == institution_id).first()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found")

    email_value = payload.email.strip().lower()
    phone_value = payload.phone.strip()
    full_name_value = payload.full_name.strip()

    if not full_name_value:
        raise HTTPException(status_code=400, detail="Ad soyad zorunludur")
    if not phone_value:
        raise HTTPException(status_code=400, detail="Telefon zorunludur")
    if len(payload.password or "") < 6:
        raise HTTPException(status_code=400, detail="Şifre en az 6 karakter olmalıdır")

    existing_user = (
        db.query(User)
        .filter((User.email == email_value) | (User.phone == phone_value))
        .first()
    )
    if existing_user:
        raise HTTPException(status_code=400, detail="Bu e-posta veya telefon zaten kullanılıyor")

    user = User(
        email=email_value,
        phone=phone_value,
        password_hash=auth.hash_password(payload.password),
        full_name=full_name_value,
        role="instructor",
        is_active=True,
        is_verified=True,
        city=payload.city or institution.city,
        district=payload.district or institution.district,
    )
    db.add(user)
    db.flush()

    instructor = Instructor(
        user_id=user.id,
        institution_id=institution.id,
        bio=payload.bio,
        specialization=payload.specialization,
        title=payload.title,
        company=payload.company or institution.name,
        location=payload.location or institution.city,
        portfolio=payload.portfolio,
        linkedin=payload.linkedin,
        github=payload.github,
        website=payload.website,
        previous_teaching=payload.previous_teaching,
        course_topics=payload.course_topics,
        teaching_motivation=payload.teaching_motivation,
        experience_years=payload.experience_years or 0,
        certification=payload.certification,
        is_approved=True,
    )
    db.add(instructor)
    db.commit()
    db.refresh(instructor)

    return _serialize_institution_instructor(instructor)


# Keep this dynamic route after static institution routes
# (/institutions/applications, /institutions/instructor-requests, etc.)
# to prevent 422 validation errors from route shadowing.
@router.get("/institutions/{institution_id}")
async def get_institution(
    institution_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth.require_role(["admin"]))
):
    """Get institution details with courses"""
    institution = _institution_query(db).filter(Institution.id == institution_id).first()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found")

    courses = db.query(InstitutionCourse).filter(
        InstitutionCourse.institution_id == institution_id
    ).all()

    instructors = (
        db.query(Instructor)
        .join(User)
        .filter(Instructor.institution_id == institution_id, User.role == "instructor")
        .order_by(Instructor.created_at.desc(), User.full_name.asc())
        .all()
    )

    payload = _serialize_institution_response(institution)
    payload["courses"] = jsonable_encoder(courses)
    payload["instructors"] = [
        _serialize_institution_instructor(instructor).dict() for instructor in instructors
    ]
    return payload
