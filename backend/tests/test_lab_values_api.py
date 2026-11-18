"""Stored lab values (Phase 3): who may use them, what they refuse, and that the numbers are encrypted at rest."""
from datetime import date, timedelta

import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.audit import AuditLog
from app.models.patient_data import LabValue, Patient

PATIENT = ("patient@demo.test", "demo1234")
STAFF = ("staff@demo.test", "demo1234")
ADMIN = ("admin@demo.test", "demo1234")
PID = "PT-2026-0417"


def lab(**kw):
    return {**{"test": "hba1c", "value": 6.4, "unit": "%", "taken_on": "2026-11-01"}, **kw}


def save(demo, values, who=PATIENT, pid=PID):
    return demo.post(f"/patients/{pid}/lab-values", json={"values": values}, headers=demo.headers(*who))


def read(demo, query="", who=PATIENT, pid=PID):
    return demo.get(f"/patients/{pid}/lab-values{query}", headers=demo.headers(*who))


def audit_rows(engine, action):
    with Session(engine) as s:
        return [(r.outcome, r.reason, r.fields_released, r.resource_id) for r in
                s.query(AuditLog).filter(AuditLog.action == action).order_by(AuditLog.id)]


def add_other_patient(engine):
    with Session(engine) as s:
        s.add(Patient(id="PT-OTHER-0001", name="Other Person", age=40, language="en"))
        s.flush()                                    # the patient row must exist before the lab value (no ORM link orders them)
        s.add(LabValue(id="LAB-OTHERS", patient_id="PT-OTHER-0001", test="hba1c", value=5.0, unit="%",
                       taken_on=date(2026, 1, 1), source="entered"))
        s.commit()


# ------------------------------------------------------------------------------------------- save and read
def test_a_patient_saves_two_values_and_gets_them_back(demo):
    r = save(demo, [lab(), lab(test="fasting_glucose", value=101, unit="mg/dL", reference_range={"low": 70, "high": 99},
                              source="report_extracted")])
    assert r.status_code == 201
    saved = r.json()["values"]
    assert [v["test"] for v in saved] == ["hba1c", "fasting_glucose"]
    first = saved[0]
    assert first["value"] == 6.4 and first["unit"] == "%" and first["reference_range"] is None
    assert first["status"] == "confirmed_by_patient" and first["source"] == "entered" and first["taken_on"] == "2026-11-01"
    assert first["id"].startswith("LAB-") and first["created_at"].endswith("Z") and first["report_id"] is None
    assert saved[1]["reference_range"] == {"low": 70.0, "high": 99.0} and saved[1]["source"] == "report_extracted"
    again = read(demo).json()["values"]
    assert {v["id"] for v in again} == {v["id"] for v in saved}


def test_the_list_is_newest_first_and_can_be_filtered_by_test(demo):
    save(demo, [lab(value=6.0, taken_on="2026-08-01"), lab(value=6.2, taken_on="2026-10-01"), lab(value=6.1, taken_on="2026-09-01"),
                lab(test="alt", value=30, unit="U/L", taken_on="2026-10-15")])
    assert [v["value"] for v in read(demo, "?test=hba1c").json()["values"]] == [6.2, 6.1, 6.0]
    assert [v["test"] for v in read(demo, "?test=alt").json()["values"]] == ["alt"]
    assert len(read(demo).json()["values"]) == 4


def test_the_same_date_is_ordered_by_when_it_was_saved(demo):
    save(demo, [lab(value=6.0)])
    save(demo, [lab(value=6.9)])
    assert [v["value"] for v in read(demo).json()["values"]] == [6.9, 6.0]


def test_an_unknown_test_filter_is_a_400(demo):
    r = read(demo, "?test=vitamin_q")
    assert r.status_code == 400 and r.json()["error"] == r.json()["detail"]


def test_a_report_the_patient_owns_can_be_linked(demo):
    pdf = b"%PDF-1.4\n%%EOF"
    up = demo.post("/reports?name=lab", content=pdf, headers={**demo.headers(*PATIENT), "Content-Type": "application/pdf"})
    assert up.status_code == 201
    r = save(demo, [lab(source="report_extracted", report_id=up.json()["id"])])
    assert r.status_code == 201 and r.json()["values"][0]["report_id"] == up.json()["id"]


def test_a_report_that_is_not_the_patients_is_a_400(demo):
    r = save(demo, [lab(source="report_extracted", report_id="REP-DOESNOTEXIST")])
    assert r.status_code == 400 and "report_id" in r.json()["error"]


# ------------------------------------------------------------------------------------------- encrypted at rest
def test_the_value_and_the_range_are_encrypted_in_the_database(demo, engine):
    assert save(demo, [lab(value=7.31, reference_range={"low": 4.17, "high": 5.63})]).status_code == 201
    with engine.connect() as conn:
        row = conn.execute(text("SELECT value, ref_low, ref_high, test, unit FROM lab_values")).one()
    for column in row[:3]:
        assert column is not None
        for plain in ("7.31", "4.17", "5.63"):
            assert plain not in column
    assert row[3] == "hba1c" and row[4] == "%"            # the name and unit stay readable on purpose
    assert read(demo).json()["values"][0]["value"] == 7.31      # and decrypt on the way out


# ------------------------------------------------------------------------------------------- limits and validation
def test_more_than_20_values_is_a_400_and_saves_nothing(demo, engine):
    r = save(demo, [lab(taken_on=(date(2026, 1, 1) + timedelta(days=i)).isoformat()) for i in range(21)])
    assert r.status_code == 400 and "values" in r.json()["error"]
    assert read(demo).json()["values"] == []
    assert save(demo, [lab(taken_on=(date(2026, 1, 1) + timedelta(days=i)).isoformat()) for i in range(20)]).status_code == 201


def test_an_empty_list_is_a_400(demo):
    assert save(demo, []).status_code == 400


@pytest.mark.parametrize("bad,field", [
    (lab(test="vitamin_q"), "values[0].test"),
    (lab(unit="mg/dL"), "values[0].unit"),                       # wrong unit for the test (it must be the app unit)
    (lab(value=0), "values[0].value"), (lab(value=-1), "values[0].value"), (lab(value=10**9), "values[0].value"),
    (lab(reference_range={}), "values[0].reference_range"),
    (lab(reference_range={"low": 9, "high": 1}), "values[0].reference_range"),
    (lab(taken_on=(date.today() + timedelta(days=30)).isoformat()), "values[0].taken_on"),
    (lab(taken_on="1800-01-01"), "values[0].taken_on"),
])
def test_a_bad_value_is_a_400_naming_the_field(demo, bad, field):
    r = save(demo, [bad])
    assert r.status_code == 400 and field in r.json()["error"]
    assert read(demo).json()["values"] == []


@pytest.mark.parametrize("bad", [lab(value=True), lab(value="6.4"), lab(value=None), lab(extra=1), lab(taken_on="not a date"),
                                 lab(source="guessed"), {"test": "hba1c"}])
def test_a_malformed_value_is_a_400(demo, bad):
    assert save(demo, [bad]).status_code == 400


def test_one_bad_value_saves_none_of_the_batch(demo):
    assert save(demo, [lab(), lab(test="nope")]).status_code == 400
    assert read(demo).json()["values"] == []


def test_an_extra_field_on_the_request_is_a_400(demo):
    r = demo.post(f"/patients/{PID}/lab-values", json={"values": [lab()], "patient_id": "x"}, headers=demo.headers(*PATIENT))
    assert r.status_code == 400


def test_errors_never_echo_the_values_sent(demo):
    r = save(demo, [lab(test="vitamin_q", value=123456.789)])
    assert "123456" not in r.text and "vitamin_q" not in r.text


# ------------------------------------------------------------------------------------------- delete
def test_delete_removes_one_value_and_answers_204(demo):
    ids = [v["id"] for v in save(demo, [lab(value=6.0), lab(value=6.5, taken_on="2026-11-02")]).json()["values"]]
    r = demo.delete(f"/patients/{PID}/lab-values/{ids[0]}", headers=demo.headers(*PATIENT))
    assert r.status_code == 204 and r.content == b""
    assert [v["id"] for v in read(demo).json()["values"]] == [ids[1]]


def test_deleting_something_that_is_not_there_is_404_after_the_permission_check(demo):
    assert demo.delete(f"/patients/{PID}/lab-values/LAB-NOPE", headers=demo.headers(*PATIENT)).status_code == 404
    assert demo.delete(f"/patients/{PID}/lab-values/LAB-NOPE", headers=demo.headers(*STAFF)).status_code == 403


def test_another_patients_value_cannot_be_read_or_deleted(demo, engine):
    add_other_patient(engine)
    assert read(demo).json()["values"] == []
    assert demo.delete(f"/patients/{PID}/lab-values/LAB-OTHERS", headers=demo.headers(*PATIENT)).status_code == 404
    with Session(engine) as s:
        assert s.get(LabValue, "LAB-OTHERS") is not None


# ------------------------------------------------------------------------------------------- who may use it
@pytest.mark.parametrize("who", [STAFF, ADMIN])
def test_staff_and_admin_get_403_on_every_route_and_it_is_audited(demo, engine, who):
    assert save(demo, [lab()], who).status_code == 403
    assert read(demo, who=who).status_code == 403
    assert demo.delete(f"/patients/{PID}/lab-values/LAB-X", headers=demo.headers(*who)).status_code == 403
    for action in ("lab_value.save", "lab_value.read", "lab_value.delete"):
        rows = audit_rows(engine, action)
        assert rows and rows[-1][:2] == ("denied", "forbidden_role"), action


def test_another_patient_id_is_403_not_404(demo, engine):
    add_other_patient(engine)
    assert read(demo, pid="PT-OTHER-0001").status_code == 403
    assert save(demo, [lab()], pid="PT-OTHER-0001").status_code == 403
    assert read(demo, pid="PT-DOES-NOT-EXIST").status_code == 403         # the same answer, so ids cannot be probed


def test_no_login_is_401(demo):
    assert demo.get(f"/patients/{PID}/lab-values").status_code == 401
    assert demo.post(f"/patients/{PID}/lab-values", json={"values": [lab()]}).status_code == 401
    assert demo.delete(f"/patients/{PID}/lab-values/LAB-X").status_code == 401


# ------------------------------------------------------------------------------------------- audit
def test_save_read_and_delete_are_audited_with_names_only(demo, engine):
    saved = save(demo, [lab(value=8.88), lab(test="alt", value=77, unit="U/L")]).json()["values"]
    read(demo)
    demo.delete(f"/patients/{PID}/lab-values/{saved[0]['id']}", headers=demo.headers(*PATIENT))
    save_row, read_row, delete_row = (audit_rows(engine, a)[-1] for a in ("lab_value.save", "lab_value.read", "lab_value.delete"))
    assert save_row[0] == "allowed" and "hba_c" in save_row[2] and "alt" in save_row[2]
    assert read_row[0] == "allowed" and "alt" in read_row[2]
    assert delete_row[0] == "allowed" and delete_row[3] == saved[0]["id"] and "hba_c" in delete_row[2]
    with Session(engine) as s:
        everything = " ".join(str(vars(r)) for r in s.query(AuditLog))
    assert "8.88" not in everything
