from typing import Optional
from decimal import Decimal, ROUND_HALF_UP

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import DiscountCode, Course, CourseBoxPricing

router = APIRouter()


class DiscountValidateRequest(BaseModel):
    code: str
    item_type: Optional[str] = 'course'  # 'course' or 'course_box' or 'general'
    item_id: Optional[int] = None


class DiscountValidateResponse(BaseModel):
    valid: bool
    percent: Optional[int] = None
    original_price: Optional[float] = None
    new_price: Optional[float] = None
    message: Optional[str] = None


@router.post("/validate", response_model=DiscountValidateResponse)
def validate_discount(payload: DiscountValidateRequest, db: Session = Depends(get_db)):
    """
    Validate a discount code for a given item (course or course_box).
    Accepts JSON body: { code, item_type, item_id }
    Returns JSON: { valid, percent?, original_price?, new_price?, message? }
    """
    code = (payload.code or '').strip()
    item_type = payload.item_type or 'course'
    item_id = payload.item_id

    if not code:
        raise HTTPException(status_code=400, detail="Kod boş olamaz")

    # Case-insensitive match
    discount = db.query(DiscountCode).filter(func.lower(DiscountCode.code) == code.lower()).first()
    if not discount or not discount.active:
        return DiscountValidateResponse(valid=False, message="İndirim kodu bulunamadı veya pasif")

    percent = int(discount.percent or 0)

    original_price = None
    new_price = None

    try:
        if item_type == 'course' and item_id:
            course = db.query(Course).filter(Course.id == item_id).first()
            if not course:
                return DiscountValidateResponse(valid=False, message="Kurs bulunamadı")
            base = course.discount_price if (course.discount_price is not None) else course.price
            original_price = float(base or 0)
        elif item_type == 'course_box' and item_id:
            pricing = db.query(CourseBoxPricing).filter(CourseBoxPricing.course_box_id == item_id).first()
            if not pricing:
                return DiscountValidateResponse(valid=False, message="Kutu fiyatlandırması bulunamadı")
            base = pricing.discount_price if (pricing.discount_price is not None) else pricing.price
            original_price = float(base or 0)
        else:
            # No item provided: return percent only
            return DiscountValidateResponse(valid=True, percent=percent, message="Genel indirim kodu geçerli")

        multiplier = (100 - percent) / 100.0
        calculated = Decimal(str(original_price)) * Decimal(str(multiplier))
        new_price = float(calculated.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))

        return DiscountValidateResponse(valid=True, percent=percent, original_price=original_price, new_price=new_price, message="İndirim kodu uygulandı")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Hesaplama hatası: {str(e)}")
