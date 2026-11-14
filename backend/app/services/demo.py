"""The demo panel's two big buttons: reset everything, and start a ready-made emergency. DEMO_MODE ONLY.

The routes refuse to run outside DEMO_MODE (404), and `append_only.reset_table` refuses too, so a real
deployment cannot be wiped through here. ALL DATA IS FICTIONAL.
"""
from typing import Callable, Dict, List

from sqlalchemy.orm import Session

from app.config import demo_mode
from app.db import Base
from app.models import accounts, apps, audit, consent, emergencies, extras, hospitals, patient_data  # noqa: F401  (fill Base.metadata)
from app.models.append_only import reset_table
from app.models.enums import EmergencyType
from app.models.patient_data import Patient
from app.security.actor import Actor
from app.security.login_limiter import reset_limiter
from app.seed.demo_data import DEMO_PATIENT_ID, seed_demo
from app.services import emergencies as emergency_service
from app.services import events
from app.services.hospital_match import DEMO_LOCATION
from app.sim.wearable import PROFILES, SCENARIO_TO_PROFILE, registry as wearable_registry

# Tables that can never be edited or deleted, with the label their protection uses. Only a demo reset clears them.
APPEND_ONLY = {"status_events": "status timeline", "audit_log": "audit log", "consents": "consents ledger"}

# How fast timed demo steps run (the escalation timer divides its waiting time by this). 1 is real time.
ALLOWED_SPEEDS = (1, 2, 5, 10, 20)
_speed = 1


def get_speed() -> int:
    return _speed


def set_speed(multiplier) -> int:
    """Only 1, 2, 5, 10 or 20. Anything else (a bool, a float, a string) is refused."""
    global _speed
    if isinstance(multiplier, bool) or not isinstance(multiplier, int) or multiplier not in ALLOWED_SPEEDS:
        raise ValueError("multiplier must be one of " + ", ".join(str(x) for x in ALLOWED_SPEEDS))
    _speed = multiplier
    return _speed


def state(patient_id: str) -> Dict[str, object]:
    """What the demo panel shows: the speed and the wearable's profile and pinned values."""
    sim = wearable_registry.get(patient_id)
    return {"speed": _speed, "allowed_speeds": list(ALLOWED_SPEEDS),
            "vitals": {"profile": sim.profile, "overrides": sim.overrides, "profiles": list(PROFILES)},
            "simulated": True}


# Anything else that keeps demo state in memory (another phase's store) registers a function here.
_reset_hooks: List[Callable[[], None]] = []


def register_reset_hook(fn: Callable[[], None]) -> None:
    if fn not in _reset_hooks:
        _reset_hooks.append(fn)


def clear_reset_hooks() -> None:
    _reset_hooks.clear()


def reset_everything(session: Session) -> Dict[str, object]:
    """Empty every table, load the seed data again and put the simulators back to normal.

    The demo logins keep their ids, so a login that was issued before the reset still works after it.
    """
    if not demo_mode():
        raise PermissionError("The demo reset only works in DEMO_MODE")
    connection = session.connection()
    for table in reversed(Base.metadata.sorted_tables):          # children before parents
        if table.name in APPEND_ONLY:
            reset_table(session, table.name, APPEND_ONLY[table.name])
        else:
            connection.execute(table.delete())
    session.commit()
    seeded = seed_demo(session)
    wearable_registry.reset_all()
    reset_limiter()
    global _speed
    _speed = 1
    for hook in list(_reset_hooks):
        hook()
    return seeded


# ------------------------------------------------------------------ scenarios

# The symptom ids the patient app sends for each ready-made scenario.
SCENARIO_SYMPTOMS = {
    "HEART": ["CHEST_PAIN", "SHORT_BREATH", "SWEATING"],
    "STROKE": ["FACE_DROOP", "LIMB_WEAKNESS", "SLURRED_SPEECH"],
    "DIABETIC": ["DIA_CONFUSION", "DIA_SHAKING", "LOW_GLUCOSE_READING"],
    "ASTHMA": ["WHEEZING", "CANNOT_SPEAK_SENTENCES", "SEVERE_SHORT_BREATH"],
}
SCENARIO_NAMES = {**{t: t for t in SCENARIO_SYMPTOMS}, "HEART_ATTACK": "HEART", "LOW_GLUCOSE": "DIABETIC"}
FALL = "FALL"


class UnknownScenario(ValueError):
    """The scenario name is not one of the ready-made ones."""


def scenario_for(name) -> str:
    if not isinstance(name, str) or not name.strip():
        raise UnknownScenario("Send a type: HEART, STROKE, DIABETIC, ASTHMA or FALL")
    key = name.strip().upper().replace("-", "_").replace(" ", "_")
    if key == FALL:
        return FALL
    if key not in SCENARIO_NAMES:
        raise UnknownScenario("type must be HEART, STROKE, DIABETIC, ASTHMA or FALL")
    return SCENARIO_NAMES[key]


def run_scenario(session: Session, actor: Actor, name: str):
    """Set the wearable to the matching profile, raise the alert for the demo patient and send the SOS.

    Returns the emergency. The caller commits and then calls `events.flush`.
    """
    scenario = scenario_for(name)
    patient = session.get(Patient, actor.patient_id or DEMO_PATIENT_ID)
    if patient is None:
        raise LookupError("Demo patient not found")
    location = {**DEMO_LOCATION, "accuracy": 50.0, "source": "demo"}
    if scenario == FALL:
        sim = wearable_registry.get(patient.id)
        sim.apply(profile="normal")
        sim.snap()
        clean = {"patient_id": patient.id, "type": EmergencyType.UNKNOWN.value, "symptoms": [],
                 "source": "FALL_CHECK", "consents": {}, "location": location}
    else:
        sim = wearable_registry.get(patient.id)
        sim.apply(profile=SCENARIO_TO_PROFILE[scenario])
        sim.snap()                                              # the readings match the scenario at once
        clean = {"patient_id": patient.id, "type": scenario, "symptoms": list(SCENARIO_SYMPTOMS[scenario]),
                 "source": "MANUAL", "consents": {}, "location": location}
    emergency = emergency_service.create_emergency(session, actor, patient, clean)
    emergency_service.send_sos(session, actor, emergency, location)
    return emergency
