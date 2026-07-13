from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, or_
from typing import Optional, List, Dict
from datetime import datetime
import uuid
import asyncio
import json
from jose import jwt, JWTError

from database import get_db
from auth import get_current_user, send_mailgun_email, send_smtp_email, SECRET_KEY, ALGORITHM
from models import (
    User,
    Instructor,
    Course,
    Enrollment,
    MessageThread,
    MessageParticipant,
    Message,
    MessageAttachment,
)
from s3_utils import generate_presigned_put_url, get_public_s3_url

messages_router = APIRouter()
security_optional = HTTPBearer(auto_error=False)

_message_subscribers: Dict[int, List[asyncio.Queue]] = {}
_message_subscribers_lock = asyncio.Lock()


async def _register_subscriber(user_id: int) -> asyncio.Queue:
    queue: asyncio.Queue = asyncio.Queue()
    async with _message_subscribers_lock:
        _message_subscribers.setdefault(user_id, []).append(queue)
    return queue


async def _unregister_subscriber(user_id: int, queue: asyncio.Queue) -> None:
    async with _message_subscribers_lock:
        if user_id in _message_subscribers and queue in _message_subscribers[user_id]:
            _message_subscribers[user_id].remove(queue)
            if not _message_subscribers[user_id]:
                _message_subscribers.pop(user_id, None)


async def _publish_message_event(user_ids: List[int], payload: dict) -> None:
    async with _message_subscribers_lock:
        targets = []
        for uid in user_ids:
            targets.extend(_message_subscribers.get(uid, []))
    for q in targets:
        try:
            await q.put(payload)
        except Exception:
            # Ignore enqueue failures for disconnected subscribers
            pass


async def get_current_user_sse(
    token: Optional[str] = Query(None),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional),
    db: Session = Depends(get_db),
):
    raw_token = credentials.credentials if credentials else token
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = jwt.decode(raw_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def _is_admin(user: User) -> bool:
    return (user.role or "").lower() == "admin"


def _get_instructor_id_for_user(user: User, db: Session) -> Optional[int]:
    if not user or (user.role or "").lower() != "instructor":
        return None
    instructor = db.query(Instructor).filter(Instructor.user_id == user.id).first()
    return instructor.id if instructor else None


def _is_student_enrolled_with_instructor(student_id: int, instructor_id: int, db: Session) -> bool:
    if not student_id or not instructor_id:
        return False
    q = (
        db.query(Enrollment.id)
        .join(Course, Enrollment.course_id == Course.id)
        .filter(and_(Enrollment.student_id == student_id, Course.instructor_id == instructor_id))
        .limit(1)
    )
    return q.first() is not None


def _can_message(sender: User, recipient: User, db: Session) -> bool:
    # Admin can message anyone
    if _is_admin(sender) or _is_admin(recipient):
        return True

    sender_role = (sender.role or "").lower()
    recipient_role = (recipient.role or "").lower()

    # Instructor <-> Student only if they are connected via enrollment
    if sender_role == "instructor" and recipient_role == "student":
        instructor_id = _get_instructor_id_for_user(sender, db)
        return _is_student_enrolled_with_instructor(recipient.id, instructor_id, db) if instructor_id else False

    if sender_role == "student" and recipient_role == "instructor":
        instructor_id = _get_instructor_id_for_user(recipient, db)
        return _is_student_enrolled_with_instructor(sender.id, instructor_id, db) if instructor_id else False

    # Default deny
    return False


def _send_admin_message_email(recipient: User, sender: User, text: Optional[str], attachments: List["AttachmentInput"]):
    if not recipient or not recipient.email:
        return

    subject = "Eğitim Platformu - Yönetici mesajı"
    sender_name = sender.full_name if sender and sender.full_name else "Yönetici"
    lines = [
        f"Merhaba {recipient.full_name or 'Eğitmen'},",
        "",
        f"{sender_name} tarafından yeni bir mesaj aldınız.",
    ]

    if text:
        lines.extend(["", "Mesaj:", text])

    if attachments:
        lines.append("")
        lines.append(f"Ek dosya sayısı: {len(attachments)}")
        names = [a.file_name for a in attachments if a.file_name]
        if names:
            preview = ", ".join(names[:5])
            if len(names) > 5:
                preview += " ve diğerleri"
            lines.append(f"Ekler: {preview}")

    lines.extend(["", "Eğitmen panelindeki Mesajlar bölümünden yanıt verebilirsiniz."])
    body = "\n".join(lines)

    try:
        send_mailgun_email(recipient.email, subject, body)
    except Exception as mailgun_err:
        print(f"Mailgun email failed: {mailgun_err}")
        try:
            send_smtp_email(recipient.email, subject, body)
        except Exception as smtp_err:
            print(f"SMTP email failed: {smtp_err}")


def _get_or_create_direct_thread(user_a_id: int, user_b_id: int, db: Session) -> MessageThread:
    # Look for an existing thread with exactly these two participants
    sub = (
        db.query(MessageParticipant.thread_id)
        .filter(MessageParticipant.user_id.in_([user_a_id, user_b_id]))
        .group_by(MessageParticipant.thread_id)
        .having(func.count(func.distinct(MessageParticipant.user_id)) == 2)
        .subquery()
    )

    thread = db.query(MessageThread).join(sub, MessageThread.id == sub.c.thread_id).first()
    if thread:
        return thread

    thread = MessageThread(last_message_at=datetime.utcnow())
    db.add(thread)
    db.commit()
    db.refresh(thread)

    db.add_all(
        [
            MessageParticipant(thread_id=thread.id, user_id=user_a_id),
            MessageParticipant(thread_id=thread.id, user_id=user_b_id),
        ]
    )
    db.commit()
    return thread


class CreateThreadRequest(BaseModel):
    recipient_user_id: int


class ThreadSummary(BaseModel):
    id: int
    other_user: dict
    last_message: Optional[str] = None
    last_message_at: Optional[str] = None
    last_message_sender_id: Optional[int] = None
    last_message_sender_role: Optional[str] = None


class PresignAttachmentRequest(BaseModel):
    thread_id: int
    filename: str
    content_type: str


class AttachmentInput(BaseModel):
    file_url: str
    file_name: Optional[str] = None
    content_type: Optional[str] = None
    file_size: Optional[int] = None


class SendMessageRequest(BaseModel):
    body: Optional[str] = None
    attachments: Optional[List[AttachmentInput]] = None


class MessageOut(BaseModel):
    id: int
    sender: dict
    body: Optional[str]
    created_at: str
    attachments: List[dict]


@messages_router.get("/recipients")
async def search_recipients(
    query: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = (query or "").strip()
    if not q:
        return []

    is_numeric = q.isdigit()
    if not is_numeric and len(q) < 2:
        return []

    # Admin can search all users except self
    if _is_admin(current_user):
        users_query = db.query(User).filter(User.id != current_user.id)
    else:
        allowed_ids: set[int] = set()

        admin_ids = [row[0] for row in db.query(User.id).filter(User.role == "admin").all()]
        allowed_ids.update(admin_ids)

        role = (current_user.role or "").lower()
        if role == "instructor":
            instructor = db.query(Instructor).filter(Instructor.user_id == current_user.id).first()
            if instructor:
                student_ids = (
                    db.query(Enrollment.student_id)
                    .join(Course, Enrollment.course_id == Course.id)
                    .filter(Course.instructor_id == instructor.id)
                    .distinct()
                    .all()
                )
                allowed_ids.update([row[0] for row in student_ids])
        elif role == "student":
            instructor_ids = (
                db.query(Course.instructor_id)
                .join(Enrollment, Enrollment.course_id == Course.id)
                .filter(Enrollment.student_id == current_user.id)
                .distinct()
                .all()
            )
            instructor_ids_list = [row[0] for row in instructor_ids]
            if instructor_ids_list:
                instructor_user_ids = (
                    db.query(Instructor.user_id)
                    .filter(Instructor.id.in_(instructor_ids_list))
                    .all()
                )
                allowed_ids.update([row[0] for row in instructor_user_ids])

        allowed_ids.discard(current_user.id)
        if not allowed_ids:
            return []
        users_query = db.query(User).filter(User.id.in_(list(allowed_ids)))

    if is_numeric:
        users_query = users_query.filter(User.id == int(q))
    else:
        users_query = users_query.filter(
            or_(
                User.full_name.ilike(f"%{q}%"),
                User.email.ilike(f"%{q}%")
            )
        )

    users = users_query.limit(limit).all()
    return [
        {
            "id": u.id,
            "full_name": u.full_name,
            "role": u.role,
            "email": u.email,
            "profile_image": u.profile_image,
        }
        for u in users
    ]


@messages_router.get("/threads", response_model=List[ThreadSummary])
async def list_threads(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    parts = db.query(MessageParticipant).filter(MessageParticipant.user_id == current_user.id).all()
    thread_ids = [p.thread_id for p in parts]
    if not thread_ids:
        return []

    threads = db.query(MessageThread).filter(MessageThread.id.in_(thread_ids)).order_by(MessageThread.last_message_at.desc()).all()

    result: List[ThreadSummary] = []
    for t in threads:
        other_part = (
            db.query(MessageParticipant)
            .filter(and_(MessageParticipant.thread_id == t.id, MessageParticipant.user_id != current_user.id))
            .first()
        )
        other_user = db.query(User).filter(User.id == other_part.user_id).first() if other_part else None

        last_msg = (
            db.query(Message)
            .filter(Message.thread_id == t.id)
            .order_by(Message.created_at.desc())
            .first()
        )
        last_sender = db.query(User).filter(User.id == last_msg.sender_id).first() if last_msg else None

        result.append(
            ThreadSummary(
                id=t.id,
                other_user={
                    "id": other_user.id if other_user else None,
                    "full_name": other_user.full_name if other_user else "Bilinmiyor",
                    "role": other_user.role if other_user else None,
                },
                last_message=(last_msg.body[:200] if last_msg and last_msg.body else None),
                last_message_at=t.last_message_at.isoformat() if t.last_message_at else None,
                last_message_sender_id=last_msg.sender_id if last_msg else None,
                last_message_sender_role=last_sender.role if last_sender else None,
            )
        )

    return result


@messages_router.get("/events")
async def message_events(
    request: Request,
    current_user: User = Depends(get_current_user_sse),
):
    async def event_stream():
        queue = await _register_subscriber(current_user.id)
        try:
            # Initial ping so client knows the stream is alive
            yield "data: {\"type\":\"connected\"}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    payload = await asyncio.wait_for(queue.get(), timeout=15)
                    yield f"data: {json.dumps(payload)}\n\n"
                except asyncio.TimeoutError:
                    # Keep-alive comment (ignored by EventSource)
                    yield ": keep-alive\n\n"
        finally:
            await _unregister_subscriber(current_user.id, queue)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@messages_router.post("/threads")
async def create_thread(
    body: CreateThreadRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    recipient = db.query(User).filter(User.id == body.recipient_user_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")

    if not _can_message(current_user, recipient, db):
        raise HTTPException(status_code=403, detail="Messaging not allowed")

    thread = _get_or_create_direct_thread(current_user.id, recipient.id, db)
    return {"thread_id": thread.id}


@messages_router.post("/attachments/presign")
async def presign_attachment(
    body: PresignAttachmentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Must be participant
    part = db.query(MessageParticipant).filter(and_(MessageParticipant.thread_id == body.thread_id, MessageParticipant.user_id == current_user.id)).first()
    if not part:
        raise HTTPException(status_code=403, detail="Not a participant")

    filename = (body.filename or "").strip()
    content_type = (body.content_type or "").strip() or "application/octet-stream"
    if not filename or "." not in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    ext = filename.split(".")[-1].lower()
    unique = str(uuid.uuid4())
    object_name = f"messages/thread_{body.thread_id}/{unique}.{ext}"

    upload_url = generate_presigned_put_url(object_name, content_type=content_type)
    if not upload_url:
        raise HTTPException(status_code=500, detail="Failed to generate presigned url")

    public_url = get_public_s3_url(object_name)
    return {"upload_url": upload_url, "public_url": public_url, "object_name": object_name}


@messages_router.get("/threads/{thread_id}/messages", response_model=List[MessageOut])
async def get_messages(
    thread_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    part = db.query(MessageParticipant).filter(and_(MessageParticipant.thread_id == thread_id, MessageParticipant.user_id == current_user.id)).first()
    if not part:
        raise HTTPException(status_code=403, detail="Not a participant")

    msgs = db.query(Message).filter(Message.thread_id == thread_id).order_by(Message.created_at.asc()).all()

    out: List[MessageOut] = []
    for m in msgs:
        sender = db.query(User).filter(User.id == m.sender_id).first()
        atts = db.query(MessageAttachment).filter(MessageAttachment.message_id == m.id).all()
        out.append(
            MessageOut(
                id=m.id,
                sender={
                    "id": sender.id if sender else None,
                    "full_name": sender.full_name if sender else "Bilinmiyor",
                    "role": sender.role if sender else None,
                },
                body=m.body,
                created_at=m.created_at.isoformat() if m.created_at else datetime.utcnow().isoformat(),
                attachments=[
                    {
                        "id": a.id,
                        "file_url": a.file_url,
                        "file_name": a.file_name,
                        "content_type": a.content_type,
                        "file_size": a.file_size,
                    }
                    for a in atts
                ],
            )
        )

    return out


@messages_router.post("/threads/{thread_id}/messages")
async def send_message(
    thread_id: int,
    body: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    part = db.query(MessageParticipant).filter(and_(MessageParticipant.thread_id == thread_id, MessageParticipant.user_id == current_user.id)).first()
    if not part:
        raise HTTPException(status_code=403, detail="Not a participant")

    # Determine the other user and validate permission
    other_part = (
        db.query(MessageParticipant)
        .filter(and_(MessageParticipant.thread_id == thread_id, MessageParticipant.user_id != current_user.id))
        .first()
    )
    other_user = db.query(User).filter(User.id == other_part.user_id).first() if other_part else None
    if not other_user:
        raise HTTPException(status_code=400, detail="Thread is invalid")

    if not _can_message(current_user, other_user, db):
        raise HTTPException(status_code=403, detail="Messaging not allowed")

    text = (body.body or "").strip() if body.body else None
    attachments = body.attachments or []

    if not text and not attachments:
        raise HTTPException(status_code=400, detail="Message body or attachments required")

    msg = Message(thread_id=thread_id, sender_id=current_user.id, body=text)
    db.add(msg)
    db.commit()
    db.refresh(msg)

    for a in attachments:
        db.add(
            MessageAttachment(
                message_id=msg.id,
                file_url=a.file_url,
                file_name=a.file_name,
                content_type=a.content_type,
                file_size=a.file_size,
            )
        )

    # Update thread activity
    thread = db.query(MessageThread).filter(MessageThread.id == thread_id).first()
    if thread:
        thread.last_message_at = datetime.utcnow()

    db.commit()

    # Notify instructors by email when admin sends a message
    try:
        if _is_admin(current_user) and (other_user.role or "").lower() == "instructor":
            _send_admin_message_email(other_user, current_user, text, attachments)
    except Exception as notify_err:
        print(f"Admin message email notification failed: {notify_err}")

    # Push realtime event to participants (SSE)
    try:
        created_at = msg.created_at.isoformat() if msg.created_at else datetime.utcnow().isoformat()
        await _publish_message_event(
            [current_user.id, other_user.id],
            {
                "type": "message",
                "thread_id": thread_id,
                "message_id": msg.id,
                "sender_id": current_user.id,
                "created_at": created_at,
            },
        )
    except Exception as notify_err:
        print(f"Message SSE notification failed: {notify_err}")

    return {"message_id": msg.id}
