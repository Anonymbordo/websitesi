import os
import sys
import traceback
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
PAYMENT_SERVICE_DIR = ROOT_DIR / "payment_service"

for candidate in (BACKEND_DIR, PAYMENT_SERVICE_DIR):
    candidate_str = str(candidate)
    if candidate_str not in sys.path:
        sys.path.insert(0, candidate_str)

os.environ["VERCEL"] = "1"

initialization_error = None

try:
    from payment_service.main import app as fastapi_app
    print("✅ Payment service initialized successfully")
except Exception as exc:
    initialization_error = str(exc)
    error_trace = traceback.format_exc()
    print(f"❌ Payment service initialization error: {initialization_error}")
    print(f"Traceback: {error_trace}")

    from fastapi import FastAPI
    from fastapi.responses import JSONResponse

    fastapi_app = FastAPI()

    @fastapi_app.get("/")
    @fastapi_app.get("/{path:path}")
    async def error_handler(path: str = ""):
        return JSONResponse(
            status_code=500,
            content={
                "error": "Payment service failed to initialize",
                "detail": initialization_error,
                "traceback": error_trace,
                "python_path": sys.path[:8],
            },
        )

app = fastapi_app
