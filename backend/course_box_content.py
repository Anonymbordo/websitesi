from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from database import get_db
from models import CourseBoxContent, CourseBox, User
from auth import get_current_user, admin_required
import os
import shutil
from datetime import datetime
from s3_utils import upload_file_to_s3, delete_file_from_s3

router = APIRouter()

# Pydantic Schemas
class CourseBoxContentCreate(BaseModel):
    title: str
    description: str | None = None
    content_type: str  # video, pdf, quiz, slide
    order_index: int = 0
    is_free: bool = False
    duration: int | None = None

class CourseBoxContentUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    content_type: str | None = None
    order_index: int | None = None
    is_free: bool | None = None
    duration: int | None = None

class CourseBoxContentResponse(BaseModel):
    id: int
    course_box_id: int
    title: str
    description: str | None
    content_type: str
    file_url: str | None
    order_index: int
    is_free: bool
    duration: int | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Admin Endpoints
@router.get("/admin/course-boxes/{box_id}/contents", response_model=List[CourseBoxContentResponse])
def get_course_box_contents(
    box_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Get all contents for a course box (admin only)"""
    box = db.query(CourseBox).filter(CourseBox.id == box_id).first()
    if not box:
        raise HTTPException(status_code=404, detail="Course box not found")
    
    contents = db.query(CourseBoxContent).filter(
        CourseBoxContent.course_box_id == box_id
    ).order_by(CourseBoxContent.order_index).all()
    
    return contents

@router.post("/admin/course-boxes/{box_id}/contents", response_model=CourseBoxContentResponse)
def create_course_box_content(
    box_id: int,
    content: CourseBoxContentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Create new content for a course box (admin only)"""
    box = db.query(CourseBox).filter(CourseBox.id == box_id).first()
    if not box:
        raise HTTPException(status_code=404, detail="Course box not found")
    
    new_content = CourseBoxContent(
        course_box_id=box_id,
        **content.dict()
    )
    
    db.add(new_content)
    db.commit()
    db.refresh(new_content)
    
    return new_content

@router.put("/admin/course-boxes/contents/{content_id}", response_model=CourseBoxContentResponse)
def update_course_box_content(
    content_id: int,
    content_update: CourseBoxContentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Update course box content (admin only)"""
    content = db.query(CourseBoxContent).filter(CourseBoxContent.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    
    update_data = content_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(content, key, value)
    
    db.commit()
    db.refresh(content)
    return content

@router.delete("/admin/course-boxes/contents/{content_id}")
def delete_course_box_content(
    content_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Delete course box content (admin only)"""
    content = db.query(CourseBoxContent).filter(CourseBoxContent.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    
    # Delete file if exists
    if content.file_url:
        if "s3" in content.file_url and "amazonaws.com" in content.file_url:
            delete_file_from_s3(content.file_url)
        elif os.path.exists(content.file_url):
            try:
                os.remove(content.file_url)
            except Exception as e:
                print(f"Error deleting file: {e}")
    
    db.delete(content)
    db.commit()
    
    return {"message": "Content deleted successfully"}

@router.post("/admin/course-boxes/contents/{content_id}/upload")
async def upload_content_file(
    content_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Upload file for course box content (admin only)"""
    content = db.query(CourseBoxContent).filter(CourseBoxContent.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    filename = f"course-boxes/{content.course_box_id}/{content.content_type}_{content_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}{file_extension}"
    
    # Upload to S3
    file_url = upload_file_to_s3(file.file, filename, file.content_type)
    
    if not file_url:
        raise HTTPException(status_code=500, detail="Failed to upload file to S3")
    
    # Update content with file URL
    content.file_url = file_url
    db.commit()
    db.refresh(content)
    
    return {"message": "File uploaded successfully", "file_url": file_url}

# Public Endpoints
@router.get("/course-boxes/{box_id}/contents", response_model=List[CourseBoxContentResponse])
def get_public_course_box_contents(
    box_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get course box contents (free preview or purchased)"""
    from models import UserCourseBoxPurchase
    
    # Check if user purchased this box
    purchase = db.query(UserCourseBoxPurchase).filter(
        UserCourseBoxPurchase.user_id == current_user.id,
        UserCourseBoxPurchase.course_box_id == box_id,
        UserCourseBoxPurchase.payment_status == "completed"
    ).first()
    
    if purchase:
        # User purchased, show all contents
        contents = db.query(CourseBoxContent).filter(
            CourseBoxContent.course_box_id == box_id
        ).order_by(CourseBoxContent.order_index).all()
    else:
        # User didn't purchase, show only free preview
        contents = db.query(CourseBoxContent).filter(
            CourseBoxContent.course_box_id == box_id,
            CourseBoxContent.is_free == True
        ).order_by(CourseBoxContent.order_index).all()
    
    return contents
