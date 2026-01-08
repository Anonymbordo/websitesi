# Vercel Serverless Function Handler
import sys
import os

# Add backend directory to path
backend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend')
sys.path.insert(0, backend_path)

# Import FastAPI app
from main import app

# Vercel will use this handler
handler = app
