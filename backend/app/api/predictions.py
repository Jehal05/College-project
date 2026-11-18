"""POST /predictions/{model}: an educational risk estimate (PROPOSED in docs/API_CONTRACT.md, not agreed yet).

Rules
- PATIENT only, and only for their own record. Everybody else gets 403 (the refusal is audited).
- The emergency flow never calls this. An alert never waits for a score.
- Inputs missing from the request are filled only with what the record really holds (age, sex). Nothing is guessed.
- Errors name fields only, never values. A model file that is missing or damaged answers 503.
"""
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.api.deps import get_current_actor
from app.db import get_db
from app.ml import predict
from app.models.patient_data import Patient
from app.security.actor import Actor
from app.services import audit

router = APIRouter(tags=["predictions"])


class PredictionRequest(BaseModel):
    """`inputs` is optional: whatever is missing is taken from the record where the record has it."""
    model_config = ConfigDict(extra="forbid")

    patient_id: Optional[str] = None
    inputs: Optional[Dict[str, Any]] = None
    scenario: Optional[Dict[str, Any]] = None      # Phase 3 what-if: model-input names -> new values; absent = Phase 2 answer


def _from_record(patient: Patient, wanted: list) -> Dict[str, Any]:
    found: Dict[str, Any] = {}
    if "age" in wanted and patient.age is not None:
        found["age"] = patient.age
    if "sex" in wanted and patient.sex:
        code = str(patient.sex).strip().upper()[:1]
        if code in ("M", "F"):
            found["sex"] = 1 if code == "M" else 0
    return found


@router.post("/predictions/{model}")
def predict_risk(model: str, body: PredictionRequest, actor: Actor = Depends(get_current_actor),
                 db: Session = Depends(get_db)) -> dict:
    if actor.role != "PATIENT" or not actor.patient_id:
        audit.record(db, action="prediction.run", resource_type="prediction", resource_id=None, outcome="denied",
                     reason="forbidden_role", actor=actor)
        raise HTTPException(status_code=403, detail="Not allowed")
    if model not in predict.MODEL_NAMES:
        raise HTTPException(status_code=404, detail="Unknown model")
    patient_id = body.patient_id or actor.patient_id
    if patient_id != actor.patient_id:
        audit.record(db, action="prediction.run", resource_type="prediction", resource_id=model, patient_id=patient_id,
                     outcome="denied", reason="forbidden_role", actor=actor)
        raise HTTPException(status_code=403, detail="Not allowed")
    patient = db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    try:
        loaded = predict.load_model(model)
    except predict.ModelError:
        raise HTTPException(status_code=503, detail="This model is not available right now") from None
    inputs = _from_record(patient, predict.feature_names(loaded))
    inputs.update(body.inputs or {})              # what the person typed (a what-if) wins over the record
    try:
        answer = predict.score(loaded, inputs) if body.scenario is None else predict.what_if(loaded, inputs, body.scenario)
    except predict.InputProblem as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None
    audit.record(db, action="prediction.run", resource_type="prediction", resource_id=model, patient_id=patient_id,
                 outcome="allowed", actor=actor, fields_released=predict.feature_names(loaded))
    return {"model": model, **answer}
