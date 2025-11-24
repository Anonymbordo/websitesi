from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from database import get_db
from models import CourseBoxQuiz, QuizQuestion, CourseBox, User, UserCourseBoxPurchase
from auth import get_current_user, admin_required
from datetime import datetime

router = APIRouter()

# Pydantic Schemas
class QuizQuestionCreate(BaseModel):
    question_text: str
    question_type: str = "multiple_choice"  # multiple_choice, true_false, short_answer
    options: list | None = None
    correct_answer: str
    points: int = 1
    order_index: int = 0

class QuizQuestionUpdate(BaseModel):
    question_text: str | None = None
    question_type: str | None = None
    options: list | None = None
    correct_answer: str | None = None
    points: int | None = None
    order_index: int | None = None

class QuizQuestionResponse(BaseModel):
    id: int
    quiz_id: int
    question_text: str
    question_type: str
    options: list | None
    points: int
    order_index: int
    created_at: datetime

    class Config:
        from_attributes = True

class CourseBoxQuizCreate(BaseModel):
    title: str
    description: str | None = None
    passing_score: int = 70
    time_limit: int | None = None
    order_index: int = 0

class CourseBoxQuizUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    passing_score: int | None = None
    time_limit: int | None = None
    order_index: int | None = None

class CourseBoxQuizResponse(BaseModel):
    id: int
    course_box_id: int
    title: str
    description: str | None
    passing_score: int
    time_limit: int | None
    order_index: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class QuizSubmission(BaseModel):
    answers: dict  # {question_id: answer}

class QuizResult(BaseModel):
    score: float
    passed: bool
    correct_answers: int
    total_questions: int
    details: list

# Admin Endpoints - Quiz Management
@router.get("/admin/course-boxes/{box_id}/quizzes", response_model=List[CourseBoxQuizResponse])
@admin_required
def get_course_box_quizzes(
    box_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all quizzes for a course box (admin only)"""
    box = db.query(CourseBox).filter(CourseBox.id == box_id).first()
    if not box:
        raise HTTPException(status_code=404, detail="Course box not found")
    
    quizzes = db.query(CourseBoxQuiz).filter(
        CourseBoxQuiz.course_box_id == box_id
    ).order_by(CourseBoxQuiz.order_index).all()
    
    return quizzes

@router.post("/admin/course-boxes/{box_id}/quizzes", response_model=CourseBoxQuizResponse)
@admin_required
def create_course_box_quiz(
    box_id: int,
    quiz: CourseBoxQuizCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new quiz for a course box (admin only)"""
    box = db.query(CourseBox).filter(CourseBox.id == box_id).first()
    if not box:
        raise HTTPException(status_code=404, detail="Course box not found")
    
    new_quiz = CourseBoxQuiz(
        course_box_id=box_id,
        **quiz.dict()
    )
    
    db.add(new_quiz)
    db.commit()
    db.refresh(new_quiz)
    
    return new_quiz

@router.put("/admin/course-boxes/quizzes/{quiz_id}", response_model=CourseBoxQuizResponse)
@admin_required
def update_course_box_quiz(
    quiz_id: int,
    quiz_update: CourseBoxQuizUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update quiz (admin only)"""
    quiz = db.query(CourseBoxQuiz).filter(CourseBoxQuiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    update_data = quiz_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(quiz, key, value)
    
    db.commit()
    db.refresh(quiz)
    
    return quiz

@router.delete("/admin/course-boxes/quizzes/{quiz_id}")
@admin_required
def delete_course_box_quiz(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete quiz (admin only)"""
    quiz = db.query(CourseBoxQuiz).filter(CourseBoxQuiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    db.delete(quiz)
    db.commit()
    
    return {"message": "Quiz deleted successfully"}

# Admin Endpoints - Question Management
@router.post("/admin/course-boxes/quizzes/{quiz_id}/questions", response_model=QuizQuestionResponse)
@admin_required
def create_quiz_question(
    quiz_id: int,
    question: QuizQuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add question to quiz (admin only)"""
    quiz = db.query(CourseBoxQuiz).filter(CourseBoxQuiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    new_question = QuizQuestion(
        quiz_id=quiz_id,
        **question.dict()
    )
    
    db.add(new_question)
    db.commit()
    db.refresh(new_question)
    
    return new_question

@router.put("/admin/course-boxes/questions/{question_id}", response_model=QuizQuestionResponse)
@admin_required
def update_quiz_question(
    question_id: int,
    question_update: QuizQuestionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update question (admin only)"""
    question = db.query(QuizQuestion).filter(QuizQuestion.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    update_data = question_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(question, key, value)
    
    db.commit()
    db.refresh(question)
    
    return question

@router.delete("/admin/course-boxes/questions/{question_id}")
@admin_required
def delete_quiz_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete question (admin only)"""
    question = db.query(QuizQuestion).filter(QuizQuestion.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    db.delete(question)
    db.commit()
    
    return {"message": "Question deleted successfully"}

# Public Endpoints
@router.get("/course-boxes/{box_id}/quizzes/{quiz_id}", response_model=CourseBoxQuizResponse)
def get_quiz(
    box_id: int,
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get quiz (requires purchase)"""
    # Check if user purchased this box
    purchase = db.query(UserCourseBoxPurchase).filter(
        UserCourseBoxPurchase.user_id == current_user.id,
        UserCourseBoxPurchase.course_box_id == box_id,
        UserCourseBoxPurchase.payment_status == "completed"
    ).first()
    
    if not purchase:
        raise HTTPException(status_code=403, detail="You must purchase this course box to access quizzes")
    
    quiz = db.query(CourseBoxQuiz).filter(
        CourseBoxQuiz.id == quiz_id,
        CourseBoxQuiz.course_box_id == box_id
    ).first()
    
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    return quiz

@router.get("/course-boxes/{box_id}/quizzes/{quiz_id}/questions", response_model=List[QuizQuestionResponse])
def get_quiz_questions(
    box_id: int,
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get quiz questions (requires purchase)"""
    # Check if user purchased this box
    purchase = db.query(UserCourseBoxPurchase).filter(
        UserCourseBoxPurchase.user_id == current_user.id,
        UserCourseBoxPurchase.course_box_id == box_id,
        UserCourseBoxPurchase.payment_status == "completed"
    ).first()
    
    if not purchase:
        raise HTTPException(status_code=403, detail="You must purchase this course box to access quizzes")
    
    questions = db.query(QuizQuestion).filter(
        QuizQuestion.quiz_id == quiz_id
    ).order_by(QuizQuestion.order_index).all()
    
    return questions

@router.post("/course-boxes/{box_id}/quizzes/{quiz_id}/submit", response_model=QuizResult)
def submit_quiz(
    box_id: int,
    quiz_id: int,
    submission: QuizSubmission,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit quiz answers and get results"""
    # Check if user purchased this box
    purchase = db.query(UserCourseBoxPurchase).filter(
        UserCourseBoxPurchase.user_id == current_user.id,
        UserCourseBoxPurchase.course_box_id == box_id,
        UserCourseBoxPurchase.payment_status == "completed"
    ).first()
    
    if not purchase:
        raise HTTPException(status_code=403, detail="You must purchase this course box to take quizzes")
    
    quiz = db.query(CourseBoxQuiz).filter(CourseBoxQuiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz_id).all()
    
    correct_count = 0
    total_points = 0
    earned_points = 0
    details = []
    
    for question in questions:
        total_points += question.points
        user_answer = submission.answers.get(str(question.id), "")
        is_correct = str(user_answer).strip().lower() == str(question.correct_answer).strip().lower()
        
        if is_correct:
            correct_count += 1
            earned_points += question.points
        
        details.append({
            "question_id": question.id,
            "question_text": question.question_text,
            "user_answer": user_answer,
            "is_correct": is_correct,
            "points_earned": question.points if is_correct else 0
        })
    
    score = (earned_points / total_points * 100) if total_points > 0 else 0
    passed = score >= quiz.passing_score
    
    return QuizResult(
        score=score,
        passed=passed,
        correct_answers=correct_count,
        total_questions=len(questions),
        details=details
    )
