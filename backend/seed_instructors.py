import sys
import os
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import Base, User, Instructor
import bcrypt
from datetime import datetime

# Tabloları oluştur (Eğer yoksa)
Base.metadata.create_all(bind=engine)

def seed_instructors():
    print("🔄 Seeding instructors...")
    db = SessionLocal()
    try:
        instructors_data = [
            {
                "email": "ayse@example.com",
                "full_name": "Dr. Ayşe Kaya",
                "specialization": "Web Development & JavaScript",
                "bio": "Frontend ve backend teknolojilerde 8 yıllık deneyime sahip yazılım geliştirici. React, Node.js ve modern web teknolojileri konularında uzman.",
                "experience_years": 8,
                "rating": 4.9,
                "total_students": 1247,
                "total_ratings": 156,
                "status": "approved"
            },
            {
                "email": "mehmet@example.com",
                "full_name": "Prof. Dr. Mehmet Demir",
                "specialization": "Data Science & Machine Learning",
                "bio": "Yapay zeka ve makine öğrenmesi alanında 15 yıllık akademik ve endüstriyel deneyim. Python, TensorFlow ve veri analizi konularında uzman.",
                "experience_years": 15,
                "rating": 4.8,
                "total_students": 850,
                "total_ratings": 98,
                "status": "pending"
            },
            {
                "email": "fatma@example.com",
                "full_name": "Fatma Şahin",
                "specialization": "UI/UX Design & Graphic Design",
                "bio": "Kullanıcı deneyimi tasarımı ve görsel iletişim alanlarında 6 yıllık deneyim. Adobe Creative Suite ve Figma konularında uzman.",
                "experience_years": 6,
                "rating": 4.7,
                "total_students": 892,
                "total_ratings": 94,
                "status": "approved"
            },
            {
                "email": "ali@example.com",
                "full_name": "Ali Özkan",
                "specialization": "Mobile App Development",
                "bio": "React Native ve Flutter ile mobil uygulama geliştirme konusunda 4 yıllık deneyim.",
                "experience_years": 4,
                "rating": 4.5,
                "total_students": 450,
                "total_ratings": 42,
                "status": "rejected"
            },
             {
                "email": "zeynep@example.com",
                "full_name": "Zeynep Yılmaz",
                "specialization": "Digital Marketing",
                "bio": "SEO, SEM ve sosyal medya pazarlaması konularında uzman. 5 yıllık ajans deneyimi.",
                "experience_years": 5,
                "rating": 4.6,
                "total_students": 600,
                "total_ratings": 75,
                "status": "approved"
            },
            {
                "email": "caner@example.com",
                "full_name": "Caner Erkin",
                "specialization": "Cyber Security",
                "bio": "Ağ güvenliği ve sızma testleri konusunda sertifikalı uzman. CEH ve CISSP sertifikalarına sahip.",
                "experience_years": 7,
                "rating": 4.9,
                "total_students": 300,
                "total_ratings": 30,
                "status": "pending"
            }
        ]

        for data in instructors_data:
            # 1. Check if user exists
            user = db.query(User).filter(User.email == data["email"]).first()
            if not user:
                print(f"➕ Creating user: {data['full_name']}")
                hashed_password = bcrypt.hashpw("password123".encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
                user = User(
                    email=data["email"],
                    phone=f"+90555{str(hash(data['email']))[-7:]}", # Dummy unique phone
                    password_hash=hashed_password,
                    full_name=data["full_name"],
                    role="instructor",
                    is_active=True,
                    is_verified=True
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            
            # 2. Check if instructor profile exists
            instructor = db.query(Instructor).filter(Instructor.user_id == user.id).first()
            if not instructor:
                print(f"➕ Creating instructor profile: {data['full_name']}")
                instructor = Instructor(
                    user_id=user.id,
                    bio=data["bio"],
                    specialization=data["specialization"],
                    experience_years=data["experience_years"],
                    rating=data["rating"],
                    total_students=data["total_students"],
                    total_ratings=data["total_ratings"],
                    is_approved=(data["status"] == "approved")
                )
                db.add(instructor)
            else:
                print(f"🔄 Updating instructor profile: {data['full_name']}")
                instructor.bio = data["bio"]
                instructor.specialization = data["specialization"]
                instructor.experience_years = data["experience_years"]
                instructor.rating = data["rating"]
                instructor.total_students = data["total_students"]
                instructor.total_ratings = data["total_ratings"]
                instructor.is_approved = (data["status"] == "approved")
        
        db.commit()
        print("✅ Instructors seeded successfully.")
    except Exception as e:
        print(f"❌ Error seeding instructors: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_instructors()
