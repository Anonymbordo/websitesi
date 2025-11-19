from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from decouple import config
import os

# Database configuration
DATABASE_URL = config(
    "DATABASE_URL",
    default="sqlite:///./education_platform.db"
)

print(f"🗄️  Using database: {DATABASE_URL[:50]}...")

# Create engine
try:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
    )
    print("✅ Database engine created successfully")
except Exception as e:
    print(f"❌ Database error: {e}")
    print("💡 Falling back to SQLite...")
    DATABASE_URL = "sqlite:///./education_platform.db"
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
    print("✅ Using SQLite database")

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class
Base = declarative_base()

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()