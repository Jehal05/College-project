"""Patient record, vitals and baseline (Task 3). Shapes follow Jehal's contract script and the patient app."""
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_actor
from app.api.patient_access import authorize_patient_record
from app.db import get_db
from app.models.patient_data import Patient
from app.security.actor import Actor
from app.services import audit
from app.services import patient_record as records
from app.services.vitals import current_vitals

router = APIRouter(tags=["patients"])


def _patient_or_404(db: Session, patient_id: str) -> Patient:
    patient = db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.get("/patients/{patient_id}")
def read_patient(patient_id: str, actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db)) -> dict:
    who = authorize_patient_record(db, actor, patient_id, "patient.read", "patient", admin_read=True)
    view = records.patient_view(db, _patient_or_404(db, patient_id), owner=(who == "owner"))
    if who == "admin":
        audit.record(db, action="patient.read", resource_type="patient", resource_id=patient_id, patient_id=patient_id,
                     outcome="allowed", actor=actor, fields_released=records.released_names(view))
    return view


@router.patch("/patients/{patient_id}")
def update_patient(patient_id: str, body: Dict[str, Any], actor: Actor = Depends(get_current_actor),
                   db: Session = Depends(get_db)) -> dict:
    authorize_patient_record(db, actor, patient_id, "patient.update", "patient")
    patient = _patient_or_404(db, patient_id)
    try:
        clean = records.clean_patch(body)
    except records.RecordError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None
    records.apply_patch(db, patient, clean)
    db.commit()
    return records.patient_view(db, patient, owner=True)


@router.get("/patients/{patient_id}/vitals")
def read_vitals(patient_id: str, actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db)) -> dict:
    authorize_patient_record(db, actor, patient_id, "vitals.read", "vitals")
    _patient_or_404(db, patient_id)
    return current_vitals(patient_id)


@router.get("/patients/{patient_id}/baseline")
def read_baseline(patient_id: str, actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db)) -> dict:
    authorize_patient_record(db, actor, patient_id, "baseline.read", "baseline")
    view = records.baseline_view(_patient_or_404(db, patient_id))
    if view is None:
        raise HTTPException(status_code=404, detail="There is no baseline for this patient yet")
    return view
