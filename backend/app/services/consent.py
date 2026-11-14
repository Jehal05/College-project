"""Consent rules (feature 51).

- No row for a field means no consent (default deny).
- The newest row for a field decides, and it is read fresh on every call, so a
  revoked consent takes effect on the very next request.
- Only the patient can change their own consent. Hospital staff, admins,
  family and responders can never change it.
- Fields without consent are OMITTED from payloads, never sent as null.
"""
from datetime import timezone
from typing import Any, Dict, List, Mapping

from sqlalchemy.orm import Session

from app.models.append_only import reset_table
from app.models.consent import CONSENT_FIELDS, ConsentLedger
from app.security.actor import Actor

# Which consent flag guards which payload field. Anything NOT listed here is
# always shown, so a new sensitive field must be added to this map.
FIELD_CONSENT: Dict[str, str] = {
    "location": "location",
    "lat": "location",
    "lng": "location",
    "accuracy": "location",
    "map_link": "location",
    "conditions": "history",
    "allergies": "history",
    "medications": "history",
    "contacts": "history",
    "vitals": "vitals",
    "reports": "reports",
}


class ConsentPermissionError(PermissionError):
    """The caller is not allowed to read or change this patient's consent."""


class UnknownConsentFieldError(ValueError):
    pass


# ---- permissions ----------------------------------------------------------

def can_read(actor: Actor, patient_id: str) -> bool:
    """The patient reads their own consent. Admin has read-only access."""
    return actor.role == "ADMIN" or (actor.role == "PATIENT" and actor.patient_id == patient_id)


def can_change(actor: Actor, patient_id: str) -> bool:
    """Only the patient, only for themselves."""
    return actor.role == "PATIENT" and actor.patient_id == patient_id


# ---- reading --------------------------------------------------------------

def current_consents(session: Session, patient_id: str) -> Dict[str, bool]:
    """Latest choice per field. Fields with no row are False."""
    state = {field: False for field in CONSENT_FIELDS}
    rows = session.query(ConsentLedger).filter_by(patient_id=patient_id).order_by(ConsentLedger.id).all()
    for row in rows:
        state[row.field] = bool(row.granted)
    return state


def get_consents_for(session: Session, actor: Actor, patient_id: str) -> Dict[str, bool]:
    if not can_read(actor, patient_id):
        raise ConsentPermissionError("Not allowed to read this patient's consent")
    return current_consents(session, patient_id)


def consent_history(session: Session, actor: Actor, patient_id: str) -> List[dict]:
    if not can_read(actor, patient_id):
        raise ConsentPermissionError("Not allowed to read this patient's consent history")
    rows = session.query(ConsentLedger).filter_by(patient_id=patient_id).order_by(ConsentLedger.id).all()
    return [
        {
            "field": r.field,
            "granted": bool(r.granted),
            "timestamp": r.created_at.replace(tzinfo=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "actor": r.actor,
            "actor_role": r.actor_role,
        }
        for r in rows
    ]


# ---- changing -------------------------------------------------------------

def update_consents(session: Session, actor: Actor, patient_id: str, changes: Mapping[str, Any]) -> List[str]:
    """Append one ledger row for every field whose value really changes.

    Returns the list of fields that changed. The caller commits.
    """
    if not can_change(actor, patient_id):
        raise ConsentPermissionError("Only the patient can change their own consent")
    for field, granted in changes.items():
        if field not in CONSENT_FIELDS:
            raise UnknownConsentFieldError(f"Unknown consent field '{field}'. Allowed: {', '.join(CONSENT_FIELDS)}")
        if not isinstance(granted, bool):
            raise ValueError(f"Consent for '{field}' must be true or false")

    current = current_consents(session, patient_id)
    changed: List[str] = []
    for field, granted in changes.items():
        if current[field] != granted:
            session.add(
                ConsentLedger(patient_id=patient_id, field=field, granted=granted,
                              actor=actor.user_id, actor_role=actor.role)
            )
            changed.append(field)
    session.flush()
    return changed


# ---- applying consent to a payload ---------------------------------------

def apply_consent(data: Mapping[str, Any], consents: Mapping[str, bool]) -> dict:
    """Drop every field the patient has not agreed to share (omit, never null)."""
    result = {}
    for key, value in data.items():
        flag = FIELD_CONSENT.get(key)
        if flag is None or consents.get(flag, False):
            result[key] = value
    return result


def consented_view(session: Session, patient_id: str, data: Mapping[str, Any]) -> dict:
    """Passports, hospital alerts, SMS and report lists call this on every request."""
    return apply_consent(data, current_consents(session, patient_id))


def shared_fields(consents: Mapping[str, bool]) -> List[str]:
    """The consent names that are on, for the passport's shared_fields."""
    return [field for field in CONSENT_FIELDS if consents.get(field)]


# ---- demo reset (the only way to clear the ledger) -----------------------

def demo_reset_ledger(session: Session) -> None:
    """Clear the ledger. Allowed ONLY when DEMO_MODE=true. The caller commits."""
    reset_table(session, "consents", "consents ledger")
