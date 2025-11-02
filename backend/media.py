from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse
import os
import shutil
from datetime import datetime
from pathlib import Path
import uuid
from typing import List

from auth import verify_admin

media_router = APIRouter()

# Upload dizini
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

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

# Maksimum dosya boyutu (50MB)
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB in bytes


def get_file_extension(filename: str) -> str:
    """Dosya uzantısını al"""
    return filename.split('.')[-1].lower() if '.' in filename else ''


def generate_unique_filename(original_filename: str) -> str:
    """Benzersiz dosya adı oluştur"""
    ext = get_file_extension(original_filename)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = uuid.uuid4().hex[:8]
    return f"{timestamp}_{unique_id}.{ext}"


@media_router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user = Depends(verify_admin)
):
    """
    Dosya yükle (Sadece admin)
    Resim, video veya döküman yüklenebilir
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
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Dosya çok büyük. Maksimum: {MAX_FILE_SIZE / (1024*1024)}MB"
        )
    
    # Benzersiz dosya adı oluştur
    unique_filename = generate_unique_filename(file.filename or "file")
    
    # Yıl/ay klasörü oluştur (organize etmek için)
    today = datetime.now()
    folder_path = UPLOAD_DIR / str(today.year) / f"{today.month:02d}"
    folder_path.mkdir(parents=True, exist_ok=True)
    
    # Dosya yolu
    file_path = folder_path / unique_filename
    
    # Dosyayı kaydet
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    # URL oluştur (relative path)
    relative_path = str(file_path).replace("\\", "/")
    file_url = f"/{relative_path}"
    
    return {
        "success": True,
        "filename": unique_filename,
        "original_filename": file.filename,
        "file_url": file_url,
        "file_size": file_size,
        "content_type": file.content_type,
        "uploaded_at": datetime.now().isoformat()
    }


@media_router.post("/upload-multiple")
async def upload_multiple_files(
    files: List[UploadFile] = File(...),
    current_user = Depends(verify_admin)
):
    """
    Birden fazla dosya yükle (Sadece admin)
    """
    results = []
    
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
            
            if file_size > MAX_FILE_SIZE:
                results.append({
                    "filename": file.filename,
                    "success": False,
                    "error": f"Dosya çok büyük ({file_size / (1024*1024):.2f}MB)"
                })
                continue
            
            unique_filename = generate_unique_filename(file.filename or "file")
            today = datetime.now()
            folder_path = UPLOAD_DIR / str(today.year) / f"{today.month:02d}"
            folder_path.mkdir(parents=True, exist_ok=True)
            
            file_path = folder_path / unique_filename
            
            with open(file_path, "wb") as f:
                f.write(file_content)
            
            relative_path = str(file_path).replace("\\", "/")
            file_url = f"/{relative_path}"
            
            results.append({
                "success": True,
                "filename": unique_filename,
                "original_filename": file.filename,
                "file_url": file_url,
                "file_size": file_size,
                "content_type": file.content_type
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
    current_user = Depends(verify_admin)
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
                        "file_url": f"/{str(file_path).replace(chr(92), '/')}",
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
                                    "file_url": f"/{str(file_path).replace(chr(92), '/')}",
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
    current_user = Depends(verify_admin)
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
