from datetime import datetime
import re
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import MockExam, MockExamAttempt, User

router = APIRouter()

VALID_SECTION_TYPES = {"verbal", "quantitative"}
VALID_EXAM_GROUPS = {
    "lgs",
    "grade_4",
    "grade_5",
    "grade_6",
    "grade_7",
    "grade_8",
    "grade_9",
    "grade_10",
    "grade_11",
    "grade_12",
}
DEFAULT_EXAM_GROUP = "lgs"
DEFAULT_VERBAL_SUBJECTS = ["turkce", "sosyal", "din"]
GRADE_6_7_VERBAL_SUBJECTS = ["turkce", "sosyal", "ingilizce"]
GRADE_8_VERBAL_SUBJECTS = ["turkce", "inkilap", "din", "ingilizce"]
QUANTITATIVE_SUBJECTS = ["matematik", "fen"]
SUBJECT_ALIASES_BY_GROUP = {
    "grade_6": {"din": "ingilizce"},
    "grade_7": {"din": "ingilizce"},
    "grade_8": {"sosyal": "inkilap"},
}
SECTION_DURATION_MINUTES = {
    "verbal": 75,
    "quantitative": 80,
}
_mock_exam_schema_checked = False


def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


def slugify(value: str) -> str:
    slug = (value or "").strip().lower()
    replacements = {
        "ğ": "g",
        "ü": "u",
        "ş": "s",
        "ı": "i",
        "ö": "o",
        "ç": "c",
    }
    for source, target in replacements.items():
        slug = slug.replace(source, target)
    slug = "".join(ch if ch.isalnum() or ch in {"-", " "} else "-" for ch in slug)
    slug = "-".join(filter(None, slug.replace("_", "-").split()))
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug.strip("-")


def normalize_media_url(value: Optional[str]) -> Optional[str]:
    url = (value or "").strip()
    if not url:
        return None

    normalized = url.replace("\\", "/")

    if normalized.startswith(("http://", "https://", "data:", "blob:")):
        return normalized

    local_prefixes = [
        "//tmp/uploads/",
        "/tmp/uploads/",
        "tmp/uploads/",
        "//uploads/",
        "uploads/",
    ]

    for prefix in local_prefixes:
        if normalized.startswith(prefix):
            suffix = normalized[len(prefix):].lstrip("/")
            return f"/uploads/{suffix}"

    return normalized if normalized.startswith("/") else f"/{normalized}"


class MockExamOptionPayload(BaseModel):
    id: str = Field(..., min_length=1, max_length=10)
    text: Optional[str] = None
    imageUrl: Optional[str] = None


class MockExamQuestionPayload(BaseModel):
    id: int
    subject: Optional[str] = None
    prompt: str = ""
    imageUrl: Optional[str] = None
    options: List[MockExamOptionPayload] = Field(default_factory=list)
    correctOptionId: str = Field(..., min_length=1, max_length=10)


class MockExamCreate(BaseModel):
    slug: str
    title: str = Field(..., min_length=2)
    exam_group: str = DEFAULT_EXAM_GROUP
    section_type: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    duration_minutes: int = Field(..., ge=1, le=300)
    questions: List[MockExamQuestionPayload] = Field(default_factory=list)
    sort_order: int = 0
    is_published: bool = False


class MockExamUpdate(BaseModel):
    slug: Optional[str] = None
    title: Optional[str] = Field(default=None, min_length=2)
    exam_group: Optional[str] = None
    section_type: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    duration_minutes: Optional[int] = Field(default=None, ge=1, le=300)
    questions: Optional[List[MockExamQuestionPayload]] = None
    sort_order: Optional[int] = None
    is_published: Optional[bool] = None


class MockExamAdminResponse(BaseModel):
    id: int
    slug: str
    title: str
    exam_group: str
    section_type: str
    description: Optional[str]
    instructions: Optional[str]
    duration_minutes: int
    question_count: int
    questions: List[MockExamQuestionPayload]
    sort_order: int
    is_published: bool
    attempt_count: int
    last_attempt_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MockExamPublicQuestion(BaseModel):
    id: int
    subject: str
    prompt: str
    imageUrl: Optional[str] = None
    options: List[MockExamOptionPayload]


class MockExamPublicListItem(BaseModel):
    id: int
    slug: str
    title: str
    exam_group: str
    section_type: str
    description: Optional[str]
    instructions: Optional[str]
    duration_minutes: int
    question_count: int
    sort_order: int


class MockExamPublicResponse(MockExamPublicListItem):
    questions: List[MockExamPublicQuestion]


class MockExamAnswerSubmission(BaseModel):
    question_id: int
    selected_option_id: Optional[str] = None


class MockExamSubmitRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    email: str = Field(..., min_length=5, max_length=160)
    phone: str = Field(..., min_length=10, max_length=30)
    answers: List[MockExamAnswerSubmission] = Field(default_factory=list)


class MockExamReviewItem(BaseModel):
    question_id: int
    selected_option_id: Optional[str] = None
    correct_option_id: str
    is_correct: bool


class MockExamSubmitResponse(BaseModel):
    attempt_id: int
    correct_count: int
    wrong_count: int
    blank_count: int
    total_questions: int
    review: List[MockExamReviewItem]


class MockExamAttemptAdminResponse(BaseModel):
    id: int
    exam_id: int
    full_name: str
    email: str
    phone: str
    correct_count: int
    wrong_count: int
    blank_count: int
    total_questions: int
    score_percentage: float
    wrong_question_ids: List[int]
    blank_question_ids: List[int]
    review: List[MockExamReviewItem]
    submitted_at: datetime


class MockExamAttemptOverviewResponse(MockExamAttemptAdminResponse):
    exam_title: str
    exam_slug: str
    exam_group: str
    exam_section_type: str


def ensure_mock_exam_schema(db: Session):
    global _mock_exam_schema_checked

    if _mock_exam_schema_checked:
        return

    bind = db.get_bind()
    inspector = inspect(bind)
    if "mock_exams" not in inspector.get_table_names():
        _mock_exam_schema_checked = True
        return

    columns = [column.get("name") for column in inspector.get_columns("mock_exams")]
    schema_changed = False

    if "exam_group" not in columns:
        db.execute(text("ALTER TABLE mock_exams ADD COLUMN exam_group VARCHAR(32) DEFAULT 'lgs'"))
        schema_changed = True

    if schema_changed:
        db.execute(text("UPDATE mock_exams SET exam_group = 'lgs' WHERE exam_group IS NULL OR TRIM(exam_group) = ''"))
        db.commit()

    _mock_exam_schema_checked = True


def normalize_exam_group(value: Optional[str]) -> str:
    normalized = (value or DEFAULT_EXAM_GROUP).strip().lower().replace("-", "_").replace(" ", "_")
    aliases = {
        "4": "grade_4",
        "5": "grade_5",
        "6": "grade_6",
        "7": "grade_7",
        "8": "grade_8",
        "9": "grade_9",
        "10": "grade_10",
        "11": "grade_11",
        "12": "grade_12",
        "4_sinif": "grade_4",
        "5_sinif": "grade_5",
        "6_sinif": "grade_6",
        "7_sinif": "grade_7",
        "8_sinif": "grade_8",
        "9_sinif": "grade_9",
        "10_sinif": "grade_10",
        "11_sinif": "grade_11",
        "12_sinif": "grade_12",
    }
    normalized = aliases.get(normalized, normalized)
    if normalized not in VALID_EXAM_GROUPS:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Geçersiz exam_group.")
    return normalized


def get_subjects_for_exam(section_type: str, exam_group: Optional[str] = None) -> List[str]:
    normalized_group = normalize_exam_group(exam_group) if exam_group else DEFAULT_EXAM_GROUP
    if section_type == "quantitative":
        return QUANTITATIVE_SUBJECTS
    if section_type != "verbal":
        return []
    if normalized_group in {"grade_6", "grade_7"}:
        return GRADE_6_7_VERBAL_SUBJECTS
    if normalized_group == "grade_8":
        return GRADE_8_VERBAL_SUBJECTS
    return DEFAULT_VERBAL_SUBJECTS


def normalize_subject_alias(subject: Optional[str], exam_group: Optional[str] = None) -> str:
    normalized_subject = (subject or "").strip().lower()
    normalized_group = normalize_exam_group(exam_group) if exam_group else DEFAULT_EXAM_GROUP
    return SUBJECT_ALIASES_BY_GROUP.get(normalized_group, {}).get(normalized_subject, normalized_subject)


def get_default_subject(section_type: str, exam_group: Optional[str] = None) -> str:
    subjects = get_subjects_for_exam(section_type, exam_group) or []
    return subjects[0] if subjects else "genel"


def get_section_duration(section_type: str) -> int:
    return SECTION_DURATION_MINUTES.get(section_type, 75)


def normalize_duration_minutes(duration_minutes: Optional[int], section_type: str) -> int:
    if duration_minutes is None:
        return get_section_duration(section_type)

    try:
        numeric_value = int(duration_minutes)
    except (TypeError, ValueError):
        return get_section_duration(section_type)

    return max(1, min(300, numeric_value))


def infer_subject_from_position(section_type: str, position: int, total_questions: int, exam_group: Optional[str] = None) -> str:
    subjects = get_subjects_for_exam(section_type, exam_group) or [get_default_subject(section_type, exam_group)]
    safe_total = max(total_questions, len(subjects), 1)
    index = min(len(subjects) - 1, int((position * len(subjects)) / safe_total))
    return subjects[index]


def normalize_subject(section_type: str, subject: Optional[str], position: int, total_questions: int, exam_group: Optional[str] = None) -> str:
    normalized = normalize_subject_alias(subject, exam_group)
    valid_subjects = get_subjects_for_exam(section_type, exam_group) or []
    if normalized in valid_subjects:
        return normalized
    return infer_subject_from_position(section_type, position, total_questions, exam_group)


def subject_sort_key(section_type: str, subject: str, exam_group: Optional[str] = None) -> int:
    valid_subjects = get_subjects_for_exam(section_type, exam_group) or []
    try:
        return valid_subjects.index(subject)
    except ValueError:
        return len(valid_subjects)


def normalize_questions(section_type: str, questions: List[MockExamQuestionPayload], exam_group: Optional[str] = None) -> List[Dict[str, Any]]:
    if not questions:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="En az bir soru gereklidir.",
        )

    normalized_questions: List[Dict[str, Any]] = []
    seen_question_ids = set()

    total_questions = len(questions)

    for position, question in enumerate(questions):
        if question.id in seen_question_ids:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Soru id tekrarlı: {question.id}",
            )
        seen_question_ids.add(question.id)

        question_image_url = normalize_media_url(question.imageUrl)
        prompt = (question.prompt or "").strip()
        if len(prompt) < 3 and not question_image_url:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{question.id}. soru için soru metni veya görsel gereklidir.",
            )

        if len(question.options) < 2:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{question.id}. soru için en az iki seçenek gereklidir.",
            )

        option_ids = set()
        normalized_options = []
        for option in question.options:
            option_id = (option.id or "").strip().upper()
            option_text = (option.text or "").strip()
            option_image_url = normalize_media_url(option.imageUrl)
            if not option_id or (not option_text and not option_image_url):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"{question.id}. soru için seçenekte metin veya görsel gereklidir.",
                )
            if option_id in option_ids:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"{question.id}. soru için seçenek id tekrarlı: {option_id}",
                )
            option_ids.add(option_id)
            normalized_options.append({"id": option_id, "text": option_text, "imageUrl": option_image_url})

        correct_option_id = (question.correctOptionId or "").strip().upper()
        if correct_option_id not in option_ids:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{question.id}. soru için doğru cevap seçenekler arasında değil.",
            )

        normalized_subject = normalize_subject(section_type, question.subject, position, total_questions, exam_group)

        normalized_questions.append(
            {
                "id": question.id,
                "subject": normalized_subject,
                "prompt": prompt,
                "imageUrl": question_image_url,
                "options": normalized_options,
                "correctOptionId": correct_option_id,
            }
        )

    normalized_questions.sort(
        key=lambda question: (
            subject_sort_key(section_type, question.get("subject", ""), exam_group),
            question["id"],
        )
    )

    for index, question in enumerate(normalized_questions, start=1):
        question["id"] = index

    return normalized_questions


def normalize_contact_info(full_name: str, email: str, phone: str) -> Dict[str, str]:
    normalized_full_name = " ".join((full_name or "").split())
    normalized_email = (email or "").strip().lower()
    normalized_phone = (phone or "").strip()
    phone_digits = "".join(ch for ch in normalized_phone if ch.isdigit())

    if len(normalized_full_name) < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Ad soyad zorunludur.",
        )

    if "@" not in normalized_email or normalized_email.startswith("@") or normalized_email.endswith("@"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Geçerli bir e-posta adresi giriniz.",
        )

    email_domain = normalized_email.split("@", 1)[-1]
    if "." not in email_domain or email_domain.startswith(".") or email_domain.endswith("."):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Geçerli bir e-posta adresi giriniz.",
        )

    if len(phone_digits) < 10:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Geçerli bir telefon numarası giriniz.",
        )

    return {
        "full_name": normalized_full_name,
        "email": normalized_email,
        "phone": normalized_phone,
    }


def normalize_placeholder_text(value: Optional[str]) -> str:
    normalized = " ".join((value or "").strip().lower().split())
    replacements = {
        "ğ": "g",
        "ü": "u",
        "ş": "s",
        "ı": "i",
        "ö": "o",
        "ç": "c",
    }
    for source, target in replacements.items():
        normalized = normalized.replace(source, target)
    return normalized


def find_placeholder_question_ids(questions: List[Dict[str, Any]]) -> List[int]:
    placeholder_option_texts = {"secenek a", "secenek b", "secenek c", "secenek d"}
    placeholder_question_ids: List[int] = []

    for question in questions:
        has_question_image = bool(normalize_media_url(question.get("imageUrl")))
        prompt = normalize_placeholder_text(question.get("prompt"))
        if re.search(r"\bicin yeni soru\b", prompt) and not has_question_image:
            placeholder_question_ids.append(question["id"])
            continue

        option_texts = [
            normalize_placeholder_text(option.get("text"))
            for option in question.get("options", [])
            if normalize_placeholder_text(option.get("text"))
        ]
        has_option_image = any(normalize_media_url(option.get("imageUrl")) for option in question.get("options", []))
        if option_texts and all(option_text in placeholder_option_texts for option_text in option_texts) and not has_option_image:
            placeholder_question_ids.append(question["id"])

    return placeholder_question_ids


def ensure_exam_is_publishable(questions: List[Dict[str, Any]]):
    placeholder_question_ids = find_placeholder_question_ids(questions)
    if placeholder_question_ids:
        question_list = ", ".join(str(question_id) for question_id in placeholder_question_ids)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Taslak/ornek soru iceren deneme yayinlanamaz. Kontrol edilmesi gereken sorular: {question_list}",
        )


def build_exam_review(
    questions: List[Dict[str, Any]],
    answers_by_question: Dict[int, Optional[str]],
) -> Dict[str, Any]:
    correct_count = 0
    wrong_count = 0
    blank_count = 0
    review: List[MockExamReviewItem] = []

    for question in questions:
        selected_option_id = answers_by_question.get(question["id"])
        correct_option_id = question["correctOptionId"]

        if not selected_option_id:
            blank_count += 1
            review.append(
                MockExamReviewItem(
                    question_id=question["id"],
                    selected_option_id=None,
                    correct_option_id=correct_option_id,
                    is_correct=False,
                )
            )
            continue

        is_correct = selected_option_id == correct_option_id
        if is_correct:
            correct_count += 1
        else:
            wrong_count += 1

        review.append(
            MockExamReviewItem(
                question_id=question["id"],
                selected_option_id=selected_option_id,
                correct_option_id=correct_option_id,
                is_correct=is_correct,
            )
        )

    return {
        "correct_count": correct_count,
        "wrong_count": wrong_count,
        "blank_count": blank_count,
        "review": review,
    }


def serialize_admin_exam(exam: MockExam) -> MockExamAdminResponse:
    raw_questions = exam.questions_json or []
    questions = [
        {
            **question,
            "subject": normalize_subject(
                exam.section_type,
                question.get("subject"),
                index,
                len(raw_questions),
                getattr(exam, "exam_group", None),
            ),
            "imageUrl": normalize_media_url(question.get("imageUrl")),
            "options": [
                {
                    **option,
                    "imageUrl": normalize_media_url(option.get("imageUrl")),
                }
                for option in question.get("options", [])
            ],
        }
        for index, question in enumerate(raw_questions)
    ]
    attempts = exam.attempts or []
    last_attempt_at = max((attempt.submitted_at for attempt in attempts), default=None)
    return MockExamAdminResponse(
        id=exam.id,
        slug=exam.slug,
        title=exam.title,
        exam_group=(getattr(exam, "exam_group", None) or DEFAULT_EXAM_GROUP),
        section_type=exam.section_type,
        description=exam.description,
        instructions=exam.instructions,
        duration_minutes=exam.duration_minutes,
        question_count=len(questions),
        questions=questions,
        sort_order=exam.sort_order,
        is_published=exam.is_published,
        attempt_count=len(attempts),
        last_attempt_at=last_attempt_at,
        created_at=exam.created_at,
        updated_at=exam.updated_at,
    )


def serialize_public_list_item(exam: MockExam) -> MockExamPublicListItem:
    questions = exam.questions_json or []
    return MockExamPublicListItem(
        id=exam.id,
        slug=exam.slug,
        title=exam.title,
        exam_group=(getattr(exam, "exam_group", None) or DEFAULT_EXAM_GROUP),
        section_type=exam.section_type,
        description=exam.description,
        instructions=exam.instructions,
        duration_minutes=exam.duration_minutes,
        question_count=len(questions),
        sort_order=exam.sort_order,
    )


def serialize_public_exam(exam: MockExam) -> MockExamPublicResponse:
    questions = exam.questions_json or []
    public_questions = [
        {
            "id": question["id"],
            "subject": normalize_subject(
                exam.section_type,
                question.get("subject"),
                index,
                len(questions),
                getattr(exam, "exam_group", None),
            ),
            "prompt": question["prompt"],
            "imageUrl": normalize_media_url(question.get("imageUrl")),
            "options": [
                {
                    **option,
                    "imageUrl": normalize_media_url(option.get("imageUrl")),
                }
                for option in question["options"]
            ],
        }
        for index, question in enumerate(questions)
    ]
    payload = serialize_public_list_item(exam).dict()
    payload["questions"] = public_questions
    return MockExamPublicResponse(**payload)


def serialize_attempt(attempt: MockExamAttempt) -> MockExamAttemptAdminResponse:
    review = [MockExamReviewItem(**item) for item in (attempt.review_json or [])]
    wrong_question_ids = [item.question_id for item in review if item.selected_option_id and not item.is_correct]
    blank_question_ids = [item.question_id for item in review if not item.selected_option_id]
    score_percentage = round((attempt.correct_count / attempt.total_questions) * 100, 1) if attempt.total_questions else 0.0
    return MockExamAttemptAdminResponse(
        id=attempt.id,
        exam_id=attempt.exam_id,
        full_name=attempt.full_name,
        email=attempt.email,
        phone=attempt.phone,
        correct_count=attempt.correct_count,
        wrong_count=attempt.wrong_count,
        blank_count=attempt.blank_count,
        total_questions=attempt.total_questions,
        score_percentage=score_percentage,
        wrong_question_ids=wrong_question_ids,
        blank_question_ids=blank_question_ids,
        review=review,
        submitted_at=attempt.submitted_at,
    )


def serialize_attempt_overview(attempt: MockExamAttempt) -> MockExamAttemptOverviewResponse:
    serialized = serialize_attempt(attempt).dict()
    exam = attempt.exam
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Deneme sınavı ilişkisi bulunamadı.",
        )

    serialized.update(
        exam_title=exam.title,
        exam_slug=exam.slug,
        exam_group=(getattr(exam, "exam_group", None) or DEFAULT_EXAM_GROUP),
        exam_section_type=exam.section_type,
    )
    return MockExamAttemptOverviewResponse(**serialized)


def get_exam_or_404(db: Session, exam_id: int) -> MockExam:
    exam = db.query(MockExam).filter(MockExam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deneme sınavı bulunamadı.")
    return exam


def get_published_exam_or_404(db: Session, slug: str) -> MockExam:
    exam = (
        db.query(MockExam)
        .filter(MockExam.slug == slug, MockExam.is_published == True)
        .first()
    )
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Yayınlanmış deneme sınavı bulunamadı.")
    return exam


@router.get("/admin/mock-exams", response_model=List[MockExamAdminResponse])
def get_admin_mock_exams(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    ensure_mock_exam_schema(db)
    exams = (
        db.query(MockExam)
        .order_by(MockExam.sort_order.asc(), MockExam.created_at.asc())
        .all()
    )
    return [serialize_admin_exam(exam) for exam in exams]


@router.get("/admin/mock-exams/attempts", response_model=List[MockExamAttemptOverviewResponse])
def get_admin_all_mock_exam_attempts(
    limit: int = 500,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    ensure_mock_exam_schema(db)
    safe_limit = min(max(limit, 1), 500)
    attempts = (
        db.query(MockExamAttempt)
        .join(MockExam)
        .order_by(MockExamAttempt.submitted_at.desc(), MockExamAttempt.id.desc())
        .limit(safe_limit)
        .all()
    )
    return [serialize_attempt_overview(attempt) for attempt in attempts]


@router.get("/admin/mock-exams/{exam_id}/attempts", response_model=List[MockExamAttemptAdminResponse])
def get_admin_mock_exam_attempts(
    exam_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    ensure_mock_exam_schema(db)
    get_exam_or_404(db, exam_id)
    attempts = (
        db.query(MockExamAttempt)
        .filter(MockExamAttempt.exam_id == exam_id)
        .order_by(MockExamAttempt.submitted_at.desc(), MockExamAttempt.id.desc())
        .all()
    )
    return [serialize_attempt(attempt) for attempt in attempts]


@router.post("/admin/mock-exams", response_model=MockExamAdminResponse, status_code=status.HTTP_201_CREATED)
def create_mock_exam(
    payload: MockExamCreate,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    ensure_mock_exam_schema(db)
    section_type = (payload.section_type or "").strip().lower()
    if section_type not in VALID_SECTION_TYPES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Geçersiz section_type.")
    exam_group = normalize_exam_group(payload.exam_group)

    slug = slugify(payload.slug)
    if not slug:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Geçerli bir slug gereklidir.")

    existing = db.query(MockExam).filter(MockExam.slug == slug).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bu slug zaten kullanılıyor.")

    normalized_questions = normalize_questions(section_type, payload.questions, exam_group)
    if payload.is_published:
        ensure_exam_is_publishable(normalized_questions)

    exam = MockExam(
        slug=slug,
        title=payload.title.strip(),
        exam_group=exam_group,
        section_type=section_type,
        description=(payload.description or "").strip() or None,
        instructions=(payload.instructions or "").strip() or None,
        duration_minutes=normalize_duration_minutes(payload.duration_minutes, section_type),
        questions_json=normalized_questions,
        sort_order=payload.sort_order,
        is_published=payload.is_published,
    )
    db.add(exam)
    db.commit()
    db.refresh(exam)
    return serialize_admin_exam(exam)


@router.put("/admin/mock-exams/{exam_id}", response_model=MockExamAdminResponse)
def update_mock_exam(
    exam_id: int,
    payload: MockExamUpdate,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    ensure_mock_exam_schema(db)
    exam = get_exam_or_404(db, exam_id)
    section_type_changed = False

    if payload.slug is not None:
        slug = slugify(payload.slug)
        if not slug:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Geçerli bir slug gereklidir.")
        existing = db.query(MockExam).filter(MockExam.slug == slug, MockExam.id != exam_id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bu slug zaten kullanılıyor.")
        exam.slug = slug

    if payload.title is not None:
        exam.title = payload.title.strip()

    if payload.exam_group is not None:
        exam.exam_group = normalize_exam_group(payload.exam_group)

    if payload.section_type is not None:
        section_type = payload.section_type.strip().lower()
        if section_type not in VALID_SECTION_TYPES:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Geçersiz section_type.")
        exam.section_type = section_type
        section_type_changed = True

    if payload.description is not None:
        exam.description = payload.description.strip() or None

    if payload.instructions is not None:
        exam.instructions = payload.instructions.strip() or None

    if payload.duration_minutes is not None:
        exam.duration_minutes = normalize_duration_minutes(payload.duration_minutes, exam.section_type)
    elif section_type_changed:
        exam.duration_minutes = get_section_duration(exam.section_type)

    if payload.questions is not None:
        exam.questions_json = normalize_questions(exam.section_type, payload.questions, exam.exam_group)

    if payload.sort_order is not None:
        exam.sort_order = payload.sort_order

    if payload.is_published is not None:
        exam.is_published = payload.is_published

    if exam.is_published:
        ensure_exam_is_publishable(exam.questions_json or [])

    exam.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(exam)
    return serialize_admin_exam(exam)


@router.delete("/admin/mock-exams/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mock_exam(
    exam_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    ensure_mock_exam_schema(db)
    exam = get_exam_or_404(db, exam_id)
    db.query(MockExamAttempt).filter(MockExamAttempt.exam_id == exam_id).delete(synchronize_session=False)
    db.delete(exam)
    db.commit()
    return None


@router.put("/admin/mock-exams/{exam_id}/publish", response_model=MockExamAdminResponse)
def publish_mock_exam(
    exam_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    ensure_mock_exam_schema(db)
    exam = get_exam_or_404(db, exam_id)
    ensure_exam_is_publishable(exam.questions_json or [])
    exam.is_published = True
    exam.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(exam)
    return serialize_admin_exam(exam)


@router.put("/admin/mock-exams/{exam_id}/unpublish", response_model=MockExamAdminResponse)
def unpublish_mock_exam(
    exam_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    ensure_mock_exam_schema(db)
    exam = get_exam_or_404(db, exam_id)
    exam.is_published = False
    exam.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(exam)
    return serialize_admin_exam(exam)


@router.get("/mock-exams", response_model=List[MockExamPublicListItem])
def get_public_mock_exams(db: Session = Depends(get_db)):
    ensure_mock_exam_schema(db)
    exams = (
        db.query(MockExam)
        .filter(MockExam.is_published == True)
        .order_by(MockExam.sort_order.asc(), MockExam.created_at.asc())
        .all()
    )
    return [serialize_public_list_item(exam) for exam in exams]


@router.get("/mock-exams/{slug}", response_model=MockExamPublicResponse)
def get_public_mock_exam(slug: str, db: Session = Depends(get_db)):
    ensure_mock_exam_schema(db)
    exam = get_published_exam_or_404(db, slug)
    return serialize_public_exam(exam)


@router.post("/mock-exams/{slug}/submit", response_model=MockExamSubmitResponse)
def submit_public_mock_exam(
    slug: str,
    payload: MockExamSubmitRequest,
    db: Session = Depends(get_db),
):
    ensure_mock_exam_schema(db)
    exam = get_published_exam_or_404(db, slug)
    contact_info = normalize_contact_info(payload.full_name, payload.email, payload.phone)

    answers_by_question = {
        item.question_id: (item.selected_option_id or "").strip().upper() or None
        for item in payload.answers
    }
    normalized_answers = [
        {
            "question_id": question_id,
            "selected_option_id": selected_option_id,
        }
        for question_id, selected_option_id in sorted(answers_by_question.items())
    ]

    questions = exam.questions_json or []
    result = build_exam_review(questions, answers_by_question)
    review = result["review"]

    attempt = MockExamAttempt(
        exam_id=exam.id,
        full_name=contact_info["full_name"],
        email=contact_info["email"],
        phone=contact_info["phone"],
        answers_json=normalized_answers,
        review_json=[item.model_dump() for item in review],
        correct_count=result["correct_count"],
        wrong_count=result["wrong_count"],
        blank_count=result["blank_count"],
        total_questions=len(questions),
        submitted_at=datetime.utcnow(),
    )
    db.add(attempt)
    exam.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(attempt)

    return MockExamSubmitResponse(
        attempt_id=attempt.id,
        correct_count=result["correct_count"],
        wrong_count=result["wrong_count"],
        blank_count=result["blank_count"],
        total_questions=len(questions),
        review=review,
    )
