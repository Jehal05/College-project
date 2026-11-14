"""GET /audit (feature 50)."""
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models.audit import AuditLog
from app.security.actor import Actor
from app.security.passport_token import create_passport_token

ADMIN = Actor("usr_020", "ADMIN")
STAFF = Actor("usr_010", "HOSPITAL_STAFF")
PATIENT = Actor("usr_001", "PATIENT", "pat_001")
FAMILY = Actor("usr_030", "FAMILY")
RESPONDER = Actor("usr_040", "RESPONDER")

T0 = datetime(2026, 11, 16, 10, 0, 0)


@pytest.fixture
def seeded(engine, patients):
    with Session(engine) as s:
        def row(minutes, **kw):
            data = dict(timestamp=T0 + timedelta(minutes=minutes), user_id="usr_010", role="HOSPITAL_STAFF",
                        action="passport.view", resource_type="passport", resource_id="pat_001",
                        patient_id="pat_001", outcome="allowed", reason=None, fields_released='["history"]')
            data.update(kw)
            s.add(AuditLog(**data))
        row(0)
        row(10, patient_id="pat_002", resource_id="pat_002", fields_released="[]")
        row(20, user_id="usr_011")
        row(30, action="emergency.read", resource_type="emergency", resource_id="em_001")
        row(40, user_id=None, role="ANONYMOUS", outcome="denied", reason="expired_token", fields_released="[]")
        s.commit()


def ids(response):
    return [i["id"] for i in response.json()["items"]]


def test_endpoint_needs_a_login():
    app.dependency_overrides.clear()
    assert TestClient(app).get("/audit").status_code == 401


@pytest.mark.parametrize("actor", [PATIENT, STAFF, FAMILY, RESPONDER])
def test_only_admin_can_read_the_audit_log(api, seeded, actor):
    api.login_as(actor)
    assert api.get("/audit").status_code == 403


def test_admin_gets_rows_newest_first_with_totals(api, seeded):
    api.login_as(ADMIN)
    body = api.get("/audit").json()
    assert body["total"] == 5 and body["page"] == 1 and body["page_size"] == 50 and body["simulated"] is True
    assert [i["id"] for i in body["items"]] == [5, 4, 3, 2, 1]
    assert body["items"][-1]["fields_released"] == ["history"]


def test_filter_by_patient(api, seeded):
    api.login_as(ADMIN)
    assert ids(api.get("/audit?patient_id=pat_002")) == [2]


def test_filter_by_user(api, seeded):
    api.login_as(ADMIN)
    assert ids(api.get("/audit?user_id=usr_011")) == [3]


def test_filter_by_action(api, seeded):
    api.login_as(ADMIN)
    assert ids(api.get("/audit?action=emergency.read")) == [4]


def test_filter_by_time_range(api, seeded):
    api.login_as(ADMIN)
    response = api.get("/audit?from=2026-11-16T10:10:00Z&to=2026-11-16T10:30:00Z")
    assert ids(response) == [4, 3, 2]


def test_time_with_an_offset_is_converted_to_utc(api, seeded):
    api.login_as(ADMIN)
    # 15:40+05:30 is 10:10 UTC
    assert ids(api.get("/audit?from=2026-11-16T15:40:00%2B05:30&to=2026-11-16T15:40:00%2B05:30")) == [2]


def test_filters_combine(api, seeded):
    api.login_as(ADMIN)
    assert ids(api.get("/audit?user_id=usr_010&action=passport.view&patient_id=pat_001")) == [1]


def test_no_match_gives_an_empty_page(api, seeded):
    api.login_as(ADMIN)
    body = api.get("/audit?patient_id=pat_404").json()
    assert body["items"] == [] and body["total"] == 0


def test_paging(api, seeded):
    api.login_as(ADMIN)
    assert ids(api.get("/audit?page_size=2&page=1")) == [5, 4]
    assert ids(api.get("/audit?page_size=2&page=2")) == [3, 2]
    assert ids(api.get("/audit?page_size=2&page=3")) == [1]
    assert ids(api.get("/audit?page_size=2&page=4")) == []
    assert api.get("/audit?page_size=2").json()["total"] == 5


@pytest.mark.parametrize("query", ["page=0", "page_size=0", "page_size=201", "page=abc"])
def test_bad_paging_is_400(api, seeded, query):
    api.login_as(ADMIN)
    assert api.get(f"/audit?{query}").status_code == 400


@pytest.mark.parametrize("query", ["from=yesterday", "to=2026-13-45", "from=16/11/2026"])
def test_bad_dates_are_400(api, seeded, query):
    api.login_as(ADMIN)
    assert api.get(f"/audit?{query}").status_code == 400


def test_denied_passport_attempts_show_up_for_the_admin(api, patients):
    api.get("/passport/pat_001?token=junk")                       # denied
    api.get(f"/passport/pat_001?token={create_passport_token('pat_001')}")   # allowed
    api.login_as(ADMIN)
    items = api.get("/audit?patient_id=pat_001").json()["items"]
    assert [(i["outcome"], i["reason"]) for i in items] == [("allowed", None), ("denied", "tampered_token")]


def test_the_endpoint_cannot_change_the_log(api, seeded):
    api.login_as(ADMIN)
    for method in ("put", "patch", "delete", "post"):
        assert getattr(api, method)("/audit").status_code == 405
