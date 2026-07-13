from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from sqlalchemy import inspect, text
from typing import Optional, List, Dict
from pydantic import BaseModel, EmailStr
from datetime import datetime

import auth
from database import get_db
from models import (
    Institution,
    Instructor,
    User,
    InstitutionInstructorRequest,
    Course,
    Lesson,
    CourseMaterial,
    Enrollment,
    Review,
    CourseAdminNote,
)
from s3_utils import build_secure_media_stream_path, generate_presigned_put_url, get_public_s3_url
import secrets

router = APIRouter()
BROCHURE_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png"}
BROCHURE_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png"}


class InstitutionApplyRequest(BaseModel):
    institution_id: Optional[int] = None
    name: Optional[str] = None
    description: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None


class InstitutionUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    logo: Optional[str] = None
    cover_image: Optional[str] = None
    intro_video: Optional[str] = None
    brochure_pdf: Optional[str] = None


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


class InstitutionMeResponse(BaseModel):
    id: int
    name: str
    description: str
    city: str
    district: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    logo: Optional[str] = None
    cover_image: Optional[str] = None
    intro_video: Optional[str] = None
    brochure_pdf: Optional[str] = None
    brochure_is_image: Optional[bool] = None
    image_color: Optional[str] = None
    is_active: bool
    is_featured: bool
    total_students: int
    total_courses: int
    rating: float
    total_ratings: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InstitutionInstructorResponse(BaseModel):
    id: int
    user_id: int
    full_name: str
    email: str
    phone: str
    title: Optional[str] = None
    specialization: Optional[str] = None
    is_approved: bool
    status: str


class InstitutionInstructorLinkRequest(BaseModel):
    instructor_user_id: Optional[int] = None
    email: Optional[str] = None


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


class InstitutionPublishedCourseResponse(BaseModel):
    id: int
    title: str
    category: Optional[str] = None
    level: Optional[str] = None
    price: float
    discount_price: Optional[float] = None
    enrollment_count: int
    rating: float
    thumbnail: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class InstitutionInstructorCoursesResponse(BaseModel):
    instructor_id: int
    user_id: int
    full_name: str
    email: str
    phone: str
    title: Optional[str] = None
    specialization: Optional[str] = None
    total_students: int
    published_course_count: int
    courses: List[InstitutionPublishedCourseResponse]


class InstitutionManagedCourseCreateRequest(BaseModel):
    instructor_id: Optional[int] = None
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
    is_published: bool = False
    what_you_will_learn: Optional[List[str]] = None
    requirements: Optional[List[str]] = None


class InstitutionManagedCourseUpdateRequest(BaseModel):
    instructor_id: Optional[int] = None
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
    what_you_will_learn: Optional[List[str]] = None
    requirements: Optional[List[str]] = None


class InstitutionManagedCourseResponse(BaseModel):
    id: int
    instructor_id: int
    instructor_name: str
    instructor_email: str
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
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_online: bool = True
    is_published: bool = False
    what_you_will_learn: Optional[List[str]] = None
    requirements: Optional[List[str]] = None
    enrollment_count: int
    rating: float
    created_at: datetime
    updated_at: datetime


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


def _get_my_institution(current_user: User, db: Session) -> Institution:
    _ensure_institutions_table_columns(db)
    institution = db.query(Institution).filter(Institution.owner_user_id == current_user.id).first()
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kurum bulunamadı. Lütfen önce başvuru yapın."
        )
    return institution


def _get_institution_linked_instructors(institution_id: int, db: Session) -> List[Instructor]:
    return (
        db.query(Instructor)
        .join(User)
        .filter(Instructor.institution_id == institution_id, User.role == "instructor")
        .order_by(User.full_name.asc())
        .all()
    )


def _serialize_managed_course(course: Course) -> InstitutionManagedCourseResponse:
    instructor = course.instructor
    instructor_user = instructor.user if instructor else None
    return InstitutionManagedCourseResponse(
        id=course.id,
        instructor_id=instructor.id if instructor else 0,
        instructor_name=instructor_user.full_name if instructor_user else "Bilinmiyor",
        instructor_email=instructor_user.email if instructor_user else "",
        title=course.title,
        description=course.description,
        short_description=course.short_description,
        price=course.price,
        discount_price=course.discount_price,
        duration_hours=course.duration_hours,
        level=course.level,
        category=course.category,
        subcategory=course.subcategory,
        language=course.language,
        location=course.location,
        latitude=course.latitude,
        longitude=course.longitude,
        is_online=course.is_online,
        is_published=course.is_published,
        what_you_will_learn=course.what_you_will_learn,
        requirements=course.requirements,
        enrollment_count=course.enrollment_count or 0,
        rating=course.rating or 0.0,
        created_at=course.created_at,
        updated_at=course.updated_at,
    )


def _pick_instructor_for_course(
    requested_instructor_id: Optional[int],
    instructors: List[Instructor],
) -> Optional[Instructor]:
    if not instructors:
        return None
    if requested_instructor_id is not None:
        for inst in instructors:
            if inst.id == requested_instructor_id:
                return inst
        return None
    if len(instructors) == 1:
        return instructors[0]
    return None


@router.post("/institutions/apply", response_model=InstitutionMeResponse)
async def apply_as_institution(
    payload: InstitutionApplyRequest,
    current_user: User = Depends(auth.require_role(["institution", "instructor"])),
    db: Session = Depends(get_db),
):
    _ensure_institutions_table_columns(db)
    if payload.institution_id:
        institution = db.query(Institution).filter(Institution.id == payload.institution_id).first()
        if not institution:
            raise HTTPException(status_code=404, detail="Kurum bulunamadı")
        if institution.owner_user_id and institution.owner_user_id != current_user.id:
            raise HTTPException(status_code=400, detail="Bu kurum başka bir kullanıcıya bağlı")
        existing_owned = db.query(Institution).filter(Institution.owner_user_id == current_user.id).first()
        if existing_owned and existing_owned.id != institution.id:
            raise HTTPException(status_code=400, detail="Zaten başka bir kuruma bağlısınız")

        institution.owner_user_id = current_user.id
        # Başvuruda verilen bilgilerle güncelle
        for field in ["name", "description", "city", "district", "address", "phone", "email", "website"]:
            value = getattr(payload, field)
            if value is not None:
                setattr(institution, field, value)
        institution.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(institution)
        return _serialize_institution_response(institution)

    # Yeni kurum başvurusu
    existing_owned = db.query(Institution).filter(Institution.owner_user_id == current_user.id).first()
    if existing_owned:
        raise HTTPException(status_code=400, detail="Zaten bir kurumunuz var")
    if not payload.name or not payload.description or not payload.city:
        raise HTTPException(
            status_code=400,
            detail="Yeni kurum için ad, açıklama ve şehir zorunludur."
        )

    institution = Institution(
        name=payload.name,
        description=payload.description,
        city=payload.city,
        district=payload.district,
        address=payload.address,
        phone=payload.phone,
        email=payload.email,
        website=payload.website,
        owner_user_id=current_user.id,
        is_active=False,  # admin onayı beklesin
        is_featured=False,
    )
    db.add(institution)
    db.commit()
    db.refresh(institution)
    return _serialize_institution_response(institution)


@router.get("/institutions/me", response_model=InstitutionMeResponse)
async def get_my_institution(
    current_user: User = Depends(auth.require_role(["institution", "instructor"])),
    db: Session = Depends(get_db),
):
    _ensure_institutions_table_columns(db)
    institution = _get_my_institution(current_user, db)
    return _serialize_institution_response(institution)


@router.put("/institutions/me", response_model=InstitutionMeResponse)
async def update_my_institution(
    payload: InstitutionUpdateRequest,
    current_user: User = Depends(auth.require_role(["institution", "instructor"])),
    db: Session = Depends(get_db),
):
    _ensure_institutions_table_columns(db)
    institution = _get_my_institution(current_user, db)
    update_data = payload.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(institution, field, value)
    institution.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(institution)
    return _serialize_institution_response(institution)


@router.post("/institutions/me/presign-upload")
async def presign_institution_upload(
    payload: PresignUploadRequest,
    current_user: User = Depends(auth.require_role(["institution", "instructor"])),
    db: Session = Depends(get_db),
):
    _ensure_institutions_table_columns(db)
    institution = _get_my_institution(current_user, db)

    if payload.kind not in {"logo", "cover_image", "intro_video", "brochure_pdf"}:
        raise HTTPException(status_code=400, detail="Invalid upload kind")
    if payload.kind == "brochure_pdf":
        _validate_brochure_upload(payload.filename, payload.content_type)

    ext = payload.filename.split(".")[-1].lower() if "." in payload.filename else "bin"
    random_str = secrets.token_urlsafe(8)
    object_name = f"institutions/{institution.id}/{payload.kind}/{random_str}.{ext}"

    presigned = generate_presigned_put_url(object_name, payload.content_type)
    public_url = get_public_s3_url(object_name)

    return {
        "upload_url": presigned,
        "public_url": public_url,
        "object_key": object_name,
    }


@router.get("/institutions/me/instructors", response_model=List[InstitutionInstructorResponse])
async def list_my_instructors(
    current_user: User = Depends(auth.require_role(["institution", "instructor"])),
    db: Session = Depends(get_db),
):
    institution = _get_my_institution(current_user, db)
    instructors = (
        db.query(Instructor)
        .join(User)
        .filter(Instructor.institution_id == institution.id, User.role == "instructor")
        .all()
    )
    pending_requests = (
        db.query(InstitutionInstructorRequest)
        .join(Instructor)
        .filter(
            InstitutionInstructorRequest.institution_id == institution.id,
            InstitutionInstructorRequest.status == "pending",
        )
        .all()
    )

    result: List[InstitutionInstructorResponse] = []
    for inst in instructors:
        if not inst.user:
            continue
        status_value = "approved" if inst.is_approved else "pending_admin"
        result.append(
            InstitutionInstructorResponse(
                id=inst.id,
                user_id=inst.user.id,
                full_name=inst.user.full_name,
                email=inst.user.email,
                phone=inst.user.phone,
                title=inst.title,
                specialization=inst.specialization,
                is_approved=inst.is_approved,
                status=status_value,
            )
        )

    for req in pending_requests:
        inst = req.instructor
        if not inst or not inst.user:
            continue
        result.append(
            InstitutionInstructorResponse(
                id=inst.id,
                user_id=inst.user.id,
                full_name=inst.user.full_name,
                email=inst.user.email,
                phone=inst.user.phone,
                title=inst.title,
                specialization=inst.specialization,
                is_approved=inst.is_approved,
                status="pending",
            )
        )

    return result


@router.post("/institutions/me/instructors/create", response_model=InstitutionInstructorResponse)
async def create_instructor_account_for_institution(
    payload: InstitutionInstructorCreateRequest,
    current_user: User = Depends(auth.require_role(["institution", "instructor"])),
    db: Session = Depends(get_db),
):
    institution = _get_my_institution(current_user, db)

    email_value = payload.email.strip().lower()
    phone_value = payload.phone.strip()
    full_name_value = payload.full_name.strip()

    if not phone_value:
        raise HTTPException(status_code=400, detail="Telefon zorunludur")
    if not full_name_value:
        raise HTTPException(status_code=400, detail="Ad soyad zorunludur")
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
        city=payload.city,
        district=payload.district,
    )
    db.add(user)
    db.flush()

    instructor = Instructor(
        user_id=user.id,
        institution_id=institution.id,
        bio=payload.bio,
        specialization=payload.specialization,
        title=payload.title,
        company=payload.company,
        location=payload.location,
        portfolio=payload.portfolio,
        linkedin=payload.linkedin,
        github=payload.github,
        website=payload.website,
        previous_teaching=payload.previous_teaching,
        course_topics=payload.course_topics,
        teaching_motivation=payload.teaching_motivation,
        experience_years=payload.experience_years or 0,
        certification=payload.certification,
        is_approved=False,
    )
    db.add(instructor)
    db.commit()
    db.refresh(instructor)

    return InstitutionInstructorResponse(
        id=instructor.id,
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        title=instructor.title,
        specialization=instructor.specialization,
        is_approved=instructor.is_approved,
        status="pending_admin",
    )


@router.get("/institutions/me/instructor-courses", response_model=List[InstitutionInstructorCoursesResponse])
async def list_my_instructors_with_published_courses(
    current_user: User = Depends(auth.require_role(["institution", "instructor"])),
    db: Session = Depends(get_db),
):
    institution = _get_my_institution(current_user, db)

    instructors = (
        db.query(Instructor)
        .join(User)
        .filter(Instructor.institution_id == institution.id, User.role == "instructor")
        .order_by(User.full_name.asc())
        .all()
    )

    instructor_ids = [inst.id for inst in instructors if inst.id is not None]
    courses_by_instructor: Dict[int, List[Course]] = {inst_id: [] for inst_id in instructor_ids}

    if instructor_ids:
        published_courses = (
            db.query(Course)
            .filter(Course.instructor_id.in_(instructor_ids), Course.is_published == True)
            .order_by(Course.updated_at.desc(), Course.created_at.desc())
            .all()
        )
        for course in published_courses:
            if course.instructor_id in courses_by_instructor:
                courses_by_instructor[course.instructor_id].append(course)

    result: List[InstitutionInstructorCoursesResponse] = []
    for inst in instructors:
        if not inst.user:
            continue

        courses = courses_by_instructor.get(inst.id, [])
        serialized_courses = [
            InstitutionPublishedCourseResponse(
                id=course.id,
                title=course.title,
                category=course.category,
                level=course.level,
                price=course.price,
                discount_price=course.discount_price,
                enrollment_count=course.enrollment_count or 0,
                rating=course.rating or 0.0,
                thumbnail=course.thumbnail,
                created_at=course.created_at,
                updated_at=course.updated_at,
            )
            for course in courses
        ]

        result.append(
            InstitutionInstructorCoursesResponse(
                instructor_id=inst.id,
                user_id=inst.user.id,
                full_name=inst.user.full_name,
                email=inst.user.email,
                phone=inst.user.phone,
                title=inst.title,
                specialization=inst.specialization,
                total_students=inst.total_students or 0,
                published_course_count=len(serialized_courses),
                courses=serialized_courses,
            )
        )

    return result


@router.get("/institutions/me/courses", response_model=List[InstitutionManagedCourseResponse])
async def list_my_institution_courses(
    include_unpublished: bool = True,
    current_user: User = Depends(auth.require_role(["institution", "instructor"])),
    db: Session = Depends(get_db),
):
    institution = _get_my_institution(current_user, db)

    query = (
        db.query(Course)
        .join(Instructor)
        .join(User)
        .filter(Instructor.institution_id == institution.id, User.role == "instructor")
        .order_by(Course.updated_at.desc(), Course.created_at.desc())
    )
    if not include_unpublished:
        query = query.filter(Course.is_published == True)

    courses = query.all()
    return [_serialize_managed_course(course) for course in courses]


@router.post("/institutions/me/courses", response_model=InstitutionManagedCourseResponse)
async def create_my_institution_course(
    payload: InstitutionManagedCourseCreateRequest,
    current_user: User = Depends(auth.require_role(["institution", "instructor"])),
    db: Session = Depends(get_db),
):
    institution = _get_my_institution(current_user, db)
    instructors = _get_institution_linked_instructors(institution.id, db)
    if not instructors:
        raise HTTPException(status_code=400, detail="Önce kurumunuza bir eğitmen eklemelisiniz")

    selected_instructor = _pick_instructor_for_course(payload.instructor_id, instructors)
    if not selected_instructor:
        raise HTTPException(
            status_code=400,
            detail="Ders için kurumunuza bağlı geçerli bir eğitmen seçin",
        )

    if payload.is_published and not selected_instructor.is_approved:
        raise HTTPException(
            status_code=400,
            detail="Eğitmen admin tarafından onaylanmadan ders yayınlanamaz",
        )

    course = Course(
        title=payload.title,
        description=payload.description,
        short_description=payload.short_description,
        instructor_id=selected_instructor.id,
        price=payload.price,
        discount_price=payload.discount_price,
        duration_hours=payload.duration_hours,
        level=payload.level,
        category=payload.category,
        subcategory=payload.subcategory,
        language=payload.language,
        location=payload.location,
        latitude=payload.latitude,
        longitude=payload.longitude,
        is_online=payload.is_online,
        is_published=payload.is_published,
        what_you_will_learn=payload.what_you_will_learn,
        requirements=payload.requirements,
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return _serialize_managed_course(course)


@router.put("/institutions/me/courses/{course_id}", response_model=InstitutionManagedCourseResponse)
async def update_my_institution_course(
    course_id: int,
    payload: InstitutionManagedCourseUpdateRequest,
    current_user: User = Depends(auth.require_role(["institution", "instructor"])),
    db: Session = Depends(get_db),
):
    institution = _get_my_institution(current_user, db)

    course = (
        db.query(Course)
        .join(Instructor)
        .join(User)
        .filter(
            Course.id == course_id,
            Instructor.institution_id == institution.id,
            User.role == "instructor",
        )
        .first()
    )
    if not course:
        raise HTTPException(status_code=404, detail="Ders bulunamadı")

    target_instructor = course.instructor
    if payload.instructor_id is not None and payload.instructor_id != course.instructor_id:
        instructors = _get_institution_linked_instructors(institution.id, db)
        mapped = {inst.id: inst for inst in instructors}
        target_instructor = mapped.get(payload.instructor_id)
        if not target_instructor:
            raise HTTPException(status_code=400, detail="Geçersiz eğitmen seçimi")
        course.instructor_id = target_instructor.id

    next_publish = payload.is_published if payload.is_published is not None else course.is_published
    if next_publish and target_instructor and not target_instructor.is_approved:
        raise HTTPException(
            status_code=400,
            detail="Eğitmen admin tarafından onaylanmadan ders yayınlanamaz",
        )

    update_data = payload.dict(exclude_unset=True, exclude={"instructor_id"})
    for field, value in update_data.items():
        setattr(course, field, value)

    course.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(course)
    return _serialize_managed_course(course)


@router.delete("/institutions/me/courses/{course_id}")
async def delete_my_institution_course(
    course_id: int,
    current_user: User = Depends(auth.require_role(["institution", "instructor"])),
    db: Session = Depends(get_db),
):
    institution = _get_my_institution(current_user, db)

    course = (
        db.query(Course)
        .join(Instructor)
        .join(User)
        .filter(
            Course.id == course_id,
            Instructor.institution_id == institution.id,
            User.role == "instructor",
        )
        .first()
    )
    if not course:
        raise HTTPException(status_code=404, detail="Ders bulunamadı")

    db.query(CourseMaterial).filter(CourseMaterial.course_id == course_id).delete(synchronize_session=False)
    db.query(Review).filter(Review.course_id == course_id).delete(synchronize_session=False)
    db.query(Lesson).filter(Lesson.course_id == course_id).delete(synchronize_session=False)
    db.query(Enrollment).filter(Enrollment.course_id == course_id).delete(synchronize_session=False)
    db.query(CourseAdminNote).filter(CourseAdminNote.course_id == course_id).delete(synchronize_session=False)
    db.delete(course)
    db.commit()
    return {"message": "Ders silindi"}


@router.post("/institutions/me/instructors/link", response_model=InstitutionInstructorResponse)
async def link_instructor(
    payload: InstitutionInstructorLinkRequest,
    current_user: User = Depends(auth.require_role(["institution", "instructor"])),
    db: Session = Depends(get_db),
):
    institution = _get_my_institution(current_user, db)

    instructor: Optional[Instructor] = None
    if payload.instructor_user_id:
        instructor = db.query(Instructor).filter(Instructor.user_id == payload.instructor_user_id).first()
    elif payload.email:
        user = db.query(User).filter(User.email == payload.email).first()
        if user:
            instructor = db.query(Instructor).filter(Instructor.user_id == user.id).first()

    if not instructor:
        raise HTTPException(status_code=404, detail="Eğitmen bulunamadı")
    if not instructor.user or (instructor.user.role or "").lower() != "instructor":
        raise HTTPException(status_code=400, detail="Kullanıcı eğitmen rolünde değil")

    if instructor.institution_id and instructor.institution_id != institution.id:
        raise HTTPException(status_code=400, detail="Eğitmen başka bir kuruma bağlı")
    if instructor.institution_id == institution.id:
        status_value = "approved" if instructor.is_approved else "pending_admin"
        return InstitutionInstructorResponse(
            id=instructor.id,
            user_id=instructor.user.id,
            full_name=instructor.user.full_name,
            email=instructor.user.email,
            phone=instructor.user.phone,
            title=instructor.title,
            specialization=instructor.specialization,
            is_approved=instructor.is_approved,
            status=status_value,
        )

    existing_pending = (
        db.query(InstitutionInstructorRequest)
        .filter(
            InstitutionInstructorRequest.instructor_id == instructor.id,
            InstitutionInstructorRequest.status == "pending",
        )
        .first()
    )
    if existing_pending:
        if existing_pending.institution_id == institution.id:
            return InstitutionInstructorResponse(
                id=instructor.id,
                user_id=instructor.user.id,
                full_name=instructor.user.full_name,
                email=instructor.user.email,
                phone=instructor.user.phone,
                title=instructor.title,
                specialization=instructor.specialization,
                is_approved=instructor.is_approved,
                status="pending",
            )
        raise HTTPException(status_code=400, detail="Eğitmen için başka bir kurumun onay bekleyen talebi var")

    req = InstitutionInstructorRequest(
        institution_id=institution.id,
        instructor_id=instructor.id,
        status="pending",
    )
    db.add(req)
    db.commit()

    return InstitutionInstructorResponse(
        id=instructor.id,
        user_id=instructor.user.id,
        full_name=instructor.user.full_name,
        email=instructor.user.email,
        phone=instructor.user.phone,
        title=instructor.title,
        specialization=instructor.specialization,
        is_approved=instructor.is_approved,
        status="pending",
    )


@router.delete("/institutions/me/instructors/{instructor_id}")
async def unlink_instructor(
    instructor_id: int,
    current_user: User = Depends(auth.require_role(["institution", "instructor"])),
    db: Session = Depends(get_db),
):
    institution = _get_my_institution(current_user, db)
    pending_req = (
        db.query(InstitutionInstructorRequest)
        .filter(
            InstitutionInstructorRequest.instructor_id == instructor_id,
            InstitutionInstructorRequest.institution_id == institution.id,
            InstitutionInstructorRequest.status == "pending",
        )
        .first()
    )
    if pending_req:
        pending_req.status = "cancelled"
        pending_req.decided_at = datetime.utcnow()
        db.commit()
        return {"message": "Eğitmen talebi iptal edildi"}

    instructor = db.query(Instructor).filter(Instructor.id == instructor_id).first()
    if not instructor or instructor.institution_id != institution.id:
        raise HTTPException(status_code=404, detail="Eğitmen bulunamadı")

    instructor.institution_id = None
    db.commit()
    return {"message": "Eğitmen kurumdan ayrıldı"}
