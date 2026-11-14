"""Translate the apps' symptom ids into the rules engine's symptom names.

The patient app sends UPPER_SNAKE ids (CHEST_PAIN, BLUE_LIPS, ...). The rules engine uses lowercase names.
This is the ONE place that translates them. It never decides a severity.

Safety rules
- Every id the patient app can send maps to an engine name that has at least one rule, so a symptom the patient
  chose can never silently produce "no indicators" (a test checks all 20).
- An id this table does not know is NOT dropped silently: it comes back in `unmapped`, so the caller can store it
  and tell Daksh and the doctor. An unknown id never lowers a severity.
- The mapping choices are DRAFT and pending doctor review (see docs/review/DOCTOR_REVIEW_NEW_RULES.md).
"""
import re
from dataclasses import dataclass
from typing import Any, Iterable, Optional, Tuple

from app.rules.engine import default_rules

APP_TO_ENGINE = {
    # HEART
    "CHEST_PAIN": "chest_pain",
    "SHORT_BREATH": "breathlessness",
    "SWEATING": "sweating",
    "NAUSEA": "nausea",
    "ARM_JAW_PAIN": "left_arm_pain",      # DRAFT: jaw pain and right-arm pain are not separate yet (question for the doctor)
    "FAINTING": "fainting",
    # STROKE
    "FACE_DROOP": "face_drooping",
    "LIMB_WEAKNESS": "arm_weakness",
    "SLURRED_SPEECH": "slurred_speech",
    "SUDDEN_CONFUSION": "sudden_confusion",   # its own stroke rule, no longer the diabetic confusion rule
    "SEVERE_HEADACHE": "severe_headache",
    # DIABETIC
    "DIA_CONFUSION": "confusion",
    "DIA_SHAKING": "shaking",
    "DIA_SWEATING": "sweating",
    "DIA_FAINTING": "diabetic_fainting",
    "LOW_GLUCOSE_READING": "low_glucose",
    # ASTHMA
    "WHEEZING": "wheeze",
    "CANNOT_SPEAK_SENTENCES": "cannot_speak_sentences",
    "SEVERE_SHORT_BREATH": "breathlessness",
    "BLUE_LIPS": "blue_lips",
}

# A safety check-in alert (fall or inactivity check) is only raised when the person did NOT reply.
CHECKIN_SOURCES = frozenset({"FALL_CHECK", "INACTIVITY_CHECK"})
CHECKIN_SYMPTOM = "checkin_no_reply"


@dataclass(frozen=True)
class Translation:
    symptoms: Tuple[str, ...]     # engine names, no duplicates, in the order given
    unmapped: Tuple[str, ...]     # ids nobody knows: store them and tell Daksh and the doctor


def known_engine_symptoms() -> frozenset:
    """Every symptom name that at least one rule uses."""
    names = set()
    for rule in default_rules():
        names |= rule.all_symptoms | rule.any_symptoms
    return frozenset(names)


def translate(app_symptoms: Optional[Iterable[Any]], source: Optional[str] = None) -> Translation:
    """App ids (and already-lowercase engine names) to engine names. Never raises on odd input."""
    known = known_engine_symptoms()
    mapped, unmapped = [], []
    if isinstance(app_symptoms, str):
        items = [app_symptoms]
    else:
        try:
            items = list(app_symptoms or [])
        except TypeError:          # a number or another non-list: treat it as "no symptoms"
            items = []
    for item in items:
        if not isinstance(item, str) or not item.strip():
            continue
        key = re.sub(r"[\s\-]+", "_", item.strip()).upper()
        if key in APP_TO_ENGINE:
            name = APP_TO_ENGINE[key]
        elif key.lower() in known:             # the contract also allows lowercase engine names
            name = key.lower()
        else:
            if item.strip() not in unmapped:
                unmapped.append(item.strip())
            continue
        if name not in mapped:
            mapped.append(name)
    if source in CHECKIN_SOURCES and CHECKIN_SYMPTOM not in mapped:
        mapped.append(CHECKIN_SYMPTOM)
    return Translation(tuple(mapped), tuple(unmapped))
