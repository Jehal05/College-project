"""Reminders, preferences and the passport link bookkeeping (J3). Medicine names are health data: encrypted."""
from datetime import datetime, timezone

from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint

from app.db import Base
from app.models.idgen import new_id
from app.security.types import EncryptedJSON, EncryptedText


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class PassportSecret(Base):
    """The passport link, encrypted, so the patient's screen can show the same QR again after a reload.
    `emergency_passports` keeps only the hash (a stolen database cannot open a passport); this row is encrypted
    with FERNET_KEY, and is deleted when the link is revoked."""
    __tablename__ = "passport_secrets"

    passport_id = Column(String, ForeignKey("emergency_passports.id"), primary_key=True)
    token = Column(EncryptedText, nullable=False)


class PassportOpen(Base):
    """One row each time somebody opens the QR link. Only the time: no IP address, no device information."""
    __tablename__ = "passport_opens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    passport_id = Column(String, ForeignKey("emergency_passports.id"), nullable=False, index=True)
    opened_at = Column(DateTime, nullable=False, default=_utcnow)


class Reminder(Base):
    """A medication reminder. The app only REMINDS: it never suggests a dose or what to do about a missed one."""
    __tablename__ = "reminders"

    id = Column(String, primary_key=True, default=lambda: new_id("M"))
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    name = Column(EncryptedText, nullable=False)           # encrypted
    dose_note = Column(EncryptedText, nullable=False, default="")  # encrypted
    times = Column(EncryptedJSON, nullable=False)          # ["08:30", ...] on the person's own clock
    days = Column(EncryptedJSON, nullable=False)           # 0 (Sunday) to 6 (Saturday)
    paused = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=_utcnow)


class ReminderLog(Base):
    """A reminder that was shown (taken_at empty) or marked taken. A plain record, never advice."""
    __tablename__ = "reminder_log"
    __table_args__ = (UniqueConstraint("reminder_id", "scheduled_for", name="uq_reminder_log_slot"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    reminder_id = Column(String, ForeignKey("reminders.id"), nullable=False, index=True)
    scheduled_for = Column(DateTime, nullable=False)
    taken_at = Column(DateTime)


class PatientPreference(Base):
    """Small per-patient settings kept on the server (never in browser storage). Today: the safety check-in."""
    __tablename__ = "patient_preferences"
    __table_args__ = (CheckConstraint("safety_checkin_minutes IN (5, 15, 30)", name="ck_preferences_minutes"),)

    patient_id = Column(String, ForeignKey("patients.id"), primary_key=True)
    safety_checkin_enabled = Column(Boolean, nullable=False, default=False)
    safety_checkin_minutes = Column(Integer, nullable=False, default=15)
