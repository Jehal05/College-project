"""The patient's own record: profile, emergency contacts, baseline, consent log (Phase 1, Task 3).

Validation rules are copied from the patient app's own form (src/utils/validate.js) and the mock server, so a
value the app accepts is accepted here, and a value the app would refuse is refused here as well.

Privacy
- The OWNER sees everything, including their contacts' phone numbers.
- Anyone else (an admin) sees only what the patient agreed to share, with fields left OUT (never null), and
  never a phone number.
"""
import re
from datetime import timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.consent import ConsentLedger
from app.models.patient_data import Contact, Patient
from app.services.consent import apply_consent, current_consents

LANGUAGES = ("en", "hi", "gu")
BLOOD_GROUPS = ("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-")
SEX_CODES = ("M", "F", "O")
RELATIONS = ("Mother", "Father", "Spouse", "Sibling", "Child", "Friend", "Other")
EDITABLE = ("name", "age", "sex", "blood_group", "allergies", "conditions", "medications", "language")
LIST_FIELDS = ("allergies", "conditions", "medications")
MAX_CONTACTS = 5
MAX_NAME = 100
MAX_LIST_ITEMS = 20
MAX_ITEM_LENGTH = 100
_PHONE = re.compile(r"\+?\d{8,15}")


class RecordError(ValueError):
    """A bad value. The API answers 400 with this plain sentence."""


class ContactNotFound(LookupError):
    pass


class ContactLimitReached(RuntimeError):
    pass


# ---------------------------------------------------------------- the profile

def clean_patch(body: Any) -> Dict[str, Any]:
    """Check a PATCH body and return only clean values. Raises RecordError with a plain sentence."""
    if not isinstance(body, dict):
        raise RecordError("Send a JSON object with the fields to change")
    if "consents" in body:
        raise RecordError("Consents are changed with PUT /patients/{id}/consents, not here")
    if "contacts" in body:
        raise RecordError("Contacts are changed with the /patients/{id}/contacts endpoints, not here")
    unknown = sorted(set(body) - set(EDITABLE))
    if unknown:
        raise RecordError("These fields cannot be changed here: " + ", ".join(unknown))
    if not body:
        raise RecordError("Send at least one field to change")

    clean: Dict[str, Any] = {}
    if "name" in body:
        name = body["name"]
        if not isinstance(name, str) or not name.strip():
            raise RecordError("name is required")
        if len(name.strip()) > MAX_NAME:
            raise RecordError(f"name must be at most {MAX_NAME} characters")
        clean["name"] = name.strip()
    if "age" in body:
        age = body["age"]
        if isinstance(age, bool) or not isinstance(age, int) or not 0 <= age <= 120:
            raise RecordError("age must be a whole number from 0 to 120")
        clean["age"] = age
    if "sex" in body:
        if body["sex"] not in SEX_CODES:
            raise RecordError("sex must be one of: " + ", ".join(SEX_CODES))
        clean["sex"] = body["sex"]
    if "blood_group" in body:
        if body["blood_group"] not in BLOOD_GROUPS:
            raise RecordError("blood_group must be one of: " + ", ".join(BLOOD_GROUPS))
        clean["blood_group"] = body["blood_group"]
    if "language" in body:
        if body["language"] not in LANGUAGES:
            raise RecordError("language must be one of: " + ", ".join(LANGUAGES))
        clean["language"] = body["language"]
    for field in LIST_FIELDS:
        if field in body:
            items = body[field]
            if not isinstance(items, list) or any(not isinstance(i, str) for i in items):
                raise RecordError(f"{field} must be a list of text items")
            cleaned = [i.strip() for i in items if i.strip()]
            if len(cleaned) > MAX_LIST_ITEMS or any(len(i) > MAX_ITEM_LENGTH for i in cleaned):
                raise RecordError(f"{field} can hold at most {MAX_LIST_ITEMS} items of {MAX_ITEM_LENGTH} characters")
            clean[field] = cleaned
    return clean


def apply_patch(session: Session, patient: Patient, clean: Dict[str, Any]) -> None:
    for field, value in clean.items():
        setattr(patient, field, value)
    if "blood_group" in clean:
        patient.blood_group_verified = False        # the patient typed it in; nobody has verified it
    session.flush()


# ---------------------------------------------------------------- contacts

def clean_contact(body: Any) -> Dict[str, Any]:
    if not isinstance(body, dict):
        raise RecordError("Send a JSON object")
    name = body.get("name")
    if not isinstance(name, str) or not name.strip():
        raise RecordError("name is required")
    if len(name.strip()) > MAX_NAME:
        raise RecordError(f"name must be at most {MAX_NAME} characters")
    if body.get("relation") not in RELATIONS:
        raise RecordError("relation must be one of: " + ", ".join(RELATIONS))
    phone = body.get("phone")
    if not isinstance(phone, str) or not _PHONE.fullmatch(re.sub(r"[\s-]", "", phone)):
        raise RecordError("phone is not valid")
    primary = body.get("is_primary")
    if primary is not None and not isinstance(primary, bool):
        raise RecordError("is_primary must be true or false")
    return {"name": name.strip(), "relation": body["relation"], "phone": phone.strip(), "is_primary": primary}


def list_contacts(session: Session, patient_id: str) -> List[Contact]:
    return session.query(Contact).filter_by(patient_id=patient_id).order_by(Contact.position, Contact.id).all()


def contact_dict(contact: Contact) -> dict:
    return {"id": contact.id, "name": contact.name, "relation": contact.relation, "phone": contact.phone,
            "is_primary": bool(contact.is_primary), "simulated": True}


def _settle(session: Session, patient_id: str, preferred_primary: Optional[str] = None) -> None:
    """Exactly one primary contact (when there is any) and positions 1..n with no gaps."""
    contacts = list_contacts(session, patient_id)
    if not contacts:
        return
    keep = next((c for c in contacts if c.id == preferred_primary), None) or next((c for c in contacts if c.is_primary), contacts[0])
    for position, contact in enumerate(contacts, start=1):
        contact.is_primary = contact is keep
        contact.position = position
    session.flush()


def add_contact(session: Session, patient_id: str, clean: Dict[str, Any]) -> Contact:
    if session.query(Contact).filter_by(patient_id=patient_id).count() >= MAX_CONTACTS:
        raise ContactLimitReached(f"You can save at most {MAX_CONTACTS} contacts")
    last = max((c.position for c in list_contacts(session, patient_id)), default=0)
    contact = Contact(patient_id=patient_id, name=clean["name"], relation=clean["relation"], phone=clean["phone"],
                      is_primary=False, position=last + 1)
    session.add(contact)
    session.flush()
    _settle(session, patient_id, contact.id if clean["is_primary"] else None)
    return contact


def _find_contact(session: Session, patient_id: str, contact_id: str) -> Contact:
    contact = session.query(Contact).filter_by(patient_id=patient_id, id=contact_id).one_or_none()
    if contact is None:
        raise ContactNotFound("Contact not found")
    return contact


def update_contact(session: Session, patient_id: str, contact_id: str, clean: Dict[str, Any]) -> Contact:
    contact = _find_contact(session, patient_id, contact_id)
    contact.name, contact.relation, contact.phone = clean["name"], clean["relation"], clean["phone"]
    session.flush()
    _settle(session, patient_id, contact.id if clean["is_primary"] else None)
    return contact


def delete_contact(session: Session, patient_id: str, contact_id: str) -> None:
    session.delete(_find_contact(session, patient_id, contact_id))
    session.flush()
    _settle(session, patient_id)          # if the primary was deleted, the first remaining one becomes primary


# ---------------------------------------------------------------- what the API shows

def patient_view(session: Session, patient: Patient, *, owner: bool) -> dict:
    """The owner sees everything. Anyone else sees only what the patient shared (fields left out, never null),
    and no phone numbers."""
    contacts = list_contacts(session, patient.id)
    consents = current_consents(session, patient.id)
    full = {
        "id": patient.id,
        "name": patient.name,
        "age": patient.age,
        "sex": patient.sex,
        "blood_group": patient.blood_group,
        "blood_group_verified": bool(patient.blood_group_verified),
        "language": patient.language,
        "allergies": patient.allergies or [],
        "conditions": patient.conditions or [],
        "medications": patient.medications or [],
        "contacts": [contact_dict(c) if owner else
                     {"name": c.name, "relation": c.relation, "is_primary": bool(c.is_primary)} for c in contacts],
        "consents": consents,
    }
    view = full if owner else apply_consent(full, consents)
    if view.get("sex") is None:
        view.pop("sex", None)                 # unknown is left out, never sent as null
    view["simulated"] = True
    return view


def released_names(view: dict) -> List[str]:
    """The consent names whose data is actually in `view` (names only, for the audit log)."""
    from app.models.consent import CONSENT_FIELDS
    from app.services.consent import FIELD_CONSENT
    return [f for f in CONSENT_FIELDS if any(FIELD_CONSENT.get(k) == f for k in view)]


def baseline_view(patient: Patient) -> Optional[dict]:
    return None if not patient.baseline else {**patient.baseline, "simulated": True}


def consent_changes(session: Session, patient_id: str, limit: int = 20) -> List[dict]:
    """The patient's own consent changes, newest first, as the apps show them. The demo seed rows are not changes."""
    rows = (session.query(ConsentLedger)
            .filter(ConsentLedger.patient_id == patient_id, ConsentLedger.actor_role != "SYSTEM")
            .order_by(ConsentLedger.id.desc()).limit(limit).all())
    return [{"key": r.field, "value": bool(r.granted),
             "timestamp": r.created_at.replace(tzinfo=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")} for r in rows]
