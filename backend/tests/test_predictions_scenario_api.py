"""POST /predictions/{model} with a `scenario` (Phase 3 what-if). Without one, the Phase 2 answer is unchanged."""
import pytest
from sqlalchemy.orm import Session

from app.models.audit import AuditLog

PATIENT = ("patient@demo.test", "demo1234")
STAFF = ("staff@demo.test", "demo1234")
FULL = {
    "heart": {"resting_bp": 138, "cholesterol": 240, "fasting_blood_sugar": 0, "max_heart_rate": 150,
              "exercise_angina": 0, "st_depression": 1.0},
    "diabetes": {"pregnancies": 1, "glucose": 128, "blood_pressure": 74, "skin_thickness": 29, "insulin": 120,
                 "bmi": 31.0, "diabetes_pedigree": 0.5},
}
CHANGE = {"heart": {"resting_bp": 120, "cholesterol": 200}, "diabetes": {"glucose": 100, "bmi": 27.0}}


def call(demo, model, body, who=PATIENT):
    return demo.post(f"/predictions/{model}", json=body, headers=demo.headers(*who))


@pytest.fixture(params=["heart", "diabetes"])
def condition(request):
    return request.param


def test_a_scenario_gives_current_scenario_and_the_difference(demo, condition):
    r = call(demo, condition, {"inputs": FULL[condition], "scenario": CHANGE[condition]})
    assert r.status_code == 200
    body = r.json()
    assert body["model"] == condition and body["simulated"] is True
    assert set(body["current"]) == {"risk", "band"} and set(body["scenario"]) == {"risk", "band"}
    assert body["difference"] == pytest.approx(body["scenario"]["risk"] - body["current"]["risk"], abs=2e-4)
    assert {c["feature"] for c in body["changed_inputs"]} == set(CHANGE[condition])
    for c in body["changed_inputs"]:
        assert set(c) == {"feature", "from", "to", "risk_if_only_this_changes", "change"}
        assert c["to"] == CHANGE[condition][c["feature"]] and c["from"] == FULL[condition][c["feature"]]
    assert "interaction" in body and "not add up" in body["note"]
    assert body["notice"].startswith("Hypothetical. Not a prediction of what will happen.") and body["limits"]


def test_the_current_part_equals_the_plain_score(demo, condition):
    plain = call(demo, condition, {"inputs": FULL[condition]}).json()
    what_if = call(demo, condition, {"inputs": FULL[condition], "scenario": CHANGE[condition]}).json()
    assert what_if["current"] == {"risk": plain["risk"], "band": plain["band"]}


def test_age_comes_from_the_record_as_before_and_can_be_changed_by_the_scenario(demo):
    out = call(demo, "heart", {"inputs": FULL["heart"], "scenario": {"age": 40}}).json()
    assert out["changed_inputs"][0]["feature"] == "age" and out["changed_inputs"][0]["to"] == 40


def test_without_a_scenario_the_answer_is_the_phase_2_answer(demo, condition):
    body = call(demo, condition, {"inputs": FULL[condition]}).json()
    assert {"risk", "band", "top_factors"} <= set(body) and "scenario" not in body and "current" not in body
    assert call(demo, condition, {"inputs": FULL[condition], "scenario": None}).json()["risk"] == body["risk"]


@pytest.mark.parametrize("scenario,field", [
    ({"exercise": 3}, "exercise"), ({"smoking": 1}, "smoking"), ({"sleep": 8}, "sleep"), ({"diet": 1}, "diet"),
    ({"resting_bp": "high"}, "resting_bp"), ({"resting_bp": True}, "resting_bp"), ({"resting_bp": 99999}, "resting_bp"),
    ({"resting_bp": -1}, "resting_bp"),
])
def test_a_bad_scenario_is_a_400_naming_the_field_not_the_value(demo, scenario, field):
    r = call(demo, "heart", {"inputs": FULL["heart"], "scenario": scenario})
    assert r.status_code == 400 and field in r.json()["error"] and r.json()["error"] == r.json()["detail"]
    assert "99999" not in r.text


@pytest.mark.parametrize("scenario", [{}, {"resting_bp": 138}, {"resting_bp": 138.0, "cholesterol": 240}])
def test_a_scenario_that_changes_nothing_is_a_400(demo, scenario):
    r = call(demo, "heart", {"inputs": FULL["heart"], "scenario": scenario})
    assert r.status_code == 400 and "change" in r.json()["error"]


@pytest.mark.parametrize("scenario", ["resting_bp=120", [1, 2], 5])
def test_a_scenario_that_is_not_an_object_is_a_400(demo, scenario):
    assert call(demo, "heart", {"inputs": FULL["heart"], "scenario": scenario}).status_code == 400


def test_missing_real_inputs_still_come_first(demo):
    r = call(demo, "heart", {"scenario": {"resting_bp": 120}})
    assert r.status_code == 400 and "resting_bp" in r.json()["error"] and "missing" in r.json()["error"]


def test_who_may_call_is_unchanged(demo):
    body = {"inputs": FULL["heart"], "scenario": CHANGE["heart"]}
    assert call(demo, "heart", body, STAFF).status_code == 403
    assert demo.post("/predictions/heart", json=body).status_code == 401
    assert call(demo, "heart", {**body, "patient_id": "PT-2026-0002"}).status_code == 403


def test_a_what_if_is_audited_like_a_score_without_values(demo, engine):
    assert call(demo, "heart", {"inputs": FULL["heart"], "scenario": CHANGE["heart"]}).status_code == 200
    with Session(engine) as s:
        row = s.query(AuditLog).filter(AuditLog.action == "prediction.run", AuditLog.outcome == "allowed").one()
        released = row.fields_released
    assert "resting_bp" in released and "138" not in released and "120" not in released
