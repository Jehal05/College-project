"""GET /patients/{id}/insights (feature 54). Shagun's daily wellbeing summary (feature 67) reads it.

Wellbeing notes only. This endpoint never returns a severity, never sends an
alert and never touches the rules engine.
"""
from typing import Callable

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_actor, get_family_link_checker, get_history_provider
from app.db import get_db
from app.models.patient_data import Patient
from app.security.actor import Actor
from app.services import audit
from app.services.consent import current_consents
from app.services.insights import insights_response
from app.services.wellbeing_access import decide_access
from app.sim.history import History

router = APIRouter(tags=["insights"])

_DETAIL = {
    "forbidden_role": "Not allowed to read this patient's insights",
    "consent_missing": "The patient has not shared their vitals",
}


def authorize_wellbeing_read(db: Session, actor: Actor, patient_id: str, family_linked: bool, action: str) -> None:
    """Shared by insights and the trend warning. Raises 403 (and audits it) when refused."""
    access = decide_access(actor, patient_id, current_consents(db, patient_id), family_linked)
    if access.audit:
        audit.record(
            db, action=action, resource_type="insights", resource_id=patient_id, patient_id=patient_id,
            outcome="allowed" if access.allowed else "denied", reason=access.reason,
            actor=actor, fields_released=access.released,
        )
    if not access.allowed:
        raise HTTPException(status_code=access.status, detail=_DETAIL[access.reason])


@router.get("/patients/{patient_id}/insights")
def read_insights(
    patient_id: str,
    actor: Actor = Depends(get_current_actor),
    db: Session = Depends(get_db),
    family_link: Callable[[Session, Actor, str], bool] = Depends(get_family_link_checker),
    history_for: Callable[[str], History] = Depends(get_history_provider),
) -> dict:
    linked = actor.role == "FAMILY" and family_link(db, actor, patient_id)
    authorize_wellbeing_read(db, actor, patient_id, linked, "insights.read")
    if db.get(Patient, patient_id) is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    return insights_response(patient_id, history_for(patient_id))
