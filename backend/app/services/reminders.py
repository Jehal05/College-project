"""Medication reminders, their 7-day log and the patient's small preferences (J3).

The app only REMINDS while it is open. It never suggests a dose and never says what to do about a missed one, so
nothing here interprets the log. Names and notes are health data: stored encrypted, never written to the audit log.
"""
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.extras import PatientPreference, Reminder, ReminderLog

MAX_REMINDERS = 8
MAX_TIMES = 4
SAFETY_MINUTES = (5, 15, 30)
_TIME = re.compile(r"([01]\d|2[0-3]):[0-5]\d")


class ReminderError(ValueError):
    """The request is not valid. `status` is the HTTP code. The message never repeats what was sent."""

    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def _int(value: Any) -> bool:
    return isinstance(value, int) and not isinstance(value, bool)


def clean_reminder(body: Any) -> Dict[str, Any]:
    if not isinstance(body, dict):
        raise ReminderError("The body must be a JSON object")
    name = body.get("name")
    if not isinstance(name, str) or not name.strip():
        raise ReminderError("name is required")
    if len(name.strip()) > 60:
        raise ReminderError("name can be at most 60 characters")
    note = body.get("dose_note", "")
    if note is None:
        note = ""
    if not isinstance(note, str) or len(note) > 60:
        raise ReminderError("dose_note can be at most 60 characters")
    times = body.get("times")
    if not isinstance(times, list) or not 1 <= len(times) <= MAX_TIMES:
        raise ReminderError("times must be a list of 1 to %d times" % MAX_TIMES)
    if not all(isinstance(t, str) and _TIME.fullmatch(t) for t in times):
        raise ReminderError("each time must look like 08:30")
    if len(set(times)) != len(times):
        raise ReminderError("times must not repeat")
    days = body.get("days")
    if not (isinstance(days, list) and days and all(_int(d) and 0 <= d <= 6 for d in days) and len(set(days)) == len(days)):
        raise ReminderError("days must be a list of different numbers from 0 (Sunday) to 6 (Saturday)")
    paused = body.get("paused", False)
    if not isinstance(paused, bool):
        raise ReminderError("paused must be true or false")
    return {"name": name.strip(), "dose_note": note.strip(), "times": sorted(times), "days": sorted(days),
            "paused": paused}


def as_dict(reminder: Reminder) -> Dict[str, Any]:
    return {"id": reminder.id, "name": reminder.name, "dose_note": reminder.dose_note or "",
            "times": list(reminder.times), "days": list(reminder.days), "paused": bool(reminder.paused)}


def list_reminders(session: Session, patient_id: str) -> List[Reminder]:
    return (session.query(Reminder).filter(Reminder.patient_id == patient_id)
            .order_by(Reminder.created_at, Reminder.id).all())


def add_reminder(session: Session, patient_id: str, clean: Dict[str, Any]) -> Reminder:
    if session.query(Reminder).filter(Reminder.patient_id == patient_id).count() >= MAX_REMINDERS:
        raise ReminderError("You can have at most %d reminders" % MAX_REMINDERS, 409)
    reminder = Reminder(patient_id=patient_id, **clean)
    session.add(reminder)
    session.flush()
    return reminder


def find(session: Session, patient_id: str, reminder_id: str) -> Reminder:
    reminder = session.query(Reminder).filter(Reminder.patient_id == patient_id, Reminder.id == reminder_id).first()
    if reminder is None:
        raise ReminderError("Reminder not found", 404)
    return reminder


def update_reminder(session: Session, patient_id: str, reminder_id: str, clean: Dict[str, Any]) -> Reminder:
    reminder = find(session, patient_id, reminder_id)
    for key, value in clean.items():
        setattr(reminder, key, value)
    session.flush()
    return reminder


def delete_reminder(session: Session, patient_id: str, reminder_id: str) -> None:
    reminder = find(session, patient_id, reminder_id)
    session.query(ReminderLog).filter(ReminderLog.reminder_id == reminder.id).delete()
    session.delete(reminder)


# ------------------------------------------------------------------ the log

def _utc(moment: datetime) -> datetime:
    return moment if moment.tzinfo else moment.replace(tzinfo=timezone.utc)


def _iso(moment: Optional[datetime]) -> Optional[str]:
    return None if moment is None else _utc(moment).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_moment(value: Any, label: str) -> datetime:
    """An ISO 8601 date and time (with Z or an offset), as UTC, to the second."""
    if not isinstance(value, str) or not value.strip():
        raise ReminderError("%s must be a date and time" % label)
    try:
        moment = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    except ValueError:
        raise ReminderError("%s must be a date and time" % label) from None
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    return moment.astimezone(timezone.utc).replace(microsecond=0)


def entry_dict(entry: ReminderLog) -> Dict[str, Any]:
    return {"reminder_id": entry.reminder_id, "scheduled_for": _iso(entry.scheduled_for), "taken_at": _iso(entry.taken_at)}


def log_entry(session: Session, patient_id: str, reminder_id: str, body: Any) -> ReminderLog:
    """The slot's row, created when it is first mentioned. Mentioning a slot twice never makes two rows."""
    reminder = find(session, patient_id, reminder_id)
    if not isinstance(body, dict):
        raise ReminderError("scheduled_for must be a date and time")
    slot = parse_moment(body.get("scheduled_for"), "scheduled_for")
    entry = (session.query(ReminderLog).filter(ReminderLog.reminder_id == reminder.id,
                                               ReminderLog.scheduled_for == slot.replace(tzinfo=None)).first())
    if entry is None:
        entry = ReminderLog(patient_id=patient_id, reminder_id=reminder.id, scheduled_for=slot.replace(tzinfo=None))
        session.add(entry)
        session.flush()
    return entry


def mark_taken(entry: ReminderLog, body: Dict[str, Any]) -> ReminderLog:
    entry.taken_at = parse_moment(body.get("at"), "at").replace(tzinfo=None)
    return entry


def recent_log(session: Session, patient_id: str, days: int = 7, now: Optional[datetime] = None) -> List[Dict[str, Any]]:
    since = ((now or datetime.now(timezone.utc)) - timedelta(days=days)).replace(tzinfo=None)
    rows = (session.query(ReminderLog).filter(ReminderLog.patient_id == patient_id, ReminderLog.scheduled_for >= since)
            .order_by(ReminderLog.scheduled_for.desc(), ReminderLog.id.desc()).all())
    return [entry_dict(r) for r in rows]


# ------------------------------------------------------------------ preferences

def get_preferences(session: Session, patient_id: str) -> Dict[str, Any]:
    row = session.get(PatientPreference, patient_id)
    enabled = bool(row.safety_checkin_enabled) if row else False
    minutes = row.safety_checkin_minutes if row else 15
    return {"safety_checkin": {"enabled": enabled, "minutes": minutes}}


def put_preferences(session: Session, patient_id: str, body: Any) -> Dict[str, Any]:
    check = body.get("safety_checkin") if isinstance(body, dict) else None
    if not (isinstance(check, dict) and isinstance(check.get("enabled"), bool) and _int(check.get("minutes"))
            and check["minutes"] in SAFETY_MINUTES):
        raise ReminderError("safety_checkin needs enabled (true or false) and minutes (%s)"
                            % ", ".join(str(m) for m in SAFETY_MINUTES))
    row = session.get(PatientPreference, patient_id)
    if row is None:
        row = PatientPreference(patient_id=patient_id)
        session.add(row)
    row.safety_checkin_enabled, row.safety_checkin_minutes = check["enabled"], check["minutes"]
    session.flush()
    return get_preferences(session, patient_id)
