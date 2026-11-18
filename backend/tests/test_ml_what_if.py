"""What-if scoring (Phase 3): predict.what_if. Pure standard library; the expected numbers are computed here
from the model file with separate arithmetic, not by calling the scoring code."""
import json
import math
import os

import pytest

from app.ml import predict

BASE = {
    "heart": {"age": 58, "sex": 1, "resting_bp": 138, "cholesterol": 240, "fasting_blood_sugar": 0,
              "max_heart_rate": 150, "exercise_angina": 0, "st_depression": 1.0},
    "diabetes": {"pregnancies": 1, "age": 45, "glucose": 128, "blood_pressure": 74, "skin_thickness": 29,
                 "insulin": 120, "bmi": 31.0, "diabetes_pedigree": 0.5},
}
CHANGE = {"heart": {"resting_bp": 120, "cholesterol": 200}, "diabetes": {"glucose": 100, "bmi": 27.0}}


def raw_model(name):
    with open(os.path.join(predict.MODELS_DIR, name + ".json"), encoding="utf-8") as fh:
        return json.load(fh)


def risk_by_hand(model, values):
    z = model["intercept"] + sum(f["coef"] * (values[f["name"]] - f["mean"]) / f["std"] for f in model["features"])
    return 1 / (1 + math.exp(-z))


@pytest.fixture(params=["heart", "diabetes"])
def name(request):
    return request.param


def test_the_deltas_match_independent_arithmetic(name):
    raw = raw_model(name)
    out = predict.what_if(predict.load_model(name), BASE[name], CHANGE[name])
    after = {**BASE[name], **CHANGE[name]}
    r0, r1 = risk_by_hand(raw, BASE[name]), risk_by_hand(raw, after)
    assert out["current"]["risk"] == pytest.approx(r0, abs=1e-4)
    assert out["scenario"]["risk"] == pytest.approx(r1, abs=1e-4)
    assert out["difference"] == pytest.approx(r1 - r0, abs=2e-4)
    for item in out["changed_inputs"]:
        alone = risk_by_hand(raw, {**BASE[name], item["feature"]: CHANGE[name][item["feature"]]})
        assert item["risk_if_only_this_changes"] == pytest.approx(alone, abs=1e-4)
        assert item["change"] == pytest.approx(alone - r0, abs=2e-4)
        assert item["from"] == BASE[name][item["feature"]] and item["to"] == CHANGE[name][item["feature"]]
    assert out["interaction"] == pytest.approx((r1 - r0) - sum(i["change"] for i in out["changed_inputs"]), abs=3e-4)


def test_the_answer_has_the_proposed_fields_and_words(name):
    out = predict.what_if(predict.load_model(name), BASE[name], CHANGE[name])
    assert set(out) >= {"current", "scenario", "difference", "changed_inputs", "interaction", "note", "notice", "limits",
                        "model_card", "simulated"}
    assert out["current"]["band"] in ("low", "medium", "high") and out["scenario"]["band"] in ("low", "medium", "high")
    assert out["notice"].startswith("Hypothetical. Not a prediction of what will happen.")
    assert "not add up" in out["note"] and out["simulated"] is True
    assert [i["feature"] for i in out["changed_inputs"]] == [n for n in predict.feature_names(predict.load_model(name)) if n in CHANGE[name]]


def test_only_the_inputs_that_really_change_are_listed(name):
    same_and_new = {**CHANGE[name], next(iter(BASE[name])): BASE[name][next(iter(BASE[name]))]}   # one value sent unchanged
    out = predict.what_if(predict.load_model(name), BASE[name], same_and_new)
    assert {i["feature"] for i in out["changed_inputs"]} == set(CHANGE[name])


def test_one_changed_input_has_no_interaction(name):
    feature = next(iter(CHANGE[name]))
    out = predict.what_if(predict.load_model(name), BASE[name], {feature: CHANGE[name][feature]})
    assert len(out["changed_inputs"]) == 1 and out["interaction"] == pytest.approx(0, abs=2e-4)
    assert out["difference"] == pytest.approx(out["changed_inputs"][0]["change"], abs=2e-4)


@pytest.mark.parametrize("scenario,field", [
    ({"shoe_size": 42}, "shoe_size"),                               # not a model input (exercise, smoking, sleep, diet are not either)
    ({"smoking": 1}, "smoking"), ({"exercise": 3}, "exercise"), ({"sleep": 8}, "sleep"), ({"diet": 1}, "diet"),
    ({"resting_bp": "high"}, "resting_bp"), ({"resting_bp": True}, "resting_bp"), ({"resting_bp": None}, "resting_bp"),
    ({"resting_bp": float("nan")}, "resting_bp"), ({"resting_bp": 99999}, "resting_bp"), ({"resting_bp": -5}, "resting_bp"),
])
def test_a_bad_scenario_input_is_refused_naming_the_field_not_the_value(scenario, field):
    with pytest.raises(predict.InputProblem) as caught:
        predict.what_if(predict.load_model("heart"), BASE["heart"], scenario)
    assert field in caught.value.fields and field in str(caught.value)
    assert "99999" not in str(caught.value) and "high" not in str(caught.value).replace("these", "")


@pytest.mark.parametrize("scenario", [{}, {"resting_bp": 138}, {"resting_bp": 138.0, "cholesterol": 240}])
def test_a_scenario_that_changes_nothing_is_refused(scenario):
    with pytest.raises(predict.InputProblem):
        predict.what_if(predict.load_model("heart"), BASE["heart"], scenario)


def test_the_real_inputs_are_checked_first():
    broken = {k: v for k, v in BASE["heart"].items() if k != "age"}
    with pytest.raises(predict.InputProblem) as caught:
        predict.what_if(predict.load_model("heart"), broken, {"resting_bp": 120})
    assert caught.value.fields == ["age"]


def test_the_scenario_never_changes_the_callers_dictionaries():
    inputs, scenario = dict(BASE["heart"]), dict(CHANGE["heart"])
    predict.what_if(predict.load_model("heart"), inputs, scenario)
    assert inputs == BASE["heart"] and scenario == CHANGE["heart"]


def test_the_notice_says_practice_model_while_the_shipped_models_are_synthetic():
    model = predict.load_model("heart")
    out = predict.what_if(model, BASE["heart"], CHANGE["heart"])
    assert ("PRACTICE MODEL" in out["notice"]) == bool(model["synthetic"])


def test_without_a_scenario_the_phase_2_answer_is_unchanged():
    out = predict.score(predict.load_model("heart"), BASE["heart"])
    assert {"risk", "band", "top_factors", "model_card", "limits", "notice", "simulated"} <= set(out)
    assert "current" not in out and "scenario" not in out
