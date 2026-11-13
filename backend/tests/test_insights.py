"""Sleep, activity and stress insights (feature 54)."""
import ast
import inspect
import json
import re
from datetime import date

import numpy as np
import pytest

from app.models.enums import Severity
from app.rules.engine import evaluate
from app.services import insights
from app.services.insights import (
    activity_band, compute_insights, insights_response, sleep_band, stress_band, stress_index,
)
from app.services.wording import find_banned
from app.sim.history import SAMPLES_PER_DAY, History, generate_history

REF = date(2026, 11, 16)
PATIENTS = [f"pat_{i:03d}" for i in range(60)]


def hist(pid="pat_001", **kw):
    return generate_history(pid, reference_date=REF, **kw)


# ------------------------------------------------------------ repeatable

def test_same_seed_gives_the_same_result():
    assert compute_insights(hist()) == compute_insights(hist())


def test_result_is_json_safe_with_no_nan():
    text = json.dumps(compute_insights(hist()), allow_nan=False)
    assert "NaN" not in text


# ------------------------------------------------------------ stress reacts to the data

def test_calm_typical_and_stressed_give_different_stress_bands():
    bands = {p: compute_insights(hist(profile=p))["stress"]["band"] for p in ("calm", "typical", "stressed")}
    assert bands == {"calm": "lower", "typical": "typical", "stressed": "higher"}


def test_stress_index_orders_calm_below_typical_below_stressed():
    idx = {p: compute_insights(hist(profile=p))["stress"]["index"] for p in ("calm", "typical", "stressed")}
    assert idx["calm"] < idx["typical"] < idx["stressed"]


@pytest.mark.parametrize("profile, expected", [("typical", "typical"), ("calm", "lower"), ("stressed", "higher")])
def test_stress_band_is_stable_across_many_patients(profile, expected):
    for pid in PATIENTS:
        assert compute_insights(hist(pid, profile=profile))["stress"]["band"] == expected, pid


# ------------------------------------------------------------ plausible numbers

def test_sleep_estimate_is_close_to_the_true_sleep_across_patients():
    for pid in PATIENTS:
        h = hist(pid)
        result = insights.estimate_sleep(h)
        truth = float(np.mean(h.true_sleep_minutes[1:h.days])) / 60       # the nights the estimator used
        assert result["status"] == "ok" and result["nights_used"] == 6
        assert 4 <= result["avg_hours"] <= 10
        assert abs(result["avg_hours"] - truth) <= 0.6, (pid, result["avg_hours"], truth)


def test_activity_numbers_are_plausible():
    for pid in PATIENTS:
        r = insights.estimate_activity(hist(pid))
        assert r["status"] == "ok" and r["days_used"] == 7
        assert 3000 <= r["avg_steps_per_day"] <= 16000, pid
        assert 5 <= r["avg_active_minutes_per_day"] <= 240, pid


def test_all_bands_are_valid_names():
    for pid in PATIENTS:
        r = compute_insights(hist(pid))
        assert r["sleep"]["band"] in {"shorter", "typical", "longer"}
        assert r["activity"]["band"] in {"lower", "typical", "higher"}
        assert r["stress"]["band"] in {"lower", "typical", "higher"}


@pytest.mark.parametrize("hours, band", [(4.0, "shorter"), (5.9, "shorter"), (6.0, "typical"), (9.0, "typical"), (9.1, "longer")])
def test_sleep_band_edges(hours, band):
    assert sleep_band(hours) == band


@pytest.mark.parametrize("steps, band", [(0, "lower"), (3999, "lower"), (4000, "typical"), (9999, "typical"), (10000, "higher")])
def test_activity_band_edges(steps, band):
    assert activity_band(steps) == band


@pytest.mark.parametrize("index, band", [(0, "lower"), (34, "lower"), (35, "typical"), (65, "typical"), (66, "higher"), (100, "higher")])
def test_stress_band_edges(index, band):
    assert stress_band(index) == band


def test_stress_index_formula():
    assert stress_index(50, 50) == 50
    assert stress_index(50, 25) == 100
    assert stress_index(50, 100) == 0          # clamped
    assert stress_index(50, 5000) == 0 and stress_index(50, 0.0001) == 100


# ------------------------------------------------------------ not enough data

def test_no_data_gives_a_clear_not_enough_data_answer():
    r = compute_insights(History.empty("pat_001"))
    for part in ("sleep", "activity", "stress"):
        assert r[part]["status"] == "not_enough_data" and r[part]["band"] is None
        assert r[part]["message"].startswith("Not enough data")
    assert r["period_days"] == 0 and "not enough data" in r["summary"]


def test_two_days_are_not_enough():
    r = compute_insights(hist().first_days(2))
    assert [r[p]["status"] for p in ("sleep", "activity", "stress")] == ["not_enough_data"] * 3


def test_stress_needs_three_baseline_days():
    assert compute_insights(hist().first_days(4))["stress"]["status"] == "not_enough_data"   # baseline 2 days
    assert compute_insights(hist().first_days(5))["stress"]["status"] == "ok"                # baseline 3 days


def test_gaps_in_the_data_do_not_crash_and_are_skipped():
    h = hist().with_missing(2 * SAMPLES_PER_DAY, 3 * SAMPLES_PER_DAY)          # day 2 is gone
    r = compute_insights(h)
    assert r["activity"]["days_used"] == 6 and r["activity"]["status"] == "ok"
    json.dumps(r, allow_nan=False)


def test_all_data_missing_does_not_crash():
    h = hist().with_missing(0, 7 * SAMPLES_PER_DAY)
    r = compute_insights(h)
    assert all(r[p]["status"] == "not_enough_data" for p in ("sleep", "activity", "stress"))


def test_a_night_with_too_little_data_is_skipped():
    h = hist().with_missing(1 * SAMPLES_PER_DAY + 230, 2 * SAMPLES_PER_DAY + 100)
    r = insights.estimate_sleep(h)
    assert r["nights_used"] < 6 and r["status"] == "ok"


def test_partial_data_gives_a_partial_summary():
    h = hist().first_days(3)
    r = compute_insights(h)
    assert r["activity"]["status"] == "ok" and r["stress"]["status"] == "not_enough_data"
    assert "not enough variability data yet" in r["summary"]


# ------------------------------------------------------------ wording and safety

def test_every_sentence_in_every_result_passes_the_banned_word_scan():
    for pid in PATIENTS[:20]:
        for profile in ("typical", "calm", "stressed"):
            r = insights_response(pid, hist(pid, profile=profile))
            for text in (r["summary"], r["sleep"]["message"], r["activity"]["message"], r["stress"]["message"],
                         r["wording_review"], r["data_note"]):
                assert find_banned(text) == [], text


def walk(value):
    """Every key and every string value in a nested result."""
    if isinstance(value, dict):
        for k, v in value.items():
            yield str(k)
            yield from walk(v)
    elif isinstance(value, (list, tuple)):
        for v in value:
            yield from walk(v)
    elif isinstance(value, str):
        yield value


def test_response_has_no_severity_or_alert_anywhere():
    forbidden = {"severity", "emergency", "urgent", "watch", "alert", "notify", "dispatch", "dispatched"}
    for profile in ("typical", "calm", "stressed"):
        words = set(re.findall(r"[a-z]+", " ".join(walk(insights_response("pat_001", hist(profile=profile)))).lower()))
        assert not (words & forbidden), words & forbidden


def test_response_fields_are_exactly_the_contract_fields():
    r = insights_response("pat_001", hist())
    assert set(r) == {"patient_id", "period_days", "sleep", "activity", "stress", "summary",
                      "wording_review", "data_note", "simulated"}
    assert r["wording_review"] == "pending doctor review"
    assert r["data_note"] == "based on simulated wearable data, not a diagnosis"
    assert r["simulated"] is True and r["patient_id"] == "pat_001" and r["period_days"] == 7


CASES = [
    (["chest_pain"], None), (None, {"heart_rate": 130}), (["wheeze"], {"spo2": 88}),
    (["face_drooping"], None), (None, {"glucose": 55}), (None, None),
]


@pytest.mark.parametrize("symptoms, vitals", CASES)
def test_the_rules_engine_gives_the_same_answer_with_or_without_insights(symptoms, vitals):
    before = evaluate(symptoms, vitals).to_dict()
    for profile in ("typical", "calm", "stressed"):
        compute_insights(hist(profile=profile))
    assert evaluate(symptoms, vitals).to_dict() == before


def test_chest_pain_is_still_an_emergency_whatever_the_insights_say():
    for profile in ("calm", "typical", "stressed"):
        compute_insights(hist(profile=profile))
        assert evaluate(["chest_pain"]).severity == Severity.EMERGENCY


def _code_facts(module):
    """Imported module names and every identifier used in a module's code (comments and docstrings ignored)."""
    tree = ast.parse(inspect.getsource(module))
    imports, names = set(), set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imports.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            imports.add(node.module)
        elif isinstance(node, ast.Name):
            names.add(node.id)
        elif isinstance(node, ast.Attribute):
            names.add(node.attr)
    return imports, names


def test_the_insights_code_is_separate_from_the_rules_engine_and_notifications():
    """It may only import numpy, typing, the fixed wording and the synthetic history."""
    from app.services import wording
    allowed = {"numpy", "typing", "re", "app.services", "app.services.wording", "app.sim.history"}
    for module in (insights, wording):
        imports, names = _code_facts(module)
        assert imports <= allowed, imports - allowed
        for forbidden in ("Severity", "evaluate", "notify", "broadcast", "dispatch", "alert_hospital", "EmergencyType"):
            assert forbidden not in names, forbidden
