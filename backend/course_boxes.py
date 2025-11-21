from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from database import get_db
from models import CourseBox
from auth import verify_admin

course_boxes_router = APIRouter()

# Schemas
class CourseBoxCreate(BaseModel):
    title_tr: str
    title_en: Optional[str] = None
    title_ar: Optional[str] = None
    category: str
    icon: Optional[str] = "BookOpen"
    color_from: str = "#3B82F6"
    color_to: str = "#8B5CF6"
    order_index: int = 0
    is_active: bool = True

class CourseBoxUpdate(BaseModel):
    title_tr: Optional[str] = None
    title_en: Optional[str] = None
    title_ar: Optional[str] = None
    category: Optional[str] = None
    icon: Optional[str] = None
    color_from: Optional[str] = None
    color_to: Optional[str] = None
    order_index: Optional[int] = None
    is_active: Optional[bool] = None

class CourseBoxResponse(BaseModel):
    id: int
    title_tr: str
    title_en: Optional[str]
    title_ar: Optional[str]
    category: str
    icon: Optional[str]
    color_from: str
    color_to: str
    order_index: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Public endpoints
@course_boxes_router.get("/", response_model=List[CourseBoxResponse])
async def get_course_boxes(
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db)
):
    """Get all course boxes (filtered by active status)"""
    query = db.query(CourseBox)
    if is_active is not None:
        query = query.filter(CourseBox.is_active == is_active)
    boxes = query.order_by(CourseBox.order_index).all()
    return boxes

@course_boxes_router.get("/{box_id}", response_model=CourseBoxResponse)
async def get_course_box(box_id: int, db: Session = Depends(get_db)):
    """Get a single course box by ID"""
    box = db.query(CourseBox).filter(CourseBox.id == box_id).first()
    if not box:
        raise HTTPException(status_code=404, detail="Course box not found")
    return box

# Admin endpoints
@course_boxes_router.post("/", response_model=CourseBoxResponse, dependencies=[Depends(verify_admin)])
async def create_course_box(
    box_data: CourseBoxCreate,
    db: Session = Depends(get_db)
):
    """Create a new course box (Admin only)"""
    # Check if category already has a box
    existing = db.query(CourseBox).filter(CourseBox.category == box_data.category).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"A box for category '{box_data.category}' already exists"
        )
    
    new_box = CourseBox(**box_data.dict())
    db.add(new_box)
    db.commit()
    db.refresh(new_box)
    return new_box

@course_boxes_router.put("/{box_id}", response_model=CourseBoxResponse, dependencies=[Depends(verify_admin)])
async def update_course_box(
    box_id: int,
    box_data: CourseBoxUpdate,
    db: Session = Depends(get_db)
):
    """Update a course box (Admin only)"""
    box = db.query(CourseBox).filter(CourseBox.id == box_id).first()
    if not box:
        raise HTTPException(status_code=404, detail="Course box not found")
    
    # Update fields
    for field, value in box_data.dict(exclude_unset=True).items():
        setattr(box, field, value)
    
    box.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(box)
    return box

@course_boxes_router.delete("/{box_id}", dependencies=[Depends(verify_admin)])
async def delete_course_box(box_id: int, db: Session = Depends(get_db)):
    """Delete a course box (Admin only)"""
    box = db.query(CourseBox).filter(CourseBox.id == box_id).first()
    if not box:
        raise HTTPException(status_code=404, detail="Course box not found")
    
    db.delete(box)
    db.commit()
    return {"message": "Course box deleted successfully"}

@course_boxes_router.post("/seed", dependencies=[Depends(verify_admin)])
async def seed_default_boxes(db: Session = Depends(get_db)):
    """Seed default course boxes (Admin only)"""
    default_boxes = [
        {
            "title_tr": "9. Sınıf Dersleri",
            "title_en": "9th Grade Courses",
            "title_ar": "دورات الصف التاسع",
            "category": "grade_9",
            "icon": "BookOpen",
            "color_from": "#3B82F6",
            "color_to": "#8B5CF6",
            "order_index": 1
        },
        {
            "title_tr": "10. Sınıf Dersleri",
            "title_en": "10th Grade Courses",
            "title_ar": "دورات الصف العاشر",
            "category": "grade_10",
            "icon": "GraduationCap",
            "color_from": "#10B981",
            "color_to": "#059669",
            "order_index": 2
        },
        {
            "title_tr": "11. Sınıf Dersleri",
            "title_en": "11th Grade Courses",
            "title_ar": "دورات الصف الحادي عشر",
            "category": "grade_11",
            "icon": "Award",
            "color_from": "#F59E0B",
            "color_to": "#D97706",
            "order_index": 3
        },
        {
            "title_tr": "12. Sınıf Dersleri",
            "title_en": "12th Grade Courses",
            "title_ar": "دورات الصف الثاني عشر",
            "category": "grade_12",
            "icon": "Trophy",
            "color_from": "#EF4444",
            "color_to": "#DC2626",
            "order_index": 4
        }
    ]
    
    created_count = 0
    for box_data in default_boxes:
        existing = db.query(CourseBox).filter(CourseBox.category == box_data["category"]).first()
        if not existing:
            new_box = CourseBox(**box_data)
            db.add(new_box)
            created_count += 1
    
    db.commit()
    return {"message": f"Successfully seeded {created_count} default boxes"}
