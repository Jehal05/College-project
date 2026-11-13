"""Audit log: what may be stored, append-only, filters (feature 50)."""
import json
from datetime import datetime, timedelta

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

from app.models.append_only import AppendOnlyError
from app.models.audit import AuditLog
from app.security.actor import Actor
from app.services import audit

STAFF = Actor("usr_010", "HOSPITAL_STAFF")
PATIENT = Actor("usr_001", "PATIENT", "pat_001")


def add(session, **kw):
    base = dict(action="passport.view", resource_type="passport", resource_id="pat_001",
                patient_id="pat_001", outcome="allowed", actor=STAFF)
    base.update(kw)
    return audit.record(session, **base)


# ------------------------------------------------------------ what a row holds

def test_row_records_who_what_outcome_and_field_names(patients):
    row = add(patients, fields_released=["vitals", "history"])
    item = audit.to_dict(row)
    assert item["user_id"] == "usr_010" and item["role"] == "HOSPITAL_STAFF"
    assert item["action"] == "passport.view" and item["resource_type"] == "passport"
    assert item["resource_id"] == "pat_001" and item["patient_id"] == "pat_001"
    assert item["outcome"] == "allowed" and item["reason"] is None
    assert item["fields_released"] == ["history", "vitals"]          # sorted names
    assert item["timestamp"].endswith("Z")


def test_token_and_anonymous_viewers_have_their_own_roles(patients):
    via_token = add(patients, actor=None, via_token=True)
    nobody = add(patients, actor=None, outcome="denied", reason="missing_credentials")
    assert (via_token.user_id, via_token.role) == (None, "TOKEN")
    assert (nobody.user_id, nobody.role) == (None, "ANONYMOUS")


def test_denied_row_keeps_its_reason(patients):
    row = add(patients, outcome="denied", reason="expired_token", actor=None)
    assert row.outcome == "denied" and row.reason == "expired_token"


@pytest.mark.parametrize("kwargs", [
    {"outcome": "maybe"},
    {"action": "PassportView"}, {"action": "passport"}, {"action": "passport.view; DROP TABLE x"},
    {"action": "passport.view\n"}, {"resource_type": "passport\n"}, {"fields_released": ["history\n"]},
    {"resource_type": "Passport"}, {"resource_type": "a b"},
    {"reason": "the token eyJhbGciOi.abc.def was bad"}, {"reason": "free text is not allowed"},
    {"fields_released": ["hypertension 123"]}, {"fields_released": ["eyJhbGciOiJIUzI1NiJ9.abc.def"]},
    {"fields_released": ["+91-9876543210"]}, {"fields_released": ["History"]},
])
def test_writer_refuses_anything_that_could_hold_a_secret_or_a_value(patients, kwargs):
    with pytest.raises(ValueError):
        add(patients, **kwargs)
    assert patients.query(AuditLog).count() == 0


@pytest.mark.parametrize("junk", ["eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJwYXRfMDAxIn0.sig", "x" * 100, "pat 001", "pat/001", "pat_001\n"])
def test_junk_ids_are_replaced_not_stored(patients, junk):
    row = add(patients, resource_id=junk, patient_id=junk)
    assert row.resource_id == audit.INVALID_ID and row.patient_id == audit.INVALID_ID


def test_missing_ids_stay_empty(patients):
    row = add(patients, resource_id=None, patient_id=None)
    assert row.resource_id is None and row.patient_id is None


def test_emergency_read_helper(patients):
    row = audit.record_emergency_read(patients, emergency_id="em_001", outcome="allowed", actor=STAFF,
                                      patient_id="pat_001", fields_released=["location"])
    assert row.action == "emergency.read" and row.resource_type == "emergency"
    assert json.loads(row.fields_released) == ["location"]


# ------------------------------------------------------------ append-only

def test_orm_update_is_blocked(patients):
    row = add(patients)
    row.outcome = "denied"
    with pytest.raises(AppendOnlyError):
        patients.commit()
    patients.rollback()


def test_orm_delete_is_blocked(patients):
    patients.delete(add(patients))
    with pytest.raises(AppendOnlyError):
        patients.commit()
    patients.rollback()


def test_bulk_update_is_blocked_by_the_trigger(patients):
    add(patients)
    with pytest.raises(DBAPIError, match="append-only"):
        patients.query(AuditLog).update({"outcome": "denied"})
    patients.rollback()


@pytest.mark.parametrize("sql", ["UPDATE audit_log SET outcome = 'denied'", "DELETE FROM audit_log"])
def test_raw_sql_edit_and_delete_are_blocked_by_the_trigger(patients, sql):
    add(patients)
    with pytest.raises(DBAPIError, match="append-only"):
        patients.execute(text(sql))
    patients.rollback()
    assert patients.query(AuditLog).count() == 1


def test_database_rejects_a_bad_outcome(patients):
    with pytest.raises(DBAPIError):
        patients.execute(text(
            "INSERT INTO audit_log (timestamp, role, action, resource_type, outcome, fields_released) "
            "VALUES ('2026-11-16 10:00:00', 'ADMIN', 'passport.view', 'passport', 'maybe', '[]')"))
    patients.rollback()


def test_demo_reset_clears_only_in_demo_mode_and_restores_the_triggers(patients, monkeypatch):
    from app.models.append_only import reset_table
    add(patients)
    with pytest.raises(AppendOnlyError):
        reset_table(patients, "audit_log", "audit log")
    assert patients.query(AuditLog).count() == 1

    monkeypatch.setenv("DEMO_MODE", "true")
    reset_table(patients, "audit_log", "audit log")
    patients.commit()
    assert patients.query(AuditLog).count() == 0

    add(patients)
    with pytest.raises(DBAPIError, match="append-only"):
        patients.execute(text("DELETE FROM audit_log"))
    patients.rollback()


# ------------------------------------------------------------ filters and paging

T0 = datetime(2026, 11, 16, 10, 0, 0)


@pytest.fixture
def sample(patients):
    def row(minutes, **kw):
        fields = dict(timestamp=T0 + timedelta(minutes=minutes), user_id="usr_010", role="HOSPITAL_STAFF",
                      action="passport.view", resource_type="passport", resource_id="pat_001",
                      patient_id="pat_001", outcome="allowed", reason=None, fields_released="[]")
        fields.update(kw)
        patients.add(AuditLog(**fields))
    row(0)
    row(10, patient_id="pat_002", resource_id="pat_002")
    row(20, user_id="usr_011")
    row(30, action="emergency.read", resource_type="emergency", resource_id="em_001")
    row(40, user_id=None, role="ANONYMOUS", outcome="denied", reason="missing_credentials")
    patients.commit()
    return patients


def test_no_filters_returns_everything_newest_first(sample):
    items, total = audit.query_audit(sample)
    assert total == 5 and [i["id"] for i in items] == [5, 4, 3, 2, 1]


def test_filter_by_patient(sample):
    items, total = audit.query_audit(sample, patient_id="pat_002")
    assert total == 1 and items[0]["patient_id"] == "pat_002"


def test_filter_by_user(sample):
    assert audit.query_audit(sample, user_id="usr_011")[1] == 1
    assert audit.query_audit(sample, user_id="usr_010")[1] == 3


def test_filter_by_action(sample):
    items, total = audit.query_audit(sample, action="emergency.read")
    assert total == 1 and items[0]["resource_id"] == "em_001"


def test_filter_by_time_range_is_inclusive(sample):
    items, total = audit.query_audit(sample, start=T0 + timedelta(minutes=10), end=T0 + timedelta(minutes=30))
    assert total == 3 and [i["id"] for i in items] == [4, 3, 2]


def test_filters_combine(sample):
    items, total = audit.query_audit(sample, user_id="usr_010", action="passport.view", patient_id="pat_001")
    assert total == 1 and items[0]["id"] == 1


def test_denied_attempts_are_in_the_results(sample):
    items, _ = audit.query_audit(sample, start=T0 + timedelta(minutes=40))
    assert items[0]["outcome"] == "denied" and items[0]["reason"] == "missing_credentials"


def test_paging(sample):
    page1, total = audit.query_audit(sample, page=1, page_size=2)
    page2, _ = audit.query_audit(sample, page=2, page_size=2)
    page3, _ = audit.query_audit(sample, page=3, page_size=2)
    beyond, _ = audit.query_audit(sample, page=4, page_size=2)
    assert total == 5
    assert [i["id"] for i in page1 + page2 + page3] == [5, 4, 3, 2, 1]
    assert beyond == []


def test_page_size_is_capped(sample):
    _items, _ = audit.query_audit(sample, page_size=10_000)
    assert audit.MAX_PAGE_SIZE == 200
