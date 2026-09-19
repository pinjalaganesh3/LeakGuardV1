from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta, timezone

from backend.database import get_db
from backend.models import IngestedLog, Alert, User
from backend.auth import get_current_user
from backend.schemas import DashboardStats, AlertOut

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    owner_logs = db.query(IngestedLog).filter(IngestedLog.owner_id == user.id)
    total_scans = owner_logs.count()
    owner_alerts = db.query(Alert).join(IngestedLog).filter(IngestedLog.owner_id == user.id)
    
    active_alerts = owner_alerts.filter(Alert.status == 'open').count()
    resolved_alerts = owner_alerts.filter(Alert.status == 'resolved').count()
    critical_alerts = owner_alerts.filter(Alert.severity == 'critical').count()
    
    severities = owner_alerts.with_entities(Alert.severity, func.count(Alert.id)).group_by(Alert.severity).all()
    severity_breakdown = {sev: count for sev, count in severities}
    
    recent_alerts = owner_alerts.order_by(Alert.created_at.desc()).limit(5).all()
    
    timeline = []
    today = datetime.now(timezone.utc).date()
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        start_dt = datetime.combine(day, datetime.min.time()).replace(tzinfo=timezone.utc)
        end_dt = start_dt + timedelta(days=1)
        count = owner_alerts.filter(Alert.created_at >= start_dt, Alert.created_at < end_dt).count()
        timeline.append({"date": day.isoformat(), "count": count})
        
    return DashboardStats(
        total_scans=total_scans,
        active_alerts=active_alerts,
        resolved_alerts=resolved_alerts,
        critical_alerts=critical_alerts,
        severity_breakdown=severity_breakdown,
        recent_alerts=recent_alerts,
        timeline=timeline
    )
