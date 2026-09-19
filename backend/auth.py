import hashlib
import hmac
import secrets
import base64
import struct
from datetime import datetime, timedelta, timezone

from fastapi import Cookie, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from backend.config import settings
from backend.database import get_db
from backend.models import AuthSession, User

SESSION_COOKIE = "leakguard_session"
SESSION_DAYS = settings.SESSION_DAYS

def _hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 310_000)
    return f"{salt.hex()}${digest.hex()}"

def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt_hex, digest_hex = stored_hash.split("$", 1)
        expected = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), bytes.fromhex(salt_hex), 310_000
        ).hex()
        return hmac.compare_digest(expected, digest_hex)
    except (ValueError, TypeError):
        return False

def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

def create_totp_secret() -> str:
    return base64.b32encode(secrets.token_bytes(20)).decode().rstrip("=")

def verify_totp(secret: str, code: str) -> bool:
    try:
        key = base64.b32decode(secret + "=" * (-len(secret) % 8), casefold=True)
        counter = int(datetime.now(timezone.utc).timestamp()) // 30
        for offset in (-1, 0, 1):
            digest = hmac.new(key, struct.pack(">Q", counter + offset), hashlib.sha1).digest()
            index = digest[-1] & 0x0F
            number = (struct.unpack(">I", digest[index:index + 4])[0] & 0x7FFFFFFF) % 1_000_000
            if hmac.compare_digest(f"{number:06d}", code.strip()):
                return True
    except (ValueError, TypeError):
        return False
    return False

def create_session(response: Response, db: Session, user: User) -> None:
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)
    db.add(AuthSession(user_id=user.id, token_hash=_hash_token(token), expires_at=expires_at))
    db.commit()
    response.set_cookie(
        SESSION_COOKIE,
        token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=SESSION_DAYS * 24 * 60 * 60,
    )

def get_current_user(
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE),
    db: Session = Depends(get_db),
) -> User:
    user_count = db.query(User).count()
    if user_count == 0:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Create an account to continue")
    if not session_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    session = db.query(AuthSession).filter(AuthSession.token_hash == _hash_token(session_token)).first()
    now = datetime.now(timezone.utc)
    if not session or session.expires_at.replace(tzinfo=timezone.utc) <= now:
        if session:
            db.delete(session)
            db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")
    return session.user

def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator access required")
    return user