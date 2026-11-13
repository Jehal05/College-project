"""Builds the emergency passport (feature 11): only what the patient consented to share."""
from typing import Optional, Tuple

from sqlalchemy.orm import Session

from app.models.consent import CONSENT_FIELDS
from app.models.patient_data import Contact, Patient, Report
from app.services.consent import FIELD_CONSENT, apply_consent, current_consents, shared_fields


def build_passport(session: Session, patient_id: str) -> Optional[Tuple[dict, list]]:
    """Return (passport, released_consent_names), or None if the patient does not exist.

    `released_consent_names` lists the consent flags whose data really went out.
    That list (names only) is what the audit log stores.
    """
    patient = session.get(Patient, patient_id)
    if patient is None:
        return None
    contacts = session.query(Contact).filter_by(patient_id=patient_id).order_by(Contact.position, Contact.id).all()
    reports = session.query(Report).filter_by(patient_id=patient_id).order_by(Report.id).all()

    full = {
        "patient_id": patient.id,
        "name": patient.name,
        "age": patient.age,
        "sex": patient.sex,
        "blood_group": patient.blood_group,
        "conditions": patient.conditions or [],
        "allergies": patient.allergies or [],
        "medications": patient.medications or [],
        "contacts": [{"name": c.name, "phone": c.phone, "order": c.position} for c in contacts],
        "reports": [{"id": r.id, "name": r.file_name} for r in reports],
    }
    consents = current_consents(session, patient_id)
    view = apply_consent(full, consents)
    if view.get("sex") is None:
        view.pop("sex", None)                       # unknown is left out, never null
    released = [f for f in CONSENT_FIELDS if any(FIELD_CONSENT.get(k) == f for k in view)]
    view["shared_fields"] = shared_fields(consents)
    view["simulated"] = True
    return view, released
