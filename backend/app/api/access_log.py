"""GET /patients/{id}/access-log: who looked at my data, and what they were shown (the patient only)."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_actor
from app.api.patient_access import authorize_patient_record
from app.db import get_db
from app.models.patient_data import Patient
from app.security.actor import Actor
from app.services import access_log as svc

router = APIRouter(tags=["access-log"])


@router.get("/patients/{patient_id}/access-log")
def access_log(patient_id: str, limit: int = Query(50, ge=1, le=svc.MAX_LIMIT), before: Optional[int] = Query(None, ge=1),
               actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db)) -> dict:
    authorize_patient_record(db, actor, patient_id, "access_log.read", "access_log")     # the patient only
    if db.get(Patient, patient_id) is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    entries, more = svc.feed(db, patient_id, limit, before)
    return {"entries": entries, "more": more, "simulated": True}
