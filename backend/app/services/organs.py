"""Which readings belong to which organ: a FIXED table, not a model and not a guess (Phase 3).

A vital is one current SIMULATED reading, with no history (the simulator keeps none). A lab is a value the patient
confirmed, with a trend of the last few values. The table below is also printed in docs/API_CONTRACT.md.

| organ    | vitals (simulated)       | labs (entered by the patient)  |
|----------|--------------------------|--------------------------------|
| heart    | heart_rate, bp_sys, bp_dia | cholesterol, ldl             |
| lungs    | spo2, resp_rate          | none                           |
| kidneys  | none                     | creatinine, egfr               |
| liver    | none                     | alt, ast, bilirubin            |
| pancreas | glucose                  | hba1c, fasting_glucose         |
| brain    | none                     | none (the app shows it, no reading is mapped)  |
"""
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from app.services import lab_values
from app.services.vitals import current_vitals

LABEL = "Educational representation, not a medical image."
MAPPING_NOTE = "Which readings belong to which organ is a fixed table, documented in the backend."
TREND_POINTS = 12

ORGANS: Dict[str, List[tuple]] = {
    "heart": [("heart_rate", "vital"), ("bp_sys", "vital"), ("bp_dia", "vital"), ("cholesterol", "lab"), ("ldl", "lab")],
    "lungs": [("spo2", "vital"), ("resp_rate", "vital")],
    "kidneys": [("creatinine", "lab"), ("egfr", "lab")],
    "liver": [("alt", "lab"), ("ast", "lab"), ("bilirubin", "lab")],
    "pancreas": [("glucose", "vital"), ("hba1c", "lab"), ("fasting_glucose", "lab")],
    "brain": [],
}
VITAL_UNITS = {"heart_rate": "bpm", "spo2": "%", "bp_sys": "mmHg", "bp_dia": "mmHg", "resp_rate": "breaths/min",
               "glucose": "mg/dL"}


def organ_answer(db: Session, patient_id: str, organ: str, vitals: Optional[dict] = None) -> dict:
    """The answer for one organ. `organ` must be a key of ORGANS (the route answers 404 for any other)."""
    items: List[dict] = []
    for key, kind in ORGANS[organ]:
        if kind == "vital":
            if vitals is None:
                vitals = current_vitals(patient_id)          # one reading for the whole answer
            reading = vitals
            items.append({"key": key, "kind": "vital", "value": reading[key], "unit": VITAL_UNITS[key],
                          "source": "simulated", "last_updated": reading["timestamp"], "reference_range": None,
                          "trend": []})
            continue
        rows = lab_values.list_values(db, patient_id, key, limit=TREND_POINTS)       # newest first
        if not rows:
            continue
        newest = rows[0]
        items.append({"key": key, "kind": "lab", "value": newest.value, "unit": newest.unit, "source": newest.source,
                      "last_updated": lab_values.stamp(newest.created_at), "reference_range": lab_values.range_of(newest),
                      "trend": [{"at": row.taken_on.strftime("%Y-%m-%dT00:00:00Z"), "value": row.value}
                                for row in reversed(rows)]})                         # oldest first
    return {"organ": organ, "has_data": bool(items), "items": items, "mapping_note": MAPPING_NOTE, "label": LABEL}
