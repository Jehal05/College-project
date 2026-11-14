"""POST /location-shares and DELETE /location-shares/{id}: share where I am with my linked relatives for a while."""
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_actor
from app.db import get_db
from app.models.patient_data import Patient
from app.security.actor import Actor
from app.services import audit
from app.services import location_shares as svc
from app.services.consent import current_consents

router = APIRouter(tags=["location-shares"])


def _owner(db: Session, actor: Actor, action: str) -> str:
    if actor.role != "PATIENT" or not actor.patient_id:
        audit.record(db, action=action, resource_type="location", resource_id=None, outcome="denied",
                     reason="forbidden_role", actor=actor)
        raise HTTPException(status_code=403, detail="Not allowed")
    return actor.patient_id


@router.post("/location-shares", status_code=201)
def share(body: Dict[str, Any], actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db)) -> dict:
    patient_id = _owner(db, actor, "location.share")
    try:
        data = svc.clean_share(body)
    except svc.ShareError as exc:
        raise HTTPException(status_code=exc.status, detail=str(exc)) from None
    if data["patient_id"] not in (None, patient_id):
        audit.record(db, action="location.share", resource_type="location", resource_id=None, outcome="denied",
                     reason="forbidden_role", actor=actor, patient_id=patient_id)
        raise HTTPException(status_code=403, detail="You can only share your own location")
    if db.get(Patient, patient_id) is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    if not current_consents(db, patient_id).get("location"):
        audit.record(db, action="location.share", resource_type="location", resource_id=None, patient_id=patient_id,
                     outcome="denied", reason="consent_missing", actor=actor)
        raise HTTPException(status_code=403, detail="Location sharing is switched off in your consents")
    row = svc.start(db, patient_id, data["minutes"], data["location"])
    db.commit()
    audit.record(db, action="location.share", resource_type="location", resource_id=row.id, patient_id=patient_id,
                 outcome="allowed", actor=actor, fields_released=["location"])
    return {**svc.view(row), "minutes": data["minutes"]}


@router.delete("/location-shares/{share_id}")
def stop(share_id: str, actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db)) -> dict:
    patient_id = _owner(db, actor, "location.stop")
    try:
        svc.stop(db, patient_id, share_id)
    except svc.ShareError as exc:
        db.rollback()
        raise HTTPException(status_code=exc.status, detail=str(exc)) from None
    db.commit()
    audit.record(db, action="location.stop", resource_type="location", resource_id=share_id, patient_id=patient_id,
                 outcome="allowed", actor=actor)
    return {"ok": True}
