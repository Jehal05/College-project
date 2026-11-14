"""The 2026-11-13 draft rules and the symptom map.

These rules are an AI-written draft accepted for the prototype by Daksh. A doctor has NOT reviewed them.
The tests check the code does what the draft says, and that every rule stays labelled "pending doctor review".
"""
import itertools
from pathlib import Path

import pytest
import yaml

from app.models.enums import SEVERITY_RANK, EmergencyType, Severity
from app.rules.engine import RULES_PATH, evaluate, load_rules
from app.rules.symptom_map import (
    APP_TO_ENGINE, CHECKIN_SOURCES, CHECKIN_SYMPTOM, known_engine_symptoms, translate,
)

E, U, W, N = Severity.EMERGENCY, Severity.URGENT, Severity.WATCH, Severity.NONE
HEART, STROKE, DIABETIC, ASTHMA, UNKNOWN = (
    EmergencyType.HEART, EmergencyType.STROKE, EmergencyType.DIABETIC, EmergencyType.ASTHMA, EmergencyType.UNKNOWN,
)

NEW_RULE_IDS = {
    "ASTHMA_BLUE_LIPS", "ASTHMA_CANNOT_SPEAK_SENTENCES", "STROKE_SUDDEN_CONFUSION", "STROKE_SEVERE_HEADACHE",
    "FAINTING", "FAINTING_WITH_BREATHING_ARM_OR_CONFUSION_SIGNS", "DIABETIC_SHAKING",
    "DIABETIC_SHAKING_WITH_LOW_GLUCOSE_OR_CONFUSION", "DIABETIC_FAINTING", "HEART_NAUSEA",
    "HEART_NAUSEA_WITH_SWEATING", "CHECKIN_NO_REPLY",
}
SEVEN = ["NAUSEA", "FAINTING", "SEVERE_HEADACHE", "DIA_SHAKING", "DIA_FAINTING", "CANNOT_SPEAK_SENTENCES", "BLUE_LIPS"]
APP_DEFAULT_SCENARIOS = {   # the mock server's demo symptoms for each emergency type
    "HEART": ["CHEST_PAIN", "SHORT_BREATH", "SWEATING"],
    "STROKE": ["FACE_DROOP", "LIMB_WEAKNESS", "SLURRED_SPEECH"],
    "DIABETIC": ["DIA_CONFUSION", "DIA_SHAKING", "LOW_GLUCOSE_READING"],
    "ASTHMA": ["WHEEZING", "CANNOT_SPEAK_SENTENCES", "SEVERE_SHORT_BREATH"],
}


def app_decision(ids, source=None):
    return evaluate(list(translate(ids, source).symptoms))


# ------------------------------------------------------------ the rules are labelled honestly

def test_all_twelve_draft_rules_exist():
    assert NEW_RULE_IDS <= {r.id for r in load_rules()}


def test_every_rule_in_the_file_is_still_pending_doctor_review():
    assert all(r.review_status == "pending doctor review" for r in load_rules())


def test_every_draft_rule_says_it_is_not_doctor_reviewed():
    raw = yaml.safe_load(Path(RULES_PATH).read_text(encoding="utf-8"))["rules"]
    drafts = [r for r in raw if r["id"] in NEW_RULE_IDS]
    assert len(drafts) == len(NEW_RULE_IDS)
    for rule in drafts:
        assert "NOT reviewed by a doctor" in rule["origin"], rule["id"]
        assert "AI-written" in rule["origin"], rule["id"]


def test_no_rule_claims_a_doctor_approved_it():
    text = Path(RULES_PATH).read_text(encoding="utf-8").lower()
    for phrase in ("approved by dr", "doctor approved", "doctor-approved", "reviewed: true", "reviewed by dr"):
        assert phrase not in text, phrase


# ------------------------------------------------------------ each draft rule does what the draft says

@pytest.mark.parametrize("symptom, severity, kind", [
    ("blue_lips", E, ASTHMA), ("cannot_speak_sentences", E, ASTHMA),
    ("sudden_confusion", E, STROKE), ("severe_headache", U, STROKE),
    ("fainting", U, HEART), ("diabetic_fainting", E, DIABETIC),
    ("shaking", U, DIABETIC), ("nausea", W, HEART),
    (CHECKIN_SYMPTOM, E, UNKNOWN),
])
def test_a_single_new_symptom(symptom, severity, kind):
    d = evaluate([symptom])
    assert (d.severity, d.type) == (severity, kind)
    assert d.reasons


@pytest.mark.parametrize("symptoms, severity, kind", [
    (["fainting", "breathlessness"], E, HEART),
    (["fainting", "left_arm_pain"], E, HEART),
    (["fainting", "confusion"], E, HEART),
    (["shaking", "low_glucose"], E, DIABETIC),
    (["shaking", "confusion"], E, DIABETIC),
    (["nausea", "sweating"], U, HEART),
])
def test_new_symptom_combinations(symptoms, severity, kind):
    d = evaluate(symptoms)
    assert (d.severity, d.type) == (severity, kind)


def test_the_check_in_rule_gives_emergency_with_no_other_evidence():
    d = evaluate([CHECKIN_SYMPTOM])
    assert d.severity == E and d.type == UNKNOWN and d.action == "alert_hospital_now"


def test_chest_pain_is_still_emergency_with_every_new_symptom():
    for extra in ("nausea", "fainting", "shaking", "blue_lips", CHECKIN_SYMPTOM):
        assert evaluate(["chest_pain", extra]).severity == E


# ------------------------------------------------------------ severity never goes down

def test_adding_any_symptom_never_lowers_severity_across_all_symptoms():
    names = sorted(known_engine_symptoms())
    assert len(names) >= 19
    groups = [()] + [(n,) for n in names] + list(itertools.combinations(names, 2))
    for base in groups:
        base_rank = SEVERITY_RANK[evaluate(list(base)).severity]
        for extra in names:
            assert SEVERITY_RANK[evaluate([*base, extra]).severity] >= base_rank, (base, extra)


# ------------------------------------------------------------ the symptom map

def test_the_map_covers_exactly_the_twenty_app_symptoms():
    assert len(APP_TO_ENGINE) == 20


def test_no_app_symptom_maps_to_nothing():
    assert None not in APP_TO_ENGINE.values() and all(APP_TO_ENGINE.values())


def test_every_mapped_name_is_used_by_at_least_one_rule():
    assert set(APP_TO_ENGINE.values()) <= known_engine_symptoms()


@pytest.mark.parametrize("app_id", sorted(APP_TO_ENGINE))
def test_no_single_app_symptom_can_ever_give_no_indicators(app_id):
    assert app_decision([app_id]).severity != N, app_id


@pytest.mark.parametrize("app_id", SEVEN)
def test_the_seven_previously_unmapped_symptoms_are_now_flagged(app_id):
    assert SEVERITY_RANK[app_decision([app_id]).severity] >= SEVERITY_RANK[W]


def test_blue_lips_and_cannot_speak_are_emergencies_from_the_app():
    assert app_decision(["BLUE_LIPS"]).severity == E
    assert app_decision(["CANNOT_SPEAK_SENTENCES"]).severity == E


@pytest.mark.parametrize("kind, ids", APP_DEFAULT_SCENARIOS.items())
def test_each_demo_scenario_is_an_emergency_of_the_right_type(kind, ids):
    d = app_decision(ids)
    assert d.severity == E and d.type.value == kind


def test_sudden_confusion_is_a_stroke_sign_not_the_diabetic_confusion_rule():
    assert app_decision(["SUDDEN_CONFUSION"]).type == STROKE
    assert app_decision(["DIA_CONFUSION"]).type == DIABETIC


def test_fainting_in_the_diabetic_list_is_not_the_same_as_fainting_in_the_heart_list():
    assert app_decision(["DIA_FAINTING"]).severity == E
    assert app_decision(["FAINTING"]).severity == U


# ------------------------------------------------------------ translate() behaviour

def test_lowercase_engine_names_and_odd_spelling_are_accepted():
    assert translate(["chest_pain", "Chest Pain", "chest-pain"]).symptoms == ("chest_pain",)
    assert translate(["blue_lips"]).symptoms == ("blue_lips",)


def test_unknown_ids_are_reported_not_silently_dropped():
    t = translate(["CHEST_PAIN", "TELEPORTATION", "teleportation", " "])
    assert t.symptoms == ("chest_pain",) and t.unmapped == ("TELEPORTATION", "teleportation")


def test_an_unknown_id_never_lowers_a_severity():
    assert app_decision(["ZZZ", "CHEST_PAIN", "ALSO_UNKNOWN"]).severity == E


def test_duplicates_are_removed_and_order_is_kept():
    assert translate(["SHORT_BREATH", "SEVERE_SHORT_BREATH", "SWEATING"]).symptoms == ("breathlessness", "sweating")


@pytest.mark.parametrize("bad", [None, [], "", 5, [None, 7, ""], ()])
def test_odd_input_never_crashes(bad):
    t = translate(bad)
    assert t.symptoms == () and t.unmapped == ()


def test_a_single_string_is_treated_as_one_symptom():
    assert translate("CHEST_PAIN").symptoms == ("chest_pain",)


@pytest.mark.parametrize("source", sorted(CHECKIN_SOURCES))
def test_check_in_sources_add_the_no_reply_symptom(source):
    t = translate([], source)
    assert t.symptoms == (CHECKIN_SYMPTOM,)
    assert app_decision([], source).severity == E and app_decision([], source).type == UNKNOWN


@pytest.mark.parametrize("source", [None, "MANUAL", "manual", "SOMETHING_ELSE"])
def test_other_sources_do_not_add_it(source):
    assert CHECKIN_SYMPTOM not in translate(["CHEST_PAIN"], source).symptoms
    assert app_decision([], source).severity == N


def test_the_check_in_symptom_is_added_once():
    assert translate([CHECKIN_SYMPTOM], "FALL_CHECK").symptoms == (CHECKIN_SYMPTOM,)
