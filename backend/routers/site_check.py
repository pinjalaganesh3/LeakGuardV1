import ipaddress
import re
import socket
from urllib.parse import urldefrag, urljoin, urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.auth import get_current_user
from backend.database import get_db
from backend.detection import run_detection
from backend.models import Alert, AuditEntry, IngestedLog, Rule, User
from backend.schemas import FindingOut, SiteCheckRequest, SiteCheckResponse, SitePageResult

router = APIRouter(prefix="/site-check", tags=["Site Scanner"])

def _safe_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise HTTPException(status_code=422, detail="Only public http(s) URLs are allowed")
    try:
        addresses = socket.getaddrinfo(parsed.hostname, None)
    except socket.gaierror as exc:
        raise HTTPException(status_code=422, detail="The URL host could not be resolved") from exc
    for address in addresses:
        ip = ipaddress.ip_address(address[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
            raise HTTPException(status_code=422, detail="Private and local network URLs are blocked")
    return url

def _links(html: str, base_url: str, hostname: str) -> list[str]:
    found = []
    for raw in re.findall(r'href=["\']([^"\']+)', html, flags=re.IGNORECASE):
        candidate = urldefrag(urljoin(base_url, raw))[0]
        parsed = urlparse(candidate)
        if parsed.scheme in {"http", "https"} and parsed.hostname == hostname:
            found.append(candidate)
    return found

@router.post("", response_model=SiteCheckResponse)
def check_site(request: SiteCheckRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    start_url = _safe_url(request.url)
    host = urlparse(start_url).hostname
    queue = [start_url]
    visited = set()
    page_results = []

    rules = db.query(Rule).filter(
        Rule.enabled == True,
        (Rule.owner_id == user.id) | (Rule.owner_id.is_(None)),
    ).all()

    try:
        with httpx.Client(timeout=8.0, follow_redirects=False, headers={"User-Agent": "LeakGuard-Site-Scanner/1.0"}) as client:
            while queue and len(visited) < request.max_pages:
                url = queue.pop(0)
                if url in visited:
                    continue
                _safe_url(url)
                visited.add(url)
                try:
                    response = client.get(url)
                    content = response.text[:2_000_000]
                except httpx.HTTPError:
                    continue

                findings = run_detection(content, rules)
                log = IngestedLog(owner_id=user.id, source_type="web", content=content[:100_000], metadata_json=f'{{"url": {url!r}}}')
                db.add(log)
                db.flush()
                findings_out = []
                for finding in findings:
                    severity = finding.severity.lower()
                    action = "block" if severity == "critical" else "throttle" if severity == "high" else "notify"
                    db.add(Alert(log_id=log.id, rule_name=finding.rule_name, match_type=finding.match_type, severity=severity, confidence=finding.confidence, raw_evidence=finding.raw_evidence, redacted_evidence=finding.redacted_evidence, suggested_action=action))
                    findings_out.append(FindingOut(rule_name=finding.rule_name, match_type=finding.match_type, severity=severity, confidence=finding.confidence, redacted_evidence=finding.redacted_evidence))
                page_results.append(SitePageResult(url=url, status_code=response.status_code, alerts_created=len(findings), findings=findings_out))
                if response.headers.get("content-type", "").lower().startswith("text/html"):
                    queue.extend(link for link in _links(content, url, host) if link not in visited and link not in queue)
    except HTTPException:
        db.rollback()
        raise
    except httpx.HTTPError as exc:
        db.rollback()
        raise HTTPException(status_code=502, detail=f"Unable to fetch site: {exc}") from exc

    total_alerts = sum(page.alerts_created for page in page_results)
    db.add(AuditEntry(owner_id=user.id, action="site_checked", actor=user.email, entity_type="site", details=f'{{"url": {start_url!r}, "pages_checked": {len(page_results)}}}'))
    db.commit()
    return SiteCheckResponse(pages_checked=len(page_results), alerts_created=total_alerts, pages=page_results)