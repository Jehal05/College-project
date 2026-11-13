"""Tables that hold sensitive patient fields (feature 51).

These three tables are created now so field-level encryption is real from the
start. Phase 1 Task 2 adds the other tables and any extra columns.

Encrypted columns: conditions, allergies, medications, contact phone number,
report file name. Everything else here is stored as plain text on purpose.
"""
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from app.db import Base
from app.security.types import EncryptedJSON, EncryptedText


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Patient(Base):
    __tablename__ = "patients"

    id = Column(String, primary_key=True)          # for example pat_001
    name = Column(String, nullable=False)
    age = Column(Integer)
    blood_group = Column(String)
    conditions = Column(EncryptedJSON)             # list of strings
    allergies = Column(EncryptedJSON)              # list of strings
    medications = Column(EncryptedJSON)            # list of strings


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    phone = Column(EncryptedText, nullable=False)  # encrypted
    position = Column(Integer, nullable=False, default=1)  # notification order (feature 38)


class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True)          # for example rep_001
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    file_name = Column(EncryptedText, nullable=False)  # encrypted
    uploaded_at = Column(DateTime, nullable=False, default=_utcnow)
