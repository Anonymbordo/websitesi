from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from decouple import config
import os

# Database configuration
# Check for Vercel Postgres, Storage URL (Prisma), or standard DATABASE_URL
# Prefer NON_POOLING url for serverless environments to avoid connection issues
DATABASE_URL = config("POSTGRES_URL_NON_POOLING", default=config("POSTGRES_URL", default=config("POSTGRES_PRISMA_URL", default=config("STORAGE_URL", default=config("DATABASE_URL", default=None)))))

if DATABASE_URL:
    # Fix for SQLAlchemy + Vercel Postgres (Neon)
    # Vercel provides 'postgres://', SQLAlchemy needs 'postgresql+pg8000://' for the pure python driver
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+pg8000://", 1)
    elif DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+pg8000://", 1)
    
    # Remove sslmode from URL if present - pg8000 doesn't support it in URL
    if "sslmode=" in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.split("?sslmode=")[0].split("&sslmode=")[0]

    print("🗄️  Using PostgreSQL database (Remote)")
else:
    # Fallback to SQLite
    if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        DATABASE_URL = "sqlite:////tmp/education_platform.db"
        print("⚠️  Using ephemeral SQLite in /tmp (Data will be lost on restart)")
    else:
        DATABASE_URL = "sqlite:///./education_platform.db"
        print("🗄️  Using local SQLite database")

print(f"Connection String: {DATABASE_URL[:25]}...")

# Create engine
try:
    connect_args = {}
    if "sqlite" in DATABASE_URL:
        connect_args = {"check_same_thread": False}
    elif "pg8000" in DATABASE_URL:
        # pg8000 handles SSL automatically for Neon/Vercel Postgres
        # Don't pass ssl_context or sslmode - it causes errors
        connect_args = {}

    engine = create_engine(
        DATABASE_URL,
        connect_args=connect_args,
        pool_pre_ping=True, # Auto-reconnect
        pool_recycle=300    # Recycle connections every 5 mins
    )
    print("✅ Database engine created successfully")
except Exception as e:
    print(f"❌ Database error: {e}")
    print("💡 Falling back to SQLite in /tmp...")
    DATABASE_URL = "sqlite:////tmp/education_platform.db"
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
    print("✅ Using SQLite database (fallback)")

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class
Base = declarative_base()

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        # Test connection on first use if needed, or just yield
        # If connection fails here, it will raise an exception
        yield db
    except Exception as e:
        print(f"❌ Database session error: {e}")
        db.rollback()
        # If it's a connection error, maybe we should switch to sqlite?
        # But switching inside a request is tricky.
        # For now, just log it.
        raise
    finally:
        db.close()


def switch_to_sqlite():
    """Switch global engine/session to SQLite if primary DB is unreachable."""
    global DATABASE_URL, engine, SessionLocal
    print("⚠️  Switching database to SQLite fallback")
    # Use /tmp if in Vercel
    if os.environ.get("VERCEL"):
        DATABASE_URL = "sqlite:////tmp/education_platform.db"
    else:
        DATABASE_URL = "sqlite:///./education_platform.db"
        
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
    # Rebind session to new engine
    SessionLocal.configure(bind=engine)
    print("✅ SQLite fallback is active")