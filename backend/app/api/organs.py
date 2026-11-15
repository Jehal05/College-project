"""GET /patients/{id}/organs/{organ} (Phase 3, PROPOSED in docs/API_CONTRACT.md). The PATIENT, for their own record only.

The mapping from organ to readings is a fixed table in app/services/organs.py. A vital is one simulated reading
with no trend; a lab is a value the patient confirmed, with up to 12 values of trend. No data -> has_data false.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_actor
from app.api.patient_access import authorize_patient_record
from app.db import get_db
from app.models.patient_data import Patient
from app.security.actor import Actor
from app.services import audit, lab_values as lab_svc, organs

router = APIRouter(tags=["organs"])


@router.get("/patients/{patient_id}/organs/{organ}")
def read_organ(patient_id: str, organ: str, actor: Actor = Depends(get_current_actor),
               db: Session = Depends(get_db)) -> dict:
    authorize_patient_record(db, actor, patient_id, "organ.read", "organ")
    if db.get(Patient, patient_id) is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    if organ not in organs.ORGANS:
        raise HTTPException(status_code=404, detail="Unknown organ")
    answer = organs.organ_answer(db, patient_id, organ)
    audit.record(db, action="organ.read", resource_type="organ", resource_id=organ, patient_id=patient_id,
                 outcome="allowed", actor=actor,
                 fields_released=[lab_svc.audit_name(item["key"]) for item in answer["items"]])
    return answer
