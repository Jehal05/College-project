"""Consent ledger: default deny, append-only, immediate effect, permissions (feature 51)."""
import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

from app.models.consent import AppendOnlyError, ConsentLedger
from app.security.actor import Actor
from app.services import consent as svc

PATIENT = Actor("usr_001", "PATIENT", "pat_001")
OTHER_PATIENT = Actor("usr_002", "PATIENT", "pat_002")
STAFF = Actor("usr_010", "HOSPITAL_STAFF")
ADMIN = Actor("usr_020", "ADMIN")
FAMILY = Actor("usr_030", "FAMILY")
RESPONDER = Actor("usr_040", "RESPONDER")

PASSPORT = {
    "patient_id": "pat_001", "name": "Demo Patient", "age": 58, "blood_group": "B+",
    "conditions": ["hypertension"], "allergies": ["penicillin"], "medications": ["amlodipine"],
    "vitals": {"heart_rate": 72}, "reports": [{"id": "rep_001"}],
    "location": {"lat": 23.0, "lng": 72.5}, "contacts": [{"name": "Demo Relative", "order": 1}],
}


def grant_all(session, **overrides):
    values = {"location": True, "history": True, "vitals": True, "reports": True, **overrides}
    svc.update_consents(session, PATIENT, "pat_001", values)
    session.commit()


# ------------------------------------------------------------ default deny and history

def test_no_rows_means_no_consent(patients):
    assert svc.current_consents(patients, "pat_001") == {
        "location": False, "history": False, "vitals": False, "reports": False}


def test_grant_and_read_back(patients):
    grant_all(patients, reports=False)
    assert svc.current_consents(patients, "pat_001") == {
        "location": True, "history": True, "vitals": True, "reports": False}


def test_one_patient_does_not_affect_another(patients):
    grant_all(patients)
    assert not any(svc.current_consents(patients, "pat_002").values())


def test_history_lists_every_change_in_order(patients):
    svc.update_consents(patients, PATIENT, "pat_001", {"history": True}); patients.commit()
    svc.update_consents(patients, PATIENT, "pat_001", {"location": True}); patients.commit()
    svc.update_consents(patients, PATIENT, "pat_001", {"history": False}); patients.commit()
    history = svc.consent_history(patients, PATIENT, "pat_001")
    assert [(h["field"], h["granted"]) for h in history] == [("history", True), ("location", True), ("history", False)]
    assert all(h["actor"] == "usr_001" and h["actor_role"] == "PATIENT" for h in history)
    stamps = [h["timestamp"] for h in history]
    assert stamps == sorted(stamps) and stamps[0].endswith("Z")


def test_latest_row_wins(patients):
    svc.update_consents(patients, PATIENT, "pat_001", {"vitals": True}); patients.commit()
    svc.update_consents(patients, PATIENT, "pat_001", {"vitals": False}); patients.commit()
    assert svc.current_consents(patients, "pat_001")["vitals"] is False


def test_unchanged_value_adds_no_row(patients):
    svc.update_consents(patients, PATIENT, "pat_001", {"history": True}); patients.commit()
    assert svc.update_consents(patients, PATIENT, "pat_001", {"history": True}) == []
    patients.commit()
    assert patients.query(ConsentLedger).count() == 1


def test_update_returns_only_changed_fields(patients):
    svc.update_consents(patients, PATIENT, "pat_001", {"history": True}); patients.commit()
    changed = svc.update_consents(patients, PATIENT, "pat_001", {"history": True, "location": True})
    assert changed == ["location"]


def test_unknown_field_and_non_boolean_are_rejected(patients):
    with pytest.raises(svc.UnknownConsentFieldError):
        svc.update_consents(patients, PATIENT, "pat_001", {"photos": True})
    for bad in ("yes", 1, None):
        with pytest.raises(ValueError):
            svc.update_consents(patients, PATIENT, "pat_001", {"history": bad})
    assert patients.query(ConsentLedger).count() == 0


# ------------------------------------------------------------ revoked consent takes effect at once

def test_revoking_history_removes_it_on_the_very_next_call(patients):
    grant_all(patients)
    before = svc.consented_view(patients, "pat_001", PASSPORT)
    assert before["conditions"] == ["hypertension"]

    svc.update_consents(patients, PATIENT, "pat_001", {"history": False}); patients.commit()
    after = svc.consented_view(patients, "pat_001", PASSPORT)
    for key in ("conditions", "allergies", "medications"):
        assert key not in after                      # omitted, not null
    assert after["vitals"] == {"heart_rate": 72}     # other consents untouched


def test_no_consent_means_no_sensitive_fields_at_all(patients):
    view = svc.consented_view(patients, "pat_001", PASSPORT)
    assert set(view) == {"patient_id", "name", "age", "blood_group", "contacts"}
    assert None not in view.values()


def test_location_consent_drops_every_location_field(patients):
    data = {"lat": 1, "lng": 2, "accuracy": 3, "location": {"lat": 1}, "map_link": "http://map", "type": "HEART"}
    assert svc.apply_consent(data, {"location": False}) == {"type": "HEART"}
    assert svc.apply_consent(data, {"location": True}) == data


def test_reports_and_vitals_follow_their_own_flags(patients):
    grant_all(patients, reports=False, vitals=False)
    view = svc.consented_view(patients, "pat_001", PASSPORT)
    assert "reports" not in view and "vitals" not in view and "conditions" in view


def test_shared_fields_lists_granted_names(patients):
    grant_all(patients, reports=False)
    assert svc.shared_fields(svc.current_consents(patients, "pat_001")) == ["location", "history", "vitals"]


def test_every_sensitive_passport_field_is_mapped():
    sensitive = {"conditions", "allergies", "medications", "vitals", "reports", "location", "lat", "lng", "map_link"}
    assert sensitive <= set(svc.FIELD_CONSENT)


# ------------------------------------------------------------ who may do what

@pytest.mark.parametrize("actor", [STAFF, ADMIN, FAMILY, RESPONDER, OTHER_PATIENT])
def test_nobody_but_the_patient_can_change_consent(patients, actor):
    with pytest.raises(svc.ConsentPermissionError):
        svc.update_consents(patients, actor, "pat_001", {"history": True})
    assert patients.query(ConsentLedger).count() == 0


def test_patient_can_change_their_own(patients):
    assert svc.update_consents(patients, PATIENT, "pat_001", {"history": True}) == ["history"]


def test_patient_cannot_change_another_patient(patients):
    with pytest.raises(svc.ConsentPermissionError):
        svc.update_consents(patients, PATIENT, "pat_002", {"history": True})


def test_admin_can_read_but_staff_family_and_other_patients_cannot(patients):
    assert svc.get_consents_for(patients, ADMIN, "pat_001")
    assert svc.consent_history(patients, ADMIN, "pat_001") == []
    for actor in (STAFF, FAMILY, RESPONDER, OTHER_PATIENT):
        with pytest.raises(svc.ConsentPermissionError):
            svc.get_consents_for(patients, actor, "pat_001")
        with pytest.raises(svc.ConsentPermissionError):
            svc.consent_history(patients, actor, "pat_001")


# ------------------------------------------------------------ append-only

def make_row(session):
    grant_all(session, reports=False)
    return session.query(ConsentLedger).first()


def test_orm_update_is_blocked(patients):
    row = make_row(patients)
    row.granted = not row.granted
    with pytest.raises(AppendOnlyError):
        patients.commit()
    patients.rollback()


def test_orm_delete_is_blocked(patients):
    row = make_row(patients)
    patients.delete(row)
    with pytest.raises(AppendOnlyError):
        patients.commit()
    patients.rollback()


def test_bulk_update_is_blocked_by_the_database_trigger(patients):
    make_row(patients)
    with pytest.raises(DBAPIError, match="append-only"):
        patients.query(ConsentLedger).update({"granted": False})
    patients.rollback()


def test_raw_sql_update_and_delete_are_blocked_by_the_trigger(patients):
    make_row(patients)
    for sql in ("UPDATE consents SET granted = 0", "DELETE FROM consents"):
        with pytest.raises(DBAPIError, match="append-only"):
            patients.execute(text(sql))
        patients.rollback()
    assert patients.query(ConsentLedger).count() == 3


def test_invalid_field_is_rejected_by_the_database(patients):
    with pytest.raises(DBAPIError):
        patients.execute(text(
            "INSERT INTO consents (patient_id, field, granted, created_at, actor, actor_role) "
            "VALUES ('pat_001', 'photos', 1, '2026-11-16 10:00:00', 'x', 'PATIENT')"))
    patients.rollback()


def test_ledger_rows_must_belong_to_a_real_patient(patients):
    with pytest.raises(DBAPIError):
        patients.execute(text(
            "INSERT INTO consents (patient_id, field, granted, created_at, actor, actor_role) "
            "VALUES ('pat_999', 'history', 1, '2026-11-16 10:00:00', 'x', 'PATIENT')"))
    patients.rollback()


# ------------------------------------------------------------ the demo reset exception

def test_demo_reset_clears_the_ledger_only_in_demo_mode(patients, monkeypatch):
    make_row(patients)
    with pytest.raises(AppendOnlyError):
        svc.demo_reset_ledger(patients)
    assert patients.query(ConsentLedger).count() == 3

    monkeypatch.setenv("DEMO_MODE", "true")
    svc.demo_reset_ledger(patients)
    patients.commit()
    assert patients.query(ConsentLedger).count() == 0


def test_triggers_are_back_after_a_demo_reset(patients, monkeypatch):
    monkeypatch.setenv("DEMO_MODE", "true")
    make_row(patients)
    svc.demo_reset_ledger(patients)
    patients.commit()
    make_row(patients)
    with pytest.raises(DBAPIError, match="append-only"):
        patients.execute(text("DELETE FROM consents"))
    patients.rollback()
