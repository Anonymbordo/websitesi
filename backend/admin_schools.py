from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from database import get_db
from auth import get_current_user, require_role
from models import (
    User, SchoolCourse, SchoolCourseTopic, SchoolCourseNote,
    SchoolCourseVideo, SchoolCourseInstructor
)

router = APIRouter()

# Pydantic Models
class SchoolCourseCreate(BaseModel):
    level: str
    grade: int
    subject: str
    title: str
    description: Optional[str] = None
    price: float = 299.0
    thumbnail: Optional[str] = None
    preview_video: Optional[str] = None

class SchoolCourseUpdate(BaseModel):
    level: Optional[str] = None
    grade: Optional[int] = None
    subject: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    is_active: Optional[bool] = None
    thumbnail: Optional[str] = None
    preview_video: Optional[str] = None

class VideoCreate(BaseModel):
    title: str
    description: Optional[str] = None
    video_url: str
    thumbnail_url: Optional[str] = None
    duration_minutes: Optional[int] = None
    order_index: int = 0
    is_free: bool = False

class VideoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    duration_minutes: Optional[int] = None
    order_index: Optional[int] = None
    is_free: Optional[bool] = None

class NoteCreate(BaseModel):
    title: str
    description: Optional[str] = None
    file_url: Optional[str] = None
    file_type: str = "pdf"
    order_index: int = 0
    is_downloadable: bool = True

class InstructorCreate(BaseModel):
    name: str
    title: Optional[str] = None
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    specialization: Optional[str] = None
    experience_years: Optional[int] = None
    rating: float = 5.0

# ============= SCHOOL COURSES CRUD =============

@router.get("/schools")
async def get_all_school_courses(
    level: Optional[str] = None,
    grade: Optional[int] = None,
    subject: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Get all school courses (Admin only)"""
    query = db.query(SchoolCourse)
    
    if level:
        query = query.filter(SchoolCourse.level == level)
    if grade:
        query = query.filter(SchoolCourse.grade == grade)
    if subject:
        query = query.filter(SchoolCourse.subject == subject)
    
    courses = query.all()
    
    # Add counts
    result = []
    for course in courses:
        course_dict = {
            "id": course.id,
            "level": course.level,
            "grade": course.grade,
            "subject": course.subject,
            "title": course.title,
            "description": course.description,
            "price": course.price,
            "is_active": course.is_active,
            "thumbnail": course.thumbnail if hasattr(course, 'thumbnail') else None,
            "preview_video": course.preview_video if hasattr(course, 'preview_video') else None,
            "created_at": course.created_at,
            "videos_count": len(course.videos) if course.videos else 0,
            "notes_count": len(course.notes) if course.notes else 0,
            "topics_count": len(course.topics) if course.topics else 0,
        }
        result.append(course_dict)
    
    return result

@router.post("/schools")
async def create_school_course(
    course_data: SchoolCourseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Create a new school course (Admin only)"""
    
    course = SchoolCourse(
        level=course_data.level,
        grade=course_data.grade,
        subject=course_data.subject,
        title=course_data.title,
        description=course_data.description,
        price=course_data.price,
    )
    
    # Add thumbnail and preview_video if provided
    if course_data.thumbnail:
        course.thumbnail = course_data.thumbnail
    if course_data.preview_video:
        course.preview_video = course_data.preview_video
    
    db.add(course)
    db.commit()
    db.refresh(course)
    
    return {
        "message": "School course created successfully",
        "course_id": course.id,
        "course": course
    }

@router.get("/schools/{course_id}")
async def get_school_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Get school course details (Admin only)"""
    course = db.query(SchoolCourse).filter(SchoolCourse.id == course_id).first()
    
    if not course:
        raise HTTPException(status_code=404, detail="School course not found")
    
    return {
        "id": course.id,
        "level": course.level,
        "grade": course.grade,
        "subject": course.subject,
        "title": course.title,
        "description": course.description,
        "price": course.price,
        "is_active": course.is_active,
        "thumbnail": course.thumbnail if hasattr(course, 'thumbnail') else None,
        "preview_video": course.preview_video if hasattr(course, 'preview_video') else None,
        "created_at": course.created_at,
        "videos": [
            {
                "id": v.id,
                "title": v.title,
                "description": v.description,
                "video_url": v.video_url,
                "thumbnail_url": v.thumbnail_url,
                "duration_minutes": v.duration_minutes,
                "order_index": v.order_index,
                "is_free": v.is_free,
            } for v in course.videos
        ],
        "notes": [
            {
                "id": n.id,
                "title": n.title,
                "description": n.description,
                "file_url": n.file_url,
                "file_type": n.file_type,
                "order_index": n.order_index,
            } for n in course.notes
        ],
        "instructors": [
            {
                "id": i.id,
                "name": i.name,
                "title": i.title,
                "bio": i.bio,
                "photo_url": i.photo_url,
            } for i in course.instructors
        ]
    }

@router.put("/schools/{course_id}")
async def update_school_course(
    course_id: int,
    course_data: SchoolCourseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Update school course (Admin only)"""
    course = db.query(SchoolCourse).filter(SchoolCourse.id == course_id).first()
    
    if not course:
        raise HTTPException(status_code=404, detail="School course not found")
    
    # Update fields
    if course_data.level is not None:
        course.level = course_data.level
    if course_data.grade is not None:
        course.grade = course_data.grade
    if course_data.subject is not None:
        course.subject = course_data.subject
    if course_data.title is not None:
        course.title = course_data.title
    if course_data.description is not None:
        course.description = course_data.description
    if course_data.price is not None:
        course.price = course_data.price
    if course_data.is_active is not None:
        course.is_active = course_data.is_active
    if course_data.thumbnail is not None:
        course.thumbnail = course_data.thumbnail
    if course_data.preview_video is not None:
        course.preview_video = course_data.preview_video
    
    course.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(course)
    
    return {
        "message": "School course updated successfully",
        "course": course
    }

@router.delete("/schools/{course_id}")
async def delete_school_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Delete school course (Admin only)"""
    course = db.query(SchoolCourse).filter(SchoolCourse.id == course_id).first()
    
    if not course:
        raise HTTPException(status_code=404, detail="School course not found")
    
    db.delete(course)
    db.commit()
    
    return {"message": "School course deleted successfully"}

# ============= VIDEOS =============

@router.post("/schools/{course_id}/videos")
async def add_video(
    course_id: int,
    video_data: VideoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Add video to school course"""
    course = db.query(SchoolCourse).filter(SchoolCourse.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    video = SchoolCourseVideo(
        course_id=course_id,
        title=video_data.title,
        description=video_data.description,
        video_url=video_data.video_url,
        thumbnail_url=video_data.thumbnail_url,
        duration_minutes=video_data.duration_minutes,
        order_index=video_data.order_index,
        is_free=video_data.is_free
    )
    
    db.add(video)
    db.commit()
    db.refresh(video)
    
    return {"message": "Video added successfully", "video": video}

@router.put("/schools/{course_id}/videos/{video_id}")
async def update_video(
    course_id: int,
    video_id: int,
    video_data: VideoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Update video"""
    video = db.query(SchoolCourseVideo).filter(
        SchoolCourseVideo.id == video_id,
        SchoolCourseVideo.course_id == course_id
    ).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    if video_data.title is not None:
        video.title = video_data.title
    if video_data.description is not None:
        video.description = video_data.description
    if video_data.video_url is not None:
        video.video_url = video_data.video_url
    if video_data.thumbnail_url is not None:
        video.thumbnail_url = video_data.thumbnail_url
    if video_data.duration_minutes is not None:
        video.duration_minutes = video_data.duration_minutes
    if video_data.order_index is not None:
        video.order_index = video_data.order_index
    if video_data.is_free is not None:
        video.is_free = video_data.is_free
    
    db.commit()
    db.refresh(video)
    
    return {"message": "Video updated successfully", "video": video}

@router.delete("/schools/{course_id}/videos/{video_id}")
async def delete_video(
    course_id: int,
    video_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Delete video"""
    video = db.query(SchoolCourseVideo).filter(
        SchoolCourseVideo.id == video_id,
        SchoolCourseVideo.course_id == course_id
    ).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    db.delete(video)
    db.commit()
    
    return {"message": "Video deleted successfully"}

# ============= NOTES/MATERIALS =============

@router.post("/schools/{course_id}/notes")
async def add_note(
    course_id: int,
    note_data: NoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Add note/material to school course"""
    course = db.query(SchoolCourse).filter(SchoolCourse.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    note = SchoolCourseNote(
        course_id=course_id,
        title=note_data.title,
        description=note_data.description,
        file_url=note_data.file_url,
        file_type=note_data.file_type,
        order_index=note_data.order_index,
        is_downloadable=note_data.is_downloadable
    )
    
    db.add(note)
    db.commit()
    db.refresh(note)
    
    return {"message": "Note added successfully", "note": note}

@router.delete("/schools/{course_id}/notes/{note_id}")
async def delete_note(
    course_id: int,
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Delete note"""
    note = db.query(SchoolCourseNote).filter(
        SchoolCourseNote.id == note_id,
        SchoolCourseNote.course_id == course_id
    ).first()
    
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    db.delete(note)
    db.commit()
    
    return {"message": "Note deleted successfully"}

# ============= INSTRUCTORS =============

@router.post("/schools/{course_id}/instructors")
async def add_instructor(
    course_id: int,
    instructor_data: InstructorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Add instructor to school course"""
    course = db.query(SchoolCourse).filter(SchoolCourse.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    instructor = SchoolCourseInstructor(
        course_id=course_id,
        name=instructor_data.name,
        title=instructor_data.title,
        bio=instructor_data.bio,
        photo_url=instructor_data.photo_url,
        specialization=instructor_data.specialization,
        experience_years=instructor_data.experience_years,
        rating=instructor_data.rating
    )
    
    db.add(instructor)
    db.commit()
    db.refresh(instructor)
    
    return {"message": "Instructor added successfully", "instructor": instructor}

@router.delete("/schools/{course_id}/instructors/{instructor_id}")
async def delete_instructor(
    course_id: int,
    instructor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Delete instructor"""
    instructor = db.query(SchoolCourseInstructor).filter(
        SchoolCourseInstructor.id == instructor_id,
        SchoolCourseInstructor.course_id == course_id
    ).first()
    
    if not instructor:
        raise HTTPException(status_code=404, detail="Instructor not found")
    
    db.delete(instructor)
    db.commit()
    
    return {"message": "Instructor deleted successfully"}
