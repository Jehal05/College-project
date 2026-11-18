"""The runtime scoring (app/ml/predict.py): plain arithmetic on a stored model file. No scikit-learn needed.

Uses small SYNTHETIC-trained model files kept in tests/fixtures/models, so these tests do not change when the real
model files replace the shipped ones.
"""
import copy
import json
import math
import os

import pytest

from app.ml import predict as p
from ml.features import SPECS, names

FIXTURES = os.path.join(os.path.dirname(__file__), "fixtures", "models")
SAMPLE = {
    "heart": {"age": 58, "sex": 1, "resting_bp": 140, "cholesterol": 250, "fasting_blood_sugar": 0,
              "max_heart_rate": 140, "exercise_angina": 1, "st_depression": 1.5},
    "diabetes": {"pregnancies": 2, "glucose": 140, "blood_pressure": 76, "skin_thickness": 30, "insulin": 130,
                 "bmi": 33.5, "diabetes_pedigree": 0.6, "age": 41},
}


@pytest.fixture(params=["heart", "diabetes"])
def condition(request):
    return request.param


@pytest.fixture
def model(condition):
    return p.load_model(condition, FIXTURES)


def test_the_stored_features_match_the_feature_specs(condition, model):
    assert p.feature_names(model) == names(SPECS[condition])
    assert model["synthetic"] is True


def test_the_score_is_the_plain_formula(condition, model):
    values = SAMPLE[condition]
    z = model["intercept"] + sum(f["coef"] * (values[f["name"]] - f["mean"]) / f["std"] for f in model["features"])
    expected = 1 / (1 + math.exp(-z))
    result = p.score(model, values)
    assert result["risk"] == pytest.approx(expected, abs=1e-4)
    assert 0 < result["risk"] < 1


def test_the_answer_has_the_contract_fields(condition, model):
    result = p.score(model, SAMPLE[condition])
    assert set(result) == {"risk", "band", "top_factors", "model_card", "limits", "notice", "simulated"}
    assert result["simulated"] is True and "112" in result["notice"] and "not a diagnosis" in result["notice"].lower()
    assert "PRACTICE MODEL" in result["notice"]                       # a synthetic model says so
    card = result["model_card"]
    assert card["name"] == model["name"] and card["synthetic"] is True and "recall" in card["metrics"]


def test_top_factors_are_three_to_five_ordered_and_signed(condition, model):
    factors = p.score(model, SAMPLE[condition])["top_factors"]
    assert 3 <= len(factors) <= 5
    sizes = [abs(f["log_odds"]) for f in factors]
    assert sizes == sorted(sizes, reverse=True)
    for f in factors:
        assert f["direction"] == ("raises" if f["log_odds"] > 0 else "lowers")
        assert (f["contribution"] > 0) == (f["log_odds"] > 0) or f["contribution"] == 0


def test_band_edges(model):
    low, high = model["bands"]["low_below"], model["bands"]["high_from"]
    assert p.band_for(model, high) == "high" and p.band_for(model, 0.999) == "high"
    assert p.band_for(model, high - 1e-6) == "medium" and p.band_for(model, low) == "medium"
    assert p.band_for(model, low - 1e-6) == "low" and p.band_for(model, 0.0) == "low"


def test_a_missing_input_names_the_field(condition, model):
    values = dict(SAMPLE[condition])
    gone = names(SPECS[condition])[2]
    del values[gone]
    with pytest.raises(p.InputProblem) as info:
        p.score(model, values)
    assert info.value.fields == [gone]


def test_none_counts_as_missing(condition, model):
    values = {**SAMPLE[condition], "age": None}
    with pytest.raises(p.InputProblem) as info:
        p.score(model, values)
    assert info.value.fields == ["age"]


@pytest.mark.parametrize("bad", ["54", "abc", True, False, float("nan"), float("inf"), [1], {"a": 1}])
def test_a_non_number_is_refused(condition, model, bad):
    with pytest.raises(p.InputProblem) as info:
        p.score(model, {**SAMPLE[condition], "age": bad})
    assert info.value.fields == ["age"]


def test_out_of_range_is_refused_without_echoing_the_value(condition, model):
    for secret in (9876543, -9876543):
        with pytest.raises(p.InputProblem) as info:
            p.score(model, {**SAMPLE[condition], "age": secret})
        assert info.value.fields == ["age"] and str(abs(secret)) not in str(info.value)


def test_an_unknown_input_is_refused(condition, model):
    with pytest.raises(p.InputProblem) as info:
        p.score(model, {**SAMPLE[condition], "shoe_size": 42})
    assert info.value.fields == ["shoe_size"]


def test_the_range_limits_themselves_are_accepted(condition, model):
    values = {f["name"]: f["min"] for f in model["features"]}
    assert 0 <= p.score(model, values)["risk"] <= 1
    values = {f["name"]: f["max"] for f in model["features"]}
    assert 0 <= p.score(model, values)["risk"] <= 1


# ---------------------------------------------------- the model file

def write(tmp_path, name, text):
    (tmp_path / (name + ".json")).write_text(text, encoding="utf-8")
    return str(tmp_path)


def test_a_missing_model_file_is_a_model_error(tmp_path):
    with pytest.raises(p.ModelError):
        p.load_model("heart", str(tmp_path))


def test_an_unreadable_model_file_is_a_model_error(tmp_path):
    with pytest.raises(p.ModelError):
        p.load_model("heart", write(tmp_path, "heart", "{not json"))


def test_a_damaged_model_file_is_a_model_error(condition, tmp_path):
    good = json.load(open(os.path.join(FIXTURES, condition + ".json"), encoding="utf-8"))
    for damage in (lambda m: m.pop("intercept"), lambda m: m["features"][0].update(std=0),
                   lambda m: m["features"][0].update(coef="x"), lambda m: m.update(features=[]),
                   lambda m: m["bands"].pop("high_from")):
        broken = copy.deepcopy(good)
        damage(broken)
        with pytest.raises(p.ModelError):
            p.load_model(condition, write(tmp_path, condition, json.dumps(broken)))


@pytest.mark.parametrize("name", ["../heart", "heart/../x", "other", "", "HEART", "heart.json"])
def test_only_the_two_known_names_load(name):
    with pytest.raises(p.ModelError):
        p.load_model(name, FIXTURES)


def test_the_shipped_model_files_load():
    for name in p.MODEL_NAMES:
        shipped = p.load_model(name)
        assert p.feature_names(shipped) == names(SPECS[name])
