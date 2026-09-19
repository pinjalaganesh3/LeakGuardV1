from sqlalchemy.orm import Session
from backend.models import Rule
import logging

logger = logging.getLogger(__name__)

DEFAULT_RULES = [
    {
        "name": "Social Security Number (SSN)",
        "pattern_type": "regex",
        "pattern_value": r"\b\d{3}-\d{2}-\d{4}\b",
        "severity": "critical",
        "description": "Matches standard US Social Security Numbers formatted as XXX-XX-XXXX."
    },
    {
        "name": "Credit Card (Visa)",
        "pattern_type": "regex",
        "pattern_value": r"\b4\d{3}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b",
        "severity": "critical",
        "description": "Matches Visa credit card numbers."
    },
    {
        "name": "Credit Card (Mastercard)",
        "pattern_type": "regex",
        "pattern_value": r"\b5[1-5]\d{2}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b",
        "severity": "critical",
        "description": "Matches Mastercard credit card numbers."
    },
    {
        "name": "Email Address",
        "pattern_type": "regex",
        "pattern_value": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
        "severity": "medium",
        "description": "Matches standard email addresses."
    },
    {
        "name": "AWS Access Key",
        "pattern_type": "regex",
        "pattern_value": r"\bAKIA[0-9A-Z]{16}\b",
        "severity": "critical",
        "description": "Matches AWS access keys starting with AKIA."
    },
    {
        "name": "Phone Number (US)",
        "pattern_type": "regex",
        "pattern_value": r"\b(\+1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b",
        "severity": "low",
        "description": "Matches US phone numbers in various formats."
    },
    {
        "name": "Private Key",
        "pattern_type": "regex",
        "pattern_value": r"-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----",
        "severity": "critical",
        "description": "Matches RSA/EC/DSA private keys headers."
    },
    {
        "name": "JWT Token",
        "pattern_type": "regex",
        "pattern_value": r"\beyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*\b",
        "severity": "high",
        "description": "Matches JSON Web Tokens."
    },
    {
        "name": "Generic API Key",
        "pattern_type": "regex",
        "pattern_value": r"(?i)(?:api[_-]?key|access[_-]?token|secret[_-]?key)\s*[:=]\s*[\"']?([A-Za-z0-9_\-]{20,})",
        "severity": "high",
        "description": "Matches generic API keys or secrets."
    },
    {
        "name": "GitHub Token",
        "pattern_type": "regex",
        "pattern_value": r"\bghp_[A-Za-z0-9]{36}\b",
        "severity": "critical",
        "description": "Matches GitHub personal access tokens."
    },
    {
        "name": "Stripe Key",
        "pattern_type": "regex",
        "pattern_value": r"\b[sr]k_(?:live|test)_[0-9a-zA-Z]{24,}\b",
        "severity": "critical",
        "description": "Matches Stripe live or test keys."
    },
    {
        "name": "IPv4 Address",
        "pattern_type": "regex",
        "pattern_value": r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b",
        "severity": "low",
        "description": "Matches standard IPv4 addresses."
    }
]

SEMANTIC_RULES = [
    {
        "name": "Semantic: SSN",
        "pattern_type": "semantic",
        "pattern_value": "social security number",
        "severity": "high",
        "description": "Semantic check for social security numbers."
    },
    {
        "name": "Semantic: Credit Card",
        "pattern_type": "semantic",
        "pattern_value": "credit card number",
        "severity": "high",
        "description": "Semantic check for credit card numbers."
    },
    {
        "name": "Semantic: Passwords",
        "pattern_type": "semantic",
        "pattern_value": "password credentials",
        "severity": "high",
        "description": "Semantic check for password credentials."
    },
    {
        "name": "Semantic: API Secrets",
        "pattern_type": "semantic",
        "pattern_value": "API key secret",
        "severity": "high",
        "description": "Semantic check for API key secrets."
    },
    {
        "name": "Semantic: DB Strings",
        "pattern_type": "semantic",
        "pattern_value": "database connection string",
        "severity": "high",
        "description": "Semantic check for database connection strings."
    },
    {
        "name": "Semantic: Health Info",
        "pattern_type": "semantic",
        "pattern_value": "personal health information",
        "severity": "high",
        "description": "Semantic check for personal health information."
    }
]

def seed_default_rules(db_session: Session):
    """
    Seeds the database with default regex and semantic rules if they don't already exist.
    """
    rules_added = 0
    
    # Add Regex Rules
    for rule_data in DEFAULT_RULES:
        existing_rule = db_session.query(Rule).filter_by(name=rule_data["name"]).first()
        if not existing_rule:
            new_rule = Rule(**rule_data)
            db_session.add(new_rule)
            rules_added += 1
            
    # Add Semantic Rules
    for rule_data in SEMANTIC_RULES:
        existing_rule = db_session.query(Rule).filter_by(name=rule_data["name"]).first()
        if not existing_rule:
            new_rule = Rule(**rule_data)
            db_session.add(new_rule)
            rules_added += 1
            
    if rules_added > 0:
        db_session.commit()
        logger.info(f"Seeded {rules_added} default rules into the database.")
    else:
        logger.info("Default rules are already present in the database.")
