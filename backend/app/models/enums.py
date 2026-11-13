"""Shared enums for HealthTwin AI. Names and values must match CONTRACT.md exactly.

Contains: emergency types, severity, emergency states with the transition table,
roles, and emergency sources.
"""
from enum import Enum
from typing import Dict, FrozenSet


class EmergencyType(str, Enum):
    HEART = "HEART"
    STROKE = "STROKE"
    DIABETIC = "DIABETIC"
    ASTHMA = "ASTHMA"
    # Safety check-in with no reply (fall or inactivity check). The patient app and the portal already use it.
    # Not part of the day-1 contract: pending agreement with Jehal and Puneet.
    UNKNOWN = "UNKNOWN"


class Severity(str, Enum):
    EMERGENCY = "EMERGENCY"
    URGENT = "URGENT"
    WATCH = "WATCH"
    NONE = "NONE"


# Higher number = more serious. Used to compare levels and to enforce that
# severity never goes down when more evidence is added.
SEVERITY_RANK = {
    Severity.EMERGENCY: 3,
    Severity.URGENT: 2,
    Severity.WATCH: 1,
    Severity.NONE: 0,
}

# What each level triggers (feature 20). Other services read this map instead
# of hard-coding their own behaviour.
SEVERITY_ACTIONS = {
    Severity.EMERGENCY: {
        "action": "alert_hospital_now",
        "description": "Create the emergency, alert the best-matched hospital now and notify family.",
    },
    Severity.URGENT: {
        "action": "prompt_symptom_check",
        "description": "Ask the patient to confirm symptoms and show a clear call-112/108 option.",
    },
    Severity.WATCH: {
        "action": "log_only",
        "description": "Record the reading and keep monitoring. No alert is sent.",
    },
    Severity.NONE: {
        "action": "no_action",
        "description": "No indicators found. This does not rule out any condition.",
    },
}


# ---------------------------------------------------------------- states

class EmergencyState(str, Enum):
    MONITORING = "MONITORING"
    SYMPTOMS_REPORTED = "SYMPTOMS_REPORTED"
    EMERGENCY_DETECTED = "EMERGENCY_DETECTED"
    SOS_SENT = "SOS_SENT"
    HOSPITAL_ACKNOWLEDGED = "HOSPITAL_ACKNOWLEDGED"
    AMBULANCE_DISPATCHED = "AMBULANCE_DISPATCHED"
    EN_ROUTE = "EN_ROUTE"
    ARRIVED = "ARRIVED"
    HANDOVER_DONE = "HANDOVER_DONE"
    CANCELLED = "CANCELLED"
    ESCALATED = "ESCALATED"


S = EmergencyState

# The one transition table (CONTRACT.md section 2). Each state moves only to the next, no skipping.
# CANCELLED is possible only before AMBULANCE_DISPATCHED. ESCALATED happens only from SOS_SENT,
# and the alert then goes to the next hospital (back to SOS_SENT) or is acknowledged.
ALLOWED_TRANSITIONS: Dict[EmergencyState, FrozenSet[EmergencyState]] = {
    S.MONITORING: frozenset({S.SYMPTOMS_REPORTED}),
    S.SYMPTOMS_REPORTED: frozenset({S.EMERGENCY_DETECTED}),
    S.EMERGENCY_DETECTED: frozenset({S.SOS_SENT, S.CANCELLED}),
    S.SOS_SENT: frozenset({S.HOSPITAL_ACKNOWLEDGED, S.ESCALATED, S.CANCELLED}),
    S.ESCALATED: frozenset({S.SOS_SENT, S.HOSPITAL_ACKNOWLEDGED, S.CANCELLED}),
    S.HOSPITAL_ACKNOWLEDGED: frozenset({S.AMBULANCE_DISPATCHED, S.CANCELLED}),
    S.AMBULANCE_DISPATCHED: frozenset({S.EN_ROUTE}),
    S.EN_ROUTE: frozenset({S.ARRIVED}),
    S.ARRIVED: frozenset({S.HANDOVER_DONE}),
    S.HANDOVER_DONE: frozenset(),
    S.CANCELLED: frozenset(),
}
TERMINAL_STATES = frozenset(state for state, nxt in ALLOWED_TRANSITIONS.items() if not nxt)


class InvalidTransition(ValueError):
    """An emergency cannot move from one state to the other. The API answers 409 with from and to."""

    def __init__(self, from_state: EmergencyState, to_state: EmergencyState):
        super().__init__(f"Invalid transition: {from_state.value} to {to_state.value}")
        self.from_state, self.to_state = from_state, to_state


def can_move(from_state: EmergencyState, to_state: EmergencyState) -> bool:
    return to_state in ALLOWED_TRANSITIONS[from_state]


def check_transition(from_state: EmergencyState, to_state: EmergencyState) -> None:
    if not can_move(from_state, to_state):
        raise InvalidTransition(from_state, to_state)


# ---------------------------------------------------------------- roles and sources

class Role(str, Enum):
    PATIENT = "PATIENT"
    HOSPITAL_STAFF = "HOSPITAL_STAFF"
    ADMIN = "ADMIN"
    FAMILY = "FAMILY"
    RESPONDER = "RESPONDER"


class EmergencySource(str, Enum):
    MANUAL = "MANUAL"
    FALL_CHECK = "FALL_CHECK"
    INACTIVITY_CHECK = "INACTIVITY_CHECK"
