from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Float, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default="student")  # student, instructor, admin
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    city = Column(String, nullable=True)
    district = Column(String, nullable=True)
    profile_image = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    enrollments = relationship("Enrollment", back_populates="student")
    instructor_profile = relationship("Instructor", back_populates="user", uselist=False)
    reviews_given = relationship("Review", back_populates="reviewer", foreign_keys="Review.reviewer_id")
    payments = relationship("Payment", back_populates="user")

class Instructor(Base):
    __tablename__ = "instructors"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    bio = Column(Text, nullable=True)
    specialization = Column(String, nullable=True)
    experience_years = Column(Integer, default=0)
    rating = Column(Float, default=0.0)
    total_ratings = Column(Integer, default=0)
    total_students = Column(Integer, default=0)
    is_approved = Column(Boolean, default=False)
    certification = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="instructor_profile")
    courses = relationship("Course", back_populates="instructor")
    reviews_received = relationship("Review", back_populates="instructor", foreign_keys="Review.instructor_id")

class Course(Base):
    __tablename__ = "courses"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=False)
    short_description = Column(String, nullable=True)
    instructor_id = Column(Integer, ForeignKey("instructors.id"))
    price = Column(Float, nullable=False)
    discount_price = Column(Float, nullable=True)
    duration_hours = Column(Integer, nullable=False)
    level = Column(String, default="beginner")  # beginner, intermediate, advanced
    category = Column(String, nullable=False)
    subcategory = Column(String, nullable=True)
    language = Column(String, default="Turkish")
    thumbnail = Column(String, nullable=True)
    preview_video = Column(String, nullable=True)
    location = Column(String, nullable=True)  # For location-based courses
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    is_online = Column(Boolean, default=True)
    is_published = Column(Boolean, default=False)
    is_featured = Column(Boolean, default=False)  # Ana sayfada öne çıkan kurslar için
    enrollment_count = Column(Integer, default=0)
    rating = Column(Float, default=0.0)
    total_ratings = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    instructor = relationship("Instructor", back_populates="courses")
    lessons = relationship("Lesson", back_populates="course")
    enrollments = relationship("Enrollment", back_populates="course")
    reviews = relationship("Review", back_populates="course")
    materials = relationship("CourseMaterial", back_populates="course")

class Lesson(Base):
    __tablename__ = "lessons"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    video_url = Column(String, nullable=True)
    duration_minutes = Column(Integer, nullable=False)
    order_index = Column(Integer, nullable=False)
    is_preview = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    course = relationship("Course", back_populates="lessons")
    progress = relationship("LessonProgress", back_populates="lesson")

class CourseMaterial(Base):
    __tablename__ = "course_materials"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    title = Column(String, nullable=False)
    file_url = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # pdf, doc, video, etc.
    file_size = Column(Integer, nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    course = relationship("Course", back_populates="materials")

class Enrollment(Base):
    __tablename__ = "enrollments"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"))
    course_id = Column(Integer, ForeignKey("courses.id"))
    enrolled_at = Column(DateTime, default=datetime.utcnow)
    progress_percentage = Column(Float, default=0.0)
    completed_at = Column(DateTime, nullable=True)
    certificate_url = Column(String, nullable=True)
    
    # Relationships
    student = relationship("User", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")
    lesson_progress = relationship("LessonProgress", back_populates="enrollment")

class LessonProgress(Base):
    __tablename__ = "lesson_progress"
    
    id = Column(Integer, primary_key=True, index=True)
    enrollment_id = Column(Integer, ForeignKey("enrollments.id"))
    lesson_id = Column(Integer, ForeignKey("lessons.id"))
    is_completed = Column(Boolean, default=False)
    watch_time_seconds = Column(Integer, default=0)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    enrollment = relationship("Enrollment", back_populates="lesson_progress")
    lesson = relationship("Lesson", back_populates="progress")

class Review(Base):
    __tablename__ = "reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    reviewer_id = Column(Integer, ForeignKey("users.id"))
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    instructor_id = Column(Integer, ForeignKey("instructors.id"), nullable=True)
    rating = Column(Integer, nullable=False)  # 1-5 stars
    comment = Column(Text, nullable=True)
    is_approved = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    reviewer = relationship("User", back_populates="reviews_given", foreign_keys=[reviewer_id])
    course = relationship("Course", back_populates="reviews")
    instructor = relationship("Instructor", back_populates="reviews_received", foreign_keys=[instructor_id])

class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    course_id = Column(Integer, ForeignKey("courses.id"))
    amount = Column(Float, nullable=False)
    currency = Column(String, default="TRY")
    payment_method = Column(String, nullable=False)  # iyzico, card, etc.
    payment_status = Column(String, default="pending")  # pending, completed, failed, refunded
    transaction_id = Column(String, unique=True, nullable=True)
    payment_date = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="payments")

class AIInteraction(Base):
    __tablename__ = "ai_interactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    interaction_type = Column(String, nullable=False)  # chat, quiz, recommendation
    input_data = Column(JSON, nullable=False)
    output_data = Column(JSON, nullable=False)
    model_used = Column(String, nullable=False)  # openai, gemini
    created_at = Column(DateTime, default=datetime.utcnow)

class OTPVerification(Base):
    __tablename__ = "otp_verifications"
    
    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, nullable=False)
    otp_code = Column(String, nullable=False)
    is_verified = Column(Boolean, default=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class LiveSession(Base):
    __tablename__ = "live_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    instructor_id = Column(Integer, ForeignKey("instructors.id"))
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    scheduled_at = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    meeting_url = Column(String, nullable=True)
    status = Column(String, default="scheduled")  # scheduled, live, completed, cancelled
    max_participants = Column(Integer, default=50)
    created_at = Column(DateTime, default=datetime.utcnow)

class Page(Base):
    __tablename__ = "pages"
    
    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    blocks_json = Column(JSON, nullable=False)  # Visual editor blocks array
    status = Column(String, default="draft")  # draft, published
    show_in_header = Column(Boolean, default=False)  # Ana menüde göster
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True, index=True)
    slug = Column(String, nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    type = Column(String, default="course")  # course, blog, general
    color = Column(String, default="#3B82F6")
    parent_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)