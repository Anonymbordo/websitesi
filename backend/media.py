from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Request
from fastapi.responses import FileResponse, Response, StreamingResponse
from botocore.exceptions import ClientError
import os
import shutil
from datetime import datetime
from pathlib import Path
import uuid
from typing import List
import io
from pydantic import BaseModel

from auth import require_role
from firebase_config import init_firebase, upload_file_to_firebase, delete_file_from_firebase
from s3_utils import (
    AWS_BUCKET_NAME,
    upload_file_to_s3,
    delete_file_from_s3,
    generate_presigned_put_url,
    get_public_s3_url,
    get_s3_client,
    decode_media_stream_token,
)

media_router = APIRouter()
MEDIA_MANAGER_ROLES = ["admin", "editor"]

# Upload dizini - Vercel için /tmp kullan (yazılabilir alan)
if os.environ.get('VERCEL'):
    UPLOAD_DIR = Path("/tmp/uploads")
else:
    UPLOAD_DIR = Path("uploads")

# Klasör oluştur (try-catch ile güvenli)
try:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
except (OSError, PermissionError) as e:
    print(f"⚠️ Could not create upload directory: {e}")
    pass

# İzin verilen dosya tipleri
ALLOWED_IMAGE_TYPES = {
    "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/svg+xml"
}

ALLOWED_VIDEO_TYPES = {
    "video/mp4", "video/mpeg", "video/quicktime", "video/x-msvideo"
}

ALLOWED_DOCUMENT_TYPES = {
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
}

ALL_ALLOWED_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_VIDEO_TYPES | ALLOWED_DOCUMENT_TYPES

# Maksimum dosya boyutu:
# Varsayılan sınırsız. İstenirse MEDIA_MAX_FILE_SIZE_MB ile sınır konulabilir.
_max_file_size_mb = (os.getenv("MEDIA_MAX_FILE_SIZE_MB") or "").strip()
MAX_FILE_SIZE = int(_max_file_size_mb) * 1024 * 1024 if _max_file_size_mb.isdigit() and int(_max_file_size_mb) > 0 else None


class MediaPresignRequest(BaseModel):
    filename: str
    content_type: str


def get_file_extension(filename: str) -> str:
    """Dosya uzantısını al"""
    return filename.split('.')[-1].lower() if '.' in filename else ''


def generate_unique_filename(original_filename: str) -> str:
    """Benzersiz dosya adı oluştur"""
    ext = get_file_extension(original_filename)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = uuid.uuid4().hex[:8]
    return f"{timestamp}_{unique_id}.{ext}"


def build_local_file_url(file_path: Path) -> str:
    """Yerel dosya yolu icin public /uploads URL'si uret."""
    relative_path = file_path.relative_to(UPLOAD_DIR).as_posix()
    return f"/uploads/{relative_path}"


def _iter_s3_chunks(stream_body, chunk_size: int = 1024 * 1024):
    try:
        while True:
            chunk = stream_body.read(chunk_size)
            if not chunk:
                break
            yield chunk
    finally:
        stream_body.close()


@media_router.api_route("/stream/{token}", methods=["GET", "HEAD"])
async def stream_media(token: str, request: Request):
    if not AWS_BUCKET_NAME:
        raise HTTPException(status_code=500, detail="AWS bucket is not configured")

    try:
        object_name = decode_media_stream_token(token)
    except ValueError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc

    s3_client = get_s3_client()
    range_header = request.headers.get("range")

    try:
        if request.method == "HEAD":
            metadata = s3_client.head_object(Bucket=AWS_BUCKET_NAME, Key=object_name)
            headers = {
                "Accept-Ranges": "bytes",
                "Cache-Control": "private, no-store",
                "Content-Disposition": "inline",
                "Content-Length": str(metadata.get("ContentLength", 0)),
                "Cross-Origin-Resource-Policy": "same-site",
                "Referrer-Policy": "no-referrer",
                "X-Content-Type-Options": "nosniff",
            }
            return Response(
                status_code=200,
                headers=headers,
                media_type=metadata.get("ContentType") or "application/octet-stream",
            )

        params = {"Bucket": AWS_BUCKET_NAME, "Key": object_name}
        if range_header:
            params["Range"] = range_header

        s3_response = s3_client.get_object(**params)
        status_code = 206 if s3_response.get("ContentRange") else 200
        headers = {
            "Accept-Ranges": "bytes",
            "Cache-Control": "private, no-store",
            "Content-Disposition": "inline",
            "Cross-Origin-Resource-Policy": "same-site",
            "Referrer-Policy": "no-referrer",
            "X-Content-Type-Options": "nosniff",
        }
        if "ContentLength" in s3_response:
            headers["Content-Length"] = str(s3_response["ContentLength"])
        if "ContentRange" in s3_response:
            headers["Content-Range"] = s3_response["ContentRange"]
        if "ETag" in s3_response:
            headers["ETag"] = str(s3_response["ETag"])

        return StreamingResponse(
            _iter_s3_chunks(s3_response["Body"]),
            status_code=status_code,
            headers=headers,
            media_type=s3_response.get("ContentType") or "application/octet-stream",
        )
    except ClientError as exc:
        error_code = exc.response.get("Error", {}).get("Code", "")
        if error_code in {"NoSuchKey", "404"}:
            raise HTTPException(status_code=404, detail="Media file not found") from exc
        raise HTTPException(status_code=500, detail="Media file could not be streamed") from exc


@media_router.post("/presign")
async def presign_media_upload(
    body: MediaPresignRequest,
    current_user=Depends(require_role(MEDIA_MANAGER_ROLES))
):
    """
    Büyük dosyalar için S3'e direct upload presigned URL üretir.
    Böylece Vercel/request body limitine takılmadan upload yapılır.
    """
    if body.content_type not in ALL_ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Desteklenmeyen dosya tipi: {body.content_type}"
        )

    unique_filename = generate_unique_filename(body.filename or "file")
    today = datetime.now()
    object_name = f"uploads/{today.year}/{today.month:02d}/{unique_filename}"

    try:
        upload_url = generate_presigned_put_url(object_name, body.content_type, expires_in=3600)
        public_url = get_public_s3_url(object_name)
        return {
            "upload_url": upload_url,
            "public_url": public_url,
            "object_name": object_name
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Presigned URL üretilemedi: {str(e)}")


@media_router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user = Depends(require_role(MEDIA_MANAGER_ROLES))
):
    """
    Dosya yükle (Sadece admin)
    Resim, video veya döküman yüklenebilir
    Firebase Storage varsa oraya, yoksa yerel diske yükler.
    """
    # İçerik tipi kontrolü
    if file.content_type not in ALL_ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Desteklenmeyen dosya tipi: {file.content_type}"
        )
    
    # Dosya boyutu kontrolü
    file_content = await file.read()
    file_size = len(file_content)
    
    if MAX_FILE_SIZE and file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Dosya çok büyük. Maksimum: {MAX_FILE_SIZE / (1024*1024)}MB"
        )
    
    # Benzersiz dosya adı oluştur
    unique_filename = generate_unique_filename(file.filename or "file")
    
    # Yıl/ay klasörü oluştur (organize etmek için)
    today = datetime.now()
    folder_path_str = f"{today.year}/{today.month:02d}"
    
    # S3'e yüklemeyi dene
    s3_filename = f"uploads/{folder_path_str}/{unique_filename}"
    public_url = upload_file_to_s3(file.file, s3_filename, file.content_type)
    
    if public_url:
        return {
            "success": True,
            "filename": unique_filename,
            "original_filename": file.filename,
            "file_url": public_url,
            "file_size": file_size,
            "content_type": file.content_type,
            "uploaded_at": datetime.now().isoformat(),
            "storage": "s3"
        }
    
    # Firebase'e yüklemeyi dene (Fallback)
    try:
        if init_firebase():
            destination_blob_name = f"uploads/{folder_path_str}/{unique_filename}"
            file_obj = io.BytesIO(file_content)
            public_url = upload_file_to_firebase(file_obj, destination_blob_name, file.content_type)
            
            return {
                "success": True,
                "filename": unique_filename,
                "original_filename": file.filename,
                "file_url": public_url,
                "file_size": file_size,
                "content_type": file.content_type,
                "uploaded_at": datetime.now().isoformat(),
                "storage": "firebase"
            }
    except Exception as e:
        print(f"⚠️ Firebase upload failed, falling back to local: {e}")
    
    # Yerel diske yükle (Fallback)
    folder_path = UPLOAD_DIR / str(today.year) / f"{today.month:02d}"
    folder_path.mkdir(parents=True, exist_ok=True)
    
    # Dosya yolu
    file_path = folder_path / unique_filename
    
    # Dosyayı kaydet
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    # URL oluştur (relative path)
    file_url = build_local_file_url(file_path)
    
    return {
        "success": True,
        "filename": unique_filename,
        "original_filename": file.filename,
        "file_url": file_url,
        "file_size": file_size,
        "content_type": file.content_type,
        "uploaded_at": datetime.now().isoformat(),
        "storage": "local"
    }


@media_router.post("/upload-multiple")
async def upload_multiple_files(
    files: List[UploadFile] = File(...),
    current_user = Depends(require_role(MEDIA_MANAGER_ROLES))
):
    """
    Birden fazla dosya yükle (Sadece admin)
    """
    results = []
    firebase_initialized = init_firebase()
    
    for file in files:
        try:
            # Her dosya için upload fonksiyonunu çağır
            # (Güvenlik kontrollerini tekrar et)
            if file.content_type not in ALL_ALLOWED_TYPES:
                results.append({
                    "filename": file.filename,
                    "success": False,
                    "error": f"Desteklenmeyen dosya tipi: {file.content_type}"
                })
                continue
            
            file_content = await file.read()
            file_size = len(file_content)
            
            if MAX_FILE_SIZE and file_size > MAX_FILE_SIZE:
                results.append({
                    "filename": file.filename,
                    "success": False,
                    "error": f"Dosya çok büyük ({file_size / (1024*1024):.2f}MB)"
                })
                continue
            
            unique_filename = generate_unique_filename(file.filename or "file")
            today = datetime.now()
            folder_path_str = f"{today.year}/{today.month:02d}"
            
            uploaded = False
            
            # Firebase'e yüklemeyi dene
            if firebase_initialized:
                try:
                    destination_blob_name = f"uploads/{folder_path_str}/{unique_filename}"
                    file_obj = io.BytesIO(file_content)
                    public_url = upload_file_to_firebase(file_obj, destination_blob_name, file.content_type)
                    
                    results.append({
                        "success": True,
                        "filename": unique_filename,
                        "original_filename": file.filename,
                        "file_url": public_url,
                        "file_size": file_size,
                        "content_type": file.content_type,
                        "storage": "firebase"
                    })
                    uploaded = True
                except Exception as e:
                    print(f"⚠️ Firebase upload failed for {file.filename}: {e}")
            
            if not uploaded:
                # Yerel diske yükle
                folder_path = UPLOAD_DIR / str(today.year) / f"{today.month:02d}"
                folder_path.mkdir(parents=True, exist_ok=True)
                
                file_path = folder_path / unique_filename
                
                with open(file_path, "wb") as f:
                    f.write(file_content)
                
                file_url = build_local_file_url(file_path)
                
                results.append({
                    "success": True,
                    "filename": unique_filename,
                    "original_filename": file.filename,
                    "file_url": file_url,
                    "file_size": file_size,
                    "content_type": file.content_type,
                    "storage": "local"
                })
            
        except Exception as e:
            results.append({
                "filename": file.filename,
                "success": False,
                "error": str(e)
            })
    
    return {
        "total": len(files),
        "successful": len([r for r in results if r.get("success")]),
        "failed": len([r for r in results if not r.get("success")]),
        "results": results
    }


@media_router.get("/list")
async def list_uploaded_files(
    year: int = None,
    month: int = None,
    current_user = Depends(require_role(MEDIA_MANAGER_ROLES))
):
    """
    Yüklenmiş dosyaları listele (Sadece admin)
    """
    files = []
    
    if year and month:
        folder_path = UPLOAD_DIR / str(year) / f"{month:02d}"
        if folder_path.exists():
            for file_path in folder_path.iterdir():
                if file_path.is_file():
                    stat = file_path.stat()
                    files.append({
                        "filename": file_path.name,
                        "file_url": build_local_file_url(file_path),
                        "file_size": stat.st_size,
                        "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat()
                    })
    else:
        # Tüm dosyaları listele
        for year_folder in UPLOAD_DIR.iterdir():
            if year_folder.is_dir():
                for month_folder in year_folder.iterdir():
                    if month_folder.is_dir():
                        for file_path in month_folder.iterdir():
                            if file_path.is_file():
                                stat = file_path.stat()
                                files.append({
                                    "filename": file_path.name,
                                    "file_url": build_local_file_url(file_path),
                                    "file_size": stat.st_size,
                                    "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat()
                                })
    
    return {
        "total": len(files),
        "files": sorted(files, key=lambda x: x["created_at"], reverse=True)
    }


@media_router.delete("/delete")
async def delete_file(
    file_url: str,
    current_user = Depends(require_role(MEDIA_MANAGER_ROLES))
):
    """
    Dosya sil (Sadece admin)
    """
    # URL'den file path çıkar
    file_path = file_url.lstrip("/")
    full_path = Path(file_path)
    
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    
    # Güvenlik: Sadece uploads dizinindeki dosyalar silinebilir
    if not str(full_path).startswith(str(UPLOAD_DIR)):
        raise HTTPException(status_code=403, detail="Bu dosya silinemez")
    
    try:
        full_path.unlink()
        return {
            "success": True,
            "message": "Dosya silindi",
            "filename": full_path.name
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dosya silinirken hata: {str(e)}")
