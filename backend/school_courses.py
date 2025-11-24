from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from database import get_db
from auth import get_current_user, require_role
from models import (
    User, SchoolCourse, SchoolCourseTopic, SchoolCourseNote,
    SchoolCourseVideo, SchoolCourseExam, SchoolExamQuestion,
    SchoolCourseInstructor, SchoolCoursePurchase
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

# ============= COURSES =============
@router.get("/courses")
async def get_all_school_courses(
    level: Optional[str] = None,
    grade: Optional[int] = None,
    subject: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all school courses with filters"""
    query = db.query(SchoolCourse)
    
    if level:
        query = query.filter(SchoolCourse.level == level)
    if grade:
        query = query.filter(SchoolCourse.grade == grade)
    if subject:
        query = query.filter(SchoolCourse.subject == subject)
    
    courses = query.all()
    return courses

@router.get("/courses/{course_id}")
async def get_school_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get course details with access check"""
    course = db.query(SchoolCourse).filter(SchoolCourse.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    has_access = False
    if current_user:
        purchase = db.query(SchoolCoursePurchase).filter(
            SchoolCoursePurchase.user_id == current_user.id,
            SchoolCoursePurchase.course_id == course_id,
            SchoolCoursePurchase.payment_status == "completed"
        ).first()
        has_access = purchase is not None or current_user.role == "admin"
    
    return {
        "id": course.id,
        "level": course.level,
        "grade": course.grade,
        "subject": course.subject,
        "title": course.title,
        "description": course.description,
        "price": course.price,
        "is_active": course.is_active,
        "has_access": has_access,
        "topics": course.topics if has_access else [],
        "notes": course.notes if has_access else [],
        "videos": course.videos if has_access else [],
        "exams": course.exams if has_access else [],
        "instructors": course.instructors
    }

@router.post("/courses", dependencies=[Depends(require_role(["admin"]))])
async def create_school_course(
    course: SchoolCourseCreate,
    db: Session = Depends(get_db)
):
    """Create new school course (Admin only)"""
    new_course = SchoolCourse(**course.dict())
    db.add(new_course)
    db.commit()
    db.refresh(new_course)
    return new_course

@router.put("/courses/{course_id}", dependencies=[Depends(require_role(["admin"]))])
async def update_school_course(
    course_id: int,
    course_update: SchoolCourseCreate,
    db: Session = Depends(get_db)
):
    """Update school course (Admin only)"""
    course = db.query(SchoolCourse).filter(SchoolCourse.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    for key, value in course_update.dict(exclude_unset=True).items():
        setattr(course, key, value)
    
    db.commit()
    db.refresh(course)
    return course

@router.delete("/courses/{course_id}", dependencies=[Depends(require_role(["admin"]))])
async def delete_school_course(
    course_id: int,
    db: Session = Depends(get_db)
):
    """Delete school course (Admin only)"""
    course = db.query(SchoolCourse).filter(SchoolCourse.id == course_id).first()
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
    course = db.query(SchoolCourse).filter(SchoolCourse.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    new_topic = SchoolCourseTopic(course_id=course_id, **topic.dict())
    db.add(new_topic)
    db.commit()
    db.refresh(new_topic)
    return new_topic

@router.put("/topics/{topic_id}", dependencies=[Depends(require_role(["admin"]))])
async def update_topic(topic_id: int, topic_update: TopicCreate, db: Session = Depends(get_db)):
    topic = db.query(SchoolCourseTopic).filter(SchoolCourseTopic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    for key, value in topic_update.dict().items():
        setattr(topic, key, value)
    
    db.commit()
    db.refresh(topic)
    return topic

@router.delete("/topics/{topic_id}", dependencies=[Depends(require_role(["admin"]))])
async def delete_topic(topic_id: int, db: Session = Depends(get_db)):
    topic = db.query(SchoolCourseTopic).filter(SchoolCourseTopic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    db.delete(topic)
    db.commit()
    return {"message": "Topic deleted"}

# ============= NOTES =============
@router.post("/courses/{course_id}/notes", dependencies=[Depends(require_role(["admin"]))])
async def create_note(course_id: int, note: NoteCreate, db: Session = Depends(get_db)):
    course = db.query(SchoolCourse).filter(SchoolCourse.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    new_note = SchoolCourseNote(course_id=course_id, **note.dict())
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    return new_note

@router.put("/notes/{note_id}", dependencies=[Depends(require_role(["admin"]))])
async def update_note(note_id: int, note_update: NoteCreate, db: Session = Depends(get_db)):
    note = db.query(SchoolCourseNote).filter(SchoolCourseNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    for key, value in note_update.dict().items():
        setattr(note, key, value)
    
    db.commit()
    db.refresh(note)
    return note

@router.delete("/notes/{note_id}", dependencies=[Depends(require_role(["admin"]))])
async def delete_note(note_id: int, db: Session = Depends(get_db)):
    note = db.query(SchoolCourseNote).filter(SchoolCourseNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    db.delete(note)
    db.commit()
    return {"message": "Note deleted"}

# ============= VIDEOS =============
@router.post("/courses/{course_id}/videos", dependencies=[Depends(require_role(["admin"]))])
async def create_video(course_id: int, video: VideoCreate, db: Session = Depends(get_db)):
    course = db.query(SchoolCourse).filter(SchoolCourse.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    new_video = SchoolCourseVideo(course_id=course_id, **video.dict())
    db.add(new_video)
    db.commit()
    db.refresh(new_video)
    return new_video

@router.put("/videos/{video_id}", dependencies=[Depends(require_role(["admin"]))])
async def update_video(video_id: int, video_update: VideoCreate, db: Session = Depends(get_db)):
    video = db.query(SchoolCourseVideo).filter(SchoolCourseVideo.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    for key, value in video_update.dict().items():
        setattr(video, key, value)
    
    db.commit()
    db.refresh(video)
    return video

@router.delete("/videos/{video_id}", dependencies=[Depends(require_role(["admin"]))])
async def delete_video(video_id: int, db: Session = Depends(get_db)):
    video = db.query(SchoolCourseVideo).filter(SchoolCourseVideo.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    db.delete(video)
    db.commit()
    return {"message": "Video deleted"}

# ============= EXAMS =============
@router.post("/courses/{course_id}/exams", dependencies=[Depends(require_role(["admin"]))])
async def create_exam(course_id: int, exam: ExamCreate, db: Session = Depends(get_db)):
    course = db.query(SchoolCourse).filter(SchoolCourse.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    new_exam = SchoolCourseExam(course_id=course_id, **exam.dict())
    db.add(new_exam)
    db.commit()
    db.refresh(new_exam)
    return new_exam

@router.post("/exams/{exam_id}/questions", dependencies=[Depends(require_role(["admin"]))])
async def create_exam_question(exam_id: int, question: ExamQuestionCreate, db: Session = Depends(get_db)):
    exam = db.query(SchoolCourseExam).filter(SchoolCourseExam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    new_question = SchoolExamQuestion(exam_id=exam_id, **question.dict())
    db.add(new_question)
    db.commit()
    db.refresh(new_question)
    return new_question

# ============= INSTRUCTORS =============
@router.post("/courses/{course_id}/instructors", dependencies=[Depends(require_role(["admin"]))])
async def create_instructor(course_id: int, instructor: InstructorCreate, db: Session = Depends(get_db)):
    course = db.query(SchoolCourse).filter(SchoolCourse.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    new_instructor = SchoolCourseInstructor(course_id=course_id, **instructor.dict())
    db.add(new_instructor)
    db.commit()
    db.refresh(new_instructor)
    return new_instructor

@router.put("/instructors/{instructor_id}", dependencies=[Depends(require_role(["admin"]))])
async def update_instructor(instructor_id: int, instructor_update: InstructorCreate, db: Session = Depends(get_db)):
    instructor = db.query(SchoolCourseInstructor).filter(SchoolCourseInstructor.id == instructor_id).first()
    if not instructor:
        raise HTTPException(status_code=404, detail="Instructor not found")
    
    for key, value in instructor_update.dict().items():
        setattr(instructor, key, value)
    
    db.commit()
    db.refresh(instructor)
    return instructor

@router.delete("/instructors/{instructor_id}", dependencies=[Depends(require_role(["admin"]))])
async def delete_instructor(instructor_id: int, db: Session = Depends(get_db)):
    instructor = db.query(SchoolCourseInstructor).filter(SchoolCourseInstructor.id == instructor_id).first()
    if not instructor:
        raise HTTPException(status_code=404, detail="Instructor not found")
    
    db.delete(instructor)
    db.commit()
    return {"message": "Instructor deleted"}

# ============= ACCESS CHECK =============
@router.get("/check-access/{level}/{grade}/{subject}")
async def check_course_access(
    level: str,
    grade: int,
    subject: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check if user has access to a course"""
    if not current_user:
        return {"has_access": False}
    
    if current_user.role == "admin":
        return {"has_access": True}
    
    course = db.query(SchoolCourse).filter(
        SchoolCourse.level == level,
        SchoolCourse.grade == grade,
        SchoolCourse.subject == subject
    ).first()
    
    if not course:
        return {"has_access": False}
    
    purchase = db.query(SchoolCoursePurchase).filter(
        SchoolCoursePurchase.user_id == current_user.id,
        SchoolCoursePurchase.course_id == course.id,
        SchoolCoursePurchase.payment_status == "completed"
    ).first()
    
    return {"has_access": purchase is not None}
