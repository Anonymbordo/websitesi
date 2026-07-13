from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Float, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

# İndirim kodu modeli
class DiscountCode(Base):
    __tablename__ = "discount_codes"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False, index=True)
    percent = Column(Integer, nullable=False)  # İndirim oranı (örn: 20)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

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
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=True)
    bio = Column(Text, nullable=True)
    specialization = Column(String, nullable=True)
    title = Column(String, nullable=True)
    company = Column(String, nullable=True)
    location = Column(String, nullable=True)
    portfolio = Column(String, nullable=True)
    linkedin = Column(String, nullable=True)
    github = Column(String, nullable=True)
    website = Column(String, nullable=True)
    previous_teaching = Column(Text, nullable=True)
    course_topics = Column(Text, nullable=True)
    teaching_motivation = Column(Text, nullable=True)
    experience_years = Column(Integer, default=0)
    rating = Column(Float, default=0.0)
    total_ratings = Column(Integer, default=0)
    total_students = Column(Integer, default=0)
    is_approved = Column(Boolean, default=False)
    is_featured = Column(Boolean, default=False)  # Admin panelden öne çıkartma
    certification = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="instructor_profile")
    courses = relationship("Course", back_populates="instructor")
    reviews_received = relationship("Review", back_populates="instructor", foreign_keys="Review.instructor_id")
    institution = relationship("Institution", back_populates="instructors")

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
    what_you_will_learn = Column(JSON, nullable=True)  # List of strings
    requirements = Column(JSON, nullable=True)  # List of strings
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
    admin_notes = relationship("CourseAdminNote", back_populates="course")

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
    material_type = Column(String, nullable=False)  # video, document, pdf, etc.
    file_size = Column(Integer, nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    course = relationship("Course", back_populates="materials")

class CourseAdminNote(Base):
    __tablename__ = "course_admin_notes"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    admin_id = Column(Integer, ForeignKey("users.id"))
    note = Column(Text, nullable=False)
    note_type = Column(String, default="general")  # general, feedback, todo
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    course = relationship("Course", back_populates="admin_notes")
    admin = relationship("User", foreign_keys=[admin_id])

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
    payment_status = Column(String, default="pending")  # pending, completed, failed, refunded, voided
    transaction_id = Column(String, unique=True, nullable=True)
    payment_date = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="payments")
    operations = relationship("PaymentOperation", back_populates="payment", cascade="all, delete-orphan")


class PaymentOperation(Base):
    __tablename__ = "payment_operations"

    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=False, index=True)
    admin_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    operation_type = Column(String, nullable=False)  # refund, void
    amount = Column(Float, nullable=True)
    reason = Column(Text, nullable=True)
    operation_status = Column(String, default="pending")  # pending, success, failed
    provider_proc_return_code = Column(String, nullable=True)
    provider_txn_result = Column(String, nullable=True)
    provider_error_message = Column(Text, nullable=True)
    provider_trans_id = Column(String, nullable=True)
    provider_host_ref_num = Column(String, nullable=True)
    raw_response = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    payment = relationship("Payment", back_populates="operations")
    admin_user = relationship("User", foreign_keys=[admin_user_id])

class AIInteraction(Base):
    __tablename__ = "ai_interactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    interaction_type = Column(String, nullable=False)  # chat, quiz, recommendation
    input_data = Column(JSON, nullable=False)
    output_data = Column(JSON, nullable=False)
    model_used = Column(String, nullable=False)  # openai, gemini
    created_at = Column(DateTime, default=datetime.utcnow)


# Messaging (Admin <-> Instructor <-> Student)
class MessageThread(Base):
    __tablename__ = "message_threads"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_message_at = Column(DateTime, default=datetime.utcnow)

    participants = relationship("MessageParticipant", back_populates="thread", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="thread", cascade="all, delete-orphan")


class MessageParticipant(Base):
    __tablename__ = "message_participants"

    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(Integer, ForeignKey("message_threads.id"), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    joined_at = Column(DateTime, default=datetime.utcnow)

    thread = relationship("MessageThread", back_populates="participants")
    user = relationship("User")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(Integer, ForeignKey("message_threads.id"), index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), index=True)
    body = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    thread = relationship("MessageThread", back_populates="messages")
    sender = relationship("User")
    attachments = relationship("MessageAttachment", back_populates="message", cascade="all, delete-orphan")


class MessageAttachment(Base):
    __tablename__ = "message_attachments"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"), index=True)
    file_url = Column(String, nullable=False)
    file_name = Column(String, nullable=True)
    content_type = Column(String, nullable=True)
    file_size = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    message = relationship("Message", back_populates="attachments")

class OTPVerification(Base):
    __tablename__ = "otp_verifications"
    
    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
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


class BlogPost(Base):
    __tablename__ = "blog_posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    slug = Column(String, unique=True, index=True, nullable=False)
    excerpt = Column(Text, nullable=True)
    content = Column(Text, nullable=False)
    featured_image = Column(String, nullable=True)
    video_url = Column(String, nullable=True)
    video_title = Column(String, nullable=True)
    author_name = Column(String, nullable=True)
    author_avatar = Column(String, nullable=True)
    category = Column(String, nullable=False, default="Genel")
    tags_json = Column(JSON, nullable=False, default=list)
    status = Column(String, nullable=False, default="draft", index=True)  # draft, published, scheduled
    is_featured = Column(Boolean, default=False)
    views = Column(Integer, default=0)
    published_at = Column(DateTime, nullable=True)
    scheduled_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class MockExam(Base):
    __tablename__ = "mock_exams"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    exam_group = Column(String, nullable=False, default="lgs", index=True)
    section_type = Column(String, nullable=False)  # verbal, quantitative
    description = Column(Text, nullable=True)
    instructions = Column(Text, nullable=True)
    duration_minutes = Column(Integer, nullable=False, default=75)
    questions_json = Column(JSON, nullable=False)
    sort_order = Column(Integer, default=0)
    is_published = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    attempts = relationship("MockExamAttempt", back_populates="exam", cascade="all, delete-orphan")


class MockExamAttempt(Base):
    __tablename__ = "mock_exam_attempts"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("mock_exams.id"), nullable=False, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, nullable=False, index=True)
    phone = Column(String, nullable=False)
    answers_json = Column(JSON, nullable=False)
    review_json = Column(JSON, nullable=False)
    correct_count = Column(Integer, default=0)
    wrong_count = Column(Integer, default=0)
    blank_count = Column(Integer, default=0)
    total_questions = Column(Integer, default=0)
    submitted_at = Column(DateTime, default=datetime.utcnow, index=True)

    exam = relationship("MockExam", back_populates="attempts")

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

class CourseBox(Base):
    __tablename__ = "course_boxes"
    
    id = Column(Integer, primary_key=True, index=True)
    title_tr = Column(String, nullable=False)  # Türkçe başlık
    title_en = Column(String, nullable=True)   # İngilizce başlık
    title_ar = Column(String, nullable=True)   # Arapça başlık
    category = Column(String, nullable=False)  # İlişkili kategori (grade_1, grade_10, etc.)
    icon = Column(String, nullable=True)       # Icon adı (BookOpen, GraduationCap, etc.)
    color_from = Column(String, default="#3B82F6")  # Gradient başlangıç rengi
    color_to = Column(String, default="#8B5CF6")    # Gradient bitiş rengi
    order_index = Column(Integer, default=0)   # Sıralama
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    contents = relationship("CourseBoxContent", back_populates="course_box", cascade="all, delete-orphan")
    pricing = relationship("CourseBoxPricing", back_populates="course_box", uselist=False, cascade="all, delete-orphan")
    quizzes = relationship("CourseBoxQuiz", back_populates="course_box", cascade="all, delete-orphan")
    purchases = relationship("UserCourseBoxPurchase", back_populates="course_box", cascade="all, delete-orphan")

class CourseBoxContent(Base):
    __tablename__ = "course_box_contents"
    
    id = Column(Integer, primary_key=True, index=True)
    course_box_id = Column(Integer, ForeignKey("course_boxes.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    content_type = Column(String, nullable=False)  # video, pdf, quiz, slide
    file_url = Column(String, nullable=True)  # URL to uploaded file
    order_index = Column(Integer, default=0)
    is_free = Column(Boolean, default=False)  # Free preview content
    duration = Column(Integer, nullable=True)  # Duration in minutes (for videos)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    course_box = relationship("CourseBox", back_populates="contents")

class CourseBoxPricing(Base):
    __tablename__ = "course_box_pricing"
    
    id = Column(Integer, primary_key=True, index=True)
    course_box_id = Column(Integer, ForeignKey("course_boxes.id"), unique=True, nullable=False)
    price = Column(Float, nullable=False, default=0.0)
    discount_price = Column(Float, nullable=True)
    currency = Column(String, default="TRY")
    is_free = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    course_box = relationship("CourseBox", back_populates="pricing")

class CourseBoxQuiz(Base):
    __tablename__ = "course_box_quizzes"
    
    id = Column(Integer, primary_key=True, index=True)
    course_box_id = Column(Integer, ForeignKey("course_boxes.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    passing_score = Column(Integer, default=70)  # Passing score percentage
    time_limit = Column(Integer, nullable=True)  # Time limit in minutes
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    course_box = relationship("CourseBox", back_populates="quizzes")
    questions = relationship("QuizQuestion", back_populates="quiz", cascade="all, delete-orphan")

class QuizQuestion(Base):
    __tablename__ = "quiz_questions"
    
    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("course_box_quizzes.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    question_type = Column(String, default="multiple_choice")  # multiple_choice, true_false, short_answer
    options = Column(JSON, nullable=True)  # List of options for multiple choice
    correct_answer = Column(String, nullable=False)
    points = Column(Integer, default=1)
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    quiz = relationship("CourseBoxQuiz", back_populates="questions")

class UserCourseBoxPurchase(Base):
    __tablename__ = "user_course_box_purchases"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_box_id = Column(Integer, ForeignKey("course_boxes.id"), nullable=False)
    purchase_date = Column(DateTime, default=datetime.utcnow)
    amount_paid = Column(Float, nullable=False)
    payment_status = Column(String, default="pending")  # pending, completed, failed
    payment_method = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
    course_box = relationship("CourseBox", back_populates="purchases")

class LanguageCourse(Base):
    __tablename__ = "language_courses"
    
    id = Column(Integer, primary_key=True, index=True)
    language = Column(String, nullable=False)  # ingilizce, almanca, fransizca, ispanyolca
    level = Column(String, nullable=False)  # a1, a2, b1, b2, c1, c2
    title = Column(String, nullable=False)  # İngilizce A-1 (Başlangıç)
    description = Column(Text, nullable=True)
    price = Column(Float, default=299.0)
    currency = Column(String, default="TRY")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    topics = relationship("LanguageCourseTopic", back_populates="course", cascade="all, delete-orphan")
    notes = relationship("LanguageCourseNote", back_populates="course", cascade="all, delete-orphan")
    videos = relationship("LanguageCourseVideo", back_populates="course", cascade="all, delete-orphan")
    exams = relationship("LanguageCourseExam", back_populates="course", cascade="all, delete-orphan")
    instructors = relationship("LanguageCourseInstructor", back_populates="course", cascade="all, delete-orphan")
    purchases = relationship("LanguageCoursePurchase", back_populates="course", cascade="all, delete-orphan")
    live_requests = relationship("LiveClassRequest", back_populates="course", cascade="all, delete-orphan")

class LanguageCourseTopic(Base):
    __tablename__ = "language_course_topics"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("language_courses.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    content = Column(Text, nullable=True)  # Rich text content
    order_index = Column(Integer, default=0)
    duration_minutes = Column(Integer, nullable=True)
    is_free = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    course = relationship("LanguageCourse", back_populates="topics")

class LanguageCourseNote(Base):
    __tablename__ = "language_course_notes"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("language_courses.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    file_url = Column(String, nullable=True)  # PDF URL
    file_type = Column(String, default="pdf")
    file_size = Column(Integer, nullable=True)  # in bytes
    order_index = Column(Integer, default=0)
    is_downloadable = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    course = relationship("LanguageCourse", back_populates="notes")

class LanguageCourseVideo(Base):
    __tablename__ = "language_course_videos"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("language_courses.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    video_url = Column(String, nullable=False)
    thumbnail_url = Column(String, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    order_index = Column(Integer, default=0)
    is_free = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    course = relationship("LanguageCourse", back_populates="videos")

class LanguageCourseExam(Base):
    __tablename__ = "language_course_exams"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("language_courses.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    passing_score = Column(Integer, default=70)
    time_limit_minutes = Column(Integer, nullable=True)
    order_index = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    course = relationship("LanguageCourse", back_populates="exams")
    questions = relationship("LanguageExamQuestion", back_populates="exam", cascade="all, delete-orphan")

class LanguageExamQuestion(Base):
    __tablename__ = "language_exam_questions"
    
    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("language_course_exams.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    question_type = Column(String, default="multiple_choice")  # multiple_choice, true_false, fill_blank
    options = Column(JSON, nullable=True)  # ["Option A", "Option B", "Option C", "Option D"]
    correct_answer = Column(String, nullable=False)
    explanation = Column(Text, nullable=True)
    points = Column(Integer, default=1)
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    exam = relationship("LanguageCourseExam", back_populates="questions")

class LanguageCourseInstructor(Base):
    __tablename__ = "language_course_instructors"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("language_courses.id"), nullable=False)
    name = Column(String, nullable=False)
    title = Column(String, nullable=True)  # "Native Speaker", "Certified Teacher"
    bio = Column(Text, nullable=True)
    photo_url = Column(String, nullable=True)
    specialization = Column(String, nullable=True)
    experience_years = Column(Integer, nullable=True)
    rating = Column(Float, default=5.0)
    order_index = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    course = relationship("LanguageCourse", back_populates="instructors")

class LanguageCoursePurchase(Base):
    __tablename__ = "language_course_purchases"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("language_courses.id"), nullable=False)
    amount_paid = Column(Float, nullable=False)
    currency = Column(String, default="TRY")
    payment_status = Column(String, default="pending")  # pending, completed, failed, refunded
    payment_method = Column(String, nullable=True)
    transaction_id = Column(String, nullable=True)
    purchase_date = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)  # For subscription-based access
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
    course = relationship("LanguageCourse", back_populates="purchases")

class LiveClassRequest(Base):
    __tablename__ = "live_class_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("language_courses.id"), nullable=True)
    request_type = Column(String, nullable=False)  # individual, group
    preferred_date = Column(DateTime, nullable=True)
    preferred_time = Column(String, nullable=True)  # "14:00-16:00"
    message = Column(Text, nullable=True)
    status = Column(String, default="pending")  # pending, approved, rejected, scheduled, completed
    admin_notes = Column(Text, nullable=True)
    scheduled_at = Column(DateTime, nullable=True)
    meeting_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
    course = relationship("LanguageCourse", back_populates="live_requests")

# K-12 Education Content Management
class SchoolCourse(Base):
    __tablename__ = "school_courses"
    
    id = Column(Integer, primary_key=True, index=True)
    level = Column(String, nullable=False)  # ilkokul, ortaokul, lise
    grade = Column(Integer, nullable=False)  # 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
    subject = Column(String, nullable=False)  # turkce, matematik, fen-bilimleri, etc.
    title = Column(String, nullable=False)  # Display title
    description = Column(Text, nullable=True)
    thumbnail = Column(String, nullable=True)  # Course thumbnail image
    preview_video = Column(String, nullable=True)  # Preview video URL
    price = Column(Float, default=299.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    topics = relationship("SchoolCourseTopic", back_populates="course", cascade="all, delete-orphan")
    notes = relationship("SchoolCourseNote", back_populates="course", cascade="all, delete-orphan")
    videos = relationship("SchoolCourseVideo", back_populates="course", cascade="all, delete-orphan")
    exams = relationship("SchoolCourseExam", back_populates="course", cascade="all, delete-orphan")
    instructors = relationship("SchoolCourseInstructor", back_populates="course", cascade="all, delete-orphan")
    purchases = relationship("SchoolCoursePurchase", back_populates="course", cascade="all, delete-orphan")

class SchoolCourseTopic(Base):
    __tablename__ = "school_course_topics"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("school_courses.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    content = Column(Text, nullable=True)
    order_index = Column(Integer, default=0)
    duration_minutes = Column(Integer, nullable=True)
    is_free = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    course = relationship("SchoolCourse", back_populates="topics")

class SchoolCourseNote(Base):
    __tablename__ = "school_course_notes"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("school_courses.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    file_url = Column(String, nullable=True)
    file_type = Column(String, default="pdf")
    file_size = Column(Integer, nullable=True)
    order_index = Column(Integer, default=0)
    is_downloadable = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    course = relationship("SchoolCourse", back_populates="notes")

class SchoolCourseVideo(Base):
    __tablename__ = "school_course_videos"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("school_courses.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    video_url = Column(String, nullable=False)
    thumbnail_url = Column(String, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    order_index = Column(Integer, default=0)
    is_free = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    course = relationship("SchoolCourse", back_populates="videos")

class SchoolCourseExam(Base):
    __tablename__ = "school_course_exams"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("school_courses.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    passing_score = Column(Integer, default=70)
    time_limit_minutes = Column(Integer, nullable=True)
    order_index = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    course = relationship("SchoolCourse", back_populates="exams")
    questions = relationship("SchoolExamQuestion", back_populates="exam", cascade="all, delete-orphan")

class SchoolExamQuestion(Base):
    __tablename__ = "school_exam_questions"
    
    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("school_course_exams.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    question_type = Column(String, default="multiple_choice")
    options = Column(JSON, nullable=True)
    correct_answer = Column(String, nullable=False)
    explanation = Column(Text, nullable=True)
    points = Column(Integer, default=1)
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    exam = relationship("SchoolCourseExam", back_populates="questions")

class SchoolCourseInstructor(Base):
    __tablename__ = "school_course_instructors"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("school_courses.id"), nullable=False)
    name = Column(String, nullable=False)
    title = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    photo_url = Column(String, nullable=True)
    specialization = Column(String, nullable=True)
    experience_years = Column(Integer, nullable=True)
    rating = Column(Float, default=5.0)
    order_index = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    course = relationship("SchoolCourse", back_populates="instructors")

class SchoolCoursePurchase(Base):
    __tablename__ = "school_course_purchases"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("school_courses.id"), nullable=False)
    amount_paid = Column(Float, nullable=False)
    payment_status = Column(String, default="pending")
    payment_method = Column(String, nullable=True)
    transaction_id = Column(String, nullable=True)
    purchase_date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User")
    course = relationship("SchoolCourse", back_populates="purchases")

# Educational Institutions (Anlaşmalı Eğitim Kurumları)
class Institution(Base):
    __tablename__ = "institutions"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=False)
    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    logo = Column(String, nullable=True)
    cover_image = Column(String, nullable=True)
    intro_video = Column(String, nullable=True)
    brochure_pdf = Column(String, nullable=True)
    
    # Contact & Location
    city = Column(String, nullable=False, index=True)
    district = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    website = Column(String, nullable=True)
    
    # Stats
    rating = Column(Float, default=0.0)
    total_ratings = Column(Integer, default=0)
    total_students = Column(Integer, default=0)
    total_courses = Column(Integer, default=0)
    
    # Visual
    image_color = Column(String, default="from-blue-500 to-purple-600")  # Tailwind gradient classes
    
    # Status
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    courses = relationship("InstitutionCourse", back_populates="institution")
    instructors = relationship("Instructor", back_populates="institution")

class InstitutionCourse(Base):
    __tablename__ = "institution_courses"
    
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, default=0)
    discount_price = Column(Float, nullable=True)
    duration = Column(String, nullable=True)
    level = Column(String, nullable=True)
    thumbnail = Column(String, nullable=True)
    order_index = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    institution = relationship("Institution", back_populates="courses")


class InstitutionInstructorRequest(Base):
    __tablename__ = "institution_instructor_requests"

    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False)
    instructor_id = Column(Integer, ForeignKey("instructors.id"), nullable=False)
    status = Column(String, default="pending")  # pending, approved, rejected, cancelled
    created_at = Column(DateTime, default=datetime.utcnow)
    decided_at = Column(DateTime, nullable=True)
    decided_by_admin_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    institution = relationship("Institution")
    instructor = relationship("Instructor")
    decided_by = relationship("User")


class StudentApplication(Base):
    __tablename__ = "student_applications"

    id = Column(Integer, primary_key=True, index=True)
    student_full_name = Column(String, nullable=False, index=True)
    parent_full_name = Column(String, nullable=False)
    phone = Column(String, nullable=False, index=True)
    is_checked = Column(Boolean, default=False)
    checked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
