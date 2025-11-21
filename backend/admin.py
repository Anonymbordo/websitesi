from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta

from database import get_db
from models import User, Instructor, Course, Enrollment, Payment, Review, AIInteraction
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
    short_description: Optional[str] = None
    instructor_name: str
    instructor_id: int
    category: str
    level: str
    price: float
    discount_price: Optional[float] = None
    duration_hours: int
    enrollment_count: int = 0
    rating: float = 0.0
    total_ratings: int = 0
    is_published: bool
    is_featured: bool = False
    thumbnail: Optional[str] = None
    created_at: datetime
    total_revenue: float = 0.0
    total_students: int = 0

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
    try:
        # Basic counts
        total_users = db.query(User).count()
        total_instructors = db.query(Instructor).filter(Instructor.is_approved == True).count()
        total_courses = db.query(Course).count()
        total_enrollments = db.query(Enrollment).count()
        
        # Revenue calculation
        total_revenue = db.query(func.sum(Payment.amount)).filter(
            Payment.payment_status == "completed"
        ).scalar() or 0.0
        
        # Treat NULL is_approved as pending as well (some rows were created with NULL)
        pending_instructor_approvals = db.query(Instructor).filter(
            or_(Instructor.is_approved == False, Instructor.is_approved.is_(None))
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
    except Exception as e:
        print(f"Error fetching admin stats: {e}")
        # Return zeroed stats instead of 500
        return AdminStats(
            total_users=0,
            total_instructors=0,
            total_courses=0,
            total_enrollments=0,
            total_revenue=0.0,
            pending_instructor_approvals=0,
            active_courses=0,
            users_this_month=0,
            revenue_this_month=0.0
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
        # If caller requested is_approved == False, include NULL values as pending as well
        if is_approved is False:
            query = query.filter(or_(Instructor.is_approved == False, Instructor.is_approved.is_(None)))
        else:
            query = query.filter(Instructor.is_approved == True)
    
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

@admin_router.get("/instructors/{instructor_id}")
async def get_instructor_detail(
    instructor_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin için tek bir eğitmenin detaylarını getir (onay durumu fark etmez)"""
    instructor = db.query(Instructor).filter(Instructor.id == instructor_id).first()
    
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instructor not found"
        )
    
    # Kullanıcı bilgileri
    user_info = {
        "id": instructor.user.id,
        "full_name": instructor.user.full_name,
        "email": instructor.user.email,
        "phone": instructor.user.phone,
        "city": instructor.user.city,
        "district": instructor.user.district,
        "profile_image": instructor.user.profile_image,
        "created_at": instructor.user.created_at
    }
    
    # Kursları getir
    courses = db.query(Course).filter(Course.instructor_id == instructor_id).all()
    courses_info = [{
        "id": course.id,
        "title": course.title,
        "is_published": course.is_published,
        "price": course.price,
        "students_count": course.students_count
    } for course in courses]
    
    return {
        "id": instructor.id,
        "bio": instructor.bio,
        "specialization": instructor.specialization,
        "experience_years": instructor.experience_years,
        "certification": instructor.certification,
        "rating": instructor.rating,
        "total_ratings": instructor.total_ratings,
        "total_students": instructor.total_students,
        "is_approved": instructor.is_approved,
        "created_at": instructor.created_at,
        "user": user_info,
        "total_courses": len(courses_info),
        "courses": courses_info
    }

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
            short_description=course.short_description,
            instructor_name=course.instructor.user.full_name,
            instructor_id=course.instructor.id,
            category=course.category,
            level=course.level,
            price=course.price,
            discount_price=course.discount_price,
            duration_hours=course.duration_hours,
            enrollment_count=course.enrollment_count or 0,
            rating=course.rating or 0.0,
            total_ratings=course.total_ratings or 0,
            is_published=course.is_published,
            is_featured=course.is_featured or False,
            thumbnail=course.thumbnail,
            created_at=course.created_at,
            total_revenue=total_revenue,
            total_students=course.enrollment_count or 0
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

@admin_router.put("/courses/{course_id}/feature")
async def feature_course(
    course_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Kursu ana sayfada öne çıkar"""
    course = db.query(Course).filter(Course.id == course_id).first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    course.is_featured = True
    db.commit()
    
    return {"message": "Course featured successfully"}

@admin_router.put("/courses/{course_id}/unfeature")
async def unfeature_course(
    course_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Kursu ana sayfadan kaldır"""
    course = db.query(Course).filter(Course.id == course_id).first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    course.is_featured = False
    db.commit()
    
    return {"message": "Course unfeatured"}

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

# ==================== CATEGORY MANAGEMENT ====================

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    type: str = "course"  # course, blog, general
    color: str = "#3B82F6"
    parent_id: Optional[int] = None

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    color: Optional[str] = None
    parent_id: Optional[int] = None
    is_active: Optional[bool] = None

@admin_router.get("/categories")
async def get_all_categories(
    type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Tüm kategorileri getir"""
    from models import Category
    
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    
    query = db.query(Category)
    
    if type:
        query = query.filter(Category.type == type)
    
    categories = query.order_by(Category.created_at.desc()).all()
    
    result = []
    for cat in categories:
        # Count items in this category
        item_count = 0
        if cat.type == "course":
            item_count = db.query(Course).filter(Course.category == cat.name).count()
        
        result.append({
            "id": cat.id,
            "name": cat.name,
            "slug": cat.slug,
            "description": cat.description,
            "type": cat.type,
            "color": cat.color,
            "parent_id": cat.parent_id,
            "is_active": cat.is_active,
            "item_count": item_count,
            "created_at": cat.created_at,
            "updated_at": cat.updated_at
        })
    
    return result

@admin_router.post("/categories")
async def create_category(
    category_data: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Yeni kategori oluştur"""
    from models import Category
    
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    
    # Check if category with same name exists
    existing = db.query(Category).filter(Category.name == category_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category with this name already exists")
    
    # Generate slug
    slug = category_data.name.lower().replace(' ', '-')
    # Remove non-alphanumeric characters (except dashes)
    import re
    slug = re.sub(r'[^a-z0-9-]', '', slug)
    
    category = Category(
        name=category_data.name,
        slug=slug,
        description=category_data.description,
        type=category_data.type,
        color=category_data.color,
        parent_id=category_data.parent_id
    )
    
    db.add(category)
    db.commit()
    db.refresh(category)
    
    return {
        "id": category.id,
        "name": category.name,
        "slug": category.slug,
        "description": category.description,
        "type": category.type,
        "color": category.color,
        "parent_id": category.parent_id,
        "is_active": category.is_active,
        "created_at": category.created_at
    }

@admin_router.put("/categories/{category_id}")
async def update_category(
    category_id: int,
    category_data: CategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Kategoriyi güncelle"""
    from models import Category
    
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Update fields
    if category_data.name:
        category.name = category_data.name
        # Regenerate slug
        slug = category_data.name.lower().replace(' ', '-')
        import re
        category.slug = re.sub(r'[^a-z0-9-]', '', slug)
    
    if category_data.description is not None:
        category.description = category_data.description
    
    if category_data.type:
        category.type = category_data.type
    
    if category_data.color:
        category.color = category_data.color
    
    if category_data.parent_id is not None:
        category.parent_id = category_data.parent_id
    
    if category_data.is_active is not None:
        category.is_active = category_data.is_active
    
    category.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(category)
    
    return {
        "id": category.id,
        "name": category.name,
        "slug": category.slug,
        "description": category.description,
        "type": category.type,
        "color": category.color,
        "parent_id": category.parent_id,
        "is_active": category.is_active,
        "updated_at": category.updated_at
    }

@admin_router.delete("/categories/{category_id}")
async def delete_category(
    category_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Kategoriyi sil"""
    from models import Category
    
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Check if category is used
    if category.type == "course":
        course_count = db.query(Course).filter(Course.category == category.name).count()
        if course_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete category. {course_count} courses are using it."
            )
    
    db.delete(category)
    db.commit()
    
    return {"message": "Category deleted successfully"}