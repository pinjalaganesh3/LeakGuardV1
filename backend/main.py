from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from backend.database import engine, init_db, SessionLocal
from backend.config import settings
from backend.seed_rules import seed_default_rules

from backend.auth import get_current_user
from backend.routers import auth, ingest, alerts, rules, audit, consent, dashboard, site_check

@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    db = SessionLocal()
    try:
        seed_default_rules(db)
    except Exception as error:
        print(f"Error seeding rules: {error}")
    finally:
        db.close()
    yield


app = FastAPI(
    title="LeakGuard API",
    description="Backend API for the LeakGuard Data Loss Prevention system.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication stays public; product data requires a session after signup.
app.include_router(auth.router, prefix="/api")
protected = {"dependencies": [Depends(get_current_user)]}
app.include_router(ingest.router, prefix="/api", **protected)
app.include_router(alerts.router, prefix="/api", **protected)
app.include_router(rules.router, prefix="/api", **protected)
app.include_router(audit.router, prefix="/api", **protected)
app.include_router(consent.router, prefix="/api", **protected)
app.include_router(dashboard.router, prefix="/api", **protected)
app.include_router(site_check.router, prefix="/api", **protected)

@app.get("/")
def read_root():
    """Root endpoint to check API status."""
    return {
        "app": "LeakGuard",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return {"status": "ok", "database": "ok"}
