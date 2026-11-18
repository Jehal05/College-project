"""Writes docs/examples/phase3/*.json.

Made BY CODE (real output of the real functions): extract-response.json, scenario-response.json.
Written BY HAND from the route code, NOT captured from a running server: the lab-values and organ examples
(a server needs the database libraries). Each file says which one it is in its "_how_made" field.
Run from the backend folder:  python scripts/make_phase3_examples.py
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))
OUT = os.path.join(HERE, "..", "..", "docs", "examples", "phase3")

from app.ml import predict                                        # noqa: E402
from app.services import report_text                              # noqa: E402

SAMPLE_REPORT = """CITY LAB                       Page 1 of 1
Name: Demo Patient             Collected 12/03/2024
HbA1c                     6.4 %        4.0 - 5.6
Glucose, Fasting          5.1 mmol/L   3.9 - 5.5
Creatinine, Serum         88.4 umol/L  (53 - 106)
ALT (SGPT)                52 U/L       < 41
Total Cholesterol         210 mg/dL    < 200
HDL Cholesterol           45 mg/dL     > 40
"""
CODE = "made by code: the real function output on the sample report inside scripts/make_phase3_examples.py"
HAND = "written by hand from the route code, not captured from a running server"


def save(name: str, how: str, body) -> None:
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as fh:
        json.dump({"_how_made": how, **body} if isinstance(body, dict) else {"_how_made": how, "items": body}, fh,
                  indent=2, ensure_ascii=False)
        fh.write("\n")


def lab(lab_id, test, value, unit, rng, day, source="entered", created="2026-11-15T09:30:00Z"):
    return {"id": lab_id, "test": test, "value": value, "unit": unit, "reference_range": rng, "taken_on": day,
            "status": "confirmed_by_patient", "source": source, "report_id": None, "created_at": created}


def main() -> None:
    found = report_text.parse_report_text(SAMPLE_REPORT)
    save("extract-response.json", CODE, {"status": "proposed", "values": found["values"], "unreadable": found["unreadable"],
                                         "notice": report_text.NOTICE})
    model = predict.load_model("heart")
    inputs = {"age": 58, "sex": 1, "resting_bp": 138, "cholesterol": 240, "fasting_blood_sugar": 0, "max_heart_rate": 150,
              "exercise_angina": 0, "st_depression": 1.0}
    scenario = {"resting_bp": 120, "cholesterol": 200}
    save("scenario-request.json", "the request body for POST /predictions/heart", {"inputs": inputs, "scenario": scenario})
    save("scenario-response.json", CODE + " (the shipped practice model, trained on invented data)",
         {"model": "heart", **predict.what_if(model, inputs, scenario)})
    request_values = [
        {"test": "hba1c", "value": 6.4, "unit": "%", "reference_range": {"low": 4.0, "high": 5.6}, "taken_on": "2026-11-01",
         "source": "report_extracted", "report_id": "REP-0123456789ABCDEF"},
        {"test": "fasting_glucose", "value": 101, "unit": "mg/dL", "taken_on": "2026-11-01"},
    ]
    save("lab-values-post-request.json", "the request body for POST /patients/{id}/lab-values", {"values": request_values})
    saved = [lab("LAB-1A2B3C4D5E6F7A8B", "hba1c", 6.4, "%", {"low": 4.0, "high": 5.6}, "2026-11-01", "report_extracted"),
             lab("LAB-9F8E7D6C5B4A3921", "fasting_glucose", 101.0, "mg/dL", None, "2026-11-01")]
    saved[0]["report_id"] = "REP-0123456789ABCDEF"
    save("lab-values-post-response-201.json", HAND, {"values": saved})
    save("lab-values-get-response.json", HAND + " (GET /patients/{id}/lab-values?test=hba1c, newest first)",
         {"values": [lab("LAB-1A2B3C4D5E6F7A8B", "hba1c", 6.4, "%", {"low": 4.0, "high": 5.6}, "2026-11-01"),
                     lab("LAB-0A0B0C0D0E0F0102", "hba1c", 6.1, "%", None, "2026-08-02", created="2026-08-02T07:00:00Z")]})
    save("organ-kidneys.json", HAND + " (GET /patients/{id}/organs/kidneys after two creatinine values were saved)",
         {"organ": "kidneys", "has_data": True,
          "items": [{"key": "creatinine", "kind": "lab", "value": 1.1, "unit": "mg/dL", "source": "entered",
                     "last_updated": "2026-11-14T09:30:00Z", "reference_range": {"low": 0.6, "high": 1.3},
                     "trend": [{"at": "2026-08-02T00:00:00Z", "value": 1.0}, {"at": "2026-11-14T00:00:00Z", "value": 1.1}]}],
          "mapping_note": "Which readings belong to which organ is a fixed table, documented in the backend.",
          "label": "Educational representation, not a medical image."})
    save("organ-no-data.json", HAND + " (GET /patients/{id}/organs/liver before any liver value is saved)",
         {"organ": "liver", "has_data": False, "items": [],
          "mapping_note": "Which readings belong to which organ is a fixed table, documented in the backend.",
          "label": "Educational representation, not a medical image."})
    save("organ-lungs-vitals.json", HAND + " (GET /patients/{id}/organs/lungs: vitals are one simulated reading, no trend)",
         {"organ": "lungs", "has_data": True,
          "items": [{"key": "spo2", "kind": "vital", "value": 97.2, "unit": "%", "source": "simulated",
                     "last_updated": "2026-11-15T10:00:01Z", "reference_range": None, "trend": []},
                    {"key": "resp_rate", "kind": "vital", "value": 16, "unit": "breaths/min", "source": "simulated",
                     "last_updated": "2026-11-15T10:00:01Z", "reference_range": None, "trend": []}],
          "mapping_note": "Which readings belong to which organ is a fixed table, documented in the backend.",
          "label": "Educational representation, not a medical image."})
    save("errors.json", HAND + " (every error is {error, detail}, names only, never values)",
         {"400_unknown_scenario_input": {"error": "unknown scenario inputs (only model inputs can change): exercise",
                                         "detail": "unknown scenario inputs (only model inputs can change): exercise"},
          "400_scenario_changes_nothing": {"error": "the scenario does not change any input",
                                           "detail": "the scenario does not change any input"},
          "400_too_many_lab_values": {"error": "Invalid request: values", "detail": "Invalid request: values"},
          "400_scanned_image": {"error": predict_notice_ocr(), "detail": predict_notice_ocr()},
          "503_text_reading_missing": {"error": "Text reading is not installed on this server",
                                       "detail": "Text reading is not installed on this server"}})


def predict_notice_ocr() -> str:
    return "Scanned images need OCR, which is not available yet. Use a PDF with selectable text, or type the values in."


if __name__ == "__main__":
    main()
