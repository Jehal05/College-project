"""GET /passport/{id}?token (features 11 and 50).

Access: a valid signed token for THAT patient, or a logged-in hospital staff
user, or the patient themselves. Every view, allowed or denied, writes exactly
one audit row.
"""
from typing import NoReturn, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_optional_actor
from app.db import get_db
from app.security.actor import Actor
from app.security.passport_token import PassportTokenError, verify_passport_token
from app.services import audit
from app.services.passport import build_passport

router = APIRouter(tags=["passport"])

_DETAIL = {
    "missing_credentials": "A valid token or login is required",
    "expired_token": "This passport link has expired",
    "tampered_token": "This passport link is not valid",
    "token_patient_mismatch": "This token is not valid for this patient",
    "forbidden_role": "Not allowed to view this passport",
    "patient_not_found": "Patient not found",
}


@router.get("/passport/{patient_id}")
def get_passport(
    patient_id: str,
    token: Optional[str] = Query(None),
    actor: Optional[Actor] = Depends(get_optional_actor),
    db: Session = Depends(get_db),
) -> dict:
    def deny(status: int, reason: str, *, who_actor: Optional[Actor] = None, via_token: bool = False) -> NoReturn:
        audit.record(db, action="passport.view", resource_type="passport", resource_id=patient_id,
                     patient_id=patient_id, outcome="denied", reason=reason,
                     actor=who_actor, via_token=via_token)
        raise HTTPException(status_code=status, detail=_DETAIL[reason])

    viewer: Optional[Actor] = None
    via_token = False
    if token is not None:
        try:
            token_patient = verify_passport_token(token)
        except PassportTokenError as exc:
            deny(401, exc.code)
        if token_patient != patient_id:
            deny(403, "token_patient_mismatch", via_token=True)
        via_token = True
    elif actor is not None:
        allowed = actor.role == "HOSPITAL_STAFF" or (actor.role == "PATIENT" and actor.patient_id == patient_id)
        if not allowed:
            deny(403, "forbidden_role", who_actor=actor)
        viewer = actor
    else:
        deny(401, "missing_credentials")

    built = build_passport(db, patient_id)
    if built is None:
        deny(404, "patient_not_found", who_actor=viewer, via_token=via_token)
    passport, released = built
    audit.record(db, action="passport.view", resource_type="passport", resource_id=patient_id,
                 patient_id=patient_id, outcome="allowed", actor=viewer, via_token=via_token,
                 fields_released=released)
    return passport
