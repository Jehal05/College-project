"""Rule-based emergency engine (features 4 and 20).

A pure function: symptoms and vitals in, decision out. No database, no
network, no machine learning. Clinician-style rules from rules.yaml decide.

Safety properties
1. Chest pain ALWAYS gives EMERGENCY. The YAML says so, and a hard-coded
   safety floor in this file repeats it in case the YAML is edited wrongly.
2. Severity never goes down when evidence is added. Rules only use positive
   conditions and the engine takes the highest severity of all matches.
3. Bad input never crashes the engine. Unknown symptoms and unusable vitals
   are ignored.
4. This is escalation support, not a diagnosis. NONE does not rule out
   any condition.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any, Iterable, Mapping, Optional

import yaml

from app.models.enums import (
    SEVERITY_ACTIONS,
    SEVERITY_RANK,
    EmergencyType,
    Severity,
)

RULES_PATH = Path(__file__).with_name("rules.yaml")
REVIEW_STATUS = "pending doctor review"

# If two matched rules have the same severity, the first type in this list wins.
TYPE_PRIORITY = [
    EmergencyType.HEART,
    EmergencyType.STROKE,
    EmergencyType.DIABETIC,
    EmergencyType.ASTHMA,
]

# Safety floor, independent of the YAML file.
SAFETY_FLOOR = {
    "chest_pain": (EmergencyType.HEART, "Chest pain is always treated as an emergency (safety floor)"),
}

_ALLOWED_OPS = {"lt", "lte", "gt", "gte"}


class RulesError(ValueError):
    """Raised when rules.yaml is malformed."""


@dataclass(frozen=True)
class Rule:
    id: str
    type: EmergencyType
    severity: Severity
    reason: str
    review_status: str
    all_symptoms: frozenset
    any_symptoms: frozenset
    vitals: tuple  # tuple of (vital_name, ((op, number), ...))


@dataclass(frozen=True)
class Decision:
    type: Optional[EmergencyType]
    severity: Severity
    reasons: list
    action: str
    rule_ids: list

    def to_dict(self) -> dict:
        return {
            "type": self.type.value if self.type else None,
            "severity": self.severity.value,
            "reasons": list(self.reasons),
            "action": self.action,
            "rule_ids": list(self.rule_ids),
            "review_status": REVIEW_STATUS,
        }


# ---------------------------------------------------------------- loading

def _parse_rule(raw: Mapping[str, Any]) -> Rule:
    try:
        rule_id = str(raw["id"])
        rtype = EmergencyType(raw["type"])
        severity = Severity(raw["severity"])
        reason = str(raw["reason"])
        when = raw["when"]
    except (KeyError, ValueError) as exc:
        raise RulesError(f"Bad rule {raw.get('id', '?')}: {exc}") from exc

    if severity == Severity.NONE:
        raise RulesError(f"Rule {rule_id}: severity NONE is not allowed in a rule")
    if not isinstance(when, Mapping):
        raise RulesError(f"Rule {rule_id}: 'when' must be a mapping")

    all_sym = frozenset(_norm_symptom(s) for s in when.get("all_symptoms", []) or [])
    any_sym = frozenset(_norm_symptom(s) for s in when.get("any_symptoms", []) or [])

    vitals = []
    for name, tests in (when.get("vitals") or {}).items():
        if not isinstance(tests, Mapping) or not tests:
            raise RulesError(f"Rule {rule_id}: vital '{name}' needs at least one test")
        ops = []
        for op, limit in tests.items():
            if op not in _ALLOWED_OPS:
                raise RulesError(f"Rule {rule_id}: unknown operator '{op}'")
            ops.append((op, float(limit)))
        vitals.append((str(name), tuple(ops)))

    if not (all_sym or any_sym or vitals):
        raise RulesError(f"Rule {rule_id}: has no conditions")

    return Rule(
        id=rule_id,
        type=rtype,
        severity=severity,
        reason=reason,
        review_status=str(raw.get("review_status", "")),
        all_symptoms=all_sym,
        any_symptoms=any_sym,
        vitals=tuple(vitals),
    )


def load_rules(path: Path | str = RULES_PATH) -> list:
    """Read and validate a rule table. Raises RulesError on bad content."""
    with open(path, "r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle) or {}
    raw_rules = data.get("rules")
    if not isinstance(raw_rules, list) or not raw_rules:
        raise RulesError("rules.yaml must contain a non-empty 'rules' list")
    rules = [_parse_rule(r) for r in raw_rules]
    ids = [r.id for r in rules]
    if len(ids) != len(set(ids)):
        raise RulesError("Rule ids must be unique")
    return rules


@lru_cache(maxsize=1)
def default_rules() -> tuple:
    return tuple(load_rules())


# ---------------------------------------------------------------- input cleaning

def _norm_symptom(value: Any) -> str:
    """'Chest Pain', 'chest-pain' and ' CHEST_PAIN ' all become 'chest_pain'."""
    return re.sub(r"[\s\-]+", "_", str(value).strip().lower())


def _clean_symptoms(symptoms: Optional[Iterable[Any]]) -> frozenset:
    if not symptoms:
        return frozenset()
    if isinstance(symptoms, str):
        symptoms = [symptoms]
    try:
        return frozenset(_norm_symptom(s) for s in symptoms if isinstance(s, str) and s.strip())
    except TypeError:
        return frozenset()


def _clean_vitals(vitals: Optional[Mapping[str, Any]]) -> dict:
    """Keep only numeric vitals. Anything else is ignored, never an error."""
    cleaned: dict = {}
    if not isinstance(vitals, Mapping):
        return cleaned
    for name, value in vitals.items():
        if isinstance(value, bool) or value is None:
            continue
        try:
            number = float(value)
        except (TypeError, ValueError):
            continue
        if number != number:  # NaN
            continue
        cleaned[_norm_symptom(name)] = number
    return cleaned


# ---------------------------------------------------------------- matching

def _vital_passes(value: float, ops: tuple) -> bool:
    for op, limit in ops:
        if op == "lt" and not value < limit:
            return False
        if op == "lte" and not value <= limit:
            return False
        if op == "gt" and not value > limit:
            return False
        if op == "gte" and not value >= limit:
            return False
    return True


def _rule_matches(rule: Rule, symptoms: frozenset, vitals: dict) -> bool:
    if not rule.all_symptoms <= symptoms:
        return False
    if rule.any_symptoms and not (rule.any_symptoms & symptoms):
        return False
    for name, ops in rule.vitals:
        if name not in vitals or not _vital_passes(vitals[name], ops):
            return False
    return True


# ---------------------------------------------------------------- main function

def evaluate(
    symptoms: Optional[Iterable[Any]] = None,
    vitals: Optional[Mapping[str, Any]] = None,
    rules: Optional[Iterable[Rule]] = None,
) -> Decision:
    """Decide emergency type and severity from symptoms and vitals.

    Pass `rules` only in tests. Normal code uses the table in rules.yaml.
    """
    rule_list = list(rules) if rules is not None else list(default_rules())
    clean_symptoms = _clean_symptoms(symptoms)
    clean_vitals = _clean_vitals(vitals)

    # Each match is (severity, type, rule_id, reason)
    matches = [
        (r.severity, r.type, r.id, r.reason)
        for r in rule_list
        if _rule_matches(r, clean_symptoms, clean_vitals)
    ]

    # Safety floor: applied even if the YAML is wrong or empty.
    for symptom, (floor_type, floor_reason) in SAFETY_FLOOR.items():
        if symptom in clean_symptoms:
            already = any(m[0] == Severity.EMERGENCY and m[1] == floor_type for m in matches)
            if not already:
                matches.append((Severity.EMERGENCY, floor_type, f"SAFETY_FLOOR_{symptom.upper()}", floor_reason))

    if not matches:
        return Decision(
            type=None,
            severity=Severity.NONE,
            reasons=["No indicators found in the symptoms and vitals provided. This does not rule out any condition."],
            action=SEVERITY_ACTIONS[Severity.NONE]["action"],
            rule_ids=[],
        )

    matches.sort(key=lambda m: (-SEVERITY_RANK[m[0]], TYPE_PRIORITY.index(m[1]), m[2]))
    top_severity, top_type = matches[0][0], matches[0][1]

    reasons: list = []
    for _sev, _typ, _rid, reason in matches:
        if reason not in reasons:
            reasons.append(reason)

    return Decision(
        type=top_type,
        severity=top_severity,
        reasons=reasons,
        action=SEVERITY_ACTIONS[top_severity]["action"],
        rule_ids=[m[2] for m in matches],
    )
