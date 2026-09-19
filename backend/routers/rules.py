import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from backend.database import get_db
from backend.models import Rule, User
from backend.auth import get_current_user, require_admin
from backend.schemas import RuleOut, RuleCreate, RuleUpdate

router = APIRouter(prefix="/rules", tags=["Rules"])

@router.get("", response_model=List[RuleOut])
def list_rules(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Rule).filter((Rule.owner_id == user.id) | (Rule.owner_id.is_(None))).all()

@router.post("", response_model=RuleOut)
def create_rule(rule_in: RuleCreate, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    if rule_in.pattern_type == "regex":
        try:
            re.compile(rule_in.pattern_value)
        except re.error as exc:
            raise HTTPException(status_code=422, detail=f"Invalid regex pattern: {exc}") from exc

    if db.query(Rule).filter(Rule.name == rule_in.name, Rule.owner_id == user.id).first():
        raise HTTPException(status_code=409, detail="A rule with this name already exists")

    rule = Rule(**rule_in.model_dump(), owner_id=user.id)
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule

@router.put("/{rule_id}", response_model=RuleOut)
def update_rule(rule_id: int, rule_in: RuleUpdate, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    rule = db.query(Rule).filter(Rule.id == rule_id, Rule.owner_id == user.id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
        
    updates = rule_in.model_dump(exclude_unset=True)
    pattern_type = updates.get("pattern_type", rule.pattern_type)
    pattern_value = updates.get("pattern_value", rule.pattern_value)
    if pattern_type == "regex":
        try:
            re.compile(pattern_value)
        except re.error as exc:
            raise HTTPException(status_code=422, detail=f"Invalid regex pattern: {exc}") from exc

    if "name" in updates and updates["name"] != rule.name:
        if db.query(Rule).filter(Rule.name == updates["name"]).first():
            raise HTTPException(status_code=409, detail="A rule with this name already exists")

    for key, value in updates.items():
        setattr(rule, key, value)
        
    db.commit()
    db.refresh(rule)
    return rule

@router.delete("/{rule_id}")
def delete_rule(rule_id: int, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    rule = db.query(Rule).filter(Rule.id == rule_id, Rule.owner_id == user.id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
        
    db.delete(rule)
    db.commit()
    return {"message": "Rule deleted successfully"}

@router.post("/{rule_id}/toggle", response_model=RuleOut)
def toggle_rule(rule_id: int, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    rule = db.query(Rule).filter(Rule.id == rule_id, Rule.owner_id == user.id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
        
    rule.enabled = not rule.enabled
    db.commit()
    db.refresh(rule)
    return rule
