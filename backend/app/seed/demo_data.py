"""Demo seed data (feature 33 and the demo path). ALL DATA IS FICTIONAL.

Loads the 5 hospitals, 5 ambulances, the demo patient with two contacts, the demo logins and the patient's consents.
It runs ONLY when DEMO_MODE=true (or through `python -m app.seed`, which needs DEMO_MODE=true too).
It never runs in a normal start, so a real deployment never gets demo passwords.

The demo passwords below are public demo values listed in CONTRACT.md. They are not secrets, and this file is
the only place they appear. Only bcrypt hashes are stored, and nothing here ever prints a password.
"""
import json
from pathlib import Path
from typing import Dict, Optional

from sqlalchemy.orm import Session

from app.config import demo_mode
from app.models.accounts import User
from app.models.apps import FamilyInvite, ResponderProfile
from app.models.consent import CONSENT_FIELDS, ConsentLedger
from app.models.hospitals import Ambulance, Hospital
from app.models.patient_data import Contact, Patient
from app.security.passwords import hash_password

DATA_DIR = Path(__file__).parent / "data"
DEMO_PATIENT_ID = "PT-2026-0417"
DEMO_HOSPITAL_ID = "HSP-AMD-002"   # the heart and stroke institute: the staff logins belong here

# (id, login, display name, demo password, role, patient id, hospital id, label shown in the login answer)
DEMO_ACCOUNTS = [
    ("usr_001", "patient@demo.test", "Rahul Mehta", "demo1234", "PATIENT", DEMO_PATIENT_ID, None, None),
    ("usr_002", "patient1", "Rahul Mehta", "demo-password", "PATIENT", DEMO_PATIENT_ID, None, None),
    ("usr_003", "staff@demo.test", "Desk Staff (Demo)", "demo1234", "HOSPITAL_STAFF", None, DEMO_HOSPITAL_ID, None),
    ("usr_004", "staff@demo", "Desk Staff (Demo)", "demo123", "HOSPITAL_STAFF", None, DEMO_HOSPITAL_ID, "staff"),
    ("usr_005", "staff1", "Desk Staff (Demo)", "demo-password", "HOSPITAL_STAFF", None, DEMO_HOSPITAL_ID, None),
    ("usr_006", "admin@demo.test", "Admin (Demo)", "demo1234", "ADMIN", None, DEMO_HOSPITAL_ID, None),
    ("usr_007", "admin@demo", "Admin (Demo)", "demo123", "ADMIN", None, DEMO_HOSPITAL_ID, "admin"),
    ("usr_008", "admin1", "Admin (Demo)", "demo-password", "ADMIN", None, DEMO_HOSPITAL_ID, None),
    ("usr_009", "family1", "Family (Demo)", "demo-password", "FAMILY", None, None, None),
    ("usr_010", "responder1", "Responder (Demo)", "demo-password", "RESPONDER", None, None, None),
    ("usr_011", "family@demo.test", "Family (Demo)", "demo1234", "FAMILY", None, None, None),
    ("usr_012", "responder@demo.test", "Verified Responder (Demo)", "demo1234", "RESPONDER", None, None, None),
]
VERIFIED_RESPONDERS = {"usr_012"}          # every other volunteer account starts unverified, as a real sign-up does


class SeedRefused(RuntimeError):
    """Demo data was requested outside DEMO_MODE."""


_hash_cache: Dict[tuple, str] = {}


def _hash(password: str) -> str:
    """bcrypt is slow on purpose, so each demo password is hashed once per process. A demo reset stays fast."""
    from app.security.passwords import _rounds
    key = (password, _rounds())
    if key not in _hash_cache:
        _hash_cache[key] = hash_password(password)
    return _hash_cache[key]


def _load(name: str):
    return json.loads((DATA_DIR / name).read_text(encoding="utf-8"))


def is_seeded(session: Session) -> bool:
    return session.query(User).first() is not None or session.query(Hospital).first() is not None


def seed_demo(session: Session) -> Dict[str, object]:
    """Add the demo data. Does nothing if there is data already. The caller does not need to commit."""
    if not demo_mode():
        raise SeedRefused("Demo data can only be loaded when DEMO_MODE=true")
    if is_seeded(session):
        return {"already_seeded": True}

    for h in _load("hospitals.json")["hospitals"]:
        caps, avail = h["capabilities"], h["availability"]
        session.add(Hospital(
            id=h["id"], portal_id=h.get("portal_id"), name=h["name"], address=h.get("address"), phone=h.get("phone"),
            lat=h["lat"], lng=h["lng"], verified=bool(h["verified"]),
            cap_emergency=bool(caps["emergency"]), cap_cath_lab=bool(caps["cath_lab"]),
            cap_stroke_unit=bool(caps["stroke_unit"]), cap_icu=bool(caps["icu"]),
            beds_free=avail["beds_free"], icu_free=avail["icu_free"],
            cath_lab_ready=bool(avail["cath_lab_ready"]), stroke_unit_ready=bool(avail["stroke_unit_ready"]),
        ))
    session.flush()

    for a in _load("ambulances.json")["ambulances"]:
        crew = a.get("crew") or {}
        session.add(Ambulance(
            id=a["id"], portal_id=a.get("portal_id"), call_sign=a["call_sign"], crew_driver=crew.get("driver"),
            crew_paramedic=crew.get("paramedic"), base_hospital_id=a.get("base_hospital_id"),
            lat=a["lat"], lng=a["lng"], status=a.get("status", "available"),
        ))

    p = _load("patient.json")
    session.add(Patient(
        id=p["id"], name=p["name"], age=p["age"], sex=p.get("sex"), blood_group=p.get("blood_group"),
        blood_group_verified=bool(p.get("blood_group_verified")), language=p.get("language", "en"),
        conditions=p.get("conditions", []), allergies=p.get("allergies", []), medications=p.get("medications", []),
        baseline=_load("baseline.json"),
    ))
    session.flush()
    for position, c in enumerate(p.get("contacts", []), start=1):
        session.add(Contact(id=c["id"], patient_id=p["id"], name=c["name"], relation=c.get("relation"),
                            phone=c["phone"], is_primary=bool(c.get("is_primary")), position=position))

    for user_id, login, display, password, role, patient_id, hospital_id, label in DEMO_ACCOUNTS:
        session.add(User(id=user_id, login=login.lower(), display_name=display, password_hash=_hash(password),
                         role=role, role_label=label, patient_id=patient_id, hospital_id=hospital_id))

    session.flush()
    for user_id, _login, _d, _p, role, *_rest in DEMO_ACCOUNTS:
        if role == "RESPONDER":
            session.add(ResponderProfile(user_id=user_id, verified=user_id in VERIFIED_RESPONDERS))
    # The one invite code that never expires, so a demo relative can always link (real invites last 24 hours, once).
    session.add(FamilyInvite(code="FAM-0417", patient_id=p["id"], expires_at=None, reusable=True))
    from app.services.content import seed_content
    seed_content(session)

    # The demo patient shares everything, as in the mock server. Written through the append-only ledger.
    for field in CONSENT_FIELDS:
        session.add(ConsentLedger(patient_id=p["id"], field=field, granted=bool(p["consents"].get(field, False)),
                                  actor="seed", actor_role="SYSTEM"))
    session.commit()
    return {"hospitals": len(_load("hospitals.json")["hospitals"]), "ambulances": len(_load("ambulances.json")["ambulances"]),
            "patients": 1, "contacts": len(p.get("contacts", [])), "users": len(DEMO_ACCOUNTS), "consents": len(CONSENT_FIELDS)}
