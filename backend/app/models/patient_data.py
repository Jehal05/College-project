"""Tables that hold sensitive patient fields (features 51, 38).

Encrypted columns: conditions, allergies, medications, baseline, contact phone number, report file name and
report file content. Everything else here is stored as plain text on purpose.
"""
from datetime import datetime, timezone

from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, ForeignKey, Integer, String

from app.db import Base
from app.models.idgen import new_id
from app.security.types import EncryptedBytes, EncryptedJSON, EncryptedText


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Patient(Base):
    __tablename__ = "patients"
    __table_args__ = (CheckConstraint("language IN ('en','hi','gu')", name="ck_patients_language"),)

    id = Column(String, primary_key=True)          # for example PT-2026-0417 (opaque)
    name = Column(String, nullable=False)
    age = Column(Integer)
    sex = Column(String)                           # short code such as "M" or "F". Whether hospitals see it is a team decision.
    blood_group = Column(String)
    blood_group_verified = Column(Boolean, nullable=False, default=False)
    language = Column(String, nullable=False, default="en")
    conditions = Column(EncryptedJSON)             # list of strings
    allergies = Column(EncryptedJSON)              # list of strings
    medications = Column(EncryptedJSON)            # list of strings
    baseline = Column(EncryptedJSON)               # the person's own usual ranges, for the "usual range" display


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(String, primary_key=True, default=lambda: new_id("C"))
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    relation = Column(String)                      # Mother, Father, Spouse, Sibling, Child, Friend, Other
    phone = Column(EncryptedText, nullable=False)  # encrypted
    is_primary = Column(Boolean, nullable=False, default=False)
    position = Column(Integer, nullable=False, default=1)  # notification order (feature 38)


class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, default=lambda: new_id("REP"))
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    file_name = Column(EncryptedText, nullable=False)  # encrypted
    content_type = Column(String)                  # application/pdf, image/jpeg or image/png
    size = Column(Integer)
    content = Column(EncryptedBytes)               # the file itself, encrypted
    uploaded_at = Column(DateTime, nullable=False, default=_utcnow)
