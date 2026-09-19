from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base
from backend.config import settings

database_url = settings.DATABASE_URL
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)

# SQLite needs this option for FastAPI's worker threads; PostgreSQL rejects it.
engine_options = {}
if database_url.startswith("sqlite"):
    engine_options["connect_args"] = {"check_same_thread": False}

engine = create_engine(database_url, **engine_options)

# SessionLocal is a factory for new database sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for our ORM models to inherit from
Base = declarative_base()

def get_db():
    """
    Dependency generator that yields a database session.
    Used in FastAPI endpoints to get a DB session.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """
    Creates all tables in the database.
    """
    # Ensure every ORM model is registered even when startup imports change.
    import backend.models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    _migrate_existing_database()

def _migrate_existing_database():
    """Add new nullable columns to an existing local SQLite database."""
    additions = {
        "users": {
            "role": "VARCHAR DEFAULT 'analyst'",
            "reset_token_hash": "VARCHAR",
            "reset_token_expires_at": "DATETIME",
            "two_factor_secret": "VARCHAR",
            "two_factor_enabled": "BOOLEAN DEFAULT 0",
        },
        "ingested_logs": {"owner_id": "INTEGER"},
        "rules": {"owner_id": "INTEGER"},
        "audit_entries": {"owner_id": "INTEGER"},
        "consent_records": {"owner_id": "INTEGER"},
    }
    inspector = inspect(engine)
    with engine.begin() as connection:
        if "users" in inspector.get_table_names():
            connection.execute(text("UPDATE users SET email = lower(trim(email)) WHERE email IS NOT NULL"))
        for table, columns in additions.items():
            existing = {column["name"] for column in inspector.get_columns(table)}
            for name, definition in columns.items():
                if name not in existing:
                    connection.execute(text(f'ALTER TABLE "{table}" ADD COLUMN "{name}" {definition}'))
        if "users" in inspector.get_table_names():
            connection.execute(text("UPDATE users SET role = 'admin' WHERE id = (SELECT MIN(id) FROM users)"))
