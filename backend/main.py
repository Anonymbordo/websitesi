from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
from decouple import config
import uvicorn
import os

from database import engine, get_db
from models import Base
from auth import auth_router
from courses import courses_router
from instructors import instructors_router
from payments import payments_router
from ai import ai_router
from admin import admin_router
from pages import pages_router
from media import media_router

# Create database tables with safe fallback
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
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

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting up application...")
    yield
    # Shutdown
    print("Shutting down application...")

app = FastAPI(
    title="Eğitim Platformu API",
    description="Modern eğitim platformu için comprehensive API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware - Production-ready
allowed_origins = config(
    "CORS_ORIGINS",
    default="http://localhost:3000,http://127.0.0.1:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Routes
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(courses_router, prefix="/api/courses", tags=["Courses"])
app.include_router(instructors_router, prefix="/api/instructors", tags=["Instructors"])
app.include_router(payments_router, prefix="/api/payments", tags=["Payments"])
app.include_router(ai_router, prefix="/api/ai", tags=["AI Services"])
app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])
app.include_router(pages_router, prefix="/api/pages", tags=["Pages"])
app.include_router(media_router, prefix="/api/media", tags=["Media"])

# Static files (uploads) - /uploads klasörünü serve et
if not os.path.exists("uploads"):
    os.makedirs("uploads")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
async def root():
    return {
        "message": "Eğitim Platformu API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8080,
        reload=True
    )