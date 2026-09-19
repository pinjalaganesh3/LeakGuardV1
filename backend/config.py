from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

PROJECT_ROOT = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = f"sqlite:///{(PROJECT_ROOT / 'leakguard.db').as_posix()}"
    ALLOWED_ORIGINS: list[str] = Field(default_factory=lambda: [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ])
    COOKIE_SECURE: bool = False
    SESSION_DAYS: int = 7
    
    # Email settings for notifications
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USER: str | None = None
    SMTP_PASS: str | None = None
    
    # Webhook settings
    WEBHOOK_URL: str | None = None
    
    # Semantic Search settings
    SIMILARITY_THRESHOLD: float = 0.6
    MODEL_NAME: str = "all-MiniLM-L6-v2"
    ENABLE_SEMANTIC: bool = True

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
