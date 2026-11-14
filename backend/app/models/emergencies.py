"""Emergencies and everything that hangs off them (features 4, 8, 10, 19, 11)."""
from datetime import datetime, timezone

from sqlalchemy import (JSON, Boolean, CheckConstraint, Column, DateTime, Float, ForeignKey, Index, Integer, String)

from app.db import Base
from app.models.append_only import protect
from app.models.enums import EmergencySource, EmergencyState, EmergencyType, Severity
from app.security.types import EncryptedJSON


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _values(enum) -> str:
    return ", ".join(repr(member.value) for member in enum)


class Emergency(Base):
    __tablename__ = "emergencies"
    __table_args__ = (
        CheckConstraint(f"type IN ({_values(EmergencyType)})", name="ck_emergencies_type"),
        CheckConstraint(f"source IN ({_values(EmergencySource)})", name="ck_emergencies_source"),
        CheckConstraint(f"state IN ({_values(EmergencyState)})", name="ck_emergencies_state"),
        CheckConstraint(f"engine_severity IN ({_values(Severity)})", name="ck_emergencies_engine_severity"),
        CheckConstraint(f"severity IN ({_values(Severity)})", name="ck_emergencies_severity"),
    )

    id = Column(String, primary_key=True)                  # for example EM-20261114-0001 (opaque)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    type = Column(String, nullable=False)
    source = Column(String, nullable=False, default=EmergencySource.MANUAL.value)
    state = Column(String, nullable=False, default=EmergencyState.EMERGENCY_DETECTED.value, index=True)
    # What the rules engine said (never edited) and what is sent to hospitals (may be raised by the SOS floor,
    # see CONTRACT.md). Both are labelled "pending doctor review" while the rules are.
    engine_severity = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    severity_floor_applied = Column(Boolean, nullable=False, default=False)
    engine_result = Column(EncryptedJSON)                  # the full engine answer: reasons, rule ids, action
    symptoms = Column(EncryptedJSON)                       # the ids the app sent
    unmapped_symptoms = Column(EncryptedJSON)              # ids the symptom map did not know (for Daksh and the doctor)
    consents = Column(JSON)                                # the four flags at the time of the alert
    location = Column(EncryptedJSON)                       # only stored when the location consent was on
    vitals_at_alert = Column(EncryptedJSON)                # only stored when the vitals consent was on
    hospital_id = Column(String, ForeignKey("hospitals.id"))
    ambulance_id = Column(String, ForeignKey("ambulances.id"))
    eta_seconds = Column(Integer)
    created_at = Column(DateTime, nullable=False, default=_utcnow)
    sos_at = Column(DateTime)
    finished_at = Column(DateTime)


class StatusEvent(Base):
    """One row for every state change. The response timeline reads these. Append-only."""
    __tablename__ = "status_events"
    __table_args__ = (CheckConstraint(f"state IN ({_values(EmergencyState)})", name="ck_status_events_state"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    emergency_id = Column(String, ForeignKey("emergencies.id"), nullable=False, index=True)
    state = Column(String, nullable=False)
    timestamp = Column(DateTime, nullable=False, default=_utcnow)
    actor = Column(String, nullable=False)                 # "system", or the user id that clicked


protect(StatusEvent, "status timeline")


class SymptomReport(Base):
    __tablename__ = "symptom_reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    emergency_id = Column(String, ForeignKey("emergencies.id"))
    symptoms = Column(EncryptedJSON, nullable=False)
    source = Column(String, nullable=False, default=EmergencySource.MANUAL.value)
    created_at = Column(DateTime, nullable=False, default=_utcnow)


class HospitalAlert(Base):
    __tablename__ = "hospital_alerts"
    __table_args__ = (
        CheckConstraint("status IN ('ALERTED','ACKNOWLEDGED','ESCALATED_AWAY','CANCELLED')", name="ck_hospital_alerts_status"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    emergency_id = Column(String, ForeignKey("emergencies.id"), nullable=False, index=True)
    hospital_id = Column(String, ForeignKey("hospitals.id"), nullable=False, index=True)
    rank = Column(Integer, nullable=False, default=1)      # 1 = best match
    status = Column(String, nullable=False, default="ALERTED")
    alerted_at = Column(DateTime, nullable=False, default=_utcnow)
    acknowledged_at = Column(DateTime)
    acknowledged_by = Column(String)


class Vital(Base):
    __tablename__ = "vitals"
    __table_args__ = (Index("ix_vitals_patient_time", "patient_id", "timestamp"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    timestamp = Column(DateTime, nullable=False, default=_utcnow)
    heart_rate = Column(Integer)
    spo2 = Column(Float)
    bp_sys = Column(Integer)
    bp_dia = Column(Integer)
    glucose = Column(Integer)
    resp_rate = Column(Integer)


class EmergencyPassport(Base):
    """A stored passport link. Only a hash of the token is kept, so a stolen database cannot open a passport,
    and a link can be revoked or replaced before it expires."""
    __tablename__ = "emergency_passports"

    id = Column(String, primary_key=True)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    token_hash = Column(String, nullable=False, unique=True)
    created_at = Column(DateTime, nullable=False, default=_utcnow)
    expires_at = Column(DateTime, nullable=False)
    revoked_at = Column(DateTime)


class Counter(Base):
    """Counters for readable ids such as EM-20261114-0001. A demo reset clears them."""
    __tablename__ = "counters"

    key = Column(String, primary_key=True)
    value = Column(Integer, nullable=False, default=0)


class DeskEntry(Base):
    """What the hospital desk writes on an emergency: timeline notes, chat messages and checklist ticks (P2).
    One row per entry, never edited. The text is encrypted at rest (staff may type anything)."""
    __tablename__ = "desk_entries"
    __table_args__ = (CheckConstraint("kind IN ('note','chat','check')", name="ck_desk_entries_kind"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    emergency_id = Column(String, ForeignKey("emergencies.id"), nullable=False, index=True)
    kind = Column(String, nullable=False)                  # note, chat or check
    label = Column(String, nullable=False)                 # the note kind, the chat sender role, or the checklist item id
    content = Column(EncryptedJSON, nullable=False)
    hospital_id = Column(String)
    actor = Column(String, nullable=False)                 # the user id that wrote it
    created_at = Column(DateTime, nullable=False, default=_utcnow)
