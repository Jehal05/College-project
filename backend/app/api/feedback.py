"""Feedback after an emergency and privacy requests (J4)."""
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_actor
from app.db import get_db
from app.models.emergencies import Emergency
from app.models.patient_data import Patient
from app.security.actor import Actor
from app.services import audit
from app.services import family as family_service
from app.services import feedback as svc

router = APIRouter(tags=["feedback"])

_NOTE = "Simulated. Nothing is exported or deleted."


def _deny(db: Session, actor: Actor, action: str, resource: str, resource_id, patient_id, status: int, message: str):
    audit.record(db, action=action, resource_type=resource, resource_id=resource_id, patient_id=patient_id,
                 outcome="denied", reason="forbidden_role", actor=actor)
    raise HTTPException(status_code=status, detail=message)


@router.post("/feedback", status_code=201)
def send_feedback(body: Dict[str, Any], actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db)) -> dict:
    if actor.role not in ("PATIENT", "FAMILY"):
        _deny(db, actor, "feedback.send", "emergency", None, None, 403, "Not allowed")
    try:
        data = svc.clean_feedback(body)
    except svc.FeedbackError as exc:
        raise HTTPException(status_code=exc.status, detail=str(exc)) from None
    emergency = db.get(Emergency, data["emergency_id"])
    if emergency is None:
        raise HTTPException(status_code=404, detail="Emergency not found")
    if actor.role == "PATIENT" and emergency.patient_id != actor.patient_id:
        # the same answer as for an unknown id, so nobody can probe other people's emergency ids
        _deny(db, actor, "feedback.send", "emergency", emergency.id, emergency.patient_id, 404, "Emergency not found")
    if actor.role == "FAMILY" and not family_service.is_linked(db, actor.user_id, emergency.patient_id):
        _deny(db, actor, "feedback.send", "emergency", emergency.id, emergency.patient_id, 403, "You are not linked to this patient")
    try:
        row = svc.add_feedback(db, actor.user_id, data)
    except svc.FeedbackError as exc:
        db.rollback()
        raise HTTPException(status_code=exc.status, detail=str(exc)) from None
    db.commit()
    return {"id": row.id, "simulated": True}


@router.post("/privacy-requests", status_code=202)
def privacy_request(body: Dict[str, Any], actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db)) -> dict:
    if actor.role not in ("PATIENT", "ADMIN"):
        _deny(db, actor, "privacy.request", "patient", None, None, 403, "Not allowed")
    try:
        data = svc.clean_privacy(body)
    except svc.FeedbackError as exc:
        raise HTTPException(status_code=exc.status, detail=str(exc)) from None
    asked = data["patient_id"]
    if actor.role == "PATIENT":
        if asked and asked != actor.patient_id:
            _deny(db, actor, "privacy.request", "patient", asked, asked, 403, "You can only ask about your own data")
        patient_id = actor.patient_id
    else:
        if not asked:
            raise HTTPException(status_code=400, detail="patient_id is required")
        patient_id = asked
    if db.get(Patient, patient_id) is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    row = svc.add_privacy_request(db, actor.user_id, patient_id, data["type"])
    db.commit()
    audit.record(db, action="privacy." + data["type"].lower() + "_request", resource_type="patient",
                 resource_id=patient_id, patient_id=patient_id, outcome="allowed", actor=actor)
    return {"id": row.id, "type": row.type, "status": row.status, "simulated": True, "note": _NOTE}
