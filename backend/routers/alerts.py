"""
Alerts Router — View, acknowledge, take action on, and rollback alerts.

Alerts are the core output of LeakGuard's detection engine.
Each alert represents a potential data leak found in ingested logs.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
import json

from backend.database import get_db
from backend.models import Alert, AuditEntry, IngestedLog, User
from backend.auth import get_current_user
from backend.schemas import AlertOut, AlertActionRequest

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("", response_model=List[AlertOut])
def list_alerts(
    severity: Optional[str] = None,
    status: Optional[str] = None,
    source_type: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List alerts with optional filters for severity, status, and source type."""
    query = db.query(Alert).join(IngestedLog).filter(IngestedLog.owner_id == user.id)

    if severity:
        query = query.filter(Alert.severity == severity)
    if status:
        query = query.filter(Alert.status == status)
    if source_type:
        query = query.filter(IngestedLog.source_type == source_type)

    return query.order_by(Alert.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{alert_id}", response_model=AlertOut)
def get_alert(alert_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Get a single alert by ID."""
    alert = db.query(Alert).join(IngestedLog).filter(Alert.id == alert_id, IngestedLog.owner_id == user.id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.post("/{alert_id}/acknowledge", response_model=AlertOut)
def acknowledge_alert(alert_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """
    Mark an alert as 'acknowledged' — you've seen it and are handling it.
    This is like clicking 'I've read this' on a notification.
    """
    alert = db.query(Alert).join(IngestedLog).filter(Alert.id == alert_id, IngestedLog.owner_id == user.id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    previous_status = alert.status
    alert.status = "acknowledged"
    alert.updated_at = datetime.now(timezone.utc)

    audit = AuditEntry(
        action="alert_acknowledged",
        actor=user.email,
        owner_id=user.id,
        entity_type="alert",
        entity_id=alert.id,
        details=json.dumps({"previous_status": previous_status}),
        created_at=datetime.now(timezone.utc),
    )
    db.add(audit)
    db.commit()
    db.refresh(alert)
    return alert


@router.post("/{alert_id}/action", response_model=AlertOut)
def alert_action(
    alert_id: int,
    request: AlertActionRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Take an action on an alert: notify, throttle, or block.
    'block' automatically resolves the alert.
    """
    alert = db.query(Alert).join(IngestedLog).filter(Alert.id == alert_id, IngestedLog.owner_id == user.id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.action_taken = request.action
    alert.updated_at = datetime.now(timezone.utc)
    if request.action == "block":
        alert.status = "resolved"

    audit = AuditEntry(
        action="alert_action_taken",
        actor=user.email,
        owner_id=user.id,
        entity_type="alert",
        entity_id=alert.id,
        details=json.dumps({"action": request.action}),
        created_at=datetime.now(timezone.utc),
    )
    db.add(audit)
    db.commit()
    db.refresh(alert)
    return alert


@router.post("/{alert_id}/rollback", response_model=AlertOut)
def rollback_alert(alert_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """
    Rollback an alert — undo the action taken and re-open it.
    Like pressing 'Ctrl+Z' on a decision.
    """
    alert = db.query(Alert).join(IngestedLog).filter(Alert.id == alert_id, IngestedLog.owner_id == user.id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    previous_action = alert.action_taken
    alert.action_taken = None
    alert.status = "open"
    alert.updated_at = datetime.now(timezone.utc)

    audit = AuditEntry(
        action="alert_rollback",
        actor=user.email,
        owner_id=user.id,
        entity_type="alert",
        entity_id=alert.id,
        details=json.dumps({"rolled_back_action": previous_action}),
        created_at=datetime.now(timezone.utc),
    )
    db.add(audit)
    db.commit()
    db.refresh(alert)
    return alert
