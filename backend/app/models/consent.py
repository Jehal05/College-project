"""Consent ledger (feature 51). Append-only.

One row is added every time the patient changes a choice. The current consent
for a field is the newest row for that field. No row means NO consent.

Append-only protection comes from app/models/append_only.py (triggers, ORM
guards, inserts only). The single exception is /demo/reset in DEMO_MODE.
"""
from datetime import datetime, timezone

from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, ForeignKey, Integer, String

from app.db import Base
from app.models.append_only import AppendOnlyError, protect  # noqa: F401  (AppendOnlyError re-exported)

CONSENT_FIELDS = ("location", "history", "vitals", "reports")


class ConsentLedger(Base):
    __tablename__ = "consents"
    __table_args__ = (
        CheckConstraint("field IN ('location','history','vitals','reports')", name="ck_consents_field"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    field = Column(String, nullable=False)
    granted = Column(Boolean, nullable=False)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    actor = Column(String, nullable=False)        # user id of who made the change
    actor_role = Column(String, nullable=False)


protect(ConsentLedger, "consents ledger")
