"""Database setup: SQLite in WAL mode with a busy timeout.

The engine is created lazily so tests can point DATABASE_URL somewhere else.
Phase 1 Task 2 will add the remaining tables to the same Base.
"""
import os
from typing import Iterator, Optional

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker
from sqlalchemy.pool import StaticPool

Base = declarative_base()

DEFAULT_URL = "sqlite:///./healthtwin.db"
BUSY_TIMEOUT_MS = 5000

_engine: Optional[Engine] = None
_session_factory: Optional[sessionmaker] = None


def _is_memory(url: str) -> bool:
    return url in ("sqlite://", "sqlite:///") or ":memory:" in url


def make_engine(url: Optional[str] = None) -> Engine:
    url = url or os.environ.get("DATABASE_URL", DEFAULT_URL)
    kwargs: dict = {}
    is_sqlite = url.startswith("sqlite")
    if is_sqlite:
        kwargs["connect_args"] = {"check_same_thread": False}
        if _is_memory(url):
            kwargs["poolclass"] = StaticPool  # one shared connection for in-memory tests
    engine = create_engine(url, **kwargs)

    if is_sqlite:
        @event.listens_for(engine, "connect")
        def _sqlite_pragmas(dbapi_connection, _record):  # pragma: no cover - trivial
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.execute(f"PRAGMA busy_timeout={BUSY_TIMEOUT_MS}")
            if not _is_memory(url):
                cursor.execute("PRAGMA journal_mode=WAL")
            cursor.close()

    return engine


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        _engine = make_engine()
    return _engine


def reset_engine() -> None:
    """Forget the cached engine (tests change DATABASE_URL between runs)."""
    global _engine, _session_factory
    if _engine is not None:
        _engine.dispose()
    _engine = None
    _session_factory = None


def get_session_factory() -> sessionmaker:
    global _session_factory
    if _session_factory is None:
        _session_factory = sessionmaker(bind=get_engine(), expire_on_commit=False)
    return _session_factory


def get_db() -> Iterator[Session]:
    """FastAPI dependency: one session per request."""
    session = get_session_factory()()
    try:
        yield session
    finally:
        session.close()


def init_db(engine: Optional[Engine] = None) -> None:
    """Create all tables (and the ledger triggers)."""
    from app.models import accounts, audit, consent, emergencies, extras, hospitals, patient_data  # noqa: F401  (registers the tables)

    Base.metadata.create_all(engine or get_engine())
