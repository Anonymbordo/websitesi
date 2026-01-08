# Vercel Serverless Function Handler for FastAPI
import sys
import os
from pathlib import Path

# Add backend directory to Python path
backend_path = str(Path(__file__).parent.parent / 'backend')
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

# Set Vercel environment flag
os.environ['VERCEL'] = '1'

# Suppress warnings
import warnings
warnings.filterwarnings('ignore')

# Import and configure FastAPI app
try:
    from main import app
    from mangum import Mangum
    
    # Use Mangum adapter for AWS Lambda/Vercel compatibility
    handler = Mangum(app, lifespan="off")
    
except ImportError as e:
    # If Mangum is not available, try direct FastAPI export
    print(f"⚠️ Mangum not available, using direct FastAPI app: {e}")
    try:
        from main import app
        # Vercel can handle FastAPI directly in some cases
        handler = app
    except Exception as ex:
        print(f"❌ Failed to load FastAPI app: {ex}")
        # Create minimal error handler
        from fastapi import FastAPI
        from fastapi.responses import JSONResponse
        
        app = FastAPI()
        
        @app.get("/")
        @app.get("/api/")
        async def error_handler():
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Backend failed to initialize",
                    "detail": str(ex),
                    "backend_path": backend_path
                }
            )
        
        handler = app

except Exception as e:
    print(f"❌ Unexpected error: {e}")
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse
    
    app = FastAPI()
    
    @app.get("/")
    @app.get("/api/")
    async def error_handler():
        return JSONResponse(
            status_code=500,
            content={"error": "Backend initialization error", "detail": str(e)}
        )
    
    handler = app

