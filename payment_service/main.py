import sys
import traceback
from pathlib import Path

from decouple import config
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse


ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from payments import payments_router  # noqa: E402
from school_payments import router as school_payments_router  # noqa: E402


app = FastAPI(
    title="Mikrokurs Payment Service",
    description="Ayrik QNB odeme servisi",
    version="1.0.0",
    redirect_slashes=False,
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"Payment service exception: {exc}")
    traceback.print_exc()
    expose_internal_errors = config("EXPOSE_INTERNAL_ERRORS", default="false").strip().lower() in {"1", "true", "yes", "on"}
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}" if expose_internal_errors else "Internal Server Error"},
    )


allowed_origins = config(
    "CORS_ORIGINS",
    default="http://localhost:3000,http://127.0.0.1:3000,https://mikrokurs.com,https://www.mikrokurs.com",
).split(",")
allowed_origin_regex = config(
    "CORS_ORIGIN_REGEX",
    default=r"https://.*\.vercel\.app",
).strip()
trusted_hosts = [
    host.strip()
    for host in config(
        "TRUSTED_HOSTS",
        default="localhost,127.0.0.1,mikrokurs.com,www.mikrokurs.com,pay.mikrokurs.com,*.vercel.app,*.onrender.com",
    ).split(",")
    if host.strip()
]

allowed_origins = [origin.strip() for origin in allowed_origins if origin.strip()]

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=trusted_hosts,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=allowed_origin_regex or None,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "User-Agent"],
    expose_headers=["Content-Type"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

    if request.url.scheme == "https":
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

    if request.url.path.startswith("/api/payments"):
        response.headers.setdefault("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate")
        response.headers.setdefault("Pragma", "no-cache")

    return response


@app.get("/")
@app.get("/health")
def payment_service_health():
    return {
        "service": "payment-service",
        "status": "ok",
    }


app.include_router(payments_router, prefix="/api/payments", tags=["Payments"])
app.include_router(school_payments_router, prefix="/api/payments", tags=["School Payments"])
