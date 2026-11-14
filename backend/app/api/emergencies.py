"""Emergencies (features 4, 8, 19, 10): create, SOS, cancel, read, reasons, history and summary.

Who may do what
- POST /emergencies, /sos, /cancel: the PATIENT, for their own emergencies only.
- GET /emergencies/{id} and /reasons: the patient (own, not audited), hospital staff and admin (only once the SOS
  was sent, only what the patient shared, always audited), a linked relative (a plain status, audited).
  Responders and unlinked relatives get 403.
- A patient who asks for somebody else's emergency gets the same 404 as for an id that does not exist.
- The permission check comes BEFORE the "does it exist" check wherever the role alone decides.
"""
from typing import Any, Callable, Dict, List, NoReturn, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_actor, get_family_link_checker
from app.db import get_db
from app.models.emergencies import Emergency
from app.models.enums import EmergencyState, InvalidTransition
from app.models.patient_data import Patient
from app.security.actor import Actor
from app.services import audit, events
from app.services import emergencies as svc

router = APIRouter(tags=["emergencies"])

_NOT_FOUND = "Emergency not found"


def _finish(db: Session) -> None:
    """Save, then (and only then) announce."""
    db.commit()
    events.flush(db)


def _abort(db: Session, status: int, detail: Any) -> NoReturn:
    db.rollback()
    events.discard(db)
    raise HTTPException(status_code=status, detail=detail)


def _conflict(db: Session, exc: InvalidTransition) -> NoReturn:
    _abort(db, 409, {"detail": "Invalid transition", "from": exc.from_state.value, "to": exc.to_state.value})


def _deny(db: Session, actor: Actor, action: str, emergency_id: str, reason: str, status: int,
          detail: str, patient_id: Optional[str] = None) -> NoReturn:
    audit.record(db, action=action, resource_type="emergency", resource_id=emergency_id, patient_id=patient_id,
                 outcome="denied", reason=reason, actor=actor)
    raise HTTPException(status_code=status, detail=detail)


def _own_emergency(db: Session, actor: Actor, emergency_id: str, action: str) -> Emergency:
    """For the calls only the patient may make. Not yours or not there: the same 404."""
    if actor.role != "PATIENT":
        _deny(db, actor, action, emergency_id, "forbidden_role", 403, "Not allowed")
    emergency = db.get(Emergency, emergency_id)
    if emergency is None:
        raise HTTPException(status_code=404, detail=_NOT_FOUND)
    if emergency.patient_id != actor.patient_id:
        _deny(db, actor, action, emergency_id, "forbidden_role", 404, _NOT_FOUND, emergency.patient_id)
    return emergency


def _reader(db: Session, actor: Actor, emergency_id: str, linked: Callable[[Session, Actor, str], bool]
            ) -> Tuple[Emergency, str]:
    """Who is reading: ("owner" | "staff" | "status"). Raises 403 or 404, and audits every refusal."""
    action = "emergency.read"
    if actor.role == "RESPONDER":
        _deny(db, actor, action, emergency_id, "forbidden_role", 403, "Not allowed")
    emergency = db.get(Emergency, emergency_id)
    if actor.role == "PATIENT":
        if emergency is None:
            raise HTTPException(status_code=404, detail=_NOT_FOUND)
        if emergency.patient_id != actor.patient_id:
            _deny(db, actor, action, emergency_id, "forbidden_role", 404, _NOT_FOUND, emergency.patient_id)
        return emergency, "owner"
    if actor.role == "FAMILY":
        if emergency is None or not linked(db, actor, emergency.patient_id):
            _deny(db, actor, action, emergency_id, "forbidden_role", 403, "Not allowed",
                  emergency.patient_id if emergency else None)
        if emergency.sos_at is None:
            _deny(db, actor, action, emergency_id, "emergency_not_found", 404, _NOT_FOUND, emergency.patient_id)
        return emergency, "status"
    if actor.role in ("HOSPITAL_STAFF", "ADMIN"):
        if emergency is None or emergency.sos_at is None:       # a hospital hears nothing before the SOS
            _deny(db, actor, action, emergency_id, "emergency_not_found", 404, _NOT_FOUND,
                  emergency.patient_id if emergency else None)
        return emergency, "staff"
    _deny(db, actor, action, emergency_id, "forbidden_role", 403, "Not allowed")


def _audit_read(db: Session, actor: Actor, emergency: Emergency, kind: str, released: List[str]) -> None:
    if kind != "owner":                                          # the patient's own reads are not audited
        audit.record_emergency_read(db, emergency_id=emergency.id, outcome="allowed", actor=actor,
                                    patient_id=emergency.patient_id, fields_released=released)


# ---------------------------------------------------------------- create

@router.post("/emergencies", status_code=201)
def create_emergency(body: Dict[str, Any], actor: Actor = Depends(get_current_actor),
                     db: Session = Depends(get_db)) -> dict:
    if actor.role != "PATIENT":
        audit.record(db, action="emergency.create", resource_type="emergency", resource_id=None, outcome="denied",
                     reason="forbidden_role", actor=actor)
        raise HTTPException(status_code=403, detail="Not allowed")
    try:
        clean = svc.clean_create(body)
    except svc.EmergencyInputError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None
    if clean["patient_id"] not in (None, actor.patient_id):
        audit.record(db, action="emergency.create", resource_type="emergency", resource_id=None,
                     patient_id=clean["patient_id"], outcome="denied", reason="forbidden_role", actor=actor)
        raise HTTPException(status_code=403, detail="Not allowed")
    patient = db.get(Patient, actor.patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    try:
        emergency = svc.create_emergency(db, actor, patient, clean)
    except svc.EmergencyInputError as exc:
        _abort(db, 400, str(exc))
    _finish(db)
    return {"id": emergency.id, "patient_id": emergency.patient_id, "state": emergency.state, "type": emergency.type,
            "source": emergency.source, "severity": emergency.severity,
            "reasons": list((emergency.engine_result or {}).get("reasons", [])),
            "created_at": svc._iso(emergency.created_at), "simulated": True}


# ---------------------------------------------------------------- SOS and cancel

@router.post("/emergencies/{emergency_id}/sos")
def send_sos(emergency_id: str, body: Optional[Dict[str, Any]] = None, actor: Actor = Depends(get_current_actor),
             db: Session = Depends(get_db)) -> dict:
    emergency = _own_emergency(db, actor, emergency_id, "emergency.sos")
    try:
        location = svc.clean_location((body or {}).get("location")) if isinstance(body or {}, dict) else None
    except svc.EmergencyInputError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None
    try:
        svc.send_sos(db, actor, emergency, location)
    except InvalidTransition as exc:
        _conflict(db, exc)
    _finish(db)
    return {"id": emergency.id, "state": emergency.state, "hospital": svc._hospital_ref(db, emergency),
            "simulated": True}


@router.post("/emergencies/{emergency_id}/cancel")
def cancel_emergency(emergency_id: str, body: Optional[Dict[str, Any]] = None,
                     actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db)) -> dict:
    emergency = _own_emergency(db, actor, emergency_id, "emergency.cancel")
    try:
        reason = svc.clean_cancel_reason(body)
    except svc.EmergencyInputError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None
    try:
        svc.cancel(db, actor, emergency, reason)
    except InvalidTransition as exc:
        _conflict(db, exc)
    _finish(db)
    return {"id": emergency.id, "state": emergency.state, "simulated": True}


# ---------------------------------------------------------------- reading

@router.get("/emergencies/{emergency_id}")
def get_emergency(emergency_id: str, actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db),
                  linked: Callable[[Session, Actor, str], bool] = Depends(get_family_link_checker)) -> dict:
    emergency, kind = _reader(db, actor, emergency_id, linked)
    body = svc.view(db, emergency, kind)
    _audit_read(db, actor, emergency, kind, svc.released_fields(body) if kind == "staff" else [])
    return body


@router.get("/emergencies/{emergency_id}/reasons")
def get_reasons(emergency_id: str, actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db),
                linked: Callable[[Session, Actor, str], bool] = Depends(get_family_link_checker)) -> dict:
    emergency, kind = _reader(db, actor, emergency_id, linked)
    if kind == "status":                                         # a relative sees a plain status, never the reasons
        _deny(db, actor, "emergency.read", emergency_id, "forbidden_role", 403, "Not allowed", emergency.patient_id)
    body = svc.reasons_view(db, emergency, kind)
    _audit_read(db, actor, emergency, kind, ["vitals"] if kind == "staff" and body["inputs"]["vitals"] else [])
    return body


def _own_patient(db: Session, actor: Actor, patient_id: str, action: str) -> None:
    if not (actor.role == "PATIENT" and actor.patient_id == patient_id):
        audit.record(db, action=action, resource_type="emergency", resource_id=None, patient_id=patient_id,
                     outcome="denied", reason="forbidden_role", actor=actor)
        raise HTTPException(status_code=403, detail="Not allowed")
    if db.get(Patient, patient_id) is None:
        raise HTTPException(status_code=404, detail="Patient not found")


@router.get("/patients/{patient_id}/emergencies")
def list_emergencies(patient_id: str, actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db)) -> list:
    _own_patient(db, actor, patient_id, "emergency.list")
    return svc.list_for_patient(db, patient_id)


@router.get("/patients/{patient_id}/emergencies/{emergency_id}/summary")
def get_summary(patient_id: str, emergency_id: str, actor: Actor = Depends(get_current_actor),
                db: Session = Depends(get_db)) -> dict:
    _own_patient(db, actor, patient_id, "emergency.read")
    emergency = db.get(Emergency, emergency_id)
    if emergency is None or emergency.patient_id != patient_id:
        raise HTTPException(status_code=404, detail=_NOT_FOUND)
    return svc.summary(db, emergency)
