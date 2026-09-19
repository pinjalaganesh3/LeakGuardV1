from pydantic import BaseModel, ConfigDict, field_validator, model_validator
from typing import Literal, Optional, List, Dict, Any
from datetime import datetime

def risk_category_for(rule_name: str) -> str:
    name = rule_name.lower()
    if any(term in name for term in ('password', 'api', 'token', 'secret', 'key', 'credential', 'jwt')):
        return 'Credentials'
    if any(term in name for term in ('credit', 'card', 'stripe', 'bank', 'payment')):
        return 'Financial'
    if any(term in name for term in ('ip', 'phone', 'network')):
        return 'Network & Contact'
    if any(term in name for term in ('semantic', 'health', 'database', 'connection')):
        return 'Contextual / Semantic'
    return 'Personal Data'

# --- Requests ---

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str

    @field_validator('name', 'email', 'password')
    @classmethod
    def validate_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError('This field is required')
        return value

    @field_validator('email')
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.lower()

    @field_validator('password')
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError('Password must be at least 8 characters')
        return value

class LoginRequest(BaseModel):
    email: str
    password: str
    otp: Optional[str] = None

    @field_validator('email')
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator('password')
    @classmethod
    def validate_password(cls, value: str) -> str:
        if not value:
            raise ValueError('Password is required')
        return value

class SiteCheckRequest(BaseModel):
    url: str
    max_pages: int = 5

    @field_validator('url')
    @classmethod
    def validate_url(cls, value: str) -> str:
        value = value.strip()
        if not value.startswith(('http://', 'https://')):
            raise ValueError('URL must start with http:// or https://')
        return value

    @field_validator('max_pages')
    @classmethod
    def validate_page_limit(cls, value: int) -> int:
        return max(1, min(value, 10))

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    two_factor_enabled: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserRoleUpdate(BaseModel):
    role: Literal['admin', 'analyst']

class IngestRequest(BaseModel):
    source_type: str # web, llm, db, database
    content: str
    filename: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

    @field_validator('source_type')
    @classmethod
    def normalize_source_type(cls, v: str) -> str:
        v_clean = v.lower().strip()
        if v_clean in ['database', 'db']:
            return 'db'
        if v_clean in ['web', 'llm']:
            return v_clean
        raise ValueError(f"source_type must be one of 'web', 'llm', 'db' (got '{v}')")

class AlertActionRequest(BaseModel):
    action: Literal['notify', 'throttle', 'block']

class RuleCreate(BaseModel):
    name: str
    pattern_type: Literal['regex', 'semantic']
    pattern_value: str
    severity: Literal['critical', 'high', 'medium', 'low'] = 'high'
    enabled: bool = True
    description: Optional[str] = None

class RuleUpdate(BaseModel):
    name: Optional[str] = None
    pattern_type: Optional[Literal['regex', 'semantic']] = None
    pattern_value: Optional[str] = None
    severity: Optional[Literal['critical', 'high', 'medium', 'low']] = None
    enabled: Optional[bool] = None
    description: Optional[str] = None

class ConsentCreate(BaseModel):
    user_identifier: Optional[str] = None
    user_id: Optional[str] = None
    purpose: str
    granted: bool
    ip_address: Optional[str] = None

    @model_validator(mode='after')
    def validate_user_identifier(self):
        if not self.user_identifier and not self.user_id:
            raise ValueError("user_identifier (or user_id) is required")
        if not self.user_identifier:
            self.user_identifier = self.user_id
        return self

# --- Responses ---

class FindingOut(BaseModel):
    rule_name: str
    match_type: str
    severity: str
    confidence: float
    redacted_evidence: str
    evidence_redacted: Optional[str] = None
    risk_category: Optional[str] = None

    @model_validator(mode='after')
    def populate_evidence_alias(self):
        if not self.evidence_redacted:
            self.evidence_redacted = self.redacted_evidence
        return self

    @model_validator(mode='after')
    def populate_category(self):
        if not self.risk_category:
            self.risk_category = risk_category_for(self.rule_name)
        return self

class SitePageResult(BaseModel):
    url: str
    status_code: int
    alerts_created: int
    findings: List[FindingOut]

class SiteCheckResponse(BaseModel):
    pages_checked: int
    alerts_created: int
    pages: List[SitePageResult]

class PasswordResetRequest(BaseModel):
    email: str

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

    @field_validator('new_password')
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError('Password must be at least 8 characters')
        return value

class TwoFactorCode(BaseModel):
    code: str

class IngestResponse(BaseModel):
    log_id: int
    filename: Optional[str] = None
    report_url: str
    alerts_created: int
    findings: List[FindingOut]

class AlertOut(BaseModel):
    id: int
    log_id: int
    filename: Optional[str] = None
    rule_name: str
    match_type: str
    severity: str
    confidence: float
    raw_evidence: str
    redacted_evidence: str
    evidence_redacted: Optional[str] = None
    status: str
    suggested_action: str
    action_taken: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    timestamp: Optional[str] = None
    risk_category: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode='after')
    def populate_aliases(self):
        if not self.evidence_redacted:
            self.evidence_redacted = self.redacted_evidence
        if not self.timestamp and self.created_at:
            self.timestamp = self.created_at.isoformat()
        return self

    @model_validator(mode='after')
    def populate_category(self):
        if not self.risk_category:
            self.risk_category = risk_category_for(self.rule_name)
        return self

class RuleOut(BaseModel):
    id: int
    name: str
    pattern_type: str
    type: Optional[str] = None
    pattern_value: str
    severity: str
    enabled: bool
    description: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode='after')
    def populate_type_alias(self):
        if not self.type:
            self.type = self.pattern_type
        return self

class AuditEntryOut(BaseModel):
    id: int
    action: str
    actor: str
    entity_type: str
    type: Optional[str] = None
    entity_id: Optional[int] = None
    details: Optional[str] = None
    created_at: datetime
    timestamp: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode='after')
    def populate_aliases(self):
        if not self.type:
            self.type = self.entity_type
        if not self.timestamp and self.created_at:
            self.timestamp = self.created_at.isoformat()
        return self

class ConsentOut(BaseModel):
    id: int
    user_identifier: str
    user_id: Optional[str] = None
    purpose: str
    granted: bool
    ip_address: Optional[str] = None
    created_at: datetime
    timestamp: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode='after')
    def populate_aliases(self):
        if not self.user_id:
            self.user_id = self.user_identifier
        if not self.timestamp and self.created_at:
            self.timestamp = self.created_at.isoformat()
        return self

class DashboardStats(BaseModel):
    total_scans: int
    active_alerts: int
    resolved_alerts: int
    critical_alerts: int
    severity_breakdown: Dict[str, int]
    recent_alerts: List[AlertOut]
    timeline: List[Dict[str, Any]]
