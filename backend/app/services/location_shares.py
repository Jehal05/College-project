"""Time-limited location sharing with linked relatives (J-P5, the last open contract endpoint).

The patient sends where they are and for how long (15, 30 or 60 minutes). Linked relatives see it in their status view
only while the share is live AND the patient's `location` consent is still on. A new share replaces the old one;
the patient can stop it at any time. Expired and stopped shares are never shown.
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.models.apps import LocationShare
from app.services.emergencies import EmergencyInputError, clean_location

MINUTES = (15, 30, 60)
DEFAULT_MINUTES = 30


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def iso(moment: datetime) -> str:
    return moment.strftime("%Y-%m-%dT%H:%M:%SZ")


class ShareError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status


def clean_share(body) -> Dict[str, Any]:
    if not isinstance(body, dict):
        raise ShareError(400, "Send a JSON object")
    minutes = body.get("minutes", DEFAULT_MINUTES)
    if isinstance(minutes, bool) or minutes not in MINUTES:
        raise ShareError(400, "minutes must be 15, 30 or 60")
    if body.get("location") is None and not ("lat" in body and "lng" in body):
        raise ShareError(400, "location (lat and lng) is required")
    try:
        where = clean_location(body.get("location") if body.get("location") is not None else
                               {k: body[k] for k in ("lat", "lng", "accuracy", "source") if k in body})
    except EmergencyInputError as exc:
        raise ShareError(400, str(exc)) from None
    return {"minutes": minutes, "location": where, "patient_id": body.get("patient_id")}


def live_share(session: Session, patient_id: str) -> Optional[LocationShare]:
    return (session.query(LocationShare)
            .filter(LocationShare.patient_id == patient_id, LocationShare.revoked_at.is_(None),
                    LocationShare.expires_at > _now())
            .order_by(LocationShare.created_at.desc()).first())


def start(session: Session, patient_id: str, minutes: int, where: Dict[str, Any]) -> LocationShare:
    for old in session.query(LocationShare).filter(LocationShare.patient_id == patient_id,
                                                   LocationShare.revoked_at.is_(None)):
        old.revoked_at = _now()                                   # one live share at a time
    share = LocationShare(patient_id=patient_id, location=where, expires_at=_now() + timedelta(minutes=minutes))
    session.add(share)
    session.flush()
    return share


def stop(session: Session, patient_id: str, share_id: str) -> None:
    share = session.get(LocationShare, share_id)
    if share is None or share.patient_id != patient_id:
        raise ShareError(404, "Location share not found")         # the same answer for another patient's id
    if share.revoked_at is None:
        share.revoked_at = _now()


def view(share: LocationShare) -> dict:
    return {"id": share.id, "expires_at": iso(share.expires_at), "simulated": True}
