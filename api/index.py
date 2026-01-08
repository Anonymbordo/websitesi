# Minimal Vercel handler for FastAPI
import sys
import os
from pathlib import Path

# Ensure backend on path
backend_path = str(Path(__file__).parent.parent / "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

# Flag to detect Vercel
os.environ["VERCEL"] = "1"

# Import FastAPI app directly
try:
    from main import app as fastapi_app
except Exception as e:
    # Fallback tiny app to show error
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse

    fastapi_app = FastAPI()

    @fastapi_app.get("/")
    @fastapi_app.get("/api/")
    async def error_handler():
        return JSONResponse(
            status_code=500,
            content={
                "error": "Backend failed to initialize",
                "detail": str(e),
                "backend_path": backend_path,
            },
        )

# Vercel detects `app`
app = fastapi_app
# Also expose handler alias for compatibility
handler = fastapi_app

