from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta

from database import get_db
from models import User, Instructor, Course, Enrollment, Payment, Review, AIInteraction, BlogPost, Category, MediaFile
from auth import get_current_user

admin_router = APIRouter()

# Pydantic models
class AdminStats(BaseModel):
    total_users: int
    total_instructors: int
    total_courses: int
    total_enrollments: int
    total_revenue: float
    pending_instructor_approvals: int
    active_courses: int
    users_this_month: int
    revenue_this_month: float

class UserAdmin(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    is_verified: bool
    city: Optional[str]
    district: Optional[str]
    created_at: datetime
    total_enrollments: int
    total_spent: float

class InstructorAdmin(BaseModel):
    id: int
    user: dict
    bio: Optional[str]
    specialization: Optional[str]
    experience_years: int
    rating: float
    total_students: int
    total_courses: int
    total_revenue: float
    is_approved: bool
    created_at: datetime

class CourseAdmin(BaseModel):
    id: int
    title: str
    instructor_name: str
    category: str
    price: float
    enrollment_count: int
    rating: float
    is_published: bool
    created_at: datetime
    total_revenue: float

# Dependency to check admin role
def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

# Routes
@admin_router.get("/stats", response_model=AdminStats)
async def get_admin_stats(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    # Basic counts
    total_users = db.query(User).count()
    total_instructors = db.query(Instructor).filter(Instructor.is_approved == True).count()
    total_courses = db.query(Course).count()
    total_enrollments = db.query(Enrollment).count()
    
    # Revenue calculation
    total_revenue = db.query(func.sum(Payment.amount)).filter(
        Payment.payment_status == "completed"
    ).scalar() or 0.0
    
    pending_instructor_approvals = db.query(Instructor).filter(
        Instructor.is_approved == False
    ).count()
    
    active_courses = db.query(Course).filter(Course.is_published == True).count()
    
    # This month stats
    this_month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    users_this_month = db.query(User).filter(
        User.created_at >= this_month_start
    ).count()
    
    revenue_this_month = db.query(func.sum(Payment.amount)).filter(
        and_(
            Payment.payment_status == "completed",
            Payment.payment_date >= this_month_start
        )
    ).scalar() or 0.0
    
    return AdminStats(
        total_users=total_users,
        total_instructors=total_instructors,
        total_courses=total_courses,
        total_enrollments=total_enrollments,
        total_revenue=total_revenue,
        pending_instructor_approvals=pending_instructor_approvals,
        active_courses=active_courses,
        users_this_month=users_this_month,
        revenue_this_month=revenue_this_month
    )

@admin_router.get("/users", response_model=List[UserAdmin])
async def get_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
    city: Optional[str] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(User)
    
    # Apply filters
    if search:
        query = query.filter(
            or_(
                User.full_name.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%")
            )
        )
    
    if role:
        query = query.filter(User.role == role)
    
    if city:
        query = query.filter(User.city.ilike(f"%{city}%"))
    
    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    
    # Get additional stats for each user
    result = []
    for user in users:
        total_enrollments = db.query(Enrollment).filter(Enrollment.student_id == user.id).count()
        total_spent = db.query(func.sum(Payment.amount)).filter(
            and_(
                Payment.user_id == user.id,
                Payment.payment_status == "completed"
            )
        ).scalar() or 0.0
        
        user_admin = UserAdmin(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            is_active=user.is_active,
            is_verified=user.is_verified,
            city=user.city,
            district=user.district,
            created_at=user.created_at,
            total_enrollments=total_enrollments,
            total_spent=total_spent
        )
        result.append(user_admin)
    
    return result

@admin_router.get("/instructors", response_model=List[InstructorAdmin])
async def get_instructors(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    is_approved: Optional[bool] = None,
    search: Optional[str] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Instructor)
    
    # Apply filters
    if is_approved is not None:
        query = query.filter(Instructor.is_approved == is_approved)
    
    if search:
        query = query.join(User).filter(
            or_(
                User.full_name.ilike(f"%{search}%"),
                Instructor.specialization.ilike(f"%{search}%")
            )
        )
    
    instructors = query.order_by(Instructor.created_at.desc()).offset(skip).limit(limit).all()
    
    # Get additional stats for each instructor
    result = []
    for instructor in instructors:
        total_courses = db.query(Course).filter(Course.instructor_id == instructor.id).count()
        
        # Calculate total revenue for instructor
        total_revenue = db.query(func.sum(Payment.amount)).join(Course).filter(
            and_(
                Course.instructor_id == instructor.id,
                Payment.payment_status == "completed"
            )
        ).scalar() or 0.0
        
        user_info = {
            "id": instructor.user.id,
            "email": instructor.user.email,
            "full_name": instructor.user.full_name,
            "city": instructor.user.city,
            "district": instructor.user.district
        }
        
        instructor_admin = InstructorAdmin(
            id=instructor.id,
            user=user_info,
            bio=instructor.bio,
            specialization=instructor.specialization,
            experience_years=instructor.experience_years,
            rating=instructor.rating,
            total_students=instructor.total_students,
            total_courses=total_courses,
            total_revenue=total_revenue,
            is_approved=instructor.is_approved,
            created_at=instructor.created_at
        )
        result.append(instructor_admin)
    
    return result

@admin_router.put("/instructors/{instructor_id}/approve")
async def approve_instructor(
    instructor_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    instructor = db.query(Instructor).filter(Instructor.id == instructor_id).first()
    
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor not found"
        )
    
    instructor.is_approved = True
    db.commit()
    
    return {"message": "Instructor approved successfully"}

@admin_router.put("/instructors/{instructor_id}/reject")
async def reject_instructor(
    instructor_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    instructor = db.query(Instructor).filter(Instructor.id == instructor_id).first()
    
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor not found"
        )
    
    instructor.is_approved = False
    db.commit()
    
    return {"message": "Instructor rejected"}

@admin_router.get("/courses", response_model=List[CourseAdmin])
async def get_courses(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    is_published: Optional[bool] = None,
    search: Optional[str] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Course)
    
    # Apply filters
    if category:
        query = query.filter(Course.category == category)
    
    if is_published is not None:
        query = query.filter(Course.is_published == is_published)
    
    if search:
        query = query.filter(
            or_(
                Course.title.ilike(f"%{search}%"),
                Course.description.ilike(f"%{search}%")
            )
        )
    
    courses = query.order_by(Course.created_at.desc()).offset(skip).limit(limit).all()
    
    # Get additional stats for each course
    result = []
    for course in courses:
        # Calculate total revenue for course
        total_revenue = db.query(func.sum(Payment.amount)).filter(
            and_(
                Payment.course_id == course.id,
                Payment.payment_status == "completed"
            )
        ).scalar() or 0.0
        
        course_admin = CourseAdmin(
            id=course.id,
            title=course.title,
            instructor_name=course.instructor.user.full_name,
            category=course.category,
            price=course.price,
            enrollment_count=course.enrollment_count,
            rating=course.rating,
            is_published=course.is_published,
            created_at=course.created_at,
            total_revenue=total_revenue
        )
        result.append(course_admin)
    
    return result

@admin_router.put("/courses/{course_id}/publish")
async def publish_course(
    course_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    course.is_published = True
    db.commit()
    
    return {"message": "Course published successfully"}

@admin_router.put("/courses/{course_id}/unpublish")
async def unpublish_course(
    course_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    course.is_published = False
    db.commit()
    
    return {"message": "Course unpublished"}

@admin_router.put("/users/{user_id}/activate")
async def activate_user(
    user_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.is_active = True
    db.commit()
    
    return {"message": "User activated successfully"}

@admin_router.put("/users/{user_id}/deactivate")
async def deactivate_user(
    user_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.role == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate admin user"
        )
    
    user.is_active = False
    db.commit()
    
    return {"message": "User deactivated"}

@admin_router.get("/analytics/revenue")
async def get_revenue_analytics(
    days: int = Query(30, ge=1, le=365),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Daily revenue
    daily_revenue = db.query(
        func.date(Payment.payment_date).label('date'),
        func.sum(Payment.amount).label('revenue')
    ).filter(
        and_(
            Payment.payment_status == "completed",
            Payment.payment_date >= start_date
        )
    ).group_by(func.date(Payment.payment_date)).all()
    
    # Revenue by category
    category_revenue = db.query(
        Course.category,
        func.sum(Payment.amount).label('revenue')
    ).join(Payment).filter(
        and_(
            Payment.payment_status == "completed",
            Payment.payment_date >= start_date
        )
    ).group_by(Course.category).all()
    
    return {
        "period_days": days,
        "daily_revenue": [
            {"date": str(row.date), "revenue": float(row.revenue)}
            for row in daily_revenue
        ],
        "category_revenue": [
            {"category": row.category, "revenue": float(row.revenue)}
            for row in category_revenue
        ]
    }

@admin_router.get("/analytics/users")
async def get_user_analytics(
    days: int = Query(30, ge=1, le=365),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Daily user registrations
    daily_registrations = db.query(
        func.date(User.created_at).label('date'),
        func.count(User.id).label('registrations')
    ).filter(
        User.created_at >= start_date
    ).group_by(func.date(User.created_at)).all()
    
    # Users by city
    users_by_city = db.query(
        User.city,
        func.count(User.id).label('count')
    ).filter(
        and_(
            User.city.isnot(None),
            User.created_at >= start_date
        )
    ).group_by(User.city).order_by(func.count(User.id).desc()).limit(10).all()
    
    return {
        "period_days": days,
        "daily_registrations": [
            {"date": str(row.date), "registrations": row.registrations}
            for row in daily_registrations
        ],
        "users_by_city": [
            {"city": row.city, "count": row.count}
            for row in users_by_city
        ]
    }

@admin_router.get("/reviews/pending")
async def get_pending_reviews(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    reviews = db.query(Review).filter(
        Review.is_approved == False
    ).order_by(Review.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for review in reviews:
        review_dict = {
            "id": review.id,
            "rating": review.rating,
            "comment": review.comment,
            "created_at": review.created_at,
            "reviewer": {
                "id": review.reviewer.id,
                "full_name": review.reviewer.full_name
            },
            "course": {
                "id": review.course.id,
                "title": review.course.title
            } if review.course else None,
            "instructor": {
                "id": review.instructor.id,
                "name": review.instructor.user.full_name
            } if review.instructor else None
        }
        result.append(review_dict)
    
    return result

@admin_router.put("/reviews/{review_id}/approve")
async def approve_review(
    review_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    review = db.query(Review).filter(Review.id == review_id).first()
    
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    review.is_approved = True
    db.commit()
    
    return {"message": "Review approved successfully"}

@admin_router.delete("/reviews/{review_id}")
async def delete_review(
    review_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    review = db.query(Review).filter(Review.id == review_id).first()

    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )

    db.delete(review)
    db.commit()

    return {"message": "Review deleted successfully"}

# Blog Management
@admin_router.get("/blog")
async def get_blog_posts(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    is_published: Optional[bool] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(BlogPost)

    if search:
        query = query.filter(BlogPost.title.ilike(f"%{search}%"))

    if is_published is not None:
        query = query.filter(BlogPost.is_published == is_published)

    posts = query.order_by(BlogPost.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for post in posts:
        post_dict = {
            "id": post.id,
            "title": post.title,
            "slug": post.slug,
            "excerpt": post.excerpt,
            "author": {
                "id": post.author.id,
                "full_name": post.author.full_name
            },
            "category": {
                "id": post.category.id if post.category else None,
                "name": post.category.name if post.category else None
            },
            "featured_image": post.featured_image,
            "is_published": post.is_published,
            "is_featured": post.is_featured,
            "view_count": post.view_count,
            "published_at": post.published_at,
            "created_at": post.created_at,
            "updated_at": post.updated_at
        }
        result.append(post_dict)

    return result

@admin_router.post("/blog")
async def create_blog_post(
    title: str,
    content: str,
    slug: str,
    excerpt: Optional[str] = None,
    category_id: Optional[int] = None,
    featured_image: Optional[str] = None,
    tags: Optional[List[str]] = None,
    is_published: bool = False,
    is_featured: bool = False,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    post = BlogPost(
        title=title,
        slug=slug,
        content=content,
        excerpt=excerpt,
        author_id=admin_user.id,
        category_id=category_id,
        featured_image=featured_image,
        tags=tags,
        is_published=is_published,
        is_featured=is_featured,
        published_at=datetime.utcnow() if is_published else None
    )

    db.add(post)
    db.commit()
    db.refresh(post)

    return {"message": "Blog post created successfully", "id": post.id}

@admin_router.put("/blog/{post_id}")
async def update_blog_post(
    post_id: int,
    title: Optional[str] = None,
    content: Optional[str] = None,
    slug: Optional[str] = None,
    excerpt: Optional[str] = None,
    category_id: Optional[int] = None,
    featured_image: Optional[str] = None,
    tags: Optional[List[str]] = None,
    is_published: Optional[bool] = None,
    is_featured: Optional[bool] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    post = db.query(BlogPost).filter(BlogPost.id == post_id).first()

    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")

    if title is not None:
        post.title = title
    if content is not None:
        post.content = content
    if slug is not None:
        post.slug = slug
    if excerpt is not None:
        post.excerpt = excerpt
    if category_id is not None:
        post.category_id = category_id
    if featured_image is not None:
        post.featured_image = featured_image
    if tags is not None:
        post.tags = tags
    if is_published is not None:
        post.is_published = is_published
        if is_published and not post.published_at:
            post.published_at = datetime.utcnow()
    if is_featured is not None:
        post.is_featured = is_featured

    db.commit()

    return {"message": "Blog post updated successfully"}

@admin_router.delete("/blog/{post_id}")
async def delete_blog_post(
    post_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    post = db.query(BlogPost).filter(BlogPost.id == post_id).first()

    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")

    db.delete(post)
    db.commit()

    return {"message": "Blog post deleted successfully"}

# Category Management
@admin_router.get("/categories")
async def get_categories(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    search: Optional[str] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Category)

    if search:
        query = query.filter(Category.name.ilike(f"%{search}%"))

    categories = query.order_by(Category.order_index, Category.name).offset(skip).limit(limit).all()

    result = []
    for cat in categories:
        cat_dict = {
            "id": cat.id,
            "name": cat.name,
            "slug": cat.slug,
            "description": cat.description,
            "icon": cat.icon,
            "parent_id": cat.parent_id,
            "order_index": cat.order_index,
            "is_active": cat.is_active,
            "created_at": cat.created_at,
            "updated_at": cat.updated_at,
            "subcategories_count": len(cat.subcategories) if cat.subcategories else 0,
            "blog_posts_count": len(cat.blog_posts) if cat.blog_posts else 0
        }
        result.append(cat_dict)

    return result

@admin_router.post("/categories")
async def create_category(
    name: str,
    slug: str,
    description: Optional[str] = None,
    icon: Optional[str] = None,
    parent_id: Optional[int] = None,
    order_index: int = 0,
    is_active: bool = True,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    category = Category(
        name=name,
        slug=slug,
        description=description,
        icon=icon,
        parent_id=parent_id,
        order_index=order_index,
        is_active=is_active
    )

    db.add(category)
    db.commit()
    db.refresh(category)

    return {"message": "Category created successfully", "id": category.id}

@admin_router.put("/categories/{category_id}")
async def update_category(
    category_id: int,
    name: Optional[str] = None,
    slug: Optional[str] = None,
    description: Optional[str] = None,
    icon: Optional[str] = None,
    parent_id: Optional[int] = None,
    order_index: Optional[int] = None,
    is_active: Optional[bool] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    category = db.query(Category).filter(Category.id == category_id).first()

    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    if name is not None:
        category.name = name
    if slug is not None:
        category.slug = slug
    if description is not None:
        category.description = description
    if icon is not None:
        category.icon = icon
    if parent_id is not None:
        category.parent_id = parent_id
    if order_index is not None:
        category.order_index = order_index
    if is_active is not None:
        category.is_active = is_active

    db.commit()

    return {"message": "Category updated successfully"}

@admin_router.delete("/categories/{category_id}")
async def delete_category(
    category_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    category = db.query(Category).filter(Category.id == category_id).first()

    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Check if category has subcategories or blog posts
    if category.subcategories and len(category.subcategories) > 0:
        raise HTTPException(status_code=400, detail="Cannot delete category with subcategories")

    if category.blog_posts and len(category.blog_posts) > 0:
        raise HTTPException(status_code=400, detail="Cannot delete category with blog posts")

    db.delete(category)
    db.commit()

    return {"message": "Category deleted successfully"}

# Media Management
@admin_router.get("/media")
async def get_media_files(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    file_type: Optional[str] = None,
    folder: Optional[str] = None,
    search: Optional[str] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(MediaFile)

    if file_type:
        query = query.filter(MediaFile.file_type == file_type)

    if folder:
        query = query.filter(MediaFile.folder == folder)

    if search:
        query = query.filter(MediaFile.original_filename.ilike(f"%{search}%"))

    files = query.order_by(MediaFile.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for file in files:
        file_dict = {
            "id": file.id,
            "filename": file.filename,
            "original_filename": file.original_filename,
            "file_url": file.file_url,
            "file_type": file.file_type,
            "mime_type": file.mime_type,
            "file_size": file.file_size,
            "width": file.width,
            "height": file.height,
            "duration": file.duration,
            "uploader": {
                "id": file.uploader.id,
                "full_name": file.uploader.full_name
            },
            "folder": file.folder,
            "alt_text": file.alt_text,
            "created_at": file.created_at
        }
        result.append(file_dict)

    return result

@admin_router.delete("/media/{file_id}")
async def delete_media_file(
    file_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    file = db.query(MediaFile).filter(MediaFile.id == file_id).first()

    if not file:
        raise HTTPException(status_code=404, detail="Media file not found")

    # TODO: Delete actual file from storage

    db.delete(file)
    db.commit()

    return {"message": "Media file deleted successfully"}