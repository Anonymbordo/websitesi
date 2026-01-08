# Vercel Python handler for FastAPI using vercel-wsgi
import sys
import os
from pathlib import Path
from vercel_wsgi import handle

# Ensure backend is on PYTHONPATH
backend_path = str(Path(__file__).parent.parent / "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

os.environ["VERCEL"] = "1"

try:
    from main import app as fastapi_app
except Exception as e:
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


def handler(event, context):
    return handle(fastapi_app, event, context)


# Vercel also looks for `app`
app = fastapi_app

