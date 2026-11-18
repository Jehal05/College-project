"""POST /predictions/{model}: who may call it, what it refuses, and what it says (PROPOSED contract).

The shipped model files are used, whatever they were trained on, so these tests check structure, not numbers.
"""
import ast
import glob
import os

import pytest
from sqlalchemy.orm import Session

from app.ml import predict
from app.models.audit import AuditLog
from ml.features import SPECS, names

PATIENT = ("patient@demo.test", "demo1234")
STAFF = ("staff@demo.test", "demo1234")
ADMIN = ("admin@demo.test", "demo1234")
FULL = {
    "heart": {"resting_bp": 138, "cholesterol": 240, "fasting_blood_sugar": 0, "max_heart_rate": 150,
              "exercise_angina": 0, "st_depression": 1.0},        # age and sex come from the demo patient's record
    "diabetes": {"pregnancies": 1, "glucose": 128, "blood_pressure": 74, "skin_thickness": 29, "insulin": 120,
                 "bmi": 31.0, "diabetes_pedigree": 0.5},          # age comes from the record
}


def call(demo, model, body, who=PATIENT):
    return demo.post(f"/predictions/{model}", json=body, headers=demo.headers(*who))


@pytest.fixture(params=["heart", "diabetes"])
def condition(request):
    return request.param


def test_a_patient_gets_a_score_with_the_contract_fields(demo, condition):
    r = call(demo, condition, {"inputs": FULL[condition]})
    assert r.status_code == 200
    body = r.json()
    assert body["model"] == condition and body["simulated"] is True
    assert 0 <= body["risk"] <= 1 and body["band"] in ("low", "medium", "high")
    assert 3 <= len(body["top_factors"]) <= 5
    assert {"name", "version", "dataset", "dataset_source", "trained_on", "metrics"} <= set(body["model_card"])
    assert "112" in body["notice"] and body["limits"]


def test_age_and_sex_are_filled_from_the_record(demo):
    body = call(demo, "heart", {"inputs": FULL["heart"]}).json()      # no age, no sex in the request
    assert {f["feature"] for f in body["top_factors"]} <= set(names(SPECS["heart"]))


def test_what_the_person_types_wins_over_the_record(demo):
    young = call(demo, "heart", {"inputs": {**FULL["heart"], "age": 25}}).json()["risk"]
    old = call(demo, "heart", {"inputs": {**FULL["heart"], "age": 85}}).json()["risk"]
    assert young != old


def test_a_missing_input_is_a_400_with_names_only(demo):
    r = call(demo, "diabetes", {"inputs": {"glucose": 99999}})
    assert r.status_code == 400
    assert "99999" not in r.text
    text = r.json()["error"]
    assert r.json()["detail"] == text
    assert text.startswith("missing inputs:") and "pregnancies" in text   # it names what is MISSING; glucose was sent


def test_nothing_is_guessed_when_the_request_is_empty(demo):
    r = call(demo, "heart", {})
    assert r.status_code == 400 and "resting_bp" in r.json()["error"]


def test_an_out_of_range_or_non_number_input_is_a_400(demo):
    for bad in (-5, 100000, "high", True):
        r = call(demo, "heart", {"inputs": {**FULL["heart"], "resting_bp": bad}})
        assert r.status_code == 400 and "resting_bp" in r.json()["error"]


def test_an_unknown_input_or_request_field_is_a_400(demo):
    assert call(demo, "heart", {"inputs": {**FULL["heart"], "shoe_size": 42}}).status_code == 400
    assert call(demo, "heart", {"inputs": FULL["heart"], "extra": 1}).status_code == 400
    assert call(demo, "heart", {"inputs": "not an object"}).status_code == 400


def test_an_unknown_model_is_404(demo):
    assert call(demo, "kidney", {"inputs": {}}).status_code == 404


def test_no_login_is_401(demo):
    assert demo.post("/predictions/heart", json={"inputs": FULL["heart"]}).status_code == 401


def test_another_patient_is_403_and_audited(demo, engine):
    r = call(demo, "heart", {"patient_id": "PT-2026-0002", "inputs": FULL["heart"]})
    assert r.status_code == 403
    with Session(engine) as s:
        row = s.query(AuditLog).filter(AuditLog.action == "prediction.run", AuditLog.outcome == "denied").first()
    assert row is not None and row.reason == "forbidden_role"


@pytest.mark.parametrize("who", [STAFF, ADMIN])
def test_staff_and_admin_are_403(demo, who):
    assert call(demo, "heart", {"inputs": FULL["heart"]}, who).status_code == 403


def test_a_successful_call_writes_an_audit_row_without_values(demo, engine):
    assert call(demo, "heart", {"inputs": FULL["heart"]}).status_code == 200
    with Session(engine) as s:
        rows = s.query(AuditLog).filter(AuditLog.action == "prediction.run", AuditLog.outcome == "allowed").all()
        assert len(rows) == 1
        assert rows[0].resource_id == "heart"
        released = rows[0].fields_released
    assert "resting_bp" in released and "138" not in released


def test_a_missing_model_file_is_a_503(demo, monkeypatch, tmp_path):
    monkeypatch.setattr(predict, "MODELS_DIR", str(tmp_path))
    r = call(demo, "heart", {"inputs": FULL["heart"]})
    assert r.status_code == 503 and "not available" in r.json()["error"]


def test_the_emergency_code_never_uses_the_prediction_code():
    """An alert never waits for a score. Static check: only the endpoint, main and the ml package touch it."""
    here = os.path.dirname(__file__)
    app_dir = os.path.join(here, "..", "app")
    allowed = {os.path.join("api", "predictions.py"), "main.py"}
    offenders = []
    for path in glob.glob(os.path.join(app_dir, "**", "*.py"), recursive=True):
        rel = os.path.relpath(path, app_dir)
        if rel in allowed or rel.startswith("ml" + os.sep):
            continue
        tree = ast.parse(open(path, encoding="utf-8").read())
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom) and node.module and (node.module.startswith("app.ml") or node.module == "app.api.predictions"):
                offenders.append(rel)
            if isinstance(node, ast.ImportFrom) and node.module == "app.api" and any(a.name == "predictions" for a in node.names):
                offenders.append(rel)
            if isinstance(node, ast.Import) and any(a.name.startswith("app.ml") for a in node.names):
                offenders.append(rel)
    assert offenders == []


# The emergency flow must not depend on anything added after the SOS flow was finished (Phase 2 and 3 code).
EMERGENCY_FILES = [
    "api/emergencies.py", "api/ws.py", "api/hospital_desk.py", "api/responders.py",
    "services/emergencies.py", "services/emergency_state.py", "services/escalation.py", "services/ws_hub.py",
    "services/events.py", "services/hospital_match.py", "services/desk.py", "services/responders.py",
]
NEW_MODULES = ("app.ml", "app.api.predictions", "app.api.lab_values", "app.api.organs", "app.api.report_extract",
               "app.services.report_text", "app.services.lab_values", "app.services.organs")
NEW_NAMES = {"predictions", "lab_values", "organs", "report_extract", "report_text", "LabValue", "predict"}


def test_the_emergency_code_imports_none_of_the_phase_2_and_3_code():
    here = os.path.dirname(__file__)
    app_dir = os.path.join(here, "..", "app")
    offenders = []
    for rel in EMERGENCY_FILES:
        path = os.path.join(app_dir, *rel.split("/"))
        assert os.path.exists(path), f"{rel} moved: update EMERGENCY_FILES"
        tree = ast.parse(open(path, encoding="utf-8").read())
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom):
                module = node.module or ""
                if any(module == m or module.startswith(m + ".") for m in NEW_MODULES):
                    offenders.append((rel, module))
                if module in ("app.api", "app.services", "app.models.patient_data", "app", "app.ml") \
                        and any(a.name in NEW_NAMES for a in node.names):
                    offenders.append((rel, module + " import " + ",".join(a.name for a in node.names)))
            if isinstance(node, ast.Import):
                offenders += [(rel, a.name) for a in node.names if any(a.name == m or a.name.startswith(m + ".") for m in NEW_MODULES)]
    assert offenders == []


def test_no_module_outside_the_allowed_ones_imports_the_phase_3_code():
    """Only the new routes, main and the organ service (which reads lab values) may import the new modules."""
    here = os.path.dirname(__file__)
    app_dir = os.path.join(here, "..", "app")
    allowed = {
        "app.services.report_text": {os.path.join("api", "report_extract.py"), os.path.join("services", "lab_values.py")},
        "app.services.lab_values": {os.path.join("api", "lab_values.py"), os.path.join("api", "organs.py"),
                                    os.path.join("api", "report_extract.py"), os.path.join("services", "organs.py")},
        "app.services.organs": {os.path.join("api", "organs.py")},
    }
    offenders = []
    for path in glob.glob(os.path.join(app_dir, "**", "*.py"), recursive=True):
        rel = os.path.relpath(path, app_dir)
        tree = ast.parse(open(path, encoding="utf-8").read())
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom):
                imported = [node.module or ""] + [f"{node.module}.{a.name}" for a in node.names]
                for target, owners in allowed.items():
                    if target in imported and rel not in owners:
                        offenders.append((rel, target))
    assert offenders == []
