#!/usr/bin/env python3
"""Script to approve an instructor by email"""
import sys
from database import SessionLocal
from models import User, Instructor

def approve_instructor(email: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"❌ User not found: {email}")
            return
        
        print(f"✓ User found: {user.email} (role: {user.role})")
        
        instructor = db.query(Instructor).filter(Instructor.user_id == user.id).first()
        
        if not instructor:
            print(f"❌ No instructor record found for {email}")
            print(f"Creating instructor record...")
            instructor = Instructor(
                user_id=user.id,
                bio="Onaylı Eğitmen",
                specialization="Genel",
                experience_years=1,
                rating=5.0,
                total_students=0,
                is_approved=True
            )
            db.add(instructor)
            db.commit()
            db.refresh(instructor)
            print(f"✅ Instructor record created and approved: {instructor.id}")
        else:
            if instructor.is_approved:
                print(f"✓ Instructor already approved")
            else:
                instructor.is_approved = True
                db.commit()
                print(f"✅ Instructor approved successfully")
        
        print(f"\nInstructor Details:")
        print(f"  ID: {instructor.id}")
        print(f"  User: {user.email}")
        print(f"  Approved: {instructor.is_approved}")
        print(f"  Specialization: {instructor.specialization}")
        
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python approve_instructor.py <email>")
        sys.exit(1)
    
    email = sys.argv[1]
    approve_instructor(email)
