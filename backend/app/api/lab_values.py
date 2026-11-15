"""Lab values the patient confirmed (Phase 3, PROPOSED in docs/API_CONTRACT.md). The PATIENT, for their own record only.

POST   /patients/{id}/lab-values            save 1 to 20 values, answer 201 with what was saved
GET    /patients/{id}/lab-values?test=      newest first
DELETE /patients/{id}/lab-values/{lab_id}   204

A refusal (403) is audited and comes BEFORE the "does it exist" check (404). Every read, save and delete is audited
with test names only, never values.
"""
from datetime import date
from typing import Annotated, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_actor
from app.api.patient_access import authorize_patient_record
from app.db import get_db
from app.models.patient_data import Patient
from app.security.actor import Actor
from app.services import audit, lab_values as svc

router = APIRouter(tags=["lab-values"])

Number = Annotated[float, Field(strict=True, allow_inf_nan=False)]


class ReferenceRange(BaseModel):
    model_config = ConfigDict(extra="forbid")

    low: Optional[Number] = None
    high: Optional[Number] = None


class LabValueIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    test: str = Field(max_length=30)
    value: Number
    unit: str = Field(max_length=30)
    reference_range: Optional[ReferenceRange] = None
    taken_on: date
    source: Literal["entered", "report_extracted"] = "entered"
    report_id: Optional[str] = Field(default=None, max_length=64)


class LabValuesIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    values: List[LabValueIn] = Field(min_length=1, max_length=svc.MAX_PER_REQUEST)


def _own(db: Session, actor: Actor, patient_id: str, action: str) -> None:
    authorize_patient_record(db, actor, patient_id, action, "lab_value")
    if db.get(Patient, patient_id) is None:
        raise HTTPException(status_code=404, detail="Patient not found")


@router.post("/patients/{patient_id}/lab-values", status_code=201)
def save_lab_values(patient_id: str, body: LabValuesIn, actor: Actor = Depends(get_current_actor),
                    db: Session = Depends(get_db)) -> dict:
    _own(db, actor, patient_id, "lab_value.save")
    try:
        rows = svc.add_values(db, patient_id, body.values)
    except svc.LabError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from None
    audit.record(db, action="lab_value.save", resource_type="lab_value", resource_id=None, patient_id=patient_id,
                 outcome="allowed", actor=actor, fields_released=[svc.audit_name(r.test) for r in rows])
    return {"values": [svc.info(r) for r in rows]}


@router.get("/patients/{patient_id}/lab-values")
def read_lab_values(patient_id: str, test: Optional[str] = None, actor: Actor = Depends(get_current_actor),
                    db: Session = Depends(get_db)) -> dict:
    _own(db, actor, patient_id, "lab_value.read")
    if test is not None:
        try:
            svc.check_test(test)
        except svc.LabError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from None
    rows = svc.list_values(db, patient_id, test)
    audit.record(db, action="lab_value.read", resource_type="lab_value", resource_id=None, patient_id=patient_id,
                 outcome="allowed", actor=actor, fields_released=[svc.audit_name(t) for t in {r.test for r in rows}])
    return {"values": [svc.info(r) for r in rows]}


@router.delete("/patients/{patient_id}/lab-values/{lab_id}", status_code=204)
def delete_lab_value(patient_id: str, lab_id: str, actor: Actor = Depends(get_current_actor),
                     db: Session = Depends(get_db)) -> Response:
    _own(db, actor, patient_id, "lab_value.delete")
    row = svc.find(db, patient_id, lab_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Lab value not found")
    test = row.test
    db.delete(row)
    db.commit()
    audit.record(db, action="lab_value.delete", resource_type="lab_value", resource_id=lab_id, patient_id=patient_id,
                 outcome="allowed", actor=actor, fields_released=[svc.audit_name(test)])
    return Response(status_code=204)
