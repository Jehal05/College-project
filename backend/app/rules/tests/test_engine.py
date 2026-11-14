"""Tests for the rule-based emergency engine (features 4 and 20)."""
import itertools

import pytest
import yaml

from app.models.enums import SEVERITY_ACTIONS, SEVERITY_RANK, EmergencyType, Severity
from app.rules.engine import (
    RulesError,
    evaluate,
    load_rules,
    RULES_PATH,
)

E, U, W, N = Severity.EMERGENCY, Severity.URGENT, Severity.WATCH, Severity.NONE
HEART, STROKE, DIABETIC, ASTHMA = (
    EmergencyType.HEART, EmergencyType.STROKE, EmergencyType.DIABETIC, EmergencyType.ASTHMA,
)
NORMAL = {"heart_rate": 72, "spo2": 98, "bp_sys": 120, "bp_dia": 80, "glucose": 100, "resp_rate": 16}


# ------------------------------------------------------------ chest pain: always EMERGENCY

def test_chest_pain_alone_is_emergency():
    d = evaluate(["chest_pain"])
    assert d.severity == E and d.type == HEART


def test_chest_pain_with_normal_vitals_is_emergency():
    assert evaluate(["chest_pain"], NORMAL).severity == E


@pytest.mark.parametrize("extra", [
    ["breathlessness"], ["sweating"], ["left_arm_pain"], ["wheeze"], ["confusion", "low_glucose"],
])
def test_chest_pain_with_other_symptoms_is_still_emergency(extra):
    assert evaluate(["chest_pain", *extra]).severity == E


@pytest.mark.parametrize("spelling", ["Chest Pain", "chest-pain", " CHEST_PAIN ", "chest pain"])
def test_chest_pain_spelling_variants(spelling):
    assert evaluate([spelling]).severity == E


def test_safety_floor_works_when_rule_list_is_empty():
    d = evaluate(["chest_pain"], rules=[])
    assert d.severity == E and d.type == HEART
    assert d.rule_ids == ["SAFETY_FLOOR_CHEST_PAIN"]


def test_safety_floor_works_when_yaml_lacks_chest_pain_rule():
    rules = [r for r in load_rules() if r.id != "HEART_CHEST_PAIN"]
    assert evaluate(["chest_pain"], rules=rules).severity == E


# ------------------------------------------------------------ stroke

@pytest.mark.parametrize("symptom", ["face_drooping", "arm_weakness", "slurred_speech"])
def test_each_stroke_sign_is_emergency(symptom):
    d = evaluate([symptom])
    assert d.severity == E and d.type == STROKE


def test_stroke_trio_is_emergency():
    d = evaluate(["face_drooping", "arm_weakness", "slurred_speech"])
    assert d.severity == E and d.type == STROKE and len(d.reasons) == 3


# ------------------------------------------------------------ diabetic

def test_low_glucose_reading_with_confusion_is_emergency():
    d = evaluate(["confusion"], {"glucose": 55})
    assert d.severity == E and d.type == DIABETIC


def test_low_glucose_reading_with_sweating_is_emergency():
    d = evaluate(["sweating"], {"glucose": 60})
    assert d.severity == E and d.type == DIABETIC


def test_low_glucose_reported_with_confusion_is_emergency():
    d = evaluate(["low_glucose", "confusion"])
    assert d.severity == E and d.type == DIABETIC


def test_low_glucose_reading_alone_is_urgent():
    d = evaluate(None, {"glucose": 60})
    assert d.severity == U and d.type == DIABETIC


def test_confusion_alone_is_urgent_with_glucose_check_reason():
    d = evaluate(["confusion"])
    assert d.severity == U and "glucose" in d.reasons[0].lower()


# ------------------------------------------------------------ asthma

def test_low_spo2_with_wheeze_is_emergency():
    d = evaluate(["wheeze"], {"spo2": 88})
    assert d.severity == E and d.type == ASTHMA


def test_wheeze_with_breathlessness_is_emergency():
    d = evaluate(["wheeze", "breathlessness"])
    assert d.severity == E and d.type == ASTHMA


def test_wheeze_alone_is_urgent():
    d = evaluate(["wheeze"])
    assert d.severity == U and d.type == ASTHMA


def test_breathlessness_alone_is_urgent():
    assert evaluate(["breathlessness"]).severity == U


# ------------------------------------------------------------ heart combinations

def test_arm_pain_with_sweating_is_emergency():
    d = evaluate(["left_arm_pain", "sweating"])
    assert d.severity == E and d.type == HEART


def test_breathlessness_with_sweating_is_emergency():
    assert evaluate(["breathlessness", "sweating"]).severity == E


# ------------------------------------------------------------ vitals alone

@pytest.mark.parametrize("vitals, expected", [
    ({"heart_rate": 130}, U),
    ({"heart_rate": 40}, U),
    ({"heart_rate": 110}, W),
    ({"bp_sys": 190}, U),
    ({"bp_sys": 85}, U),
    ({"bp_sys": 165}, W),
    ({"spo2": 90}, U),
    ({"spo2": 93}, W),
    ({"glucose": 260}, W),
    ({"resp_rate": 26}, W),
])
def test_vitals_alone_give_urgent_or_watch(vitals, expected):
    assert evaluate(None, vitals).severity == expected


def test_normal_vitals_give_none():
    assert evaluate(None, NORMAL).severity == N


def test_extreme_vitals_alone_never_reach_emergency():
    """Emergency level needs a reported symptom. Flagged for doctor review."""
    extreme = {"spo2": 50, "heart_rate": 200, "bp_sys": 300, "glucose": 20, "resp_rate": 60}
    assert evaluate(None, extreme).severity == U


# ------------------------------------------------------------ empty and odd input

def test_empty_input_is_none():
    d = evaluate()
    assert d.severity == N and d.type is None and d.rule_ids == []


@pytest.mark.parametrize("symptoms, vitals", [
    (None, None), ([], {}), ("", None), (None, "not a dict"), ([None, 5, ""], {"x": None}),
])
def test_empty_or_wrong_type_input_does_not_crash(symptoms, vitals):
    assert evaluate(symptoms, vitals).severity == N


def test_unknown_symptoms_never_crash_and_give_none():
    assert evaluate(["headache_on_tuesdays", "zzz"]).severity == N


def test_unknown_symptom_does_not_hide_chest_pain():
    assert evaluate(["zzz", "chest_pain"]).severity == E


def test_non_numeric_vitals_are_ignored():
    assert evaluate(None, {"spo2": "abc", "heart_rate": None, "glucose": True}).severity == N


def test_numeric_string_vitals_are_accepted():
    assert evaluate(None, {"heart_rate": "130"}).severity == U


def test_duplicate_symptoms_are_harmless():
    assert evaluate(["chest_pain", "chest_pain"]).severity == E


# ------------------------------------------------------------ severity never goes down

ALL_SYMPTOMS = [
    "chest_pain", "breathlessness", "sweating", "left_arm_pain", "face_drooping",
    "arm_weakness", "slurred_speech", "confusion", "wheeze", "low_glucose",
]
VITAL_CASES = [None, {"spo2": 88}, {"glucose": 60}, {"heart_rate": 130}, NORMAL]


def test_adding_a_symptom_never_lowers_severity_exhaustive():
    for vitals in VITAL_CASES:
        for size in range(len(ALL_SYMPTOMS) + 1):
            for base in itertools.combinations(ALL_SYMPTOMS, size):
                base_rank = SEVERITY_RANK[evaluate(list(base), vitals).severity]
                for extra in ALL_SYMPTOMS:
                    if extra in base:
                        continue
                    new_rank = SEVERITY_RANK[evaluate([*base, extra], vitals).severity]
                    assert new_rank >= base_rank, (base, extra, vitals)


def test_adding_vitals_never_lowers_severity():
    for size in range(len(ALL_SYMPTOMS) + 1):
        for base in itertools.combinations(ALL_SYMPTOMS, size):
            base_rank = SEVERITY_RANK[evaluate(list(base)).severity]
            for vitals in VITAL_CASES:
                assert SEVERITY_RANK[evaluate(list(base), vitals).severity] >= base_rank


def test_normal_vitals_do_not_calm_down_a_red_flag():
    assert evaluate(["chest_pain"], NORMAL).severity == evaluate(["chest_pain"]).severity == E


# ------------------------------------------------------------ output shape and action map

def test_decision_to_dict_shape():
    out = evaluate(["chest_pain"]).to_dict()
    assert set(out) == {"type", "severity", "reasons", "action", "rule_ids", "review_status"}
    assert out["type"] == "HEART" and out["severity"] == "EMERGENCY"
    assert out["review_status"] == "pending doctor review"


def test_reasons_present_for_every_flagged_result():
    for combo in (["chest_pain"], ["wheeze"], ["confusion"]):
        assert evaluate(combo).reasons


def test_none_result_states_it_does_not_rule_out_a_condition():
    assert "does not rule out" in evaluate().reasons[0]


def test_every_severity_has_an_action():
    assert set(SEVERITY_ACTIONS) == set(Severity)


@pytest.mark.parametrize("severity, action", [
    (E, "alert_hospital_now"), (U, "prompt_symptom_check"), (W, "log_only"), (N, "no_action"),
])
def test_action_map_values(severity, action):
    assert SEVERITY_ACTIONS[severity]["action"] == action


def test_decision_action_matches_severity():
    assert evaluate(["chest_pain"]).action == "alert_hospital_now"
    assert evaluate(["wheeze"]).action == "prompt_symptom_check"
    assert evaluate().action == "no_action"


# ------------------------------------------------------------ the YAML file itself

def test_every_rule_is_marked_pending_doctor_review():
    rules = load_rules()
    assert rules and all(r.review_status == "pending doctor review" for r in rules)


def test_rule_ids_are_unique_and_every_emergency_type_is_covered():
    rules = load_rules()
    assert len({r.id for r in rules}) == len(rules)
    assert {r.type for r in rules} == set(EmergencyType)


def test_yaml_contains_chest_pain_emergency_rule():
    assert any(
        r.id == "HEART_CHEST_PAIN" and r.severity == E and r.all_symptoms == {"chest_pain"}
        for r in load_rules()
    )


def _write(tmp_path, rules):
    path = tmp_path / "bad.yaml"
    path.write_text(yaml.safe_dump({"rules": rules}))
    return path


def test_rule_without_conditions_is_rejected(tmp_path):
    bad = [{"id": "X", "type": "HEART", "severity": "URGENT", "reason": "r", "when": {}}]
    with pytest.raises(RulesError):
        load_rules(_write(tmp_path, bad))


def test_unknown_operator_is_rejected(tmp_path):
    bad = [{"id": "X", "type": "HEART", "severity": "URGENT", "reason": "r",
            "when": {"vitals": {"spo2": {"approx": 5}}}}]
    with pytest.raises(RulesError):
        load_rules(_write(tmp_path, bad))


def test_none_severity_inside_a_rule_is_rejected(tmp_path):
    bad = [{"id": "X", "type": "HEART", "severity": "NONE", "reason": "r",
            "when": {"all_symptoms": ["chest_pain"]}}]
    with pytest.raises(RulesError):
        load_rules(_write(tmp_path, bad))


def test_duplicate_rule_ids_are_rejected(tmp_path):
    rule = {"id": "X", "type": "HEART", "severity": "URGENT", "reason": "r",
            "when": {"all_symptoms": ["chest_pain"]}}
    with pytest.raises(RulesError):
        load_rules(_write(tmp_path, [rule, dict(rule)]))
