import re

def redact_value(value: str, pattern_type: str) -> str:
    """
    Redacts sensitive strings based on the detected pattern type.
    """
    if not value:
        return value
        
    pattern_type = pattern_type.lower()
    
    if "ssn" in pattern_type or "social security" in pattern_type:
        digits = re.sub(r'\D', '', value)
        if len(digits) >= 4:
            return f"***-**-{digits[-4:]}"
        return "***-**-****"
        
    elif "credit card" in pattern_type or "cc" in pattern_type:
        digits = re.sub(r'\D', '', value)
        if len(digits) >= 4:
            return f"****-****-****-{digits[-4:]}"
        return "****-****-****-****"
        
    elif "email" in pattern_type:
        parts = value.split('@')
        if len(parts) == 2:
            name, domain = parts
            if len(name) > 1:
                return f"{name[0]}***@{domain}"
            return f"*@{domain}"
        return "***********"
        
    elif any(kw in pattern_type for kw in ["api key", "token", "secret", "aws", "github", "stripe"]):
        if len(value) > 8:
            return f"{value[:4]}****...****{value[-4:]}"
        return "********"
        
    elif "phone" in pattern_type:
        digits = re.sub(r'\D', '', value)
        if len(digits) >= 4:
            return f"(***) ***-{digits[-4:]}"
        return "(***) ***-****"
        
    else:
        # Default fallback: Show first 2 + mask middle + show last 2
        if len(value) > 4:
            return f"{value[:2]}{'*' * (len(value) - 4)}{value[-2:]}"
        elif len(value) > 0:
            return "*" * len(value)
        return ""

def redact_in_text(text: str, matches: list[str], pattern_type: str) -> str:
    """
    Replaces all occurrences of sensitive matches in the text with redacted versions.
    """
    redacted_text = text
    for match in matches:
        redacted_match = redact_value(match, pattern_type)
        redacted_text = redacted_text.replace(match, redacted_match)
    return redacted_text
