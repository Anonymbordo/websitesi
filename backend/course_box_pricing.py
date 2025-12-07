from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import CourseBoxPricing, CourseBox, User
from auth import get_current_user, admin_required
from datetime import datetime

router = APIRouter()

# Pydantic Schemas
class CourseBoxPricingCreate(BaseModel):
    price: float = 0.0
    discount_price: float | None = None
    currency: str = "TRY"
    is_free: bool = False

class CourseBoxPricingUpdate(BaseModel):
    price: float | None = None
    discount_price: float | None = None
    currency: str | None = None
    is_free: bool | None = None

class CourseBoxPricingResponse(BaseModel):
    id: int
    course_box_id: int
    price: float
    discount_price: float | None
    currency: str
    is_free: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Admin Endpoints
@router.get("/admin/course-boxes/{box_id}/pricing", response_model=CourseBoxPricingResponse)
def get_course_box_pricing(
    box_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Get pricing for a course box (admin only)"""
    box = db.query(CourseBox).filter(CourseBox.id == box_id).first()
    if not box:
        raise HTTPException(status_code=404, detail="Course box not found")
    
    pricing = db.query(CourseBoxPricing).filter(
        CourseBoxPricing.course_box_id == box_id
    ).first()
    
    if not pricing:
        # Create default pricing if not exists
        pricing = CourseBoxPricing(
            course_box_id=box_id,
            price=0.0,
            is_free=True
        )
        db.add(pricing)
        db.commit()
        db.refresh(pricing)
    
    return pricing

@router.put("/admin/course-boxes/{box_id}/pricing", response_model=CourseBoxPricingResponse)
def update_course_box_pricing(
    box_id: int,
    pricing_update: CourseBoxPricingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Update pricing for a course box (admin only)"""
    box = db.query(CourseBox).filter(CourseBox.id == box_id).first()
    if not box:
        raise HTTPException(status_code=404, detail="Course box not found")
    
    pricing = db.query(CourseBoxPricing).filter(
        CourseBoxPricing.course_box_id == box_id
    ).first()
    
    if not pricing:
        # Create new pricing
        pricing = CourseBoxPricing(
            course_box_id=box_id,
            **pricing_update.dict(exclude_unset=True)
        )
        db.add(pricing)
    else:
        # Update existing pricing
        update_data = pricing_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(pricing, key, value)
    
    db.commit()
    db.refresh(pricing)
    
    return pricing

# Public Endpoints
@router.get("/course-boxes/{box_id}/pricing", response_model=CourseBoxPricingResponse)
def get_public_course_box_pricing(
    box_id: int,
    db: Session = Depends(get_db)
):
    """Get pricing for a course box (public)"""
    box = db.query(CourseBox).filter(CourseBox.id == box_id).first()
    if not box:
        raise HTTPException(status_code=404, detail="Course box not found")
    
    pricing = db.query(CourseBoxPricing).filter(
        CourseBoxPricing.course_box_id == box_id
    ).first()
    
    if not pricing:
        # Return default pricing
        return CourseBoxPricingResponse(
            id=0,
            course_box_id=box_id,
            price=0.0,
            discount_price=None,
            currency="TRY",
            is_free=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
    
    return pricing
