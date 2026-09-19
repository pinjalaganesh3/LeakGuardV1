from datetime import datetime, timezone
import json
from sqlalchemy import Column, Integer, String, Boolean, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.database import Base

def utcnow():
    """Returns the current UTC time"""
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="analyst", nullable=False)
    reset_token_hash = Column(String, nullable=True)
    reset_token_expires_at = Column(DateTime, nullable=True)
    two_factor_secret = Column(String, nullable=True)
    two_factor_enabled = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=utcnow)

class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String, unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User")

class IngestedLog(Base):
    __tablename__ = "ingested_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    source_type = Column(String, index=True) # web, llm, db
    content = Column(Text)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    
    # Relationship to alerts
    alerts = relationship("Alert", back_populates="log")

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    log_id = Column(Integer, ForeignKey("ingested_logs.id"))
    rule_name = Column(String, index=True)
    match_type = Column(String) # regex, semantic
    severity = Column(String) # critical, high, medium, low
    confidence = Column(Float)
    raw_evidence = Column(Text)
    redacted_evidence = Column(Text)
    status = Column(String, default="open") # open, acknowledged, resolved
    suggested_action = Column(String) # notify, throttle, block
    action_taken = Column(String, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    log = relationship("IngestedLog", back_populates="alerts")

    @property
    def filename(self):
        if not self.log or not self.log.metadata_json:
            return None
        try:
            return json.loads(self.log.metadata_json).get("filename")
        except (TypeError, json.JSONDecodeError):
            return None

class Rule(Base):
    __tablename__ = "rules"
    
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String, unique=True, index=True)
    pattern_type = Column(String) # regex, semantic
    pattern_value = Column(Text)
    severity = Column(String, default="high")
    enabled = Column(Boolean, default=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)

class AuditEntry(Base):
    __tablename__ = "audit_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String, index=True)
    actor = Column(String, default="system")
    entity_type = Column(String)
    entity_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)

class ConsentRecord(Base):
    __tablename__ = "consent_records"
    
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    user_identifier = Column(String, index=True)
    purpose = Column(String)
    granted = Column(Boolean)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=utcnow)
