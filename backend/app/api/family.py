"""Family linking, the family status view and the check-in reply (feature 61, J4)."""
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_actor
from app.api.patient_access import authorize_patient_record
from app.db import get_db
from app.models.patient_data import Patient
from app.security.actor import Actor
from app.services import audit, events
from app.services import family as svc

router = APIRouter(tags=["family"])


def _only_family(db: Session, actor: Actor, action: str) -> None:
    if actor.role != "FAMILY":
        audit.record(db, action=action, resource_type="family", resource_id=None, outcome="denied",
                     reason="forbidden_role", actor=actor)
        raise HTTPException(status_code=403, detail="Not allowed")


def _fail(db: Session, exc: svc.FamilyError):
    db.rollback()
    events.discard(db)
    raise HTTPException(status_code=exc.status, detail=str(exc)) from None


@router.post("/patients/{patient_id}/family-invites", status_code=201)
def create_invite(patient_id: str, actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db)) -> dict:
    authorize_patient_record(db, actor, patient_id, "family.invite", "family")
    if db.get(Patient, patient_id) is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    try:
        invite = svc.create_invite(db, patient_id)
    except svc.FamilyError as exc:
        _fail(db, exc)
    db.commit()
    audit.record(db, action="family.invite", resource_type="family", resource_id=patient_id, patient_id=patient_id,
                 outcome="allowed", actor=actor)
    return {"code": invite.code, "expires_at": svc._iso(invite.expires_at), "simulated": True}


@router.post("/family/link")
def link(body: Dict[str, Any], actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db)) -> dict:
    _only_family(db, actor, "family.link")
    try:
        patient = svc.link(db, actor, svc.clean_code(body))
    except svc.FamilyError as exc:
        _fail(db, exc)
    db.commit()
    audit.record(db, action="family.link", resource_type="family", resource_id=patient.id, patient_id=patient.id,
                 outcome="allowed", actor=actor)
    return {"patient_id": patient.id, "name": patient.name, "linked": True, "simulated": True}


@router.get("/family/patients")
def patients(actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db)) -> List[dict]:
    _only_family(db, actor, "family.view")
    views = []
    for patient_id in svc.linked_patient_ids(db, actor.user_id):
        if db.get(Patient, patient_id) is None:
            continue
        view, released = svc.patient_view(db, patient_id)
        audit.record(db, action="family.view", resource_type="patient", resource_id=patient_id, patient_id=patient_id,
                     outcome="allowed", actor=actor, fields_released=released)
        views.append(view)
    return views


@router.post("/family/checkin", status_code=201)
def checkin(body: Dict[str, Any], actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db)) -> dict:
    _only_family(db, actor, "family.checkin")
    try:
        data = svc.clean_checkin(body)
        if not svc.is_linked(db, actor.user_id, data["patient_id"]):
            audit.record(db, action="family.checkin", resource_type="family", resource_id=data["patient_id"],
                         patient_id=data["patient_id"], outcome="denied", reason="forbidden_role", actor=actor)
            raise HTTPException(status_code=403, detail="You are not linked to this patient")
        row = svc.add_checkin(db, actor, data)
    except svc.FamilyError as exc:
        _fail(db, exc)
    db.commit()
    events.flush(db)
    audit.record(db, action="family.checkin", resource_type="family", resource_id=row.emergency_id,
                 patient_id=row.patient_id, outcome="allowed", actor=actor)
    return svc.checkin_view(row)
