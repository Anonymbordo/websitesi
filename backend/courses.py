from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import shutil
import os
from firebase_config import upload_file_to_firebase, init_firebase
from s3_utils import upload_file_to_s3, generate_presigned_put_url, get_public_s3_url

from database import get_db
from models import Course, Instructor, User, Lesson, CourseMaterial, Enrollment, Review, Category
from auth import get_current_user, get_current_user_optional

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
    what_you_will_learn: Optional[List[str]] = None
    requirements: Optional[List[str]] = None

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
    what_you_will_learn: Optional[List[str]] = None
    requirements: Optional[List[str]] = None

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
    what_you_will_learn: Optional[List[str]] = None
    requirements: Optional[List[str]] = None
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


class PresignUploadRequest(BaseModel):
    kind: str  # thumbnail | preview_video | video | document
    filename: str
    content_type: str


class SetUrlRequest(BaseModel):
    url: str


class CreateMaterialUrlRequest(BaseModel):
    title: str
    material_type: str  # video | document
    file_url: str
    file_size: Optional[int] = None

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
    try:
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
        
        # Format response with instructor info - güvenli serileştirme
        result = []
        for course in courses:
            try:
                sc = _serialize_course(course)
                if sc:
                    result.append(sc)
            except Exception as e:
                print(f"Course serileştirme hatası {course.id}: {e}")
                continue
        
        return result
    except Exception as e:
        print(f"Get courses hatası: {e}")
        # Boş liste döndür, hata verme
        return []

def _serialize_course(course: Course) -> Optional[CourseResponse]:
    """Güvenli kurs serileştirme. Eksik ilişki varsa None döner."""
    try:
        # Veri tutarlılığı bozuksa (ör: instructor veya user silinmiş) atla
        if not course.instructor or not course.instructor.user:
            return None

        instructor = course.instructor
        user = instructor.user
        instructor_info = {
            "id": instructor.id,
            "name": user.full_name,
            "bio": instructor.bio,
            "rating": instructor.rating,
            "total_students": instructor.total_students,
            "experience_years": instructor.experience_years,
            "avatar": user.profile_image
        }

        # Helper to safely parse JSON or return list
        def parse_json_field(field_val):
             if field_val is None:
                 return None
             if isinstance(field_val, list):
                 return field_val
             if isinstance(field_val, str):
                 try:
                     import json
                     return json.loads(field_val)
                 except:
                     return []
             return []

        # SQLAlchemy objelerini dictionary'ye çevir ve ilişki objelerini çıkar
        course_data = {
            "id": course.id,
            "title": course.title,
            "description": course.description,
            "short_description": course.short_description,
            "price": course.price,
            "discount_price": course.discount_price,
            "duration_hours": course.duration_hours,
            "level": course.level,
            "category": course.category,
            "subcategory": course.subcategory,
            "language": course.language or "Turkish",
            "thumbnail": course.thumbnail,
            "preview_video": course.preview_video,
            "location": course.location,
            "latitude": course.latitude,
            "longitude": course.longitude,
            "is_online": course.is_online,
            "is_published": course.is_published,
            "what_you_will_learn": parse_json_field(course.what_you_will_learn),
            "requirements": parse_json_field(course.requirements),
            "enrollment_count": course.enrollment_count or 0,
            "rating": course.rating or 0.0,
            "total_ratings": course.total_ratings or 0,
            "created_at": course.created_at,
            "instructor": instructor_info
        }
        
        return CourseResponse(**course_data)
    except Exception as e:
        print(f"Error serializing course {course.id}: {e}")
        return None

@courses_router.get("/featured/list", response_model=List[CourseResponse])
async def get_featured_courses(
    limit: int = Query(6, ge=1, le=20),
    db: Session = Depends(get_db)
):
    """Ana sayfa için öne çıkan kursları getir. Veri tutarsızlığına karşı dayanıklı."""
    courses = db.query(Course).filter(
        Course.is_published == True,
        Course.is_featured == True
    ).order_by(Course.created_at.desc()).limit(limit).all()

    serialized: List[CourseResponse] = []
    for course in courses:
        sc = _serialize_course(course)
        if sc:
            serialized.append(sc)
    return serialized

@courses_router.get("/{course_id}", response_model=CourseResponse)
async def get_course(
    course_id: int, 
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    # Önce kursu bul
    course = db.query(Course).filter(Course.id == course_id).first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Kurs yayında değilse, sadece kursun sahibi (eğitmen) veya admin görebilir
    if not course.is_published:
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found"
            )
        
        # Eğitmen mi kontrol et
        instructor = db.query(Instructor).filter(Instructor.user_id == current_user.id).first()
        is_owner = instructor and course.instructor_id == instructor.id
        is_admin = current_user.role == "admin"
        
        if not (is_owner or is_admin):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found"
            )
    
    # Güvenli serileştirme
    serialized = _serialize_course(course)
    if not serialized:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Course data is incomplete or corrupted"
        )
    
    return serialized

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
        "name": instructor.user.full_name if instructor.user else "Unknown",
        "bio": instructor.bio,
        "rating": instructor.rating,
        "total_students": instructor.total_students,
        "experience_years": instructor.experience_years
    }
    
    course_data = course.__dict__.copy()
    if "_sa_instance_state" in course_data:
        del course_data["_sa_instance_state"]
        
    course_dict = {
        **course_data,
        "instructor": instructor_info
    }
    
    return CourseResponse(**course_dict)


@courses_router.post("/{course_id}/presign-upload")
async def presign_course_upload(
    course_id: int,
    req: PresignUploadRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a presigned S3 PUT URL so the client can upload without hitting Vercel body limits."""
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

    kind = (req.kind or "").strip().lower()
    filename = (req.filename or "").strip()
    content_type = (req.content_type or "").strip()

    if not filename or "." not in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    file_extension = filename.split(".")[-1].lower()
    import uuid
    unique_id = str(uuid.uuid4())[:8]

    if kind == "thumbnail":
        if not content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Only image files are allowed")
        object_name = f"course-thumbnails/course_{course_id}_thumbnail.{file_extension}"
    elif kind == "preview_video":
        if not content_type.startswith("video/"):
            raise HTTPException(status_code=400, detail="Only video files are allowed")
        object_name = f"course-previews/course_{course_id}_preview.{file_extension}"
    elif kind == "video":
        if not content_type.startswith("video/"):
            raise HTTPException(status_code=400, detail="Only video files are allowed")
        object_name = f"course-videos/course_{course_id}_video_{unique_id}.{file_extension}"
    elif kind == "document":
        allowed_types = [
            'application/pdf', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]
        if content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Only PDF and document files are allowed")
        object_name = f"course-materials/course_{course_id}_material_{unique_id}.{file_extension}"
    else:
        raise HTTPException(status_code=400, detail="Invalid kind")

    upload_url = generate_presigned_put_url(object_name, content_type=content_type)
    if not upload_url:
        raise HTTPException(status_code=500, detail="Failed to generate presigned upload url")

    public_url = get_public_s3_url(object_name)
    return {
        "upload_url": upload_url,
        "public_url": public_url,
        "object_name": object_name,
    }


@courses_router.put("/{course_id}/set-thumbnail-url")
async def set_course_thumbnail_url(
    course_id: int,
    body: SetUrlRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    instructor = get_instructor_or_404(current_user, db)
    course = db.query(Course).filter(
        Course.id == course_id,
        Course.instructor_id == instructor.id
    ).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or you don't have permission to edit it")
    course.thumbnail = body.url
    db.commit()
    return {"message": "Thumbnail URL saved", "thumbnail_url": course.thumbnail}


@courses_router.put("/{course_id}/set-preview-video-url")
async def set_course_preview_video_url(
    course_id: int,
    body: SetUrlRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    instructor = get_instructor_or_404(current_user, db)
    course = db.query(Course).filter(
        Course.id == course_id,
        Course.instructor_id == instructor.id
    ).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or you don't have permission to edit it")
    course.preview_video = body.url
    db.commit()
    return {"message": "Preview video URL saved", "preview_video_url": course.preview_video}


@courses_router.post("/{course_id}/materials-url")
async def add_course_material_url(
    course_id: int,
    body: CreateMaterialUrlRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    instructor = get_instructor_or_404(current_user, db)
    course = db.query(Course).filter(
        Course.id == course_id,
        Course.instructor_id == instructor.id
    ).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or you don't have permission to edit it")

    mt = (body.material_type or "").strip().lower()
    if mt not in {"video", "document"}:
        raise HTTPException(status_code=400, detail="Invalid material_type")

    material = CourseMaterial(
        course_id=course_id,
        title=body.title,
        material_type=mt,
        file_url=body.file_url,
        file_size=body.file_size,
    )
    db.add(material)
    db.commit()
    db.refresh(material)
    return {
        "message": "Material saved",
        "material_id": material.id,
        "file_url": material.file_url,
    }

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
        "name": instructor.user.full_name if instructor.user else "Unknown",
        "bio": instructor.bio,
        "rating": instructor.rating,
        "total_students": instructor.total_students,
        "experience_years": instructor.experience_years
    }
    
    course_data = course.__dict__.copy()
    if "_sa_instance_state" in course_data:
        del course_data["_sa_instance_state"]
        
    course_dict = {
        **course_data,
        "instructor": instructor_info
    }
    
    return CourseResponse(**course_dict)

@courses_router.delete("/{course_id}")
async def delete_course(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a course. Only the course instructor or admin can delete.
    """
    instructor = get_instructor_or_404(current_user, db)
    
    course = db.query(Course).filter(
        Course.id == course_id,
        Course.instructor_id == instructor.id
    ).first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found or you don't have permission to delete it"
        )
    
    try:
        # Delete related data first (in order to avoid foreign key constraints)
        # 1. Delete course materials
        db.query(CourseMaterial).filter(CourseMaterial.course_id == course_id).delete(synchronize_session=False)
        
        # 2. Delete reviews
        db.query(Review).filter(Review.course_id == course_id).delete(synchronize_session=False)
        
        # 3. Delete lessons
        db.query(Lesson).filter(Lesson.course_id == course_id).delete(synchronize_session=False)
        
        # 4. Delete enrollments
        db.query(Enrollment).filter(Enrollment.course_id == course_id).delete(synchronize_session=False)
        
        # 5. Delete the course itself
        db.delete(course)
        db.commit()
        
        return {"message": "Course deleted successfully"}
    except Exception as e:
        db.rollback()
        print(f"Error deleting course: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete course: {str(e)}"
        )

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
    filename = f"course-thumbnails/course_{course_id}_thumbnail.{file_extension}"
    
    # Upload to S3
    public_url = upload_file_to_s3(file.file, filename, file.content_type)
    
    if public_url:
        course.thumbnail = public_url
        db.commit()
        return {"message": "Thumbnail uploaded successfully", "thumbnail_url": course.thumbnail}
    else:
        raise HTTPException(status_code=500, detail="Failed to upload thumbnail to S3")

@courses_router.post("/{course_id}/upload-preview-video")
async def upload_preview_video(
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
    filename = f"course-previews/course_{course_id}_preview.{file_extension}"
    
    # Upload to S3
    public_url = upload_file_to_s3(file.file, filename, file.content_type)
    
    if public_url:
        course.preview_video = public_url
        db.commit()
        return {"message": "Preview video uploaded successfully", "preview_video_url": course.preview_video}
    else:
        raise HTTPException(status_code=500, detail="Failed to upload preview video to S3")

@courses_router.post("/{course_id}/upload-video")
async def upload_course_video(
    course_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Kursa video yükle - çoklu video yüklemesi için kullanılabilir
    """
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
    
    # Video dosya kontrolü
    if not file.content_type or not file.content_type.startswith('video/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only video files are allowed"
        )
    
    file_extension = file.filename.split(".")[-1]
    import uuid
    unique_id = str(uuid.uuid4())[:8]
    filename = f"course-videos/course_{course_id}_video_{unique_id}.{file_extension}"
    
    # Upload to S3
    public_url = upload_file_to_s3(file.file, filename, file.content_type)
    
    if public_url:
        # Video'yu materyal olarak kaydet
        material = CourseMaterial(
            course_id=course_id,
            title=file.filename,
            material_type="video",
            file_url=public_url
        )
        db.add(material)
        db.commit()
        db.refresh(material)
        
        return {
            "message": "Video uploaded successfully",
            "video_url": public_url,
            "material_id": material.id
        }
    else:
        raise HTTPException(status_code=500, detail="Failed to upload video to S3")

@courses_router.post("/{course_id}/upload-material")
async def upload_course_material(
    course_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Kursa PDF veya döküman yükle
    """
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
    
    # PDF/döküman kontrolü
    allowed_types = ['application/pdf', 'application/msword', 
                     'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    
    if not file.content_type or file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF and document files are allowed"
        )
    
    file_extension = file.filename.split(".")[-1]
    import uuid
    unique_id = str(uuid.uuid4())[:8]
    filename = f"course-materials/course_{course_id}_material_{unique_id}.{file_extension}"
    
    # Upload to S3
    public_url = upload_file_to_s3(file.file, filename, file.content_type)
    
    if public_url:
        # Materyali kaydet
        material = CourseMaterial(
            course_id=course_id,
            title=file.filename,
            material_type="document",
            file_url=public_url
        )
        db.add(material)
        db.commit()
        db.refresh(material)
        
        return {
            "message": "Material uploaded successfully",
            "material_url": public_url,
            "material_id": material.id
        }
    else:
        raise HTTPException(status_code=500, detail="Failed to upload material to S3")

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
    Kurs kategorilerini getir - Sadece veritabanındaki aktif kategoriler
    """
    try:
        # Sadece veritabanından aktif kategorileri çek
        db_categories = db.query(Category).filter(
            and_(Category.is_active == True, Category.type == "course")
        ).all()
        
        # Kategori isimlerini listele
        categories = [cat.name for cat in db_categories]
        
        return categories
        
    except Exception as e:
        print(f"Kategori hatası: {e}")
        return []

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
        
        course_data = course.__dict__.copy()
        if "_sa_instance_state" in course_data:
            del course_data["_sa_instance_state"]
            
        course_dict = {
            **course_data,
            "instructor": instructor_info,
            "enrollment": {
                "enrolled_at": enrollment.enrolled_at,
                "progress_percentage": enrollment.progress_percentage,
                "completed_at": enrollment.completed_at
            }
        }
        result.append(EnrolledCourseResponse(**course_dict))
    
    return result

@courses_router.get("/{course_id}/materials")
async def get_course_materials(
    course_id: int,
    db: Session = Depends(get_db)
):
    """
    Kursun tüm materyallerini getir (videolar, PDF'ler)
    """
    materials = db.query(CourseMaterial).filter(
        CourseMaterial.course_id == course_id
    ).order_by(CourseMaterial.created_at).all()
    
    # SQLAlchemy objelerini dictionary'e çevir
    materials_list = []
    for material in materials:
        materials_list.append({
            "id": material.id,
            "course_id": material.course_id,
            "title": material.title,
            "material_type": material.material_type,
            "file_url": material.file_url,
            "file_size": material.file_size,
            "created_at": material.created_at.isoformat() if material.created_at else None
        })
    
    return materials_list