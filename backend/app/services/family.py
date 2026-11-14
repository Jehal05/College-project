"""Family linking, the plain status a relative sees, and the check-in reply (feature 61, J4).

THE PRIVACY RULE: a field reaches a relative only if the patient allowed it when the SOS was sent AND still
allows it now (`both_on`). Withdrawing a consent therefore takes effect on the very next read.
A relative never gets allergies, conditions, medications, phone numbers, the severity or the symptoms.
"""
import secrets
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.accounts import User
from app.models.apps import FamilyCheckin, FamilyInvite, FamilyLink
from app.models.emergencies import Emergency
from app.models.hospitals import Hospital
from app.models.patient_data import Patient
from app.security.actor import Actor
from app.services import events
from app.services.consent import current_consents, shared_fields
from app.services import location_shares
from app.services.emergencies import LIVE_STATES, timeline
from app.services.vitals import current_vitals

MESSAGES = ("ON_MY_WAY", "CALLING_NOW", "CANNOT_REACH")
INVITE_HOURS = 24
DEMO_INVITE = "FAM-0417"
_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"            # no 0/O/1/I: easy to read out over the phone


class FamilyError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _iso(moment: datetime) -> str:
    return moment.strftime("%Y-%m-%dT%H:%M:%SZ")


def both_on(snapshot: Dict[str, bool], now: Dict[str, bool]) -> Dict[str, bool]:
    """On only if it was on at the SOS and is still on."""
    return {k: bool(snapshot.get(k)) and bool(now.get(k)) for k in now}


def is_linked(session: Session, user_id: str, patient_id: str) -> bool:
    return session.query(FamilyLink).filter_by(user_id=user_id, patient_id=patient_id).first() is not None


def link_checker(session: Session, actor: Actor, patient_id: str) -> bool:
    """The real replacement for the old always-False checker (get_family_link_checker)."""
    return actor.role == "FAMILY" and is_linked(session, actor.user_id, patient_id)


def linked_patient_ids(session: Session, user_id: str) -> List[str]:
    rows = session.query(FamilyLink).filter_by(user_id=user_id).order_by(FamilyLink.id).all()
    return [r.patient_id for r in rows]


# ---------------------------------------------------------------- invites and links

def create_invite(session: Session, patient_id: str) -> FamilyInvite:
    for _ in range(5):
        code = "FAM-" + "".join(secrets.choice(_ALPHABET) for _ in range(4)) + "-" + "".join(secrets.choice(_ALPHABET) for _ in range(4))
        if session.get(FamilyInvite, code) is None:
            invite = FamilyInvite(code=code, patient_id=patient_id, expires_at=_now() + timedelta(hours=INVITE_HOURS))
            session.add(invite)
            session.flush()
            return invite
    raise FamilyError(500, "Could not make an invite code")


def clean_code(body) -> str:
    code = body.get("invite_code") if isinstance(body, dict) else None
    if not isinstance(code, str) or not code.strip():
        raise FamilyError(400, "invite_code is required")
    return code.strip().upper()[:40]


def link(session: Session, user: Actor, code: str) -> Patient:
    """Idempotent for a relative who is already linked (no code is used up twice)."""
    invite = session.get(FamilyInvite, code)
    if invite is None:
        raise FamilyError(404, "Invite code not found")
    patient = session.get(Patient, invite.patient_id)
    if patient is None:
        raise FamilyError(404, "Invite code not found")
    if is_linked(session, user.user_id, invite.patient_id):
        return patient
    if (invite.expires_at is not None and invite.expires_at <= _now()) or (invite.used_at is not None and not invite.reusable):
        raise FamilyError(410, "Invite code has expired or was already used")
    session.add(FamilyLink(user_id=user.user_id, patient_id=invite.patient_id))
    if not invite.reusable:
        invite.used_at = _now()
    session.flush()
    return patient


# ---------------------------------------------------------------- what a relative sees

def live_emergency(session: Session, patient_id: str) -> Optional[Emergency]:
    rows = (session.query(Emergency).filter(Emergency.patient_id == patient_id, Emergency.sos_at.isnot(None))
            .order_by(Emergency.created_at.desc()).all())
    return next((e for e in rows if e.state in LIVE_STATES), None)


def patient_view(session: Session, patient_id: str):
    """Returns (view, released) where released holds the NAMES of the shared fields in the view, for the audit log."""
    patient = session.get(Patient, patient_id)
    now = current_consents(session, patient_id)
    emergency = live_emergency(session, patient_id)
    allowed = both_on(emergency.consents or {}, now) if emergency is not None else now
    view = {"patient_id": patient_id, "name": patient.name, "shared_fields": shared_fields(now),
            "active_emergency": None, "simulated": True}
    released: List[str] = []
    if allowed.get("vitals"):
        vitals = current_vitals(patient_id)
        view["vitals"] = {k: v for k, v in vitals.items() if k != "patient_id"}
        released.append("vitals")
    share = location_shares.live_share(session, patient_id)
    if share is not None and now.get("location"):                 # the patient's consent for location is on right now
        view["location_share"] = {"lat": share.location["lat"], "lng": share.location["lng"],
                                  "expires_at": location_shares.iso(share.expires_at)}
        released.append("location")
    if emergency is not None:
        tl = timeline(session, emergency)
        active = {"id": emergency.id, "state": emergency.state, "started_at": tl[0]["timestamp"] if tl else None}
        hospital = session.get(Hospital, emergency.hospital_id) if emergency.hospital_id else None
        if hospital is not None:
            active["hospital"] = {"name": hospital.name}
        if emergency.eta_seconds is not None:
            active["eta_seconds"] = emergency.eta_seconds
        if allowed.get("location") and emergency.location:
            active["location"] = {"lat": emergency.location["lat"], "lng": emergency.location["lng"]}
            if "location" not in released:
                released.append("location")
        rows = session.query(FamilyCheckin).filter_by(emergency_id=emergency.id).order_by(FamilyCheckin.created_at).all()
        active["checkins"] = [{"message": c.message, "at": _iso(c.created_at)} for c in rows]
        view["active_emergency"] = active
    return view, released


# ---------------------------------------------------------------- check-in

def clean_checkin(body) -> Dict[str, Optional[str]]:
    if not isinstance(body, dict):
        raise FamilyError(400, "Send a JSON object")
    patient_id, emergency_id, message = body.get("patient_id"), body.get("emergency_id"), body.get("message")
    if not isinstance(patient_id, str) or not patient_id.strip():
        raise FamilyError(400, "patient_id is required")
    if emergency_id is not None and not isinstance(emergency_id, str):
        raise FamilyError(400, "emergency_id must be text")
    if message not in MESSAGES:
        raise FamilyError(400, "message must be one of " + ", ".join(MESSAGES))
    return {"patient_id": patient_id.strip(), "emergency_id": emergency_id, "message": message}


def add_checkin(session: Session, user: Actor, data: Dict[str, Optional[str]]) -> FamilyCheckin:
    patient_id = data["patient_id"]
    if data["emergency_id"]:
        emergency = session.get(Emergency, data["emergency_id"])
        if emergency is None or emergency.patient_id != patient_id or emergency.sos_at is None:
            raise FamilyError(404, "Emergency not found for this patient")
    else:
        emergency = live_emergency(session, patient_id)
        if emergency is None:
            raise FamilyError(404, "Emergency not found for this patient")
    if emergency.state not in LIVE_STATES:
        raise FamilyError(409, "This emergency has finished")
    row = FamilyCheckin(emergency_id=emergency.id, patient_id=patient_id, user_id=user.user_id, message=data["message"])
    session.add(row)
    session.flush()
    # The patient is told that somebody answered. Nothing about the relative (no name, no phone) is in the event.
    events.queue(session, "family.checkin", {"message": row.message}, audience="patient:" + patient_id,
                 emergency_id=emergency.id, state=emergency.state)
    return row


def checkin_view(row: FamilyCheckin) -> dict:
    return {"id": row.id, "emergency_id": row.emergency_id, "message": row.message,
            "at": _iso(row.created_at), "simulated": True}
