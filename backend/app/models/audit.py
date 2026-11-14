"""Audit log (feature 50). Append-only.

Records WHO looked at WHAT and WHEN, and whether it was allowed. It stores
names only: which consent fields were released, never their values. It never
stores a token, a password or any patient data.
"""
from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, Column, DateTime, Integer, String, Text

from app.db import Base
from app.models.append_only import protect


class AuditLog(Base):
    __tablename__ = "audit_log"
    __table_args__ = (
        CheckConstraint("outcome IN ('allowed','denied')", name="ck_audit_outcome"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    user_id = Column(String, nullable=True, index=True)   # null for token or anonymous access
    role = Column(String, nullable=False)                 # PATIENT, HOSPITAL_STAFF, ..., TOKEN, ANONYMOUS
    action = Column(String, nullable=False, index=True)   # for example passport.view
    resource_type = Column(String, nullable=False)        # passport, emergency
    resource_id = Column(String, nullable=True)
    patient_id = Column(String, nullable=True, index=True)  # no foreign key: denied attempts on unknown ids are logged too
    outcome = Column(String, nullable=False)              # allowed or denied
    reason = Column(String, nullable=True)               # a fixed code, never free text
    fields_released = Column(Text, nullable=False, default="[]")  # JSON list of consent names


protect(AuditLog, "audit log")
