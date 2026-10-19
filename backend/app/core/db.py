from collections.abc import Iterator
from datetime import UTC, datetime

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


def utcnow() -> datetime:
    return datetime.now(UTC)


def make_engine(url: str):
    return create_engine(
        url,
        pool_pre_ping=True,
        future=True,
        connect_args={"connect_timeout": 5},
        pool_timeout=10,
        max_overflow=5,
    )


_engine = None
_SessionLocal: sessionmaker[Session] | None = None


def configure(url: str | None = None) -> None:
    global _engine, _SessionLocal
    _engine = make_engine(url or get_settings().database_url)
    _SessionLocal = sessionmaker(bind=_engine, expire_on_commit=False)


def get_engine():
    if _engine is None:
        configure()
    return _engine


def new_session() -> Session:
    """A standalone session for background work (caller must close it)."""
    if _SessionLocal is None:
        configure()
    if _SessionLocal is None:
        raise RuntimeError("Database session factory not configured")
    return _SessionLocal()


def get_db() -> Iterator[Session]:
    db = new_session()
    try:
        yield db
    finally:
        db.close()
