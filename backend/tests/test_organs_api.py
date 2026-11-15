"""GET /patients/{id}/organs/{organ} (Phase 3): the fixed mapping, the answer shape, who may call it."""
from datetime import date

import pytest
from sqlalchemy.orm import Session

from app.models.audit import AuditLog
from app.models.patient_data import LabValue, Patient
from app.services import organs

PATIENT = ("patient@demo.test", "demo1234")
STAFF = ("staff@demo.test", "demo1234")
ADMIN = ("admin@demo.test", "demo1234")
PID = "PT-2026-0417"

# The table printed in docs/API_CONTRACT.md. Written out here on purpose: changing the mapping must change this test.
EXPECTED = {
    "heart": [("heart_rate", "vital"), ("bp_sys", "vital"), ("bp_dia", "vital"), ("cholesterol", "lab"), ("ldl", "lab")],
    "lungs": [("spo2", "vital"), ("resp_rate", "vital")],
    "kidneys": [("creatinine", "lab"), ("egfr", "lab")],
    "liver": [("alt", "lab"), ("ast", "lab"), ("bilirubin", "lab")],
    "pancreas": [("glucose", "vital"), ("hba1c", "lab"), ("fasting_glucose", "lab")],
    "brain": [],
}
UNIT = {"cholesterol": "mg/dL", "ldl": "mg/dL", "creatinine": "mg/dL", "egfr": "mL/min/1.73 m2", "alt": "U/L", "ast": "U/L",
        "bilirubin": "mg/dL", "hba1c": "%", "fasting_glucose": "mg/dL"}


def organ(demo, name, who=PATIENT, pid=PID):
    return demo.get(f"/patients/{pid}/organs/{name}", headers=demo.headers(*who))


def put(demo, test, value, day, **kw):
    body = {"test": test, "value": value, "unit": UNIT[test], "taken_on": day, **kw}
    r = demo.post(f"/patients/{PID}/lab-values", json={"values": [body]}, headers=demo.headers(*PATIENT))
    assert r.status_code == 201, r.text


def test_the_mapping_table_is_exactly_the_documented_one():
    assert {k: list(v) for k, v in organs.ORGANS.items()} == EXPECTED


def test_every_mapped_lab_is_a_test_the_server_can_store_and_has_a_unit():
    from app.services.report_text import APP_UNIT
    for _organ, items in organs.ORGANS.items():
        for key, kind in items:
            assert (key in APP_UNIT) if kind == "lab" else (key in organs.VITAL_UNITS)


def test_an_organ_with_no_labs_says_has_data_false_and_no_items(demo):
    body = organ(demo, "kidneys").json()
    assert body["organ"] == "kidneys" and body["has_data"] is False and body["items"] == []
    assert body["label"] == "Educational representation, not a medical image." and body["mapping_note"]


def test_brain_has_no_mapped_readings(demo):
    body = organ(demo, "brain").json()
    assert body["has_data"] is False and body["items"] == []


def test_a_lab_item_carries_the_newest_value_and_a_trend_oldest_first(demo):
    put(demo, "creatinine", 1.0, "2026-08-02", reference_range={"low": 0.6, "high": 1.3}, source="report_extracted")
    put(demo, "creatinine", 1.2, "2026-10-02", reference_range={"low": 0.6, "high": 1.3})
    put(demo, "creatinine", 1.1, "2026-09-02")
    body = organ(demo, "kidneys").json()
    assert body["has_data"] is True and [i["key"] for i in body["items"]] == ["creatinine"]
    item = body["items"][0]
    assert (item["kind"], item["value"], item["unit"], item["source"]) == ("lab", 1.2, "mg/dL", "entered")
    assert item["reference_range"] == {"low": 0.6, "high": 1.3}
    assert item["last_updated"].endswith("Z")
    assert item["trend"] == [{"at": "2026-08-02T00:00:00Z", "value": 1.0}, {"at": "2026-09-02T00:00:00Z", "value": 1.1},
                             {"at": "2026-10-02T00:00:00Z", "value": 1.2}]


def test_the_trend_keeps_only_the_last_12(demo):
    for i in range(15):
        put(demo, "alt", 20 + i, date(2026, 1, 1 + i).isoformat())
    item = organ(demo, "liver").json()["items"][0]
    assert len(item["trend"]) == 12
    assert item["trend"][0]["value"] == 23 and item["trend"][-1]["value"] == 34 and item["value"] == 34


def test_only_the_labs_that_have_values_are_listed(demo):
    put(demo, "ast", 30, "2026-10-01")
    assert [i["key"] for i in organ(demo, "liver").json()["items"]] == ["ast"]


def test_a_vital_is_one_simulated_reading_with_no_trend(demo):
    body = organ(demo, "lungs").json()
    assert body["has_data"] is True and [i["key"] for i in body["items"]] == ["spo2", "resp_rate"]
    for item in body["items"]:
        assert item["kind"] == "vital" and item["source"] == "simulated" and item["trend"] == []
        assert item["reference_range"] is None and isinstance(item["value"], (int, float)) and item["last_updated"]
    assert body["items"][0]["unit"] == "%"


def test_pancreas_mixes_one_vital_and_stored_labs(demo):
    put(demo, "hba1c", 6.4, "2026-10-01")
    put(demo, "fasting_glucose", 101, "2026-10-01")
    items = {i["key"]: i for i in organ(demo, "pancreas").json()["items"]}
    assert set(items) == {"glucose", "hba1c", "fasting_glucose"}
    assert items["glucose"]["kind"] == "vital" and items["hba1c"]["kind"] == "lab" and items["hba1c"]["trend"][0]["value"] == 6.4


def test_heart_lists_the_vitals_first_then_stored_labs(demo):
    put(demo, "ldl", 110, "2026-10-01")
    assert [i["key"] for i in organ(demo, "heart").json()["items"]] == ["heart_rate", "bp_sys", "bp_dia", "ldl"]


def test_an_unknown_organ_is_404(demo):
    assert organ(demo, "spleen").status_code == 404


def test_a_lab_value_never_appears_under_another_patient(demo, engine):
    with Session(engine) as s:
        s.add(Patient(id="PT-OTHER-0001", name="Other", age=40, language="en"))
        s.flush()                                    # the patient row must exist before the lab value (no ORM link orders them)
        s.add(LabValue(id="LAB-OTHERS", patient_id="PT-OTHER-0001", test="creatinine", value=9.9, unit="mg/dL",
                       taken_on=date(2026, 1, 1), source="entered"))
        s.commit()
    assert organ(demo, "kidneys").json()["items"] == []
    assert organ(demo, "kidneys", pid="PT-OTHER-0001").status_code == 403


@pytest.mark.parametrize("who", [STAFF, ADMIN])
def test_staff_and_admin_are_403_and_audited(demo, engine, who):
    assert organ(demo, "heart", who).status_code == 403
    with Session(engine) as s:
        row = s.query(AuditLog).filter(AuditLog.action == "organ.read", AuditLog.outcome == "denied").first()
    assert row is not None and row.reason == "forbidden_role"


def test_a_refusal_comes_before_the_unknown_organ_404(demo):
    assert organ(demo, "spleen", STAFF).status_code == 403


def test_no_login_is_401(demo):
    assert demo.get(f"/patients/{PID}/organs/heart").status_code == 401


def test_a_read_is_audited_with_names_only(demo, engine):
    put(demo, "creatinine", 4.56, "2026-10-01")
    organ(demo, "kidneys")
    with Session(engine) as s:
        row = s.query(AuditLog).filter(AuditLog.action == "organ.read", AuditLog.outcome == "allowed").one()
        assert row.resource_id == "kidneys" and "creatinine" in row.fields_released and "4.56" not in row.fields_released
