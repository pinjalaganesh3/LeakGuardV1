from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.database import get_db
from backend.models import AuditEntry, User
from backend.auth import get_current_user
from backend.schemas import AuditEntryOut

router = APIRouter(prefix="/audit", tags=["Audit"])

@router.get("", response_model=List[AuditEntryOut])
def list_audit_entries(
    action: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(AuditEntry).filter(AuditEntry.owner_id == user.id)
    if action:
        query = query.filter(AuditEntry.action == action)
        
    return query.order_by(AuditEntry.created_at.desc()).offset(skip).limit(limit).all()
