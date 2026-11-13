"""Consent endpoints (feature 51). Used by Jehal's consent screen (18) and Shagun's location sharing (66)."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, StrictBool
from sqlalchemy.orm import Session

from app.api.deps import get_current_actor
from app.db import get_db
from app.models.patient_data import Patient
from app.security.actor import Actor
from app.services import consent as service
from app.services.patient_record import consent_changes

router = APIRouter(prefix="/patients", tags=["consents"])


class ConsentUpdate(BaseModel):
    """Send only the fields you want to change. Values must be true or false."""
    model_config = ConfigDict(extra="forbid")

    location: Optional[StrictBool] = None
    history: Optional[StrictBool] = None
    vitals: Optional[StrictBool] = None
    reports: Optional[StrictBool] = None


def _check_read(actor: Actor, patient_id: str, db: Session) -> None:
    if not service.can_read(actor, patient_id):
        raise HTTPException(status_code=403, detail="Not allowed to read this patient's consent")
    if db.get(Patient, patient_id) is None:
        raise HTTPException(status_code=404, detail="Patient not found")


@router.get("/{patient_id}/consents")
def read_consents(patient_id: str, actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db)) -> dict:
    _check_read(actor, patient_id, db)
    return {"patient_id": patient_id, "consents": service.current_consents(db, patient_id),
            "changes": consent_changes(db, patient_id), "simulated": True}


@router.put("/{patient_id}/consents")
def update_consents(
    patient_id: str,
    body: ConsentUpdate,
    actor: Actor = Depends(get_current_actor),
    db: Session = Depends(get_db),
) -> dict:
    if not service.can_change(actor, patient_id):
        raise HTTPException(status_code=403, detail="Only the patient can change their own consent")
    if db.get(Patient, patient_id) is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    changes = {k: v for k, v in body.model_dump().items() if v is not None}
    if not changes:
        raise HTTPException(status_code=400, detail="Send at least one of: location, history, vitals, reports")
    changed = service.update_consents(db, actor, patient_id, changes)
    db.commit()
    return {
        "patient_id": patient_id,
        "consents": service.current_consents(db, patient_id),
        "changes": consent_changes(db, patient_id),
        "changed": changed,
        "simulated": True,
    }


@router.get("/{patient_id}/consents/history")
def read_consent_history(
    patient_id: str, actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db)
) -> dict:
    _check_read(actor, patient_id, db)
    return {"patient_id": patient_id, "history": service.consent_history(db, actor, patient_id), "simulated": True}
