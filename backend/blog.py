from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth import get_current_user_optional, require_role
from database import get_db
from models import BlogPost, User

router = APIRouter()

VALID_STATUSES = {"draft", "published", "scheduled"}


class BlogAuthorResponse(BaseModel):
    full_name: str
    avatar: Optional[str] = None


class BlogPostCreate(BaseModel):
    title: str
    slug: str
    excerpt: Optional[str] = None
    content: str
    featured_image: Optional[str] = None
    video_url: Optional[str] = None
    video_title: Optional[str] = None
    author_name: str = "Site Admin"
    author_avatar: Optional[str] = None
    category: str = "Genel"
    tags: List[str] = Field(default_factory=list)
    status: str = "draft"
    is_featured: bool = False
    published_at: Optional[datetime] = None
    scheduled_at: Optional[datetime] = None


class BlogPostUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    excerpt: Optional[str] = None
    content: Optional[str] = None
    featured_image: Optional[str] = None
    video_url: Optional[str] = None
    video_title: Optional[str] = None
    author_name: Optional[str] = None
    author_avatar: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None
    is_featured: Optional[bool] = None
    published_at: Optional[datetime] = None
    scheduled_at: Optional[datetime] = None


class BlogPostResponse(BaseModel):
    id: int
    title: str
    excerpt: str
    content: str
    slug: str
    featured_image: Optional[str] = None
    video_url: Optional[str] = None
    video_title: Optional[str] = None
    author: BlogAuthorResponse
    category: str
    tags: List[str] = Field(default_factory=list)
    status: str
    is_featured: bool = False
    views: int = 0
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime] = None
    scheduled_at: Optional[datetime] = None

    class Config:
        from_attributes = True


def _ensure_status(value: str) -> str:
    if value not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail="Geçersiz blog durumu")
    return value


def _clean_tags(tags: Optional[List[str]]) -> List[str]:
    if not tags:
        return []
    return [tag.strip() for tag in tags if isinstance(tag, str) and tag.strip()]


def _is_manager(user: Optional[User]) -> bool:
    return bool(user and user.role in {"admin", "editor"})


def _sort_posts(posts: List[BlogPost]) -> List[BlogPost]:
    return sorted(
        posts,
        key=lambda post: (
            1 if post.is_featured else 0,
            (post.published_at or post.scheduled_at or post.created_at).timestamp(),
        ),
        reverse=True,
    )


def _serialize_post(post: BlogPost) -> BlogPostResponse:
    return BlogPostResponse(
        id=post.id,
        title=post.title,
        excerpt=post.excerpt or "",
        content=post.content,
        slug=post.slug,
        featured_image=post.featured_image,
        video_url=post.video_url,
        video_title=post.video_title,
        author=BlogAuthorResponse(
            full_name=post.author_name or "Site Admin",
            avatar=post.author_avatar,
        ),
        category=post.category or "Genel",
        tags=_clean_tags(post.tags_json or []),
        status=post.status,
        is_featured=bool(post.is_featured),
        views=post.views or 0,
        created_at=post.created_at,
        updated_at=post.updated_at,
        published_at=post.published_at,
        scheduled_at=post.scheduled_at,
    )


def _get_post_or_404(db: Session, post_id: int) -> BlogPost:
    post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Blog yazısı bulunamadı")
    return post


@router.get("", response_model=List[BlogPostResponse])
async def list_blog_posts(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    include_all: bool = Query(default=False),
    limit: Optional[int] = Query(default=None, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    if status_filter:
        _ensure_status(status_filter)

    query = db.query(BlogPost)

    if _is_manager(current_user) and include_all:
        if status_filter:
            query = query.filter(BlogPost.status == status_filter)
    else:
        query = query.filter(BlogPost.status == "published")

    posts = _sort_posts(query.all())
    if limit is not None:
        posts = posts[:limit]

    return [_serialize_post(post) for post in posts]


@router.get("/id/{post_id}", response_model=BlogPostResponse)
async def get_blog_post_by_id(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    post = _get_post_or_404(db, post_id)
    return _serialize_post(post)


@router.get("/{slug}", response_model=BlogPostResponse)
async def get_blog_post_by_slug(
    slug: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    post = db.query(BlogPost).filter(BlogPost.slug == slug).first()
    if not post:
        raise HTTPException(status_code=404, detail="Blog yazısı bulunamadı")

    if post.status != "published" and not _is_manager(current_user):
        raise HTTPException(status_code=404, detail="Blog yazısı bulunamadı")

    return _serialize_post(post)


@router.post("", response_model=BlogPostResponse, status_code=status.HTTP_201_CREATED)
async def create_blog_post(
    payload: BlogPostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    _ensure_status(payload.status)

    existing_post = db.query(BlogPost).filter(BlogPost.slug == payload.slug).first()
    if existing_post:
        raise HTTPException(status_code=400, detail="Bu slug zaten kullanılıyor")

    published_at = payload.published_at
    scheduled_at = payload.scheduled_at
    if payload.status == "published" and not published_at:
        published_at = datetime.utcnow()
    if payload.status == "scheduled" and not scheduled_at:
        scheduled_at = datetime.utcnow()

    post = BlogPost(
        title=payload.title.strip(),
        slug=payload.slug.strip(),
        excerpt=(payload.excerpt or "").strip(),
        content=payload.content,
        featured_image=payload.featured_image,
        video_url=payload.video_url,
        video_title=payload.video_title,
        author_name=payload.author_name.strip() or current_user.full_name,
        author_avatar=payload.author_avatar,
        category=(payload.category or "Genel").strip(),
        tags_json=_clean_tags(payload.tags),
        status=payload.status,
        is_featured=payload.is_featured,
        published_at=published_at,
        scheduled_at=scheduled_at,
    )

    db.add(post)
    db.commit()
    db.refresh(post)
    return _serialize_post(post)


@router.put("/{post_id}", response_model=BlogPostResponse)
async def update_blog_post(
    post_id: int,
    payload: BlogPostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    post = _get_post_or_404(db, post_id)

    if payload.slug and payload.slug != post.slug:
        existing_post = db.query(BlogPost).filter(BlogPost.slug == payload.slug).first()
        if existing_post and existing_post.id != post_id:
            raise HTTPException(status_code=400, detail="Bu slug zaten kullanılıyor")

    if payload.status is not None:
        post.status = _ensure_status(payload.status)
    if payload.title is not None:
        post.title = payload.title.strip()
    if payload.slug is not None:
        post.slug = payload.slug.strip()
    if payload.excerpt is not None:
        post.excerpt = payload.excerpt.strip()
    if payload.content is not None:
        post.content = payload.content
    if payload.featured_image is not None:
        post.featured_image = payload.featured_image
    if payload.video_url is not None:
        post.video_url = payload.video_url
    if payload.video_title is not None:
        post.video_title = payload.video_title
    if payload.author_name is not None:
        post.author_name = payload.author_name.strip() or current_user.full_name
    if payload.author_avatar is not None:
        post.author_avatar = payload.author_avatar
    if payload.category is not None:
        post.category = payload.category.strip() or "Genel"
    if payload.tags is not None:
        post.tags_json = _clean_tags(payload.tags)
    if payload.is_featured is not None:
        post.is_featured = payload.is_featured

    if payload.status == "published":
        post.published_at = payload.published_at or post.published_at or datetime.utcnow()
        post.scheduled_at = None
    elif payload.status == "scheduled":
        post.scheduled_at = payload.scheduled_at or post.scheduled_at or datetime.utcnow()
        post.published_at = None
    elif payload.status == "draft":
        post.published_at = None
        post.scheduled_at = None
    else:
        if payload.published_at is not None:
            post.published_at = payload.published_at
        if payload.scheduled_at is not None:
            post.scheduled_at = payload.scheduled_at

    post.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(post)
    return _serialize_post(post)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_blog_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    post = _get_post_or_404(db, post_id)
    db.delete(post)
    db.commit()


@router.post("/{post_id}/views", response_model=BlogPostResponse)
async def increment_blog_post_view(
    post_id: int,
    db: Session = Depends(get_db),
):
    post = _get_post_or_404(db, post_id)
    post.views = (post.views or 0) + 1
    post.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(post)
    return _serialize_post(post)
