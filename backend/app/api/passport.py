"""GET /passport/{id}?token (features 11 and 50).

Access: a valid signed token for THAT patient, or a logged-in hospital staff
user, or the patient themselves. Every view, allowed or denied, writes exactly
one audit row.
"""
import re
from typing import NoReturn, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_optional_actor
from app.db import get_db
from app.security.actor import Actor
from app.security.passport_token import PassportTokenError, verify_passport_token
from app.services import audit, events
from app.services import passport_links as links
from app.services.passport import build_passport

router = APIRouter(tags=["passport"])

_DETAIL = {
    "missing_credentials": "A valid token or login is required",
    "expired_token": "This passport link has expired",
    "tampered_token": "This passport link is not valid",
    "token_patient_mismatch": "This token is not valid for this patient",
    "forbidden_role": "Not allowed to view this passport",
    "patient_not_found": "Patient not found",
    "revoked_token": "This passport is no longer available",
}
GONE = "This passport is no longer available."

# Patient ids look like PT-2026-0417 (or pat_001 in the examples). Anything else in the address is a QR link.
_PATIENT_ID = re.compile(r"PT-\d{4}-\d{4}|pat_[A-Za-z0-9_]+")


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

    # The QR link itself: an opaque token in the address. A token always wins over a login. Nobody needs to log in.
    if token is None and not _PATIENT_ID.fullmatch(patient_id):
        row = links.lookup(db, patient_id)
        if row is not None:
            if links.is_revoked(row) or links.is_expired(row):
                reason = "revoked_token" if links.is_revoked(row) else "expired_token"
                audit.record(db, action="passport.view", resource_type="passport", resource_id=row.id,
                             patient_id=row.patient_id, outcome="denied", reason=reason, via_token=True)
                raise HTTPException(status_code=410, detail=GONE)
            return _open(db, row, row.patient_id)
        if actor is None:                                      # not a patient id, not a link we issued
            audit.record(db, action="passport.view", resource_type="passport", resource_id=patient_id,
                         outcome="denied", reason="tampered_token", via_token=True)
            raise HTTPException(status_code=410, detail=GONE)

    if token is not None:
        try:
            token_patient = verify_passport_token(token)
        except PassportTokenError as exc:
            deny(401, exc.code)
        if token_patient != patient_id:
            deny(403, "token_patient_mismatch", via_token=True)
        row = links.lookup(db, token)
        if row is not None and links.is_revoked(row):          # revoked by the patient: still a valid signature
            audit.record(db, action="passport.view", resource_type="passport", resource_id=patient_id,
                         patient_id=patient_id, outcome="denied", reason="revoked_token", via_token=True)
            raise HTTPException(status_code=410, detail=GONE)
        via_token = True
        if row is not None:
            return _open(db, row, patient_id)
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


def _open(db: Session, row, patient_id: str) -> dict:
    """Someone opened a live QR link: show the passport, log the time, tell the patient's screen."""
    built = build_passport(db, patient_id)
    if built is None:
        raise HTTPException(status_code=410, detail=GONE)
    passport, released = built
    audit.record(db, action="passport.view", resource_type="passport", resource_id=patient_id,
                 patient_id=patient_id, outcome="allowed", via_token=True, fields_released=released)
    opened = links.record_open(db, row)
    events.queue(db, "passport.opened", {"patient_id": patient_id}, audience="patient:" + patient_id,
                 state="MONITORING")
    db.commit()
    events.flush(db)
    passport["expires_at"] = links.expires_iso(row)
    return passport
