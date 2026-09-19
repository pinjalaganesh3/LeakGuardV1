import re
import logging
from dataclasses import dataclass
from typing import Any, List, Protocol
from backend.config import settings
from backend.redactor import redact_value

logger = logging.getLogger(__name__)

class DetectionRule(Protocol):
    enabled: bool
    pattern_type: str
    pattern_value: str
    name: str
    severity: str

util: Any = None
sensitive_embeddings: Any = None

# Try loading sentence_transformers for semantic detection
try:
    if settings.ENABLE_SEMANTIC:
        from sentence_transformers import SentenceTransformer, util
        
        logger.info(f"Loading semantic model: {settings.MODEL_NAME}")
        semantic_model = SentenceTransformer(settings.MODEL_NAME)
        
        # Pre-encode common sensitive phrases to act as semantic targets
        SENSITIVE_PHRASES = [
            'social security number', 
            'credit card number', 
            'password credentials', 
            'API key secret', 
            'database connection string', 
            'private encryption key', 
            'personal health information', 
            'bank account details'
        ]
        sensitive_embeddings = semantic_model.encode(SENSITIVE_PHRASES, convert_to_tensor=True)
        SEMANTIC_ENABLED = True
    else:
        SEMANTIC_ENABLED = False
        semantic_model = None
except Exception as exc:
    logger.warning("Semantic detection unavailable: %s", exc)
    SEMANTIC_ENABLED = False
    semantic_model = None

@dataclass
class Finding:
    rule_name: str
    match_type: str
    severity: str
    confidence: float
    raw_evidence: str
    redacted_evidence: str

def check_semantic_phrase(text: str, phrase: str, threshold: float = settings.SIMILARITY_THRESHOLD) -> List[tuple[str, float]]:
    """
    Checks text chunks against a specific phrase using semantic similarity.
    Returns list of (matching_chunk, score).
    """
    if not SEMANTIC_ENABLED or not semantic_model:
        return []
    try:
        chunks = re.split(r'[.!?;|\n]', text)
        chunks = [c.strip() for c in chunks if len(c.strip()) > 8]
        if not chunks:
            return []
            
        phrase_embedding = semantic_model.encode([phrase], convert_to_tensor=True)
        chunk_embeddings = semantic_model.encode(chunks, convert_to_tensor=True)
        scores = util.cos_sim(chunk_embeddings, phrase_embedding)
        
        matches = []
        for i, chunk in enumerate(chunks):
            score = scores[i][0].item()
            if score >= threshold:
                matches.append((chunk, score))
        return matches
    except Exception as e:
        logger.error(f"Error comparing phrase '{phrase}': {e}")
        return []

def check_semantic(text: str, threshold: float = settings.SIMILARITY_THRESHOLD) -> List[Finding]:
    """
    Checks the text against pre-encoded sensitive phrases using cosine similarity.
    """
    findings = []
    if not SEMANTIC_ENABLED or not semantic_model:
        return findings
        
    try:
        # Split text into simple sentences/chunks to compare
        chunks = re.split(r'[.!?;|\n]', text)
        chunks = [c.strip() for c in chunks if len(c.strip()) > 10]
        
        if not chunks:
            return findings
            
        chunk_embeddings = semantic_model.encode(chunks, convert_to_tensor=True)
        
        # Compute cosine similarity between chunks and sensitive phrases
        cosine_scores = util.cos_sim(chunk_embeddings, sensitive_embeddings)
        
        for i in range(len(chunks)):
            for j in range(len(SENSITIVE_PHRASES)):
                score = cosine_scores[i][j].item()
                if score >= threshold:
                    raw_text = chunks[i]
                    redacted = redact_value(raw_text, "semantic")
                    findings.append(Finding(
                        rule_name=f"Semantic Match: {SENSITIVE_PHRASES[j]}",
                        match_type="semantic",
                        severity="high",
                        confidence=score,
                        raw_evidence=raw_text,
                        redacted_evidence=redacted
                    ))
    except Exception as e:
        logger.error(f"Error during semantic check: {e}")
        
    return findings

def run_detection(text: str, rules: List[DetectionRule]) -> List[Finding]:
    """
    Main detection function that applies active rules (regex and semantic) to text.
    Returns a list of findings.
    """
    findings = []
    seen_evidence_keys = set()
    
    # Process each rule against the input text
    for rule in rules:
        if not rule.enabled:
            continue
            
        if rule.pattern_type == "regex":
            try:
                # Compile regex from rule and search in text
                pattern = re.compile(rule.pattern_value)
                matches = pattern.findall(text)
                
                # If matches are tuples (due to groups), get the first group or join
                clean_matches = []
                for match in matches:
                    if isinstance(match, tuple):
                        clean_matches.append(match[0] if match[0] else "".join(match))
                    else:
                        clean_matches.append(match)
                
                # De-duplicate matches
                clean_matches = list(set(clean_matches))
                
                for match in clean_matches:
                    key = (rule.name, match)
                    if key not in seen_evidence_keys:
                        seen_evidence_keys.add(key)
                        redacted = redact_value(match, rule.name)
                        findings.append(Finding(
                            rule_name=rule.name,
                            match_type="regex",
                            severity=rule.severity,
                            confidence=1.0,
                            raw_evidence=match,
                            redacted_evidence=redacted
                        ))
            except Exception as e:
                logger.error(f"Error executing regex rule {rule.name}: {e}")
                
        elif rule.pattern_type == "semantic":
            # Check active semantic rule
            if settings.ENABLE_SEMANTIC and rule.pattern_value:
                semantic_matches = check_semantic_phrase(text, rule.pattern_value)
                for chunk, score in semantic_matches:
                    key = (rule.name, chunk)
                    if key not in seen_evidence_keys:
                        seen_evidence_keys.add(key)
                        redacted = redact_value(chunk, "semantic")
                        findings.append(Finding(
                            rule_name=rule.name,
                            match_type="semantic",
                            severity=rule.severity,
                            confidence=score,
                            raw_evidence=chunk,
                            redacted_evidence=redacted
                        ))
            
    # Run global sensitive phrases if semantic is enabled and no semantic rules matched yet
    if settings.ENABLE_SEMANTIC and not any(f.match_type == "semantic" for f in findings):
        semantic_findings = check_semantic(text)
        for sf in semantic_findings:
            key = (sf.rule_name, sf.raw_evidence)
            if key not in seen_evidence_keys:
                seen_evidence_keys.add(key)
                findings.append(sf)
        
    return findings
