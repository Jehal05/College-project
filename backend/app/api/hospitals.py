"""Hospitals and ambulances (P1 and P3).

Who may do what
- GET /hospitals: hospital staff and admin see every hospital (the desk needs the unverified ones to verify them),
  a patient sees only verified hospitals. Family and responders get 403.
- PATCH /hospitals/{id}/availability: staff of THAT hospital, or an admin. Staff of another hospital get 403.
- POST /hospitals, PUT /hospitals/{id}, PATCH /hospitals/{id}/verify: admin only. A new hospital starts unverified.
- GET /ambulances and POST /ambulances/{id}/location: hospital staff (an ambulance of their own hospital, or one
  working one of their emergencies) and admin.
Every refusal is written to the audit log with the fixed reason code `forbidden_role`.
"""
from datetime import datetime, timezone
from typing import Any, Dict, NoReturn, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_actor
from app.db import get_db
from app.models.emergencies import Emergency
from app.models.hospitals import Ambulance, Hospital
from app.security.actor import Actor
from app.services import audit, events
from app.services import hospitals as svc

router = APIRouter(tags=["hospitals"])

_STAFF = ("HOSPITAL_STAFF", "ADMIN")


def _deny(db: Session, actor: Actor, action: str, resource_type: str, resource_id: Optional[str],
          status: int = 403, detail: str = "Not allowed") -> NoReturn:
    audit.record(db, action=action, resource_type=resource_type, resource_id=resource_id, outcome="denied",
                 reason="forbidden_role", actor=actor)
    raise HTTPException(status_code=status, detail=detail)


def _bad(exc: svc.HospitalInputError) -> HTTPException:
    return HTTPException(status_code=400, detail=str(exc))


def _hospital(db: Session, hospital_id: str) -> Hospital:
    hospital = db.get(Hospital, hospital_id)
    if hospital is None:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return hospital


# ---------------------------------------------------------------- hospitals

@router.get("/hospitals")
def list_hospitals(lat: Optional[str] = None, lng: Optional[str] = None, type: Optional[str] = None,
                   actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db)) -> list:
    if actor.role not in ("HOSPITAL_STAFF", "ADMIN", "PATIENT"):
        _deny(db, actor, "hospital.list", "hospital", None)
    try:
        where, kind = svc.parse_coordinates(lat, lng), svc.clean_type(type)
    except svc.HospitalInputError as exc:
        raise _bad(exc) from None
    return svc.list_hospitals(db, verified_only=actor.role == "PATIENT", where=where, emergency_type=kind)


@router.patch("/hospitals/{hospital_id}/availability")
def update_availability(hospital_id: str, body: Dict[str, Any], actor: Actor = Depends(get_current_actor),
                        db: Session = Depends(get_db)) -> dict:
    if actor.role not in _STAFF:
        _deny(db, actor, "hospital.availability", "hospital", hospital_id)
    hospital = _hospital(db, hospital_id)
    if actor.role == "HOSPITAL_STAFF" and actor.hospital_id != hospital.id:
        _deny(db, actor, "hospital.availability", "hospital", hospital.id)
    try:
        update = svc.clean_availability(body)
        svc.apply_availability(hospital, update)
    except svc.HospitalInputError as exc:
        db.rollback()
        raise _bad(exc) from None
    hospital.updated_at = datetime.now(timezone.utc)
    events.queue(db, "hospital.availability_updated", {"hospital_id": hospital.id, "availability": hospital.availability},
                 audience="hospitals")
    audit.record(db, action="hospital.availability", resource_type="hospital", resource_id=hospital.id,
                 outcome="allowed", actor=actor, fields_released=[])
    events.flush(db)
    return svc.hospital_view(hospital)


@router.post("/hospitals", status_code=201)
def create_hospital(body: Dict[str, Any], actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db)) -> dict:
    if actor.role != "ADMIN":
        _deny(db, actor, "hospital.create", "hospital", None)
    try:
        hospital = svc.create_hospital(db, svc.clean_hospital(body))
    except svc.HospitalInputError as exc:
        db.rollback()
        raise _bad(exc) from None
    audit.record(db, action="hospital.create", resource_type="hospital", resource_id=hospital.id, outcome="allowed",
                 actor=actor)
    return svc.hospital_view(hospital)


@router.put("/hospitals/{hospital_id}")
def edit_hospital(hospital_id: str, body: Dict[str, Any], actor: Actor = Depends(get_current_actor),
                  db: Session = Depends(get_db)) -> dict:
    if actor.role != "ADMIN":
        _deny(db, actor, "hospital.update", "hospital", hospital_id)
    hospital = _hospital(db, hospital_id)
    try:
        svc.update_hospital(hospital, svc.clean_hospital(body))
    except svc.HospitalInputError as exc:
        db.rollback()
        raise _bad(exc) from None
    hospital.updated_at = datetime.now(timezone.utc)
    audit.record(db, action="hospital.update", resource_type="hospital", resource_id=hospital.id, outcome="allowed",
                 actor=actor)
    return svc.hospital_view(hospital)


@router.patch("/hospitals/{hospital_id}/verify")
def verify_hospital(hospital_id: str, body: Dict[str, Any], actor: Actor = Depends(get_current_actor),
                    db: Session = Depends(get_db)) -> dict:
    if actor.role != "ADMIN":
        _deny(db, actor, "hospital.verify", "hospital", hospital_id)
    hospital = _hospital(db, hospital_id)
    verified = body.get("verified") if isinstance(body, dict) else None
    if not isinstance(verified, bool):
        raise HTTPException(status_code=400, detail="verified must be true or false")
    hospital.verified = verified
    hospital.updated_at = datetime.now(timezone.utc)
    audit.record(db, action="hospital.verify", resource_type="hospital", resource_id=hospital.id, outcome="allowed",
                 actor=actor)
    return {"id": hospital.id, "verified": hospital.verified}


# ---------------------------------------------------------------- ambulances

def _may_use_ambulance(db: Session, actor: Actor, amb: Ambulance) -> bool:
    if actor.role == "ADMIN":
        return True
    if actor.hospital_id is None:
        return False
    if amb.base_hospital_id == actor.hospital_id:
        return True
    return db.query(Emergency).filter(Emergency.ambulance_id == amb.id,
                                      Emergency.hospital_id == actor.hospital_id).first() is not None


@router.get("/ambulances")
def list_ambulances(actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db)) -> list:
    if actor.role not in _STAFF:
        _deny(db, actor, "ambulance.list", "ambulance", None)
    return [svc.ambulance_view(a) for a in db.query(Ambulance).order_by(Ambulance.id)]


@router.post("/ambulances/{ambulance_id}/location")
def ambulance_location(ambulance_id: str, body: Dict[str, Any], actor: Actor = Depends(get_current_actor),
                       db: Session = Depends(get_db)) -> dict:
    if actor.role not in _STAFF:
        _deny(db, actor, "ambulance.location", "ambulance", ambulance_id)
    amb = db.get(Ambulance, ambulance_id)
    if amb is None:
        raise HTTPException(status_code=404, detail="Ambulance not found")
    if not _may_use_ambulance(db, actor, amb):
        _deny(db, actor, "ambulance.location", "ambulance", amb.id)
    lat, lng, eta, eid = body.get("lat"), body.get("lng"), body.get("eta_seconds"), body.get("emergency_id")
    if not (svc._number(lat) and svc._number(lng)) or not (-90 <= lat <= 90 and -180 <= lng <= 180):
        raise HTTPException(status_code=400, detail="lat must be between -90 and 90 and lng between -180 and 180")
    if eta is not None and not svc._whole(eta):
        raise HTTPException(status_code=400, detail="eta_seconds must be a whole number, 0 or more")
    emergency = None
    if eid is not None:
        emergency = db.get(Emergency, eid) if isinstance(eid, str) else None
        if emergency is None or emergency.ambulance_id != amb.id:
            raise HTTPException(status_code=400, detail="That ambulance is not working that emergency")
    amb.lat, amb.lng = float(lat), float(lng)
    if emergency is not None:
        if eta is not None:
            emergency.eta_seconds = eta
        events.queue(db, "ambulance.location",
                     {"ambulance_id": amb.id, "lat": amb.lat, "lng": amb.lng, "eta_seconds": eta},
                     audience="all", emergency_id=emergency.id, state=emergency.state)
    db.commit()
    events.flush(db)
    return {"ok": True, "ambulance_id": amb.id, "lat": amb.lat, "lng": amb.lng, "simulated": True}
