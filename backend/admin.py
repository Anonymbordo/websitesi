from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta

from database import get_db
from models import User, Instructor, Course, Enrollment, Payment, Review, AIInteraction, BlogPost
from auth import get_current_user

admin_router = APIRouter()

# Public blog router (no authentication required)
blog_public_router = APIRouter()

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

# Blog Post Management
class BlogPostCreate(BaseModel):
    title: str
    excerpt: str
    content: str
    featured_image: Optional[str] = None
    category: str
    tags: List[str] = []
    status: str = "draft"
    is_featured: bool = False
    scheduled_at: Optional[datetime] = None

class BlogPostUpdate(BaseModel):
    title: Optional[str] = None
    excerpt: Optional[str] = None
    content: Optional[str] = None
    featured_image: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None
    is_featured: Optional[bool] = None
    scheduled_at: Optional[datetime] = None

class BlogPostResponse(BaseModel):
    id: int
    title: str
    slug: str
    excerpt: str
    content: str
    featured_image: Optional[str]
    author: dict
    category: str
    tags: List[str]
    status: str
    is_featured: bool
    views: int
    created_at: datetime
    published_at: Optional[datetime]
    scheduled_at: Optional[datetime]

@admin_router.get("/blog", response_model=List[BlogPostResponse])
async def get_blog_posts(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(BlogPost)

    # Apply filters
    if search:
        query = query.filter(
            or_(
                BlogPost.title.ilike(f"%{search}%"),
                BlogPost.content.ilike(f"%{search}%")
            )
        )

    if category:
        query = query.filter(BlogPost.category == category)

    if status:
        query = query.filter(BlogPost.status == status)

    posts = query.order_by(BlogPost.created_at.desc()).offset(skip).limit(limit).all()

    # Format response
    result = []
    for post in posts:
        author_user = db.query(User).filter(User.id == post.author_id).first()

        post_data = BlogPostResponse(
            id=post.id,
            title=post.title,
            slug=post.slug,
            excerpt=post.excerpt,
            content=post.content,
            featured_image=post.featured_image,
            author={
                "id": author_user.id if author_user else None,
                "full_name": author_user.full_name if author_user else "Unknown",
                "avatar": author_user.profile_image if author_user else None
            },
            category=post.category,
            tags=post.tags if post.tags else [],
            status=post.status,
            is_featured=post.is_featured,
            views=post.views,
            created_at=post.created_at,
            published_at=post.published_at,
            scheduled_at=post.scheduled_at
        )
        result.append(post_data)

    return result

@admin_router.post("/blog")
async def create_blog_post(
    post_data: BlogPostCreate,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    # Generate slug from title
    import re
    slug = re.sub(r'[^\w\s-]', '', post_data.title.lower())
    slug = re.sub(r'[-\s]+', '-', slug)

    # Check if slug already exists
    existing_post = db.query(BlogPost).filter(BlogPost.slug == slug).first()
    if existing_post:
        # Add timestamp to make slug unique
        slug = f"{slug}-{int(datetime.utcnow().timestamp())}"

    # Set published_at if status is published
    published_at = None
    if post_data.status == "published":
        published_at = datetime.utcnow()

    new_post = BlogPost(
        title=post_data.title,
        slug=slug,
        excerpt=post_data.excerpt,
        content=post_data.content,
        featured_image=post_data.featured_image,
        author_id=admin_user.id,
        category=post_data.category,
        tags=post_data.tags,
        status=post_data.status,
        is_featured=post_data.is_featured,
        published_at=published_at,
        scheduled_at=post_data.scheduled_at
    )

    db.add(new_post)
    db.commit()
    db.refresh(new_post)

    return {"message": "Blog post created successfully", "id": new_post.id, "slug": new_post.slug}

@admin_router.get("/blog/{post_id}", response_model=BlogPostResponse)
async def get_blog_post(
    post_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    post = db.query(BlogPost).filter(BlogPost.id == post_id).first()

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blog post not found"
        )

    author_user = db.query(User).filter(User.id == post.author_id).first()

    return BlogPostResponse(
        id=post.id,
        title=post.title,
        slug=post.slug,
        excerpt=post.excerpt,
        content=post.content,
        featured_image=post.featured_image,
        author={
            "id": author_user.id if author_user else None,
            "full_name": author_user.full_name if author_user else "Unknown",
            "avatar": author_user.profile_image if author_user else None
        },
        category=post.category,
        tags=post.tags if post.tags else [],
        status=post.status,
        is_featured=post.is_featured,
        views=post.views,
        created_at=post.created_at,
        published_at=post.published_at,
        scheduled_at=post.scheduled_at
    )

@admin_router.put("/blog/{post_id}")
async def update_blog_post(
    post_id: int,
    post_data: BlogPostUpdate,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    post = db.query(BlogPost).filter(BlogPost.id == post_id).first()

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blog post not found"
        )

    # Update fields if provided
    if post_data.title is not None:
        post.title = post_data.title
        # Regenerate slug
        import re
        slug = re.sub(r'[^\w\s-]', '', post_data.title.lower())
        slug = re.sub(r'[-\s]+', '-', slug)

        # Check if slug already exists
        existing_post = db.query(BlogPost).filter(
            and_(BlogPost.slug == slug, BlogPost.id != post_id)
        ).first()
        if existing_post:
            slug = f"{slug}-{int(datetime.utcnow().timestamp())}"
        post.slug = slug

    if post_data.excerpt is not None:
        post.excerpt = post_data.excerpt

    if post_data.content is not None:
        post.content = post_data.content

    if post_data.featured_image is not None:
        post.featured_image = post_data.featured_image

    if post_data.category is not None:
        post.category = post_data.category

    if post_data.tags is not None:
        post.tags = post_data.tags

    if post_data.status is not None:
        # If changing to published, set published_at
        if post_data.status == "published" and post.status != "published":
            post.published_at = datetime.utcnow()
        post.status = post_data.status

    if post_data.is_featured is not None:
        post.is_featured = post_data.is_featured

    if post_data.scheduled_at is not None:
        post.scheduled_at = post_data.scheduled_at

    post.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(post)

    return {"message": "Blog post updated successfully", "slug": post.slug}

@admin_router.delete("/blog/{post_id}")
async def delete_blog_post(
    post_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    post = db.query(BlogPost).filter(BlogPost.id == post_id).first()

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blog post not found"
        )

    db.delete(post)
    db.commit()

    return {"message": "Blog post deleted successfully"}

@admin_router.put("/blog/{post_id}/publish")
async def publish_blog_post(
    post_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    post = db.query(BlogPost).filter(BlogPost.id == post_id).first()

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blog post not found"
        )

    post.status = "published"
    post.published_at = datetime.utcnow()
    db.commit()

    return {"message": "Blog post published successfully"}

@admin_router.put("/blog/{post_id}/unpublish")
async def unpublish_blog_post(
    post_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    post = db.query(BlogPost).filter(BlogPost.id == post_id).first()

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blog post not found"
        )

    post.status = "draft"
    db.commit()

    return {"message": "Blog post unpublished successfully"}

# Public Blog Endpoints (No authentication required)
@blog_public_router.get("/posts", response_model=List[BlogPostResponse])
async def get_public_blog_posts(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    featured: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get published blog posts for public viewing"""
    query = db.query(BlogPost).filter(BlogPost.status == "published")

    if category:
        query = query.filter(BlogPost.category == category)

    if featured is not None:
        query = query.filter(BlogPost.is_featured == featured)

    posts = query.order_by(BlogPost.published_at.desc()).offset(skip).limit(limit).all()

    # Format response
    result = []
    for post in posts:
        author_user = db.query(User).filter(User.id == post.author_id).first()

        post_data = BlogPostResponse(
            id=post.id,
            title=post.title,
            slug=post.slug,
            excerpt=post.excerpt,
            content=post.content,
            featured_image=post.featured_image,
            author={
                "id": author_user.id if author_user else None,
                "full_name": author_user.full_name if author_user else "Unknown",
                "avatar": author_user.profile_image if author_user else None
            },
            category=post.category,
            tags=post.tags if post.tags else [],
            status=post.status,
            is_featured=post.is_featured,
            views=post.views,
            created_at=post.created_at,
            published_at=post.published_at,
            scheduled_at=post.scheduled_at
        )
        result.append(post_data)

    return result

@blog_public_router.get("/posts/{slug}", response_model=BlogPostResponse)
async def get_public_blog_post(
    slug: str,
    db: Session = Depends(get_db)
):
    """Get a single published blog post by slug"""
    post = db.query(BlogPost).filter(
        and_(BlogPost.slug == slug, BlogPost.status == "published")
    ).first()

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blog post not found"
        )

    # Increment views
    post.views += 1
    db.commit()

    author_user = db.query(User).filter(User.id == post.author_id).first()

    return BlogPostResponse(
        id=post.id,
        title=post.title,
        slug=post.slug,
        excerpt=post.excerpt,
        content=post.content,
        featured_image=post.featured_image,
        author={
            "id": author_user.id if author_user else None,
            "full_name": author_user.full_name if author_user else "Unknown",
            "avatar": author_user.profile_image if author_user else None
        },
        category=post.category,
        tags=post.tags if post.tags else [],
        status=post.status,
        is_featured=post.is_featured,
        views=post.views,
        created_at=post.created_at,
        published_at=post.published_at,
        scheduled_at=post.scheduled_at
    )

@blog_public_router.get("/categories")
async def get_blog_categories(db: Session = Depends(get_db)):
    """Get all blog categories with post counts"""
    categories = db.query(
        BlogPost.category,
        func.count(BlogPost.id).label('count')
    ).filter(
        BlogPost.status == "published"
    ).group_by(BlogPost.category).all()

    return [
        {"category": cat.category, "count": cat.count}
        for cat in categories
    ]