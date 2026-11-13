"""Consent endpoints (feature 51)."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import get_current_actor
from app.db import get_db
from app.main import app
from app.security.actor import Actor

PATIENT = Actor("usr_001", "PATIENT", "pat_001")
OTHER_PATIENT = Actor("usr_002", "PATIENT", "pat_002")
STAFF = Actor("usr_010", "HOSPITAL_STAFF")
ADMIN = Actor("usr_020", "ADMIN")
FAMILY = Actor("usr_030", "FAMILY")


@pytest.fixture
def client(engine, patients):
    state = {"actor": PATIENT}

    def db_override():
        with Session(engine, expire_on_commit=False) as s:
            yield s

    app.dependency_overrides[get_db] = db_override
    app.dependency_overrides[get_current_actor] = lambda: state["actor"]
    test_client = TestClient(app)
    test_client.as_actor = lambda actor: state.update(actor=actor)
    yield test_client
    app.dependency_overrides.clear()


def test_endpoints_need_a_login():
    app.dependency_overrides.clear()
    c = TestClient(app)
    assert c.get("/patients/pat_001/consents").status_code == 401
    assert c.put("/patients/pat_001/consents", json={"history": True}).status_code == 401
    assert c.get("/patients/pat_001/consents/history").status_code == 401


def test_default_is_no_consent(client):
    body = client.get("/patients/pat_001/consents").json()
    assert body["consents"] == {"location": False, "history": False, "vitals": False, "reports": False}
    assert body["simulated"] is True


def test_patient_updates_and_reads_back(client):
    response = client.put("/patients/pat_001/consents", json={"history": True, "location": True})
    assert response.status_code == 200
    assert sorted(response.json()["changed"]) == ["history", "location"]
    assert client.get("/patients/pat_001/consents").json()["consents"]["history"] is True


def test_revoking_shows_on_the_next_request(client):
    client.put("/patients/pat_001/consents", json={"history": True})
    client.put("/patients/pat_001/consents", json={"history": False})
    assert client.get("/patients/pat_001/consents").json()["consents"]["history"] is False


def test_history_endpoint_lists_changes_in_order(client):
    client.put("/patients/pat_001/consents", json={"history": True})
    client.put("/patients/pat_001/consents", json={"location": True})
    client.put("/patients/pat_001/consents", json={"history": False})
    history = client.get("/patients/pat_001/consents/history").json()["history"]
    assert [(h["field"], h["granted"]) for h in history] == [("history", True), ("location", True), ("history", False)]


def test_unchanged_put_reports_no_change(client):
    client.put("/patients/pat_001/consents", json={"history": True})
    assert client.put("/patients/pat_001/consents", json={"history": True}).json()["changed"] == []


def test_empty_body_is_400(client):
    assert client.put("/patients/pat_001/consents", json={}).status_code == 400


@pytest.mark.parametrize("body", [{"photos": True}, {"history": "yes"}, {"history": 1}, {"history": None, "x": 1}])
def test_bad_body_is_400(client, body):
    assert client.put("/patients/pat_001/consents", json=body).status_code == 400


@pytest.mark.parametrize("actor", [STAFF, ADMIN, FAMILY, OTHER_PATIENT])
def test_others_cannot_change_consent(client, actor):
    client.as_actor(actor)
    assert client.put("/patients/pat_001/consents", json={"history": True}).status_code == 403
    client.as_actor(PATIENT)
    assert client.get("/patients/pat_001/consents").json()["consents"]["history"] is False


def test_admin_has_read_only_access(client):
    client.as_actor(ADMIN)
    assert client.get("/patients/pat_001/consents").status_code == 200
    assert client.get("/patients/pat_001/consents/history").status_code == 200


@pytest.mark.parametrize("actor", [STAFF, FAMILY, OTHER_PATIENT])
def test_others_cannot_read_consent(client, actor):
    client.as_actor(actor)
    assert client.get("/patients/pat_001/consents").status_code == 403
    assert client.get("/patients/pat_001/consents/history").status_code == 403


def test_unknown_patient_is_404_for_admin_but_403_for_a_patient(client):
    client.as_actor(ADMIN)
    assert client.get("/patients/pat_999/consents").status_code == 404
    client.as_actor(PATIENT)
    assert client.get("/patients/pat_999/consents").status_code == 403  # no hint that it exists


def test_update_unknown_patient_is_404_for_that_patient_only(client):
    client.as_actor(Actor("usr_099", "PATIENT", "pat_999"))
    assert client.put("/patients/pat_999/consents", json={"history": True}).status_code == 404
