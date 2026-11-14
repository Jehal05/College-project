"""Volunteer responders (J4): sign up, alerts with no identity, accept."""
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_actor
from app.db import get_db
from app.models.emergencies import Emergency
from app.security.actor import Actor
from app.services import audit, events
from app.services import responders as svc

router = APIRouter(tags=["responders"])


def _verified_responder(db: Session, actor: Actor, action: str) -> None:
    if actor.role != "RESPONDER" or not svc.is_verified(db, actor.user_id):
        audit.record(db, action=action, resource_type="emergency", resource_id=None, outcome="denied",
                     reason="forbidden_role", actor=actor)
        raise HTTPException(status_code=403, detail="Your volunteer account is not verified yet"
                            if actor.role == "RESPONDER" else "Not allowed")


@router.post("/responders/register", status_code=201)
def register(body: Dict[str, Any], db: Session = Depends(get_db)) -> dict:
    try:
        user = svc.register(db, svc.clean_registration(body))
    except svc.ResponderError as exc:
        db.rollback()
        raise HTTPException(status_code=exc.status, detail=str(exc)) from None
    db.commit()
    audit.record(db, action="responder.register", resource_type="user", resource_id=user.id, outcome="allowed")
    return {"id": user.id, "verified": False, "simulated": True}


@router.get("/responders/alerts")
def alerts(actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db)) -> List[dict]:
    _verified_responder(db, actor, "responder.alerts")
    return svc.live_alerts(db, actor.user_id)


@router.post("/responders/{emergency_id}/accept")
def accept(emergency_id: str, actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db)) -> dict:
    _verified_responder(db, actor, "responder.accept")
    try:
        answer, released = svc.accept(db, actor, emergency_id)
    except svc.ResponderError as exc:
        db.rollback()
        events.discard(db)
        raise HTTPException(status_code=exc.status, detail=str(exc)) from None
    emergency = db.get(Emergency, emergency_id)
    db.commit()
    events.flush(db)
    audit.record(db, action="responder.accept", resource_type="emergency", resource_id=emergency_id,
                 patient_id=emergency.patient_id, outcome="allowed", actor=actor, fields_released=released)
    return answer
