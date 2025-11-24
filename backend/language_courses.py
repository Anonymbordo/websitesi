from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import json

from database import get_db
from auth import get_current_user, require_role
from models import (
    User, LanguageCourse, LanguageCourseTopic, LanguageCourseNote,
    LanguageCourseVideo, LanguageCourseExam, LanguageExamQuestion,
    LanguageCourseInstructor, LanguageCoursePurchase, LiveClassRequest
)
from pydantic import BaseModel

router = APIRouter()

# ============= PYDANTIC MODELS =============

class LanguageCourseCreate(BaseModel):
    language: str
    level: str
    title: str
    description: Optional[str] = None
    price: float = 299.0

class LanguageCourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    is_active: Optional[bool] = None

class TopicCreate(BaseModel):
    title: str
    description: Optional[str] = None
    content: Optional[str] = None
    order_index: int = 0
    duration_minutes: Optional[int] = None
    is_free: bool = False

class NoteCreate(BaseModel):
    title: str
    description: Optional[str] = None
    file_url: Optional[str] = None
    order_index: int = 0
    is_downloadable: bool = True

class VideoCreate(BaseModel):
    title: str
    description: Optional[str] = None
    video_url: str
    thumbnail_url: Optional[str] = None
    duration_minutes: Optional[int] = None
    order_index: int = 0
    is_free: bool = False

class ExamCreate(BaseModel):
    title: str
    description: Optional[str] = None
    passing_score: int = 70
    time_limit_minutes: Optional[int] = None
    order_index: int = 0

class ExamQuestionCreate(BaseModel):
    question_text: str
    question_type: str = "multiple_choice"
    options: Optional[List[str]] = None
    correct_answer: str
    explanation: Optional[str] = None
    points: int = 1
    order_index: int = 0

class InstructorCreate(BaseModel):
    name: str
    title: Optional[str] = None
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    specialization: Optional[str] = None
    experience_years: Optional[int] = None
    rating: float = 5.0
    order_index: int = 0

class LiveClassRequestCreate(BaseModel):
    course_id: Optional[int] = None
    request_type: str
    preferred_date: Optional[datetime] = None
    preferred_time: Optional[str] = None
    message: Optional[str] = None

# ============= COURSE CRUD =============

@router.get("/courses")
async def get_all_language_courses(
    language: Optional[str] = None,
    level: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get all language courses with optional filters"""
    query = db.query(LanguageCourse)
    
    if language:
        query = query.filter(LanguageCourse.language == language)
    if level:
        query = query.filter(LanguageCourse.level == level)
    if is_active is not None:
        query = query.filter(LanguageCourse.is_active == is_active)
    
    courses = query.all()
    return courses

@router.get("/courses/{course_id}")
async def get_language_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed course info including all content"""
    course = db.query(LanguageCourse).filter(LanguageCourse.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Check if user has access
    has_access = False
    if current_user:
        purchase = db.query(LanguageCoursePurchase).filter(
            LanguageCoursePurchase.user_id == current_user.id,
            LanguageCoursePurchase.course_id == course_id,
            LanguageCoursePurchase.payment_status == "completed"
        ).first()
        has_access = purchase is not None or current_user.role == "admin"
    
    result = {
        "id": course.id,
        "language": course.language,
        "level": course.level,
        "title": course.title,
        "description": course.description,
        "price": course.price,
        "currency": course.currency,
        "is_active": course.is_active,
        "has_access": has_access,
        "topics": course.topics if has_access else [],
        "notes": course.notes if has_access else [],
        "videos": course.videos if has_access else [],
        "exams": course.exams if has_access else [],
        "instructors": course.instructors
    }
    
    return result

@router.post("/courses", dependencies=[Depends(require_role(["admin"]))])
async def create_language_course(
    course: LanguageCourseCreate,
    db: Session = Depends(get_db)
):
    """Create a new language course (Admin only)"""
    new_course = LanguageCourse(**course.dict())
    db.add(new_course)
    db.commit()
    db.refresh(new_course)
    return new_course

@router.put("/courses/{course_id}", dependencies=[Depends(require_role(["admin"]))])
async def update_language_course(
    course_id: int,
    course_update: LanguageCourseUpdate,
    db: Session = Depends(get_db)
):
    """Update language course (Admin only)"""
    course = db.query(LanguageCourse).filter(LanguageCourse.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    for key, value in course_update.dict(exclude_unset=True).items():
        setattr(course, key, value)
    
    db.commit()
    db.refresh(course)
    return course

@router.delete("/courses/{course_id}", dependencies=[Depends(require_role(["admin"]))])
async def delete_language_course(
    course_id: int,
    db: Session = Depends(get_db)
):
    """Delete language course (Admin only)"""
    course = db.query(LanguageCourse).filter(LanguageCourse.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    db.delete(course)
    db.commit()
    return {"message": "Course deleted successfully"}

# ============= TOPICS =============

@router.post("/courses/{course_id}/topics", dependencies=[Depends(require_role(["admin"]))])
async def create_topic(
    course_id: int,
    topic: TopicCreate,
    db: Session = Depends(get_db)
):
    """Add topic to course (Admin only)"""
    course = db.query(LanguageCourse).filter(LanguageCourse.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    new_topic = LanguageCourseTopic(course_id=course_id, **topic.dict())
    db.add(new_topic)
    db.commit()
    db.refresh(new_topic)
    return new_topic

@router.put("/topics/{topic_id}", dependencies=[Depends(require_role(["admin"]))])
async def update_topic(
    topic_id: int,
    topic_update: TopicCreate,
    db: Session = Depends(get_db)
):
    """Update topic (Admin only)"""
    topic = db.query(LanguageCourseTopic).filter(LanguageCourseTopic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    for key, value in topic_update.dict().items():
        setattr(topic, key, value)
    
    db.commit()
    db.refresh(topic)
    return topic

@router.delete("/topics/{topic_id}", dependencies=[Depends(require_role(["admin"]))])
async def delete_topic(
    topic_id: int,
    db: Session = Depends(get_db)
):
    """Delete topic (Admin only)"""
    topic = db.query(LanguageCourseTopic).filter(LanguageCourseTopic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    db.delete(topic)
    db.commit()
    return {"message": "Topic deleted successfully"}

# ============= NOTES =============

@router.post("/courses/{course_id}/notes", dependencies=[Depends(require_role(["admin"]))])
async def create_note(
    course_id: int,
    note: NoteCreate,
    db: Session = Depends(get_db)
):
    """Add note to course (Admin only)"""
    course = db.query(LanguageCourse).filter(LanguageCourse.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    new_note = LanguageCourseNote(course_id=course_id, **note.dict())
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    return new_note

@router.put("/notes/{note_id}", dependencies=[Depends(require_role(["admin"]))])
async def update_note(
    note_id: int,
    note_update: NoteCreate,
    db: Session = Depends(get_db)
):
    """Update note (Admin only)"""
    note = db.query(LanguageCourseNote).filter(LanguageCourseNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    for key, value in note_update.dict().items():
        setattr(note, key, value)
    
    db.commit()
    db.refresh(note)
    return note

@router.delete("/notes/{note_id}", dependencies=[Depends(require_role(["admin"]))])
async def delete_note(
    note_id: int,
    db: Session = Depends(get_db)
):
    """Delete note (Admin only)"""
    note = db.query(LanguageCourseNote).filter(LanguageCourseNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    db.delete(note)
    db.commit()
    return {"message": "Note deleted successfully"}

# ============= VIDEOS =============

@router.post("/courses/{course_id}/videos", dependencies=[Depends(require_role(["admin"]))])
async def create_video(
    course_id: int,
    video: VideoCreate,
    db: Session = Depends(get_db)
):
    """Add video to course (Admin only)"""
    course = db.query(LanguageCourse).filter(LanguageCourse.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    new_video = LanguageCourseVideo(course_id=course_id, **video.dict())
    db.add(new_video)
    db.commit()
    db.refresh(new_video)
    return new_video

@router.put("/videos/{video_id}", dependencies=[Depends(require_role(["admin"]))])
async def update_video(
    video_id: int,
    video_update: VideoCreate,
    db: Session = Depends(get_db)
):
    """Update video (Admin only)"""
    video = db.query(LanguageCourseVideo).filter(LanguageCourseVideo.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    for key, value in video_update.dict().items():
        setattr(video, key, value)
    
    db.commit()
    db.refresh(video)
    return video

@router.delete("/videos/{video_id}", dependencies=[Depends(require_role(["admin"]))])
async def delete_video(
    video_id: int,
    db: Session = Depends(get_db)
):
    """Delete video (Admin only)"""
    video = db.query(LanguageCourseVideo).filter(LanguageCourseVideo.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    db.delete(video)
    db.commit()
    return {"message": "Video deleted successfully"}

# ============= EXAMS =============

@router.post("/courses/{course_id}/exams", dependencies=[Depends(require_role(["admin"]))])
async def create_exam(
    course_id: int,
    exam: ExamCreate,
    db: Session = Depends(get_db)
):
    """Create exam for course (Admin only)"""
    course = db.query(LanguageCourse).filter(LanguageCourse.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    new_exam = LanguageCourseExam(course_id=course_id, **exam.dict())
    db.add(new_exam)
    db.commit()
    db.refresh(new_exam)
    return new_exam

@router.post("/exams/{exam_id}/questions", dependencies=[Depends(require_role(["admin"]))])
async def create_exam_question(
    exam_id: int,
    question: ExamQuestionCreate,
    db: Session = Depends(get_db)
):
    """Add question to exam (Admin only)"""
    exam = db.query(LanguageCourseExam).filter(LanguageCourseExam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    new_question = LanguageExamQuestion(exam_id=exam_id, **question.dict())
    db.add(new_question)
    db.commit()
    db.refresh(new_question)
    return new_question

@router.get("/exams/{exam_id}/questions")
async def get_exam_questions(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get exam questions (requires course access)"""
    exam = db.query(LanguageCourseExam).filter(LanguageCourseExam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Check access
    has_access = False
    if current_user:
        purchase = db.query(LanguageCoursePurchase).filter(
            LanguageCoursePurchase.user_id == current_user.id,
            LanguageCoursePurchase.course_id == exam.course_id,
            LanguageCoursePurchase.payment_status == "completed"
        ).first()
        has_access = purchase is not None or current_user.role == "admin"
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied. Please purchase the course.")
    
    return exam.questions

# ============= INSTRUCTORS =============

@router.post("/courses/{course_id}/instructors", dependencies=[Depends(require_role(["admin"]))])
async def create_instructor(
    course_id: int,
    instructor: InstructorCreate,
    db: Session = Depends(get_db)
):
    """Add instructor to course (Admin only)"""
    course = db.query(LanguageCourse).filter(LanguageCourse.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    new_instructor = LanguageCourseInstructor(course_id=course_id, **instructor.dict())
    db.add(new_instructor)
    db.commit()
    db.refresh(new_instructor)
    return new_instructor

@router.put("/instructors/{instructor_id}", dependencies=[Depends(require_role(["admin"]))])
async def update_instructor(
    instructor_id: int,
    instructor_update: InstructorCreate,
    db: Session = Depends(get_db)
):
    """Update instructor (Admin only)"""
    instructor = db.query(LanguageCourseInstructor).filter(LanguageCourseInstructor.id == instructor_id).first()
    if not instructor:
        raise HTTPException(status_code=404, detail="Instructor not found")
    
    for key, value in instructor_update.dict().items():
        setattr(instructor, key, value)
    
    db.commit()
    db.refresh(instructor)
    return instructor

@router.delete("/instructors/{instructor_id}", dependencies=[Depends(require_role(["admin"]))])
async def delete_instructor(
    instructor_id: int,
    db: Session = Depends(get_db)
):
    """Delete instructor (Admin only)"""
    instructor = db.query(LanguageCourseInstructor).filter(LanguageCourseInstructor.id == instructor_id).first()
    if not instructor:
        raise HTTPException(status_code=404, detail="Instructor not found")
    
    db.delete(instructor)
    db.commit()
    return {"message": "Instructor deleted successfully"}

# ============= LIVE CLASS REQUESTS =============

@router.post("/live-class-requests")
async def create_live_class_request(
    request_data: LiveClassRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a live class request"""
    new_request = LiveClassRequest(
        user_id=current_user.id,
        **request_data.dict()
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    return new_request

@router.get("/live-class-requests", dependencies=[Depends(require_role(["admin"]))])
async def get_all_live_class_requests(
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all live class requests (Admin only)"""
    query = db.query(LiveClassRequest)
    if status:
        query = query.filter(LiveClassRequest.status == status)
    
    requests = query.order_by(LiveClassRequest.created_at.desc()).all()
    return requests

@router.put("/live-class-requests/{request_id}", dependencies=[Depends(require_role(["admin"]))])
async def update_live_class_request(
    request_id: int,
    status: str,
    admin_notes: Optional[str] = None,
    scheduled_at: Optional[datetime] = None,
    meeting_url: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Update live class request status (Admin only)"""
    request = db.query(LiveClassRequest).filter(LiveClassRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    request.status = status
    if admin_notes:
        request.admin_notes = admin_notes
    if scheduled_at:
        request.scheduled_at = scheduled_at
    if meeting_url:
        request.meeting_url = meeting_url
    
    db.commit()
    db.refresh(request)
    return request

# ============= PURCHASE/ACCESS CHECK =============

@router.get("/check-access/{language}/{level}")
async def check_course_access(
    language: str,
    level: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check if user has access to a course"""
    if not current_user:
        return {"has_access": False}
    
    if current_user.role == "admin":
        return {"has_access": True}
    
    course = db.query(LanguageCourse).filter(
        LanguageCourse.language == language,
        LanguageCourse.level == level
    ).first()
    
    if not course:
        return {"has_access": False}
    
    purchase = db.query(LanguageCoursePurchase).filter(
        LanguageCoursePurchase.user_id == current_user.id,
        LanguageCoursePurchase.course_id == course.id,
        LanguageCoursePurchase.payment_status == "completed"
    ).first()
    
    return {"has_access": purchase is not None}
