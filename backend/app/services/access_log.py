"""Who looked at my data (the patient's own transparency feed).

Built from the audit log: every read by someone other than the patient, allowed or refused, in plain words.
It never shows a user id, a login, a token, a phone number or a value, only the kind of person, the hospital name for a
desk, what they looked at, which kinds of data were released (names only) and when.
"""
import json
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.accounts import User
from app.models.audit import AuditLog
from app.models.hospitals import Hospital
from app.services import audit as audit_service

MAX_LIMIT = 100

# what each action means, in the patient's terms (the app translates these keys)
WHAT = {
    "passport.view": "passport", "passport.staff_view": "passport", "emergency.read": "emergency",
    "emergency.list": "emergency", "insights.read": "insights", "family.view": "status",
    "family.checkin": "checkin", "responder.accept": "volunteer", "family.link": "link",
    "location.share": "location", "profile.read": "profile",
}
WHO = {"HOSPITAL_STAFF": "hospital_desk", "ADMIN": "admin", "FAMILY": "relative", "RESPONDER": "volunteer",
       "TOKEN": "qr_link", "ANONYMOUS": "unknown"}


def _hospital_name(session: Session, user_id: Optional[str], cache: Dict[str, Optional[str]]) -> Optional[str]:
    if not user_id:
        return None
    if user_id not in cache:
        user = session.get(User, user_id)
        hospital = session.get(Hospital, user.hospital_id) if user is not None and user.hospital_id else None
        cache[user_id] = hospital.name if hospital is not None else None
    return cache[user_id]


def entry(session: Session, row: AuditLog, cache: Dict[str, Optional[str]]) -> dict:
    d = audit_service.to_dict(row)
    who = {"kind": WHO.get(row.role, "unknown")}
    if row.role == "HOSPITAL_STAFF":
        name = _hospital_name(session, row.user_id, cache)
        if name:
            who["hospital"] = name
    return {"id": d["id"], "at": d["timestamp"], "who": who, "what": WHAT.get(row.action, "data"),
            "action": row.action, "outcome": row.outcome, "fields": d["fields_released"], "reason": row.reason}


def feed(session: Session, patient_id: str, limit: int = 50, before_id: Optional[int] = None) -> Tuple[List[dict], bool]:
    """Newest first. Returns (entries, more). Rows by the patient themselves are left out."""
    limit = min(max(limit, 1), MAX_LIMIT)
    query = session.query(AuditLog).filter(AuditLog.patient_id == patient_id, AuditLog.role != "PATIENT",
                                          AuditLog.action.in_(list(WHAT)))      # looks at data, not desk actions
    if before_id is not None:
        query = query.filter(AuditLog.id < before_id)
    rows = query.order_by(AuditLog.id.desc()).limit(limit + 1).all()
    cache: Dict[str, Optional[str]] = {}
    return [entry(session, r, cache) for r in rows[:limit]], len(rows) > limit


def entry_light(row: AuditLog) -> dict:
    """The same entry without a database lookup (for the live event): the hospital name is not included."""
    return {"id": row.id, "at": audit_service._iso(row.timestamp), "who": {"kind": WHO.get(row.role, "unknown")},
            "what": WHAT.get(row.action, "data"), "action": row.action, "outcome": row.outcome,
            "fields": json.loads(row.fields_released), "reason": row.reason}
