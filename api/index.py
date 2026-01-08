# Vercel Serverless Function Handler
import sys
import os

# Add backend directory to path
backend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend')
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

# Set environment to production for Vercel
os.environ['VERCEL'] = '1'

# Suppress unnecessary warnings
import warnings
warnings.filterwarnings('ignore')

# Import FastAPI app
try:
    from main import app
    handler = app
except Exception as e:
    # If import fails, create a minimal FastAPI app that returns the error
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse
    
    handler = FastAPI()
    
    @handler.get("/")
    @handler.get("/api/")
    async def root():
        return JSONResponse(
            status_code=500,
            content={
                "error": "Backend initialization failed",
                "detail": str(e),
                "sys_path": sys.path,
                "backend_path": backend_path
            }
        )

