"""Scores one person with a stored logistic-regression model. Standard library only.

The model file (app/ml/models/<name>.json) holds, for each input, its training mean, standard deviation and
coefficient, plus the intercept, the threshold and the accepted range. The score is
    risk = 1 / (1 + exp(-(intercept + sum(coef * (value - mean) / std))))
which is the same arithmetic as the trained model, so a viva can follow it with a calculator.
Errors name FIELDS only. They never contain the values sent.
"""
import json
import math
import os
from typing import Any, Dict, List, Optional

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
MODEL_NAMES = ("heart", "diabetes")
LIMITS_TEXT = ("A small public dataset, not checked on Indian patients and not clinically validated. "
               "An estimate for learning, not a diagnosis. A low score does not mean you are well.")
NOTICE = "Estimate, not a diagnosis. In an emergency call 112."
SYNTHETIC_NOTICE = "PRACTICE MODEL trained on invented data. The number means nothing about a real person."


class ModelError(Exception):
    """The model file is missing or damaged (the server answers 503)."""


class InputProblem(Exception):
    """The inputs cannot be scored. `fields` are the NAMES of the fields at fault (never their values)."""

    def __init__(self, message: str, fields: List[str]) -> None:
        super().__init__(message)
        self.fields = fields


def _check_model(model: Any, name: str) -> Dict[str, Any]:
    try:
        assert isinstance(model, dict)
        for key in ("name", "version", "features", "intercept", "threshold", "bands", "metrics", "synthetic"):
            assert key in model
        assert model["features"], "no features"
        for f in model["features"]:
            for key in ("name", "mean", "std", "coef", "min", "max"):
                assert key in f
            assert float(f["std"]) > 0
            float(f["mean"]), float(f["coef"]), float(f["min"]), float(f["max"])
        float(model["intercept"]), float(model["threshold"])
        float(model["bands"]["low_below"]), float(model["bands"]["high_from"])
    except (AssertionError, KeyError, TypeError, ValueError):
        raise ModelError(f"model file '{name}' is damaged") from None
    return model


def load_model(name: str, directory: Optional[str] = None) -> Dict[str, Any]:
    """Only the two known names are accepted, so a name can never point at another file."""
    if name not in MODEL_NAMES:
        raise ModelError("unknown model")
    path = os.path.join(directory or MODELS_DIR, name + ".json")
    try:
        with open(path, encoding="utf-8") as fh:
            return _check_model(json.load(fh), name)
    except FileNotFoundError:
        raise ModelError(f"model file '{name}' is not installed") from None
    except (OSError, ValueError):
        raise ModelError(f"model file '{name}' cannot be read") from None


def feature_names(model: Dict[str, Any]) -> List[str]:
    return [f["name"] for f in model["features"]]


def _is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def _sigmoid(x: float) -> float:
    if x >= 0:
        return 1.0 / (1.0 + math.exp(-x))
    e = math.exp(x)
    return e / (1.0 + e)


def band_for(model: Dict[str, Any], risk: float) -> str:
    if risk >= float(model["bands"]["high_from"]):
        return "high"
    if risk < float(model["bands"]["low_below"]):
        return "low"
    return "medium"


def validate(model: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, float]:
    """Every input present, a real number, inside its range, and nothing unknown. Returns floats."""
    names = feature_names(model)
    unknown = sorted(k for k in inputs if k not in names)
    if unknown:
        raise InputProblem("unknown inputs: " + ", ".join(map(str, unknown)), unknown)
    missing = [n for n in names if n not in inputs or inputs[n] is None]
    if missing:
        raise InputProblem("missing inputs: " + ", ".join(missing), missing)
    not_numbers = [n for n in names if not _is_number(inputs[n])]
    if not_numbers:
        raise InputProblem("these inputs must be numbers: " + ", ".join(not_numbers), not_numbers)
    out_of_range = [f["name"] for f in model["features"] if not float(f["min"]) <= inputs[f["name"]] <= float(f["max"])]
    if out_of_range:
        raise InputProblem("these inputs are outside the accepted range: " + ", ".join(out_of_range), out_of_range)
    return {n: float(inputs[n]) for n in names}


def score(model: Dict[str, Any], inputs: Dict[str, Any]) -> Dict[str, Any]:
    values = validate(model, inputs)
    parts = []                                            # (feature, coef * standardised value) in log-odds
    total = float(model["intercept"])
    for f in model["features"]:
        part = float(f["coef"]) * (values[f["name"]] - float(f["mean"])) / float(f["std"])
        parts.append((f["name"], part))
        total += part
    risk = _sigmoid(total)
    factors = []
    for name, part in parts:
        # the change in RISK if this input sat at the training average instead: same units as `risk`
        change = risk - _sigmoid(total - part)
        factors.append({"feature": name, "direction": "raises" if part > 0 else "lowers",
                        "contribution": round(change, 4), "log_odds": round(part, 4)})
    factors.sort(key=lambda item: abs(item["log_odds"]), reverse=True)
    synthetic = bool(model["synthetic"])
    return {
        "risk": round(risk, 4),
        "band": band_for(model, risk),
        "top_factors": factors[:5],
        "model_card": {k: model.get(k) for k in ("name", "version", "dataset", "dataset_source", "trained_on", "metrics",
                                                  "confusion_matrix", "threshold", "synthetic")},
        "limits": LIMITS_TEXT,
        "notice": (SYNTHETIC_NOTICE + " " if synthetic else "") + NOTICE,
        "simulated": True,
    }


# ------------------------------------------------------------------------------------------------------- what if
HYPOTHETICAL_NOTICE = "Hypothetical. Not a prediction of what will happen."
NOT_ADDITIVE_NOTE = ("These models are logistic: the effect of one change depends on the other inputs, so the "
                     "single-change numbers do not add up to the total. `interaction` is the part that does not add up.")


def _only(model: Dict[str, Any], current: Dict[str, float], name: str, new_value: float) -> float:
    return score(model, {**current, name: new_value})["risk"]


def what_if(model: Dict[str, Any], inputs: Dict[str, Any], scenario: Dict[str, Any]) -> Dict[str, Any]:
    """Scores `inputs` as they are, then again with `scenario` laid over them. Nothing is invented:
    only the model's own inputs can change, with its own accepted range. Errors name FIELDS only."""
    base = validate(model, inputs)                                   # a problem here is a problem with the real inputs
    if not isinstance(scenario, dict) or not scenario:
        raise InputProblem("the scenario must name at least one input to change", ["scenario"])
    names = feature_names(model)
    unknown = sorted(str(k) for k in scenario if k not in names)
    if unknown:
        raise InputProblem("unknown scenario inputs (only model inputs can change): " + ", ".join(unknown), unknown)
    bad = [n for n in names if n in scenario and not _is_number(scenario[n])]
    if bad:
        raise InputProblem("these scenario inputs must be numbers: " + ", ".join(bad), bad)
    ranges = {f["name"]: (float(f["min"]), float(f["max"])) for f in model["features"]}
    outside = [n for n in names if n in scenario and not ranges[n][0] <= scenario[n] <= ranges[n][1]]
    if outside:
        raise InputProblem("these scenario inputs are outside the accepted range: " + ", ".join(outside), outside)
    changes = [n for n in names if n in scenario and float(scenario[n]) != base[n]]
    if not changes:
        raise InputProblem("the scenario does not change any input", sorted(scenario))
    after = {**base, **{n: float(scenario[n]) for n in changes}}
    now, then = score(model, base), score(model, after)
    changed = []
    for n in changes:
        alone = _only(model, base, n, after[n])
        changed.append({"feature": n, "from": base[n], "to": after[n], "risk_if_only_this_changes": alone,
                        "change": round(alone - now["risk"], 4)})
    difference = round(then["risk"] - now["risk"], 4)
    interaction = round(difference - sum(c["change"] for c in changed), 4)
    synthetic = bool(model["synthetic"])
    return {
        "current": {"risk": now["risk"], "band": now["band"]},
        "scenario": {"risk": then["risk"], "band": then["band"]},
        "difference": difference,
        "changed_inputs": changed,
        "interaction": interaction,
        "note": NOT_ADDITIVE_NOTE,
        "notice": HYPOTHETICAL_NOTICE + (" " + SYNTHETIC_NOTICE if synthetic else ""),
        "limits": LIMITS_TEXT,
        "model_card": now["model_card"],
        "simulated": True,
    }
