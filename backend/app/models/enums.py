"""Shared enums for HealthTwin AI.

Only the pieces needed by the rules engine live here for now (Phase 2, Task 1).
Emergency states, roles and the transition dict are added with the models
(Phase 1, Task 2). Names and values must match CONTRACT.md exactly.
"""
from enum import Enum


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
