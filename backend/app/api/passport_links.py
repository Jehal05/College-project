"""The patient's QR passport link (J3): POST, GET, DELETE /patients/{id}/passport and GET .../passport/log.

The PATIENT, for their own record only. The public read of the link is `GET /passport/{token}` (api/passport.py).
"""
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_actor
from app.api.patient_access import authorize_patient_record
from app.db import get_db
from app.models.patient_data import Patient
from app.security.actor import Actor
from app.services import passport_links as links

router = APIRouter(tags=["passport"])


def _own(db: Session, actor: Actor, patient_id: str, action: str) -> None:
    authorize_patient_record(db, actor, patient_id, action, "passport")
    if db.get(Patient, patient_id) is None:
        raise HTTPException(status_code=404, detail="Patient not found")


@router.post("/patients/{patient_id}/passport", status_code=201)
def create_link(patient_id: str, body: Optional[Dict[str, Any]] = None, actor: Actor = Depends(get_current_actor),
                db: Session = Depends(get_db)) -> dict:
    _own(db, actor, patient_id, "passport.create")
    try:
        hours = links.clean_hours(body if body is not None else {})
    except links.PassportLinkError as exc:
        raise HTTPException(status_code=exc.status, detail=str(exc)) from None
    token, row = links.create(db, patient_id, hours)
    db.commit()
    return {"token": token, "expires_at": links.expires_iso(row)}


@router.get("/patients/{patient_id}/passport")
def current_link(patient_id: str, actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db)) -> dict:
    _own(db, actor, patient_id, "passport.read")
    found = links.current(db, patient_id)
    if found is None:
        raise HTTPException(status_code=404, detail="No active passport")
    token, row = found
    return {"token": token, "expires_at": links.expires_iso(row)}


@router.delete("/patients/{patient_id}/passport")
def revoke_link(patient_id: str, actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db)) -> dict:
    _own(db, actor, patient_id, "passport.revoke")
    links.revoke_current(db, patient_id)
    db.commit()
    return {"ok": True}


@router.get("/patients/{patient_id}/passport/log")
def link_log(patient_id: str, actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db)) -> List[dict]:
    _own(db, actor, patient_id, "passport.read")
    return links.open_log(db, patient_id)
