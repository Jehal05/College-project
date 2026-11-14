"""Medication reminders, their log and the patient's preferences (J3). The PATIENT, for their own record only."""
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_actor
from app.api.patient_access import authorize_patient_record
from app.db import get_db
from app.models.patient_data import Patient
from app.security.actor import Actor
from app.services import reminders as svc

router = APIRouter(tags=["reminders"])


def _own(db: Session, actor: Actor, patient_id: str, action: str, resource: str = "reminder") -> None:
    authorize_patient_record(db, actor, patient_id, action, resource)
    if db.get(Patient, patient_id) is None:
        raise HTTPException(status_code=404, detail="Patient not found")


def _fail(db: Session, exc: svc.ReminderError):
    db.rollback()
    raise HTTPException(status_code=exc.status, detail=str(exc)) from None


@router.get("/patients/{patient_id}/reminders")
def list_reminders(patient_id: str, actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db)) -> List[dict]:
    _own(db, actor, patient_id, "reminder.read")
    return [svc.as_dict(r) for r in svc.list_reminders(db, patient_id)]


@router.get("/patients/{patient_id}/reminders/log")
def reminder_log(patient_id: str, actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db)) -> List[dict]:
    _own(db, actor, patient_id, "reminder.read")
    return svc.recent_log(db, patient_id)


@router.post("/patients/{patient_id}/reminders", status_code=201)
def add_reminder(patient_id: str, body: Dict[str, Any], actor: Actor = Depends(get_current_actor),
                 db: Session = Depends(get_db)) -> dict:
    _own(db, actor, patient_id, "reminder.write")
    try:
        reminder = svc.add_reminder(db, patient_id, svc.clean_reminder(body))
    except svc.ReminderError as exc:
        _fail(db, exc)
    db.commit()
    return svc.as_dict(reminder)


@router.put("/patients/{patient_id}/reminders/{reminder_id}")
def update_reminder(patient_id: str, reminder_id: str, body: Dict[str, Any], actor: Actor = Depends(get_current_actor),
                    db: Session = Depends(get_db)) -> dict:
    _own(db, actor, patient_id, "reminder.write")
    try:
        svc.find(db, patient_id, reminder_id)
        reminder = svc.update_reminder(db, patient_id, reminder_id, svc.clean_reminder(body))
    except svc.ReminderError as exc:
        _fail(db, exc)
    db.commit()
    return svc.as_dict(reminder)


@router.delete("/patients/{patient_id}/reminders/{reminder_id}")
def delete_reminder(patient_id: str, reminder_id: str, actor: Actor = Depends(get_current_actor),
                    db: Session = Depends(get_db)) -> dict:
    _own(db, actor, patient_id, "reminder.write")
    try:
        svc.delete_reminder(db, patient_id, reminder_id)
    except svc.ReminderError as exc:
        _fail(db, exc)
    db.commit()
    return {"ok": True}


@router.post("/patients/{patient_id}/reminders/{reminder_id}/shown", status_code=201)
def reminder_shown(patient_id: str, reminder_id: str, body: Dict[str, Any], actor: Actor = Depends(get_current_actor),
                   db: Session = Depends(get_db)) -> dict:
    _own(db, actor, patient_id, "reminder.write")
    try:
        entry = svc.log_entry(db, patient_id, reminder_id, body)
    except svc.ReminderError as exc:
        _fail(db, exc)
    db.commit()
    return svc.entry_dict(entry)


@router.post("/patients/{patient_id}/reminders/{reminder_id}/taken")
def reminder_taken(patient_id: str, reminder_id: str, body: Dict[str, Any], actor: Actor = Depends(get_current_actor),
                   db: Session = Depends(get_db)) -> dict:
    _own(db, actor, patient_id, "reminder.write")
    try:
        entry = svc.log_entry(db, patient_id, reminder_id, body)
        svc.mark_taken(entry, body)
    except svc.ReminderError as exc:
        _fail(db, exc)
    db.commit()
    return svc.entry_dict(entry)


@router.get("/patients/{patient_id}/preferences")
def read_preferences(patient_id: str, actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db)) -> dict:
    _own(db, actor, patient_id, "preference.read", "preference")
    return svc.get_preferences(db, patient_id)


@router.put("/patients/{patient_id}/preferences")
def write_preferences(patient_id: str, body: Dict[str, Any], actor: Actor = Depends(get_current_actor),
                      db: Session = Depends(get_db)) -> dict:
    _own(db, actor, patient_id, "preference.write", "preference")
    try:
        result = svc.put_preferences(db, patient_id, body)
    except svc.ReminderError as exc:
        _fail(db, exc)
    db.commit()
    return result
