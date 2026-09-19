import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
import httpx
from backend.config import settings
logger = logging.getLogger(__name__)

class NotificationService:
    @staticmethod
    def send_email(to: str, subject: str, body: str):
        """
        Sends an email using configured SMTP settings.
        Falls back to console logging if SMTP is not configured.
        """
        if not all([settings.SMTP_HOST, settings.SMTP_USER, settings.SMTP_PASS]):
            logger.info(f"[EMAIL NOTIFICATION] To: {to} | Subject: {subject} | Body: {body}")
            return
            
        try:
            msg = MIMEMultipart()
            msg['From'] = settings.SMTP_USER
            msg['To'] = to
            msg['Subject'] = subject
            
            msg.attach(MIMEText(body, 'plain'))
            
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASS) # type: ignore
                server.send_message(msg)
            logger.info(f"Email sent successfully to {to}")
        except Exception as e:
            logger.error(f"Failed to send email: {e}")

    @staticmethod
    def send_webhook(url: str, payload: dict):
        """
        Sends a POST request to the specified webhook URL.
        Falls back to console logging if URL is not configured.
        """
        if not url:
            logger.info(f"[WEBHOOK NOTIFICATION] Payload: {payload}")
            return
            
        try:
            # Sync HTTP request - suitable for PoC
            response = httpx.post(url, json=payload, timeout=5.0)
            response.raise_for_status()
            logger.info("Webhook delivered successfully.")
        except Exception as e:
            logger.error(f"Failed to deliver webhook: {e}")

    @classmethod
    def notify_alert(
        cls,
        alert_id: int,
        rule_name: str,
        severity: str,
        confidence: float,
        redacted_evidence: str,
        action_taken: str | None,
        suggested_action: str,
    ):
        """
        Main entrypoint for alert notifications.
        Sends email and webhook for critical or high severity alerts.
        """
        if severity not in ["critical", "high"]:
            return
            
        subject = f"[{severity.upper()}] LeakGuard Alert: {rule_name}"
        body = (
            f"LeakGuard has detected a sensitive data leak.\n\n"
            f"Rule: {rule_name}\n"
            f"Severity: {severity}\n"
            f"Confidence: {confidence}\n"
            f"Evidence (Redacted): {redacted_evidence}\n"
            f"Action Taken: {action_taken or suggested_action}\n"
        )
        
        # Send email (mock admin email)
        cls.send_email("admin@company.com", subject, body)
        
        # Send webhook
        payload = {
            "alert_id": alert_id,
            "rule": rule_name,
            "severity": severity,
            "evidence": redacted_evidence
        }
        cls.send_webhook(settings.WEBHOOK_URL or "", payload)
