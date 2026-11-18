"""The inputs of each model: name, unit, the range we accept, and what the training CSV must contain.

One place, read by the training script, the synthetic-data maker and (through the stored model file) the endpoint.
Column names are the names the CSV must have. A real dataset whose headers differ can be mapped with
`--rename old=new,old2=new2` on the command line.
"""
from typing import Dict, List, NamedTuple, Tuple


class Feature(NamedTuple):
    name: str
    unit: str
    low: float          # the smallest value the endpoint accepts
    high: float         # the largest value the endpoint accepts
    note: str = ""


class Spec(NamedTuple):
    condition: str
    title: str
    target: str                      # 1 = the condition is present
    features: Tuple[Feature, ...]
    zero_is_missing: Tuple[str, ...]  # columns where a 0 in a real dataset means "not measured"


HEART = Spec(
    condition="heart",
    title="Heart disease risk",
    target="target",
    features=(
        Feature("age", "years", 18, 100),
        Feature("sex", "1 = male, 0 = female", 0, 1),
        Feature("resting_bp", "mmHg", 80, 220, "resting systolic blood pressure"),
        Feature("cholesterol", "mg/dL", 100, 600, "serum cholesterol"),
        Feature("fasting_blood_sugar", "1 = above 120 mg/dL, 0 = not", 0, 1),
        Feature("max_heart_rate", "beats/min", 60, 220, "highest rate reached in the exercise test"),
        Feature("exercise_angina", "1 = yes, 0 = no", 0, 1, "chest pain brought on by exercise"),
        Feature("st_depression", "mm", 0, 7, "ECG change during exercise"),
    ),
    zero_is_missing=("cholesterol", "resting_bp"),
)

DIABETES = Spec(
    condition="diabetes",
    title="Diabetes risk",
    target="target",
    features=(
        Feature("pregnancies", "count", 0, 20),
        Feature("glucose", "mg/dL", 40, 300, "plasma glucose in a tolerance test"),
        Feature("blood_pressure", "mmHg", 40, 140, "diastolic"),
        Feature("skin_thickness", "mm", 5, 100, "triceps skin fold"),
        Feature("insulin", "mu U/mL", 10, 900, "2-hour serum insulin"),
        Feature("bmi", "kg/m2", 15, 70),
        Feature("diabetes_pedigree", "score", 0.05, 2.5, "family-history score"),
        Feature("age", "years", 18, 100),
    ),
    zero_is_missing=("glucose", "blood_pressure", "skin_thickness", "insulin", "bmi"),
)

SPECS: Dict[str, Spec] = {"heart": HEART, "diabetes": DIABETES}


def names(spec: Spec) -> List[str]:
    return [f.name for f in spec.features]
