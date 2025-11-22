import sys
import os

# Add current directory to sys.path to fix Vercel import errors
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
from decouple import config
import uvicorn
import os
import traceback

from database import engine, get_db
from models import Base
from firebase_config import init_firebase

# Defensive imports to prevent startup crash
try:
    from auth import auth_router
except Exception as e:
    print(f"❌ Error importing auth_router: {e}")
    auth_router = None

try:
    from courses import courses_router
except Exception as e:
    print(f"❌ Error importing courses_router: {e}")
    courses_router = None

try:
    from instructors import instructors_router
except Exception as e:
    print(f"❌ Error importing instructors_router: {e}")
    instructors_router = None

try:
    from payments import payments_router
except Exception as e:
    print(f"❌ Error importing payments_router: {e}")
    payments_router = None

try:
    from ai import ai_router
except Exception as e:
    print(f"❌ Error importing ai_router: {e}")
    ai_router = None

try:
    from admin import admin_router
except Exception as e:
    print(f"❌ Error importing admin_router: {e}")
    admin_router = None

try:
    from pages import pages_router
except Exception as e:
    print(f"❌ Error importing pages_router: {e}")
    pages_router = None

try:
    from media import media_router
except Exception as e:
    print(f"❌ Error importing media_router: {e}")
    media_router = None

try:
    from course_boxes import course_boxes_router
except Exception as e:
    print(f"❌ Error importing course_boxes_router: {e}")
    course_boxes_router = None

# Create database tables with safe fallback
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    db_startup_error = str(e)
    print(f"❌ Failed to initialize DB on primary engine: {e}")
    # Attempt fallback to SQLite to keep the app responsive
    try:
        from database import switch_to_sqlite, engine as _engine_fallback
        switch_to_sqlite()
        Base.metadata.create_all(bind=_engine_fallback)
        print("✅ DB initialized on SQLite fallback")
    except Exception as ie:
        print(f"❌ Fallback DB initialization failed: {ie}")
        raise

# Global variable to store startup error
db_startup_error = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting up application...")
    # Log loaded keys (masked)
    groq_key = os.getenv("GROQ_API_KEY")
    print(f"GROQ_API_KEY loaded: {'Yes' if groq_key else 'No'}")

    # Initialize Firebase
    init_firebase()

    # Seed Admin User (Critical for Vercel ephemeral DB)
    try:
        from database import SessionLocal
        from models import User
        import bcrypt
        
        db = SessionLocal()
        admin_email = "ddemurathan12@gmail.com"
        existing_admin = db.query(User).filter(User.email == admin_email).first()
        
        if not existing_admin:
            print(f"⚠️ Admin user {admin_email} not found. Creating default admin...")
            hashed_password = bcrypt.hashpw("admin123".encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            new_admin = User(
                email=admin_email,
                phone="+905555555555", # Dummy phone
                password_hash=hashed_password,
                full_name="System Admin",
                role="admin",
                is_active=True,
                is_verified=True
            )
            db.add(new_admin)
            db.commit()
            print("✅ Default admin created successfully.")
        else:
            print("✅ Admin user already exists.")
        db.close()
    except Exception as e:
        print(f"❌ Failed to seed admin user: {e}")
        traceback.print_exc()

    # Auto-migrate schema (Fix for missing columns)
    try:
        from sqlalchemy import text
        from database import engine
        
        print("🔄 Checking database schema...")
        with engine.connect() as connection:
            # Start a new transaction
            trans = connection.begin()
            try:
                # Check if columns exist
                result = connection.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='courses' AND column_name IN ('what_you_will_learn', 'requirements')"))
                existing_columns = [row[0] for row in result]
                
                needs_migration = False
                
                if 'what_you_will_learn' not in existing_columns:
                    print("⚠️ Column 'what_you_will_learn' missing. Adding...")
                    connection.execute(text("ALTER TABLE courses ADD COLUMN what_you_will_learn JSONB"))
                    print("✅ Added 'what_you_will_learn' column.")
                    needs_migration = True
                
                if 'requirements' not in existing_columns:
                    print("⚠️ Column 'requirements' missing. Adding...")
                    connection.execute(text("ALTER TABLE courses ADD COLUMN requirements JSONB"))
                    print("✅ Added 'requirements' column.")
                    needs_migration = True
                
                if needs_migration:
                    trans.commit()
                    print("✅ Auto-migration complete.")
                else:
                    trans.rollback()
                    print("✅ Schema is up to date.")
                    
            except Exception as e:
                trans.rollback()
                print(f"❌ Auto-migration failed: {e}")
                traceback.print_exc()
    except Exception as e:
        print(f"❌ Schema check failed: {e}")
        traceback.print_exc()

    yield
    # Shutdown
    print("Shutting down application...")

app = FastAPI(
    title="Eğitim Platformu API",
    description="Modern eğitim platformu için comprehensive API",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False
)

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"Global Exception: {exc}")
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"},
    )

# CORS middleware - Production-ready
allowed_origins = config(
    "CORS_ORIGINS",
    default="http://localhost:3000,http://127.0.0.1:3000,https://mikrokurs.com,https://www.mikrokurs.com"
).split(",")

# Vercel preview deployments için wildcard pattern
# Add Vercel preview domains dynamically if needed, or just allow all for now in this context if safe
# For strict security, keep it limited. But for Vercel previews, we might need *.vercel.app
allowed_origins.extend([origin for origin in allowed_origins if origin]) # Clean empty strings

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for Vercel to avoid CORS headaches with dynamic preview URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Security
security = HTTPBearer()

# Routes
if auth_router:
    app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
if courses_router:
    app.include_router(courses_router, prefix="/api/courses", tags=["Courses"])
if instructors_router:
    app.include_router(instructors_router, prefix="/api/instructors", tags=["Instructors"])
if payments_router:
    app.include_router(payments_router, prefix="/api/payments", tags=["Payments"])
if ai_router:
    app.include_router(ai_router, prefix="/api/ai", tags=["AI Services"])
if admin_router:
    app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])
if pages_router:
    app.include_router(pages_router, prefix="/api/pages", tags=["Pages"])
if media_router:
    app.include_router(media_router, prefix="/api/media", tags=["Media"])
if course_boxes_router:
    app.include_router(course_boxes_router, prefix="/api/course-boxes", tags=["Course Boxes"])

# Static files (uploads) - /uploads klasörünü serve et
import shutil

upload_dir = "uploads"
# Vercel environment check
if os.environ.get("VERCEL"):
    upload_dir = "/tmp/uploads"
    # If we are on Vercel, try to copy existing repo uploads to /tmp so they are visible
    repo_uploads = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
    if os.path.exists(repo_uploads) and not os.path.exists(upload_dir):
        try:
            shutil.copytree(repo_uploads, upload_dir)
            print(f"✅ Copied repo uploads to {upload_dir}")
        except Exception as e:
            print(f"⚠️ Failed to copy repo uploads: {e}")

if not os.path.exists(upload_dir):
    try:
        os.makedirs(upload_dir)
    except Exception as e:
        print(f"⚠️ Could not create upload dir: {e}")

if os.path.exists(upload_dir):
    app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")

@app.get("/")
async def root():
    return {
        "message": "Eğitim Platformu API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    from database import DATABASE_URL
    db_type = "sqlite" if "sqlite" in str(DATABASE_URL) else "postgres"
    return {"status": "healthy", "db_type": db_type}

@app.get("/api/debug/fix-admin")
async def debug_fix_admin():
    """
    Manually trigger admin user creation and table check.
    Useful for Vercel deployments where startup scripts might fail silently.
    """
    report = {"steps": [], "success": False}
    
    try:
        # 1. Check Tables
        from sqlalchemy import inspect
        from database import engine, SessionLocal
        from models import User
        import bcrypt
        
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        report["steps"].append(f"Existing tables: {tables}")
        
        if "users" not in tables:
            report["steps"].append("❌ 'users' table missing. Attempting to create all tables...")
            try:
                Base.metadata.create_all(bind=engine)
                report["steps"].append("✅ Tables created.")
            except Exception as e:
                report["steps"].append(f"❌ Failed to create tables: {str(e)}")
                return report
        else:
            report["steps"].append("✅ 'users' table exists.")

        # 2. Check Admin User
        db = SessionLocal()
        try:
            admin_email = "ddemurathan12@gmail.com"
            user = db.query(User).filter(User.email == admin_email).first()
            
            if user:
                report["steps"].append(f"✅ Admin user found: {user.email} (ID: {user.id})")
                # Verify password
                if bcrypt.checkpw("admin123".encode("utf-8"), user.password_hash.encode("utf-8")):
                     report["steps"].append("✅ Password verification successful.")
                else:
                     report["steps"].append("❌ Password verification FAILED. Resetting...")
                     hashed = bcrypt.hashpw("admin123".encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
                     user.password_hash = hashed
                     db.commit()
                     report["steps"].append("✅ Password reset to 'admin123'")
            else:
                report["steps"].append(f"❌ Admin user {admin_email} NOT found. Creating...")
                hashed_password = bcrypt.hashpw("admin123".encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
                new_admin = User(
                    email=admin_email,
                    phone="+905555555555",
                    password_hash=hashed_password,
                    full_name="System Admin",
                    role="admin",
                    is_active=True,
                    is_verified=True
                )
                db.add(new_admin)
                db.commit()
                report["steps"].append("✅ Admin user created successfully.")
            
            report["success"] = True
            
        except Exception as e:
            report["steps"].append(f"❌ Error checking/creating admin: {str(e)}")
            import traceback
            report["traceback"] = traceback.format_exc()
        finally:
            db.close()
            
    except Exception as e:
        report["steps"].append(f"❌ Critical error: {str(e)}")
        import traceback
        report["traceback"] = traceback.format_exc()
        
    return report

@app.get("/api/debug/login-test")
async def debug_login_test(email: str = "ddemurathan12@gmail.com", password: str = "admin123"):
    """
    Test login flow components individually to diagnose 500 errors.
    """
    report = {"steps": [], "success": False}
    
    try:
        # 1. Database Connection
        from database import SessionLocal
        from models import User
        import bcrypt
        from jose import jwt
        from datetime import datetime, timedelta
        
        db = SessionLocal()
        report["steps"].append("✅ Database session created")
        
        # 2. Find User
        try:
            user = db.query(User).filter(User.email == email).first()
            if not user:
                report["steps"].append(f"❌ User not found: {email}")
                return report
            report["steps"].append(f"✅ User found: {user.id}, Role: {user.role}")
        except Exception as e:
            report["steps"].append(f"❌ Database query failed: {e}")
            return report

        # 3. Verify Password
        try:
            # Check if hash looks like bcrypt
            if not user.password_hash.startswith("$2b$") and not user.password_hash.startswith("$2a$"):
                 report["steps"].append(f"⚠️ Warning: Password hash format looks unusual: {user.password_hash[:10]}...")
            
            is_valid = bcrypt.checkpw(password.encode("utf-8"), user.password_hash.encode("utf-8"))
            if is_valid:
                report["steps"].append("✅ Password verification successful (bcrypt)")
            else:
                report["steps"].append("❌ Password verification returned False")
        except Exception as e:
            report["steps"].append(f"❌ Password verification CRASHED: {e}")
            import traceback
            report["traceback_bcrypt"] = traceback.format_exc()

        # 4. JWT Generation
        try:
            SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
            ALGORITHM = "HS256"
            access_token_expires = timedelta(minutes=30)
            expire = datetime.utcnow() + access_token_expires
            to_encode = {"sub": str(user.id), "exp": expire}
            token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
            report["steps"].append(f"✅ JWT Token generated successfully: {token[:10]}...")
        except Exception as e:
            report["steps"].append(f"❌ JWT Generation CRASHED: {e}")
            import traceback
            report["traceback_jwt"] = traceback.format_exc()

        report["success"] = True

    except Exception as e:
        report["steps"].append(f"❌ Top level error: {e}")
        import traceback
        report["traceback"] = traceback.format_exc()
    finally:
        if 'db' in locals():
            db.close()
            
    return report

@app.get("/api/debug/db-check")
async def debug_db_check():
    from database import DATABASE_URL
    import os
    
    # Mask URL
    url_str = str(DATABASE_URL)
    masked_url = url_str
    if "://" in url_str:
        try:
            prefix = url_str.split("://")[0]
            masked_url = f"{prefix}://*****"
        except:
            masked_url = "Invalid URL format"
        
    return {
        "database_url_masked": masked_url,
        "is_sqlite": "sqlite" in url_str,
        "startup_error": db_startup_error,
        "env_vars": {
            "POSTGRES_URL": "Present" if os.getenv("POSTGRES_URL") else "Missing",
            "POSTGRES_URL_NON_POOLING": "Present" if os.getenv("POSTGRES_URL_NON_POOLING") else "Missing",
            "POSTGRES_PRISMA_URL": "Present" if os.getenv("POSTGRES_PRISMA_URL") else "Missing",
            "DATABASE_URL": "Present" if os.getenv("DATABASE_URL") else "Missing",
        }
    }

@app.get("/api/debug/fix-course-schema")
async def debug_fix_course_schema():
    """
    Manually add missing columns to courses table.
    """
    from sqlalchemy import text
    from database import engine
    
    report = {"steps": [], "success": False}
    
    try:
        with engine.connect() as connection:
            # Check if columns exist first (to be safe across DB types)
            # This is a bit hacky but works for Postgres/SQLite usually
            try:
                # Try to select the columns
                connection.execute(text("SELECT what_you_will_learn, requirements FROM courses LIMIT 1"))
                report["steps"].append("✅ Columns already exist.")
                report["success"] = True
                return report
            except Exception:
                report["steps"].append("⚠️ Columns missing. Attempting to add...")
            
            # Add columns
            # Note: SQLite doesn't support IF NOT EXISTS in ADD COLUMN in all versions, 
            # and doesn't support adding multiple columns in one statement in some versions.
            # So we do them one by one.
            
            try:
                # Postgres syntax (and some SQLite)
                connection.execute(text("ALTER TABLE courses ADD COLUMN what_you_will_learn JSON"))
                report["steps"].append("✅ Added 'what_you_will_learn' column.")
            except Exception as e:
                if "duplicate column" in str(e) or "already exists" in str(e):
                     report["steps"].append("ℹ️ 'what_you_will_learn' already exists.")
                else:
                     report["steps"].append(f"❌ Failed to add 'what_you_will_learn': {e}")

            try:
                connection.execute(text("ALTER TABLE courses ADD COLUMN requirements JSON"))
                report["steps"].append("✅ Added 'requirements' column.")
            except Exception as e:
                if "duplicate column" in str(e) or "already exists" in str(e):
                     report["steps"].append("ℹ️ 'requirements' already exists.")
                else:
                     report["steps"].append(f"❌ Failed to add 'requirements': {e}")
            
            connection.commit()
            report["success"] = True
            
    except Exception as e:
        report["steps"].append(f"❌ Critical error: {str(e)}")
        import traceback
        report["traceback"] = traceback.format_exc()
        
    return report

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8001,
        reload=True
    )