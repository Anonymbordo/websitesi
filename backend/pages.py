from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

from database import get_db
from models import Page
from auth import get_current_user, verify_admin

pages_router = APIRouter()

# Pydantic Models
# BlockStyle removed to allow flexible styling from frontend
# class BlockStyle(BaseModel): ...

class Block(BaseModel):
    id: str
    type: str
    data: Dict[str, Any]
    style: Optional[Dict[str, Any]] = None  # Changed to Dict to be more permissive

class PageCreate(BaseModel):
    slug: str
    title: str
    blocks: List[Block]
    status: str = "draft"
    show_in_header: bool = False

class PageUpdate(BaseModel):
    title: Optional[str] = None
    blocks: Optional[List[Block]] = None
    status: Optional[str] = None
    show_in_header: Optional[bool] = None

class PageResponse(BaseModel):
    id: int
    slug: str
    title: str
    blocks: List[Dict[str, Any]]
    status: str
    show_in_header: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Endpoints

@pages_router.post("/", response_model=PageResponse, status_code=status.HTTP_201_CREATED)
async def create_page(
    page: PageCreate,
    db: Session = Depends(get_db),
    current_user = Depends(verify_admin)
):
    """
    Yeni sayfa oluştur (Sadece admin)
    """
    print(f"Creating page: {page.slug}, title: {page.title}")
    try:
        # Slug kontrolü
        existing_page = db.query(Page).filter(Page.slug == page.slug).first()
        if existing_page:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"'{page.slug}' slug'ı zaten kullanılıyor"
            )
        
        # Blocks'ı JSON'a çevir
        blocks_json = [block.dict() for block in page.blocks]
        
        # Yeni sayfa oluştur
        db_page = Page(
            slug=page.slug,
            title=page.title,
            blocks_json=blocks_json,
            status=page.status,
            show_in_header=page.show_in_header
        )
        
        db.add(db_page)
        db.commit()
        db.refresh(db_page)
        
        print(f"Page created successfully: {db_page.id}")
        
        return PageResponse(
            id=db_page.id,
            slug=db_page.slug,
            title=db_page.title,
            blocks=db_page.blocks_json,
            status=db_page.status,
            show_in_header=db_page.show_in_header,
            created_at=db_page.created_at,
            updated_at=db_page.updated_at
        )
    except Exception as e:
        print(f"Error creating page: {e}")
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Sayfa oluşturulurken hata oluştu: {str(e)}"
        )

@pages_router.get("/header/menu", response_model=List[PageResponse])
async def get_header_menu_pages(db: Session = Depends(get_db)):
    """
    Header menüsünde gösterilecek sayfaları getir (Public)
    """
    try:
        pages = db.query(Page).filter(
            Page.show_in_header == True,
            Page.status == "published"
        ).order_by(Page.created_at.asc()).all()
        
        return [
            PageResponse(
                id=p.id,
                slug=p.slug,
                title=p.title,
                blocks=p.blocks_json if p.blocks_json else [],
                status=p.status,
                show_in_header=p.show_in_header,
                created_at=p.created_at,
                updated_at=p.updated_at
            )
            for p in pages
        ]
    except Exception as e:
        print(f"Error fetching header menu pages: {e}")
        # Return empty list instead of 500 if table doesn't exist or other error
        # This allows the frontend to render the header without the dynamic menu
        return []

@pages_router.get("/", response_model=List[PageResponse])
async def get_all_pages(
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Tüm sayfaları listele (Public - herkes görebilir)
    """
    query = db.query(Page)
    
    if status:
        query = query.filter(Page.status == status)
    
    pages = query.order_by(Page.created_at.desc()).all()
    
    return [
        PageResponse(
            id=p.id,
            slug=p.slug,
            title=p.title,
            blocks=p.blocks_json,
            status=p.status,
            show_in_header=p.show_in_header,
            created_at=p.created_at,
            updated_at=p.updated_at
        )
        for p in pages
    ]

@pages_router.get("/{slug}", response_model=PageResponse)
async def get_page_by_slug(
    slug: str,
    db: Session = Depends(get_db)
):
    """
    Slug'a göre sayfa getir (Public)
    """
    page = db.query(Page).filter(Page.slug == slug).first()
    
    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"'{slug}' sayfası bulunamadı"
        )
    
    return PageResponse(
        id=page.id,
        slug=page.slug,
        title=page.title,
        blocks=page.blocks_json,
        status=page.status,
        show_in_header=page.show_in_header,
        created_at=page.created_at,
        updated_at=page.updated_at
    )

@pages_router.put("/{slug}", response_model=PageResponse)
async def update_page(
    slug: str,
    page_update: PageUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(verify_admin)
):
    """
    Sayfayı güncelle (Sadece admin)
    """
    page = db.query(Page).filter(Page.slug == slug).first()
    
    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"'{slug}' sayfası bulunamadı"
        )
    
    # Güncellemeleri uygula
    if page_update.title is not None:
        page.title = page_update.title
    
    if page_update.blocks is not None:
        page.blocks_json = [block.dict() for block in page_update.blocks]
    
    if page_update.status is not None:
        page.status = page_update.status
    
    if page_update.show_in_header is not None:
        page.show_in_header = page_update.show_in_header
    
    page.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(page)
    
    return PageResponse(
        id=page.id,
        slug=page.slug,
        title=page.title,
        blocks=page.blocks_json,
        status=page.status,
        show_in_header=page.show_in_header,
        created_at=page.created_at,
        updated_at=page.updated_at
    )

@pages_router.delete("/{slug}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_page(
    slug: str,
    db: Session = Depends(get_db),
    current_user = Depends(verify_admin)
):
    """
    Sayfayı sil (Sadece admin)
    """
    page = db.query(Page).filter(Page.slug == slug).first()
    
    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"'{slug}' sayfası bulunamadı"
        )
    
    db.delete(page)
    db.commit()
    
    return None

