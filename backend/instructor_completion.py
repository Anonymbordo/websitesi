from typing import List, Optional


def _has_text(value: Optional[object]) -> bool:
    return bool(value and str(value).strip())


def _split_items(value: Optional[object]) -> List[str]:
    if not _has_text(value):
        return []

    normalized = str(value).replace("|", ",")
    return [item.strip() for item in normalized.split(",") if item.strip()]


def get_instructor_application_missing_fields(user, instructor) -> List[str]:
    missing: List[str] = []

    if not _has_text(getattr(user, "full_name", None)):
        missing.append("Ad Soyad")
    if not _has_text(getattr(user, "phone", None)):
        missing.append("Telefon")

    if instructor is None:
        missing.extend(
            [
                "Unvan",
                "Deneyim Süresi",
                "Kısa Biyografi",
                "Uzmanlık Alanı",
                "Öğretmek İstediğiniz Konular",
                "Eğitmenlik Motivasyonu",
            ]
        )
        return missing

    if not _has_text(getattr(instructor, "title", None)):
        missing.append("Unvan")
    if int(getattr(instructor, "experience_years", 0) or 0) <= 0:
        missing.append("Deneyim Süresi")
    if not _has_text(getattr(instructor, "bio", None)):
        missing.append("Kısa Biyografi")
    if not _split_items(getattr(instructor, "specialization", None)):
        missing.append("Uzmanlık Alanı")
    if not _split_items(getattr(instructor, "course_topics", None)):
        missing.append("Öğretmek İstediğiniz Konular")
    if not _has_text(getattr(instructor, "teaching_motivation", None)):
        missing.append("Eğitmenlik Motivasyonu")

    return missing


def get_instructor_application_status(user, instructor) -> dict:
    missing_fields = get_instructor_application_missing_fields(user, instructor)
    return {
        "application_complete": len(missing_fields) == 0,
        "application_missing_fields": missing_fields,
    }
