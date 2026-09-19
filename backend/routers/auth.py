import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from backend.auth import SESSION_COOKIE, _hash_password, _hash_token, create_session, create_totp_secret, get_current_user, require_admin, verify_password, verify_totp
from backend.database import get_db
from backend.models import AuthSession, User
from backend.schemas import LoginRequest, PasswordResetConfirm, PasswordResetRequest, SignupRequest, TwoFactorCode, UserOut, UserRoleUpdate

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def signup(request: SignupRequest, response: Response, db: Session = Depends(get_db)):
    email = request.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    role = "admin" if db.query(User).count() == 0 else "analyst"
    user = User(name=request.name, email=email, password_hash=_hash_password(request.password), role=role)
    db.add(user)
    db.commit()
    db.refresh(user)
    create_session(response, db, user)
    return user

@router.post("/login", response_model=UserOut)
def login(request: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email.lower()).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user.two_factor_enabled and (not request.otp or not user.two_factor_secret or not verify_totp(user.two_factor_secret, request.otp)):
        raise HTTPException(status_code=401, detail="A valid two-factor code is required")
    create_session(response, db, user)
    return user

@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE),
    db: Session = Depends(get_db),
):
    if session_token:
        session = db.query(AuthSession).filter(AuthSession.token_hash == _hash_token(session_token)).first()
        if session:
            db.delete(session)
            db.commit()
    response.delete_cookie(SESSION_COOKIE)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response

@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), user: User = Depends(require_admin)):
    return db.query(User).order_by(User.created_at.asc()).all()

@router.patch("/users/{user_id}/role", response_model=UserOut)
def update_user_role(user_id: int, request: UserRoleUpdate, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == user.id and request.role != "admin":
        raise HTTPException(status_code=400, detail="You cannot remove your own admin access")
    target.role = request.role
    db.commit()
    db.refresh(target)
    return target

@router.post("/password-reset/request")
def request_password_reset(request: PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email.lower()).first()
    if not user:
        return {"message": "If the account exists, a local reset token has been generated"}
    token = secrets.token_urlsafe(32)
    user.reset_token_hash = _hash_token(token)
    user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
    db.commit()
    return {"message": "Local reset token generated", "reset_token": token}

@router.post("/password-reset/confirm")
def confirm_password_reset(request: PasswordResetConfirm, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.reset_token_hash == _hash_token(request.token)).first()
    if not user or not user.reset_token_expires_at or user.reset_token_expires_at.replace(tzinfo=timezone.utc) <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset token is invalid or expired")
    user.password_hash = _hash_password(request.new_password)
    user.reset_token_hash = None
    user.reset_token_expires_at = None
    db.commit()
    return {"message": "Password updated successfully"}

@router.post("/2fa/setup")
def setup_two_factor(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    secret = create_totp_secret()
    user.two_factor_secret = secret
    db.commit()
    return {"secret": secret, "otpauth_uri": f"otpauth://totp/LeakGuard:{user.email}?secret={secret}&issuer=LeakGuard"}

@router.post("/2fa/enable")
def enable_two_factor(request: TwoFactorCode, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not user.two_factor_secret:
        raise HTTPException(status_code=400, detail="Start two-factor setup first")
    if not verify_totp(user.two_factor_secret, request.code):
        raise HTTPException(status_code=400, detail="Invalid two-factor code")
    user.two_factor_enabled = True
    db.commit()
    return {"enabled": True}

@router.post("/2fa/disable")
def disable_two_factor(request: TwoFactorCode, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not user.two_factor_secret or not verify_totp(user.two_factor_secret, request.code):
        raise HTTPException(status_code=400, detail="Invalid two-factor code")
    user.two_factor_enabled = False
    user.two_factor_secret = None
    db.commit()
    return {"enabled": False}