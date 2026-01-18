# Minimal Vercel handler for FastAPI (no extra deps)
# Updated: Force redeploy for admin courses endpoint
import sys
import os
from pathlib import Path
import traceback

# Ensure backend is on PYTHONPATH
backend_path = str(Path(__file__).parent.parent / "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

os.environ["VERCEL"] = "1"

initialization_error = None

try:
    from main import app as fastapi_app
    print("✅ Backend initialized successfully")
except Exception as e:
    initialization_error = str(e)
    error_trace = traceback.format_exc()
    print(f"❌ Backend initialization error: {initialization_error}")
    print(f"Traceback: {error_trace}")
    
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse

    fastapi_app = FastAPI()

    @fastapi_app.get("/")
    @fastapi_app.get("/api/")
    @fastapi_app.get("/api/{path:path}")
    async def error_handler(path: str = ""):
        return JSONResponse(
            status_code=500,
            content={
                "error": "Backend failed to initialize",
                "detail": initialization_error,
                "traceback": error_trace,
                "backend_path": backend_path,
                "python_path": sys.path[:5],
            },
        )

# Vercel should detect `app` (ASGI callable).
# IMPORTANT: Do not export a `handler` variable here.
# The Vercel Python runtime treats `handler` as an http.server.BaseHTTPRequestHandler
# subclass; exporting a FastAPI app as `handler` causes `issubclass()` crashes.
app = fastapi_app

# Debug: Print available routes on startup
if initialization_error is None:
    print("Available routes:")
    for route in fastapi_app.routes:
        if hasattr(route, 'path'):
            print(f"  {route.path}")

