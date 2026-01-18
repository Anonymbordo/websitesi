from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import auth
from database import get_db
from models import Institution, InstitutionCourse

router = APIRouter()

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
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

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
    query = db.query(Institution)
    
    if city:
        query = query.filter(Institution.city == city)
    if is_active is not None:
        query = query.filter(Institution.is_active == is_active)
    if is_featured is not None:
        query = query.filter(Institution.is_featured == is_featured)
    if search:
        query = query.filter(Institution.name.ilike(f"%{search}%"))
    
    institutions = query.offset(skip).limit(limit).all()
    return institutions

# Get Single Institution
@router.get("/institutions/{institution_id}")
async def get_institution(
    institution_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth.require_role(["admin"]))
):
    """Get institution details with courses"""
    institution = db.query(Institution).filter(Institution.id == institution_id).first()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found")
    
    # Get courses
    courses = db.query(InstitutionCourse).filter(
        InstitutionCourse.institution_id == institution_id
    ).all()
    
    return {
        **institution.__dict__,
        "courses": courses
    }

# Create Institution
@router.post("/institutions", response_model=InstitutionResponse)
async def create_institution(
    institution_data: InstitutionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth.require_role(["admin"]))
):
    """Create new institution"""
    institution = Institution(**institution_data.dict())
    db.add(institution)
    db.commit()
    db.refresh(institution)
    return institution

# Update Institution
@router.put("/institutions/{institution_id}", response_model=InstitutionResponse)
async def update_institution(
    institution_id: int,
    institution_data: InstitutionUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth.require_role(["admin"]))
):
    """Update institution"""
    institution = db.query(Institution).filter(Institution.id == institution_id).first()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found")
    
    # Update fields
    update_data = institution_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(institution, field, value)
    
    institution.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(institution)
    return institution

# Delete Institution
@router.delete("/institutions/{institution_id}")
async def delete_institution(
    institution_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth.require_role(["admin"]))
):
    """Delete institution"""
    institution = db.query(Institution).filter(Institution.id == institution_id).first()
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
    institution = db.query(Institution).filter(Institution.id == institution_id).first()
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
    institution = db.query(Institution).filter(Institution.id == institution_id).first()
    if institution and institution.total_courses > 0:
        institution.total_courses -= 1
    
    db.delete(course)
    db.commit()
    return {"message": "Course deleted successfully"}

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
    query = db.query(Institution).filter(Institution.is_active == True)
    
    if city:
        query = query.filter(Institution.city == city)
    if search:
        query = query.filter(Institution.name.ilike(f"%{search}%"))
    
    institutions = query.offset(skip).limit(limit).all()
    return institutions
