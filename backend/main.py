from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
import uvicorn

from database import engine, get_db
from models import Base
from auth import auth_router
from courses import courses_router
from instructors import instructors_router
from payments import payments_router
from ai import ai_router
from admin import admin_router

# Create database tables
Base.metadata.create_all(bind=engine)

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

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Development için tüm origin'lere izin ver
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