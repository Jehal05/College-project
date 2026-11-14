"""The foundation tables: constraints, encryption at rest, append-only timeline (Phase 1 task 1)."""
from datetime import datetime, timezone

import pytest
from sqlalchemy import inspect, text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from app.models.accounts import User
from app.models.append_only import AppendOnlyError, reset_table
from app.models.emergencies import (Counter, Emergency, EmergencyPassport, HospitalAlert, StatusEvent, SymptomReport, Vital)
from app.models.hospitals import Ambulance, Hospital
from app.models.patient_data import Contact, Patient, Report
from tests import contract_tools as contract

NOW = datetime(2026, 11, 14, 10, 0, 0)


def hospital(**kw):
    base = dict(id="HSP-T-1", name="Test Hospital", lat=23.0, lng=72.5, verified=True, cap_emergency=True)
    base.update(kw)
    return Hospital(**base)


def emergency(**kw):
    base = dict(id="EM-20261114-0001", patient_id="pat_001", type="HEART", engine_severity="EMERGENCY",
                severity="EMERGENCY", symptoms=["CHEST_PAIN"])
    base.update(kw)
    return Emergency(**base)


def commit_fails(session, *objects):
    session.add_all(objects)
    with pytest.raises(DBAPIError):
        session.commit()
    session.rollback()


# ------------------------------------------------------------ the tables

def test_every_table_in_the_contract_exists(engine):
    assert contract.contract_tables() <= set(inspect(engine).get_table_names())


def test_there_is_exactly_one_helper_table(engine):
    assert set(inspect(engine).get_table_names()) - contract.contract_tables() == {"counters"}


def test_the_vitals_table_has_a_patient_and_time_index(engine):
    assert any(set(ix["column_names"]) == {"patient_id", "timestamp"} for ix in inspect(engine).get_indexes("vitals"))


# ------------------------------------------------------------ hospitals and ambulances

def test_hospital_capabilities_and_availability_use_the_portals_names(patients):
    patients.add(hospital(cap_cath_lab=True, cap_icu=True, beds_free=6, icu_free=1, cath_lab_ready=True))
    patients.commit()
    h = patients.get(Hospital, "HSP-T-1")
    assert h.capabilities == {"cath_lab": True, "stroke_unit": False, "icu": True, "emergency": True}
    assert h.availability == {"beds_free": 6, "icu_free": 1, "cath_lab_ready": True, "stroke_unit_ready": False}


def test_a_hospital_is_not_verified_by_default(patients):
    patients.add(Hospital(id="HSP-T-2", name="New", lat=1.0, lng=1.0))
    patients.commit()
    assert patients.get(Hospital, "HSP-T-2").verified is False


def test_ambulance_status_is_checked(patients):
    patients.add(hospital()); patients.commit()
    patients.add(Ambulance(id="AMB-T-1", call_sign="Alpha", lat=1.0, lng=1.0, base_hospital_id="HSP-T-1"))
    patients.commit()
    assert patients.get(Ambulance, "AMB-T-1").status == "available"
    commit_fails(patients, Ambulance(id="AMB-T-2", call_sign="Bravo", lat=1.0, lng=1.0, status="flying"))


def test_an_ambulance_needs_a_real_base_hospital(patients):
    commit_fails(patients, Ambulance(id="AMB-T-3", call_sign="C", lat=1.0, lng=1.0, base_hospital_id="HSP-NOPE"))


# ------------------------------------------------------------ users

def user(**kw):
    base = dict(id="usr_t1", login="someone", display_name="Someone", password_hash="x", role="ADMIN")
    base.update(kw)
    return User(**base)


def test_a_normal_user_is_saved(patients):
    patients.add(user()); patients.commit()
    assert patients.get(User, "usr_t1").is_active is True


def test_the_login_must_be_unique(patients):
    patients.add(user()); patients.commit()
    commit_fails(patients, user(id="usr_t2"))


def test_an_unknown_role_is_refused(patients):
    commit_fails(patients, user(role="SUPERUSER"))


def test_a_patient_account_needs_a_patient(patients):
    commit_fails(patients, user(role="PATIENT", patient_id=None))
    patients.add(user(id="usr_t3", login="p", role="PATIENT", patient_id="pat_001")); patients.commit()


def test_a_hospital_desk_account_needs_a_hospital(patients):
    commit_fails(patients, user(role="HOSPITAL_STAFF", hospital_id=None))
    patients.add(hospital()); patients.commit()
    patients.add(user(id="usr_t4", login="s", role="HOSPITAL_STAFF", hospital_id="HSP-T-1")); patients.commit()


def test_a_user_cannot_point_at_a_missing_patient_or_hospital(patients):
    commit_fails(patients, user(id="usr_t5", login="x1", role="PATIENT", patient_id="pat_nope"))
    commit_fails(patients, user(id="usr_t6", login="x2", role="HOSPITAL_STAFF", hospital_id="HSP-NOPE"))


# ------------------------------------------------------------ emergencies

def test_an_emergency_is_saved_with_sensible_defaults(patients):
    patients.add(emergency()); patients.commit()
    e = patients.get(Emergency, "EM-20261114-0001")
    assert (e.state, e.source, e.severity_floor_applied) == ("EMERGENCY_DETECTED", "MANUAL", False)
    assert e.created_at is not None and e.sos_at is None


@pytest.mark.parametrize("field, bad", [
    ("state", "FLYING"), ("type", "ALIEN"), ("source", "SPAM"), ("severity", "CRITICAL"), ("engine_severity", "BAD"),
])
def test_bad_enum_values_are_refused_by_the_database(patients, field, bad):
    commit_fails(patients, emergency(**{field: bad}))


@pytest.mark.parametrize("kind", ["HEART", "STROKE", "DIABETIC", "ASTHMA", "UNKNOWN"])
def test_every_emergency_type_including_unknown_is_allowed(patients, kind):
    patients.add(emergency(id=f"EM-{kind}", type=kind)); patients.commit()


@pytest.mark.parametrize("state", ["MONITORING", "SOS_SENT", "ESCALATED", "CANCELLED", "HANDOVER_DONE"])
def test_every_state_is_allowed(patients, state):
    patients.add(emergency(id=f"EM-{state}", state=state)); patients.commit()


def test_an_emergency_needs_a_real_patient_and_hospital(patients):
    commit_fails(patients, emergency(patient_id="pat_nope"))
    commit_fails(patients, emergency(id="EM-2", hospital_id="HSP-NOPE"))


def test_the_engine_answer_and_the_sent_severity_are_stored_separately(patients):
    patients.add(emergency(engine_severity="WATCH", severity="URGENT", severity_floor_applied=True)); patients.commit()
    e = patients.get(Emergency, "EM-20261114-0001")
    assert (e.engine_severity, e.severity, e.severity_floor_applied) == ("WATCH", "URGENT", True)


def test_alert_status_is_checked(patients):
    patients.add_all([hospital(), emergency()]); patients.commit()
    patients.add(HospitalAlert(emergency_id="EM-20261114-0001", hospital_id="HSP-T-1", rank=1)); patients.commit()
    commit_fails(patients, HospitalAlert(emergency_id="EM-20261114-0001", hospital_id="HSP-T-1", status="MAYBE"))


def test_passport_token_hashes_are_unique(patients):
    row = dict(patient_id="pat_001", token_hash="abc", expires_at=NOW)
    patients.add(EmergencyPassport(id="pp1", **row)); patients.commit()
    commit_fails(patients, EmergencyPassport(id="pp2", **row))


def test_a_patient_language_must_be_en_hi_or_gu(patients):
    commit_fails(patients, Patient(id="pat_x", name="X", language="fr"))
    for code in ("en", "hi", "gu"):
        patients.add(Patient(id=f"pat_{code}", name="X", language=code))
    patients.commit()


def test_contacts_get_their_own_ids_and_are_not_primary_by_default(patients):
    patients.add_all([Contact(patient_id="pat_001", name="A", phone="+91 1"), Contact(patient_id="pat_001", name="B", phone="+91 2")])
    patients.commit()
    a, b = patients.query(Contact).all()
    assert a.id != b.id and a.id.startswith("C-") and a.is_primary is False


# ------------------------------------------------------------ encrypted at rest

def raw(session, sql):
    return session.execute(text(sql)).scalar_one()


def test_emergency_details_are_ciphertext_in_the_database(patients):
    patients.add(emergency(
        symptoms=["CHEST_PAIN", "SHORT_BREATH"], unmapped_symptoms=["WEIRD_ID"],
        engine_result={"reasons": ["Chest pain is a red-flag symptom"], "rule_ids": ["HEART_CHEST_PAIN"]},
        location={"lat": 23.0225, "lng": 72.5714, "accuracy": 20}, vitals_at_alert={"heart_rate": 131, "spo2": 93},
        consents={"location": True, "history": False, "vitals": True, "reports": False},
    ))
    patients.commit()
    for column, plain in (("symptoms", "CHEST_PAIN"), ("unmapped_symptoms", "WEIRD_ID"), ("engine_result", "red-flag"),
                          ("location", "72.5714"), ("vitals_at_alert", "131")):
        stored = raw(patients, f"SELECT {column} FROM emergencies")
        assert plain not in stored and stored.startswith("gAAAA"), column
    e = patients.get(Emergency, "EM-20261114-0001")
    assert e.symptoms == ["CHEST_PAIN", "SHORT_BREATH"] and e.location["lat"] == 23.0225
    assert e.engine_result["rule_ids"] == ["HEART_CHEST_PAIN"] and e.vitals_at_alert["heart_rate"] == 131


def test_the_consent_flags_on_an_emergency_are_readable_plain_json(patients):
    patients.add(emergency(consents={"location": True, "history": False, "vitals": True, "reports": False})); patients.commit()
    assert patients.get(Emergency, "EM-20261114-0001").consents["history"] is False


def test_a_symptom_report_is_ciphertext(patients):
    patients.add(SymptomReport(patient_id="pat_001", symptoms=["BLUE_LIPS"])); patients.commit()
    stored = raw(patients, "SELECT symptoms FROM symptom_reports")
    assert "BLUE_LIPS" not in stored and patients.query(SymptomReport).one().symptoms == ["BLUE_LIPS"]


def test_the_patient_baseline_is_ciphertext(patients):
    patients.get(Patient, "pat_001").baseline = {"heart_rate": {"min": 60, "max": 85}}
    patients.commit()
    stored = raw(patients, "SELECT baseline FROM patients WHERE id='pat_001'")
    assert "heart_rate" not in stored and stored.startswith("gAAAA")      # ("60" can appear in random ciphertext)
    assert patients.get(Patient, "pat_001").baseline["heart_rate"]["max"] == 85


def test_an_uploaded_report_file_is_encrypted_and_comes_back_byte_for_byte(patients):
    original = bytes(range(256)) * 400 + b"%PDF-1.4 hypertension"
    patients.add(Report(id="rep_1", patient_id="pat_001", file_name="ecg.pdf", content_type="application/pdf",
                        size=len(original), content=original))
    patients.commit()
    stored = patients.execute(text("SELECT content FROM reports")).scalar_one()
    assert b"hypertension" not in stored and b"%PDF" not in stored and stored.startswith(b"gAAAA")
    assert patients.get(Report, "rep_1").content == original


def test_a_two_megabyte_file_round_trips(patients):
    original = (b"0123456789abcdef" * 131072)[: 2 * 1024 * 1024]
    patients.add(Report(id="rep_big", patient_id="pat_001", file_name="big.pdf", content=original)); patients.commit()
    assert patients.get(Report, "rep_big").content == original


def test_a_report_without_a_file_is_fine(patients):
    patients.add(Report(id="rep_2", patient_id="pat_001", file_name="note.pdf")); patients.commit()
    assert patients.get(Report, "rep_2").content is None


# ------------------------------------------------------------ the timeline cannot be rewritten

def with_event(session):
    session.add(emergency()); session.commit()
    session.add_all([StatusEvent(emergency_id="EM-20261114-0001", state="EMERGENCY_DETECTED", actor="system"),
                     StatusEvent(emergency_id="EM-20261114-0001", state="SOS_SENT", actor="usr_001")])
    session.commit()


def test_the_timeline_can_be_added_to_and_read_in_order(patients):
    with_event(patients)
    rows = patients.query(StatusEvent).order_by(StatusEvent.id).all()
    assert [r.state for r in rows] == ["EMERGENCY_DETECTED", "SOS_SENT"] and rows[0].timestamp is not None


def test_a_timeline_state_must_be_a_real_state(patients):
    patients.add(emergency()); patients.commit()
    commit_fails(patients, StatusEvent(emergency_id="EM-20261114-0001", state="MADE_UP", actor="system"))


def test_a_timeline_row_cannot_be_edited_or_deleted(patients):
    with_event(patients)
    row = patients.query(StatusEvent).first()
    row.state = "CANCELLED"
    with pytest.raises(AppendOnlyError):
        patients.commit()
    patients.rollback()
    patients.delete(patients.query(StatusEvent).first())
    with pytest.raises(AppendOnlyError):
        patients.commit()
    patients.rollback()


@pytest.mark.parametrize("sql", ["UPDATE status_events SET actor = 'x'", "DELETE FROM status_events"])
def test_raw_sql_cannot_change_the_timeline_either(patients, sql):
    with_event(patients)
    with pytest.raises(DBAPIError, match="append-only"):
        patients.execute(text(sql))
    patients.rollback()


def test_only_the_demo_reset_can_clear_the_timeline(patients, monkeypatch):
    with_event(patients)
    with pytest.raises(AppendOnlyError):
        reset_table(patients, "status_events", "status timeline")
    monkeypatch.setenv("DEMO_MODE", "true")
    reset_table(patients, "status_events", "status timeline"); patients.commit()
    assert patients.query(StatusEvent).count() == 0
    patients.add(StatusEvent(emergency_id="EM-20261114-0001", state="SOS_SENT", actor="system")); patients.commit()
    with pytest.raises(DBAPIError, match="append-only"):                 # protection is back
        patients.execute(text("DELETE FROM status_events"))
    patients.rollback()


# ------------------------------------------------------------ vitals and counters

def test_vitals_rows_are_saved_in_time_order(patients):
    patients.add_all([Vital(patient_id="pat_001", timestamp=datetime(2026, 11, 14, 10, 0, s), heart_rate=70 + s, spo2=98.0,
                            bp_sys=120, bp_dia=80, glucose=100, resp_rate=16) for s in range(3)])
    patients.commit()
    last = patients.query(Vital).order_by(Vital.timestamp.desc()).first()
    assert last.heart_rate == 72 and last.spo2 == 98.0


def test_a_vital_needs_a_real_patient(patients):
    commit_fails(patients, Vital(patient_id="pat_nope", heart_rate=70))


def test_a_counter_row_can_be_stored(patients):
    patients.add(Counter(key="EM-20261114", value=3)); patients.commit()
    assert patients.get(Counter, "EM-20261114").value == 3
