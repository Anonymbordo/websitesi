from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

from database import get_db
from models import Payment, User, Course, Enrollment
from auth import get_current_user

payments_router = APIRouter()

# Pydantic models
class PaymentCreate(BaseModel):
    course_id: int
    payment_method: str = "iyzico"

class PaymentResponse(BaseModel):
    id: int
    amount: float
    currency: str
    payment_method: str
    payment_status: str
    transaction_id: Optional[str]
    payment_date: datetime
    course: dict

    class Config:
        from_attributes = True

# Mock Iyzico integration (replace with actual integration)
class MockIyzicoService:
    @staticmethod
    def create_payment(amount: float, currency: str, user_data: dict, course_data: dict):
        # Mock payment processing
        # In real implementation, integrate with Iyzico API
        return {
            "status": "success",
            "transaction_id": str(uuid.uuid4()),
            "payment_url": "https://sandbox-api.iyzipay.com/payment/form",
            "token": str(uuid.uuid4())
        }
    
    @staticmethod
    def verify_payment(transaction_id: str):
        # Mock payment verification
        # In real implementation, verify with Iyzico API
        return {
            "status": "success",
            "payment_status": "completed"
        }

iyzico_service = MockIyzicoService()

# Routes
@payments_router.post("/create-payment")
async def create_payment(
    payment_create: PaymentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get course
    course = db.query(Course).filter(
        Course.id == payment_create.course_id,
        Course.is_published == True
    ).first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Check if already enrolled
    existing_enrollment = db.query(Enrollment).filter(
        Enrollment.student_id == current_user.id,
        Enrollment.course_id == payment_create.course_id
    ).first()
    
    if existing_enrollment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already enrolled in this course"
        )
    
    # Check if payment already exists
    existing_payment = db.query(Payment).filter(
        Payment.user_id == current_user.id,
        Payment.course_id == payment_create.course_id,
        Payment.payment_status.in_(["pending", "completed"])
    ).first()
    
    if existing_payment:
        if existing_payment.payment_status == "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment already completed for this course"
            )
        else:
            # Return existing pending payment
            return {
                "payment_id": existing_payment.id,
                "status": "pending",
                "transaction_id": existing_payment.transaction_id
            }
    
    # Calculate amount (use discount price if available)
    amount = course.discount_price if course.discount_price else course.price
    
    # Create payment record
    payment = Payment(
        user_id=current_user.id,
        course_id=payment_create.course_id,
        amount=amount,
        payment_method=payment_create.payment_method,
        payment_status="pending"
    )
    
    db.add(payment)
    db.commit()
    db.refresh(payment)
    
    # Create payment with Iyzico (mock)
    user_data = {
        "id": current_user.id,
        "name": current_user.full_name,
        "email": current_user.email,
        "phone": current_user.phone,
        "city": current_user.city or "Istanbul",
        "district": current_user.district or "Kadikoy"
    }
    
    course_data = {
        "id": course.id,
        "title": course.title,
        "price": amount
    }
    
    iyzico_response = iyzico_service.create_payment(
        amount=amount,
        currency="TRY",
        user_data=user_data,
        course_data=course_data
    )
    
    if iyzico_response["status"] == "success":
        payment.transaction_id = iyzico_response["transaction_id"]
        db.commit()
        
        return {
            "payment_id": payment.id,
            "status": "success",
            "payment_url": iyzico_response["payment_url"],
            "token": iyzico_response["token"],
            "transaction_id": payment.transaction_id
        }
    else:
        payment.payment_status = "failed"
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Payment creation failed"
        )

@payments_router.post("/verify-payment/{payment_id}")
async def verify_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get payment
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.user_id == current_user.id
    ).first()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    if payment.payment_status == "completed":
        return {"status": "already_completed", "message": "Payment already verified"}
    
    if not payment.transaction_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No transaction ID found"
        )
    
    # Verify payment with Iyzico (mock)
    verification_response = iyzico_service.verify_payment(payment.transaction_id)
    
    if verification_response["status"] == "success" and verification_response["payment_status"] == "completed":
        # Update payment status
        payment.payment_status = "completed"
        
        # Create enrollment
        enrollment = Enrollment(
            student_id=current_user.id,
            course_id=payment.course_id
        )
        db.add(enrollment)
        
        # Update course enrollment count
        course = db.query(Course).filter(Course.id == payment.course_id).first()
        course.enrollment_count += 1
        
        # Update instructor total students
        course.instructor.total_students += 1
        
        db.commit()
        
        return {
            "status": "success",
            "message": "Payment verified and course enrollment completed",
            "enrollment_id": enrollment.id
        }
    else:
        payment.payment_status = "failed"
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment verification failed"
        )

@payments_router.get("/my-payments")
async def get_my_payments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    payments = db.query(Payment).filter(Payment.user_id == current_user.id).order_by(Payment.payment_date.desc()).all()
    
    result = []
    for payment in payments:
        course = db.query(Course).filter(Course.id == payment.course_id).first()
        
        course_info = {
            "id": course.id,
            "title": course.title,
            "thumbnail": course.thumbnail,
            "instructor_name": course.instructor.user.full_name
        }
        
        payment_dict = {
            **payment.__dict__,
            "course": course_info
        }
        result.append(PaymentResponse(**payment_dict))
    
    return result

@payments_router.get("/payment/{payment_id}")
async def get_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.user_id == current_user.id
    ).first()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    course = db.query(Course).filter(Course.id == payment.course_id).first()
    
    course_info = {
        "id": course.id,
        "title": course.title,
        "thumbnail": course.thumbnail,
        "instructor_name": course.instructor.user.full_name,
        "price": course.price,
        "discount_price": course.discount_price
    }
    
    payment_dict = {
        **payment.__dict__,
        "course": course_info
    }
    
    return PaymentResponse(**payment_dict)

# Webhook endpoint for Iyzico (for real integration)
@payments_router.post("/webhook/iyzico")
async def iyzico_webhook(
    # webhook_data: dict,  # Iyzico webhook payload
    db: Session = Depends(get_db)
):
    # Handle Iyzico webhook for payment status updates
    # This would be implemented with actual Iyzico webhook payload processing
    return {"status": "received"}