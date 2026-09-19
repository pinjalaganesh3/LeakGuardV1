"""
Ingest Router — Accepts log data, runs DLP detection, creates alerts.

This is the main entry point for feeding data into LeakGuard.
Think of it like a security checkpoint: every log that comes in gets scanned
for sensitive information before being stored.
"""

from fastapi import APIRouter, Depends, BackgroundTasks
from fastapi.responses import Response
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import json

from backend.database import get_db
from backend.models import IngestedLog, Alert, Rule, AuditEntry, User
from backend.auth import get_current_user
from backend.schemas import IngestRequest, IngestResponse, FindingOut
from backend.detection import run_detection
from backend.notifier import NotificationService

router = APIRouter(prefix="/ingest", tags=["Ingest"])


@router.post("", response_model=IngestResponse)
def ingest_log(
    request: IngestRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Ingest a log entry and scan it for sensitive data leaks.

    Flow:
    1. Save the raw log to the database
    2. Fetch all active detection rules
    3. Run the detection engine (regex + semantic)
    4. Create an Alert for each finding
    5. Log the action in the audit trail
    6. Trigger notifications for critical/high severity findings
    """

    # Step 1: Store the raw log
    new_log = IngestedLog(
        source_type=request.source_type,
        owner_id=user.id,
        content=request.content,
        metadata_json=json.dumps({**(request.metadata or {}), "filename": request.filename} if request.filename else request.metadata) if request.metadata or request.filename else None,
        created_at=datetime.now(timezone.utc),
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)

    # Step 2: Get all active (enabled) rules from the database
    active_rules = db.query(Rule).filter(
        Rule.enabled == True,
        (Rule.owner_id == user.id) | (Rule.owner_id.is_(None)),
    ).all()

    # Step 3: Run the detection engine on the log content
    findings = run_detection(new_log.content, active_rules)

    # Step 4: Create Alert records for each finding
    alerts_created = 0
    findings_out = []

    for finding in findings:
        # Determine suggested action based on severity:
        #   critical → block, high → throttle, medium/low → notify
        severity = finding.severity.lower()
        if severity == "critical":
            suggested_action = "block"
        elif severity == "high":
            suggested_action = "throttle"
        else:
            suggested_action = "notify"

        alert = Alert(
            log_id=new_log.id,
            rule_name=finding.rule_name,
            match_type=finding.match_type,
            severity=severity,
            confidence=finding.confidence,
            raw_evidence=finding.raw_evidence,
            redacted_evidence=finding.redacted_evidence,
            status="open",
            suggested_action=suggested_action,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(alert)
        db.flush()  # Get the alert.id without committing
        alerts_created += 1

        # Trigger background notifications for serious findings
        if severity in ["critical", "high"]:
            background_tasks.add_task(
                NotificationService.notify_alert,
                alert.id,
                alert.rule_name,
                alert.severity,
                alert.confidence,
                alert.redacted_evidence,
                alert.action_taken,
                alert.suggested_action,
            )

        findings_out.append(
            FindingOut(
                rule_name=finding.rule_name,
                match_type=finding.match_type,
                severity=severity,
                confidence=finding.confidence,
                redacted_evidence=finding.redacted_evidence,
            )
        )

    # Step 5: Record this ingestion in the audit log
    audit = AuditEntry(
        action="log_ingested",
        actor=user.email,
        owner_id=user.id,
        entity_type="log",
        entity_id=new_log.id,
        details=json.dumps(
            {
                "source_type": request.source_type,
                "alerts_created": alerts_created,
                "content_length": len(request.content),
            }
        ),
        created_at=datetime.now(timezone.utc),
    )
    db.add(audit)
    db.commit()

    return IngestResponse(
        log_id=new_log.id,
        filename=request.filename,
        report_url=f"/api/ingest/{new_log.id}/report.pdf",
        alerts_created=alerts_created,
        findings=findings_out,
    )

@router.get("/{log_id}/report.pdf")
def download_scan_report(log_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Download a redacted, per-scan risk report."""
    log = db.query(IngestedLog).filter(IngestedLog.id == log_id, IngestedLog.owner_id == user.id).first()
    if not log:
        return Response(content="Scan not found", status_code=404)

    alerts = db.query(Alert).filter(Alert.log_id == log.id).order_by(Alert.severity, Alert.id).all()
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib.units import inch
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
        from reportlab.lib import colors
        from io import BytesIO
    except ImportError:
        return Response(content="PDF reporting is not installed", status_code=503)

    filename = "payload"
    if log.metadata_json:
        try:
            filename = json.loads(log.metadata_json).get("filename") or filename
        except json.JSONDecodeError:
            pass
    filename = str(filename).replace("\r", " ").replace("\n", " ")
    buffer = BytesIO()
    document = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=0.6 * inch, leftMargin=0.6 * inch)
    styles = getSampleStyleSheet()
    story = [Paragraph("LeakGuard Risk Report", styles["Title"]), Paragraph(f"File / payload: {filename}", styles["Normal"]), Paragraph(f"Scan ID: {log.id} | Source: {log.source_type}", styles["Normal"]), Spacer(1, 0.2 * inch)]
    if not alerts:
        story.append(Paragraph("No sensitive risks were detected.", styles["Heading2"]))
    else:
        for severity in ("critical", "high", "medium", "low"):
            severity_alerts = [alert for alert in alerts if alert.severity == severity]
            if not severity_alerts:
                continue
            story.append(Paragraph(f"{severity.title()} risks ({len(severity_alerts)})", styles["Heading2"]))
            rows = [["Category", "Rule", "Type", "Confidence", "Redacted evidence"]]
            from backend.schemas import risk_category_for
            rows.extend([[risk_category_for(alert.rule_name), alert.rule_name, alert.match_type, f"{alert.confidence:.0%}", alert.redacted_evidence] for alert in severity_alerts])
            table = Table(rows, colWidths=[1.15 * inch, 1.4 * inch, 0.65 * inch, 0.75 * inch, 2.8 * inch], repeatRows=1)
            table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#164e63")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
            ]))
            story.extend([table, Spacer(1, 0.15 * inch)])
    story.append(Paragraph("This report contains redacted evidence only. Original payloads remain protected inside the authenticated LeakGuard database.", styles["Italic"]))
    document.build(story)
    safe_name = "".join(character if character.isalnum() or character in " ._-" else "_" for character in filename).strip() or "payload"
    return Response(content=buffer.getvalue(), media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{safe_name}-risk-report.pdf"'})
