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

try:
    from course_box_content import router as course_box_content_router
except Exception as e:
    print(f"❌ Error importing course_box_content_router: {e}")
    course_box_content_router = None

try:
    from course_box_pricing import router as course_box_pricing_router
except Exception as e:
    print(f"❌ Error importing course_box_pricing_router: {e}")
    course_box_pricing_router = None

try:
    from course_box_quiz import router as course_box_quiz_router
except Exception as e:
    print(f"❌ Error importing course_box_quiz_router: {e}")
    course_box_quiz_router = None
