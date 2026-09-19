from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from backend.database import get_db
from backend.models import ConsentRecord, User
from backend.auth import get_current_user
from backend.schemas import ConsentCreate, ConsentOut

router = APIRouter(prefix="/consent", tags=["Consent"])

@router.post("", response_model=ConsentOut)
def record_consent(consent_in: ConsentCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    consent_data = consent_in.model_dump(exclude={"user_id"})
    consent = ConsentRecord(**consent_data, owner_id=user.id)
    db.add(consent)
    db.commit()
    db.refresh(consent)
    return consent

@router.get("", response_model=List[ConsentOut])
def list_consent(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return db.query(ConsentRecord).filter(ConsentRecord.owner_id == user.id).order_by(ConsentRecord.created_at.desc()).offset(skip).limit(limit).all()
