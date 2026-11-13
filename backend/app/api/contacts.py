"""Emergency contacts (Task 3, feature 38): at most 5, exactly one primary. Owner only."""
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_actor
from app.api.patient_access import authorize_patient_record
from app.db import get_db
from app.models.patient_data import Patient
from app.security.actor import Actor
from app.services import patient_record as records

router = APIRouter(tags=["contacts"])


def _own_patient(db: Session, actor: Actor, patient_id: str, action: str) -> None:
    authorize_patient_record(db, actor, patient_id, action, "contacts")
    if db.get(Patient, patient_id) is None:
        raise HTTPException(status_code=404, detail="Patient not found")


def _clean(body: Any) -> Dict[str, Any]:
    try:
        return records.clean_contact(body)
    except records.RecordError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None


@router.get("/patients/{patient_id}/contacts")
def list_contacts(patient_id: str, actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db)) -> List[dict]:
    _own_patient(db, actor, patient_id, "contacts.read")
    return [records.contact_dict(c) for c in records.list_contacts(db, patient_id)]


@router.post("/patients/{patient_id}/contacts", status_code=201)
def create_contact(patient_id: str, body: Dict[str, Any], actor: Actor = Depends(get_current_actor),
                   db: Session = Depends(get_db)) -> dict:
    _own_patient(db, actor, patient_id, "contacts.write")
    clean = _clean(body)
    try:
        contact = records.add_contact(db, patient_id, clean)
    except records.ContactLimitReached as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from None
    db.commit()
    return records.contact_dict(contact)


@router.put("/patients/{patient_id}/contacts/{contact_id}")
def update_contact(patient_id: str, contact_id: str, body: Dict[str, Any], actor: Actor = Depends(get_current_actor),
                   db: Session = Depends(get_db)) -> dict:
    _own_patient(db, actor, patient_id, "contacts.write")
    try:
        contact = records.update_contact(db, patient_id, contact_id, _clean(body))
    except records.ContactNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from None
    db.commit()
    return records.contact_dict(contact)


@router.delete("/patients/{patient_id}/contacts/{contact_id}", status_code=204)
def delete_contact(patient_id: str, contact_id: str, actor: Actor = Depends(get_current_actor),
                   db: Session = Depends(get_db)) -> Response:
    _own_patient(db, actor, patient_id, "contacts.write")
    try:
        records.delete_contact(db, patient_id, contact_id)
    except records.ContactNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from None
    db.commit()
    return Response(status_code=204)
