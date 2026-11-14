"""Readable emergency ids: EM-YYYYMMDD-nnnn, with a counter per day (SQLite).

The counter is bumped with a single UPDATE inside the caller's transaction. SQLite takes its write lock at that
moment, so two requests at the same time wait for each other and can never get the same number.
Nothing in the code reads meaning back out of an id: ids are opaque strings.
"""
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.idgen import new_id  # noqa: F401  (re-exported for convenience)


def next_daily_id(session: Session, prefix: str = "EM", when: Optional[datetime] = None) -> str:
    moment = when or datetime.now(timezone.utc)
    key = f"{prefix}-{moment.strftime('%Y%m%d')}"
    session.execute(text("INSERT OR IGNORE INTO counters (key, value) VALUES (:k, 0)"), {"k": key})
    session.execute(text("UPDATE counters SET value = value + 1 WHERE key = :k"), {"k": key})
    value = session.execute(text("SELECT value FROM counters WHERE key = :k"), {"k": key}).scalar_one()
    return f"{key}-{value:04d}"


def reset_counters(session: Session) -> None:
    """For /demo/reset: the next emergency is number 0001 again."""
    session.execute(text("DELETE FROM counters"))
