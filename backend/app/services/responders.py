"""Volunteer responders (J4): sign-up, alerts without identity, and what accepting releases.

A volunteer account starts UNVERIFIED and sees nothing until an admin verifies it. An alert carries no patient
identity. Accepting releases only what the patient allowed at the SOS AND still allows now: the name and age always,
allergies with the `history` consent, the location with the `location` consent.
"""
import re
import zlib
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.accounts import User
from app.models.apps import ResponderAcceptance, ResponderProfile
from app.models.emergencies import Emergency
from app.models.patient_data import Patient
from app.security.actor import Actor
from app.security.passwords import hash_password
from app.services import events
from app.services.accounts import next_user_id
from app.services.consent import current_consents
from app.services.emergencies import LIVE_STATES
from app.services.family import both_on

_EMAIL = re.compile(r"[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s]{2,24}")
MIN_PASSWORD, MAX_PASSWORD = 8, 128


class ResponderError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status


def clean_registration(body) -> Dict[str, str]:
    if not isinstance(body, dict):
        raise ResponderError(400, "Send a JSON object")
    name, email, password = body.get("name"), body.get("email"), body.get("password")
    if not isinstance(name, str) or not name.strip() or len(name.strip()) > 80:
        raise ResponderError(400, "name is required (80 characters at most)")
    if not isinstance(email, str) or not _EMAIL.fullmatch(email.strip()):
        raise ResponderError(400, "email must be a valid address")
    if not isinstance(password, str) or not (MIN_PASSWORD <= len(password) <= MAX_PASSWORD):
        raise ResponderError(400, f"password must have {MIN_PASSWORD} to {MAX_PASSWORD} characters")
    return {"name": " ".join(name.split()), "email": email.strip().lower(), "password": password}


def register(session: Session, data: Dict[str, str]) -> User:
    if session.query(User).filter(User.login == data["email"]).first() is not None:
        raise ResponderError(409, "This email is already registered")
    user = User(id=next_user_id(session), login=data["email"], display_name=data["name"],
                password_hash=hash_password(data["password"]), role="RESPONDER")
    session.add(user)
    session.flush()
    session.add(ResponderProfile(user_id=user.id, verified=False))
    session.flush()
    return user


def is_verified(session: Session, user_id: str) -> bool:
    profile = session.get(ResponderProfile, user_id)
    return bool(profile and profile.verified)


def distance_for(emergency_id: str) -> int:
    """A fixed fake distance from the volunteer, in metres (simulated, there is no real position)."""
    return 400 + (zlib.crc32(emergency_id.encode()) % 7) * 150


def live_alerts(session: Session, user_id: str) -> List[dict]:
    mine = {a.emergency_id for a in session.query(ResponderAcceptance).filter_by(user_id=user_id)}
    rows = (session.query(Emergency).filter(Emergency.sos_at.isnot(None)).order_by(Emergency.created_at.desc()).all())
    return [{"id": e.id, "type": e.type, "distance_m": distance_for(e.id), "state": e.state,
             "accepted": e.id in mine, "simulated": True} for e in rows if e.state in LIVE_STATES]


def accept(session: Session, user: Actor, emergency_id: str):
    """Returns (answer, released field names). Raises ResponderError(404) for an unknown or finished alert."""
    emergency = session.get(Emergency, emergency_id)
    if emergency is None or emergency.sos_at is None or emergency.state not in LIVE_STATES:
        raise ResponderError(404, "Alert not found or already finished")
    if session.query(ResponderAcceptance).filter_by(emergency_id=emergency.id, user_id=user.user_id).first() is None:
        session.add(ResponderAcceptance(emergency_id=emergency.id, user_id=user.user_id))
        session.flush()
        events.queue(session, "responder.accepted", {}, audience="patient:" + emergency.patient_id,
                     emergency_id=emergency.id, state=emergency.state)
    patient = session.get(Patient, emergency.patient_id)
    allowed = both_on(emergency.consents or {}, current_consents(session, emergency.patient_id))
    shown: Dict[str, object] = {"name": patient.name, "age": patient.age}
    if allowed.get("history"):
        shown["allergies"] = list(patient.allergies or [])
    answer = {"id": emergency.id, "accepted": True, "patient": shown, "simulated": True}
    released = ["name", "age"] + (["allergies"] if "allergies" in shown else [])
    if allowed.get("location") and emergency.location:
        answer["location"] = {"lat": emergency.location["lat"], "lng": emergency.location["lng"]}
        released.append("location")
    return answer, released
