"""What the hospital desk does with an emergency (P2): acknowledge, dispatch, move along, and the lists.

Who may do what
- HOSPITAL_STAFF only, and only for an emergency the SOS was sent for (before that: 404, a hospital hears nothing).
- Acknowledge: staff of a hospital that was alerted for it (the current one, or one in its alert list).
- Dispatch and status: staff of the hospital that acknowledged it (emergency.hospital_id).
- GET /emergencies?status=: staff see the emergencies their hospital was alerted for; an admin sees all sent ones.
- Every state change goes through `emergency_state.transition()`, so the table in CONTRACT.md section 2 is enforced in
  one place. A wrong move is a 409 with `from` and `to`. Events are sent only after the commit.
- Everything the desk reads about someone's emergency is audited.
"""
from datetime import datetime, timezone
from typing import Any, Dict, List, NoReturn, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_actor
from app.db import get_db
from app.models.emergencies import Emergency, HospitalAlert
from app.models.enums import EmergencyState, InvalidTransition
from app.models.hospitals import Ambulance
from app.security.actor import Actor
from app.services import audit, emergency_state, events
from app.services import emergencies as svc
from app.services import hospitals as hospital_svc

S = EmergencyState
router = APIRouter(tags=["hospital desk"])

_NOT_FOUND = "Emergency not found"
_FINISHED = (S.HANDOVER_DONE.value, S.CANCELLED.value)
_STATUS_STEPS = (S.EN_ROUTE.value, S.ARRIVED.value, S.HANDOVER_DONE.value)


def _finish(db: Session) -> None:
    db.commit()
    events.flush(db)


def _abort(db: Session, status: int, detail: Any) -> NoReturn:
    db.rollback()
    events.discard(db)
    raise HTTPException(status_code=status, detail=detail)


def _conflict(db: Session, exc: InvalidTransition) -> NoReturn:
    _abort(db, 409, {"detail": "Invalid transition", "from": exc.from_state.value, "to": exc.to_state.value})


def _deny(db: Session, actor: Actor, action: str, emergency_id: Optional[str], reason: str, status: int, detail: str,
          patient_id: Optional[str] = None) -> NoReturn:
    audit.record(db, action=action, resource_type="emergency", resource_id=emergency_id, patient_id=patient_id,
                 outcome="denied", reason=reason, actor=actor)
    raise HTTPException(status_code=status, detail=detail)


def _alerted(db: Session, emergency: Emergency, hospital_id: str) -> bool:
    if emergency.hospital_id == hospital_id:
        return True
    return db.query(HospitalAlert).filter(HospitalAlert.emergency_id == emergency.id,
                                          HospitalAlert.hospital_id == hospital_id).first() is not None


def _desk_emergency(db: Session, actor: Actor, emergency_id: str, action: str) -> Emergency:
    """Staff only; an emergency whose SOS was not sent is not there for a hospital."""
    if actor.role != "HOSPITAL_STAFF" or actor.hospital_id is None:
        _deny(db, actor, action, emergency_id, "forbidden_role", 403, "Not allowed")
    emergency = db.get(Emergency, emergency_id)
    if emergency is None or emergency.sos_at is None:
        _deny(db, actor, action, emergency_id, "emergency_not_found", 404, _NOT_FOUND,
              emergency.patient_id if emergency else None)
    return emergency


def _own_hospital_only(db: Session, actor: Actor, emergency: Emergency, action: str, body: Dict[str, Any]) -> None:
    """A body `hospital_id`, when sent, must be the caller's own."""
    sent = body.get("hospital_id") if isinstance(body, dict) else None
    if sent is not None and sent != actor.hospital_id:
        _deny(db, actor, action, emergency.id, "forbidden_role", 403, "Not allowed", emergency.patient_id)


def _answer(db: Session, emergency: Emergency) -> dict:
    return {"id": emergency.id, "state": emergency.state, "hospital": svc._hospital_ref(db, emergency),
            "ambulance": svc._ambulance_ref(db, emergency), "eta_seconds": emergency.eta_seconds, "simulated": True}


# ---------------------------------------------------------------- acknowledge

@router.post("/emergencies/{emergency_id}/ack")
def acknowledge(emergency_id: str, body: Optional[Dict[str, Any]] = None, actor: Actor = Depends(get_current_actor),
                db: Session = Depends(get_db)) -> dict:
    action, body = "emergency.ack", body or {}
    emergency = _desk_emergency(db, actor, emergency_id, action)
    _own_hospital_only(db, actor, emergency, action, body)
    if not _alerted(db, emergency, actor.hospital_id):
        _deny(db, actor, action, emergency.id, "forbidden_role", 403, "Not allowed", emergency.patient_id)
    if S(emergency.state) is S.HOSPITAL_ACKNOWLEDGED and emergency.hospital_id == actor.hospital_id:
        return _answer(db, emergency)                       # the same desk twice is harmless
    now = datetime.now(timezone.utc)
    try:
        emergency_state.transition(db, emergency, S.HOSPITAL_ACKNOWLEDGED, actor,
                                   payload={"hospital_id": actor.hospital_id, "acknowledged_by": actor.user_id})
    except InvalidTransition as exc:
        _conflict(db, exc)
    emergency.hospital_id = actor.hospital_id
    for alert in db.query(HospitalAlert).filter(HospitalAlert.emergency_id == emergency.id):
        if alert.hospital_id == actor.hospital_id:
            alert.status, alert.acknowledged_at, alert.acknowledged_by = "ACKNOWLEDGED", now, actor.user_id
        elif alert.status == "ALERTED":
            alert.status = "ESCALATED_AWAY"
    audit.record(db, action=action, resource_type="emergency", resource_id=emergency.id,
                 patient_id=emergency.patient_id, outcome="allowed", actor=actor)
    _finish(db)
    return _answer(db, emergency)


# ---------------------------------------------------------------- dispatch

@router.post("/emergencies/{emergency_id}/dispatch")
def dispatch(emergency_id: str, body: Dict[str, Any], actor: Actor = Depends(get_current_actor),
             db: Session = Depends(get_db)) -> dict:
    action = "emergency.dispatch"
    emergency = _desk_emergency(db, actor, emergency_id, action)
    _own_hospital_only(db, actor, emergency, action, body)
    if emergency.hospital_id != actor.hospital_id:
        _deny(db, actor, action, emergency.id, "forbidden_role", 403, "Not allowed", emergency.patient_id)
    ambulance_id, eta = body.get("ambulance_id"), body.get("eta_seconds")
    if not isinstance(ambulance_id, str) or not ambulance_id:
        raise HTTPException(status_code=400, detail="ambulance_id is required")
    if eta is not None and not hospital_svc._whole(eta):
        raise HTTPException(status_code=400, detail="eta_seconds must be a whole number, 0 or more")
    try:                                                    # a wrong state wins over a missing ambulance
        emergency_state.check_transition(S(emergency.state), S.AMBULANCE_DISPATCHED)
    except InvalidTransition as exc:
        _conflict(db, exc)
    amb = db.get(Ambulance, ambulance_id)
    if amb is None:
        raise HTTPException(status_code=400, detail="Unknown ambulance_id")
    if amb.status != "available":
        raise HTTPException(status_code=409, detail="That ambulance is not available")
    emergency_state.transition(db, emergency, S.AMBULANCE_DISPATCHED, actor,
                               payload={"ambulance_id": amb.id, "eta_seconds": eta})
    amb.status, emergency.ambulance_id = "dispatched", amb.id
    if eta is not None:
        emergency.eta_seconds = eta
    audit.record(db, action=action, resource_type="emergency", resource_id=emergency.id,
                 patient_id=emergency.patient_id, outcome="allowed", actor=actor)
    _finish(db)
    return _answer(db, emergency)


# ---------------------------------------------------------------- status

@router.post("/emergencies/{emergency_id}/status")
def move_on(emergency_id: str, body: Dict[str, Any], actor: Actor = Depends(get_current_actor),
            db: Session = Depends(get_db)) -> dict:
    action = "emergency.status"
    emergency = _desk_emergency(db, actor, emergency_id, action)
    if emergency.hospital_id != actor.hospital_id:
        _deny(db, actor, action, emergency.id, "forbidden_role", 403, "Not allowed", emergency.patient_id)
    to = body.get("state") if isinstance(body, dict) else None
    if to not in _STATUS_STEPS:
        raise HTTPException(status_code=400, detail="state must be one of " + ", ".join(_STATUS_STEPS))
    amb = db.get(Ambulance, emergency.ambulance_id) if emergency.ambulance_id else None
    if to == S.EN_ROUTE.value:
        payload = {"ambulance_id": emergency.ambulance_id, "lat": amb.lat if amb else None,
                   "lng": amb.lng if amb else None, "eta_seconds": emergency.eta_seconds}
    elif to == S.ARRIVED.value:
        payload = {"ambulance_id": emergency.ambulance_id}
    else:
        payload = {"handover_by": actor.user_id}
    try:
        emergency_state.transition(db, emergency, S(to), actor, payload=payload)
    except InvalidTransition as exc:
        _conflict(db, exc)
    if amb is not None:
        amb.status = {"EN_ROUTE": "en_route", "ARRIVED": "en_route"}.get(to, "available")
    audit.record(db, action=action, resource_type="emergency", resource_id=emergency.id,
                 patient_id=emergency.patient_id, outcome="allowed", actor=actor)
    _finish(db)
    return _answer(db, emergency)


# ---------------------------------------------------------------- the lists

@router.get("/emergencies")
def list_for_desk(status: Optional[str] = None, actor: Actor = Depends(get_current_actor),
                  db: Session = Depends(get_db)) -> List[dict]:
    """?status=active (not finished or cancelled) or ?status=finished. Nothing else is accepted."""
    action = "emergency.list"
    if actor.role not in ("HOSPITAL_STAFF", "ADMIN"):
        _deny(db, actor, action, None, "forbidden_role", 403, "Not allowed")
    if status not in (None, "active", "finished"):
        raise HTTPException(status_code=400, detail="status must be active or finished")
    rows = db.query(Emergency).filter(Emergency.sos_at.isnot(None)).order_by(Emergency.created_at.desc()).all()
    if actor.role == "HOSPITAL_STAFF":
        rows = [e for e in rows if actor.hospital_id and _alerted(db, e, actor.hospital_id)]
    if status == "active":
        rows = [e for e in rows if e.state not in _FINISHED]
    elif status == "finished":
        rows = [e for e in rows if e.state in _FINISHED]
    out, released = [], set()
    for emergency in rows:
        body = svc.view(db, emergency, "staff")
        released.update(svc.released_fields(body))
        out.append({**body, "emergency_id": emergency.id})
    audit.record(db, action=action, resource_type="emergency", resource_id=None, outcome="allowed", actor=actor,
                 fields_released=sorted(released))
    return out
