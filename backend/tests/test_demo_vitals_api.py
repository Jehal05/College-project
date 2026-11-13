"""Tests for POST /demo/vitals."""
import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_current_actor
from app.main import app
from app.security.actor import Actor
from app.sim.wearable import registry


@pytest.fixture(autouse=True)
def clean_state(monkeypatch):
    monkeypatch.setenv("DEMO_MODE", "true")          # /demo endpoints exist only in demo mode
    registry.reset_all()
    app.dependency_overrides.clear()
    yield
    registry.reset_all()
    app.dependency_overrides.clear()


@pytest.fixture
def admin_client():
    """Any logged-in user may use /demo (it is demo mode only); the login itself is faked here."""
    app.dependency_overrides[get_current_actor] = lambda: Actor("usr_020", "ADMIN")
    return TestClient(app)


def test_endpoint_needs_a_login():
    response = TestClient(app).post("/demo/vitals", json={"profile": "asthma"})
    assert response.status_code == 401 and response.headers["www-authenticate"] == "Bearer"
    assert registry.get("PT-2026-0417").profile == "normal"


def test_endpoint_does_not_exist_outside_demo_mode(admin_client, monkeypatch):
    monkeypatch.setenv("DEMO_MODE", "false")
    assert admin_client.post("/demo/vitals", json={"profile": "asthma"}).status_code == 404
    assert TestClient(app).post("/demo/vitals", json={"profile": "asthma"}).status_code == 404    # not even a 401
    assert registry.get("PT-2026-0417").profile == "normal"


@pytest.mark.parametrize("role", ["PATIENT", "HOSPITAL_STAFF", "ADMIN", "FAMILY", "RESPONDER"])
def test_every_logged_in_role_may_use_the_demo_panel(role):
    app.dependency_overrides[get_current_actor] = lambda: Actor("usr_x", role, "PT-2026-0417" if role == "PATIENT" else None)
    assert TestClient(app).post("/demo/vitals", json={"profile": "asthma"}).status_code == 200


def test_profile_switch(admin_client):
    response = admin_client.post("/demo/vitals", json={"profile": "heart_attack"})
    assert response.status_code == 200
    body = response.json()
    assert body["profile"] == "heart_attack" and body["simulated"] is True
    assert body["patient_id"] == "PT-2026-0417"


def test_scenario_name_is_accepted(admin_client):
    assert admin_client.post("/demo/vitals", json={"profile": "STROKE"}).json()["profile"] == "stroke"


def test_override_is_applied_and_shows_in_the_stream(admin_client):
    admin_client.post("/demo/vitals", json={"overrides": {"heart_rate": 150}})
    assert registry.get("PT-2026-0417").tick().values["heart_rate"] == 150


def test_null_clears_one_override_and_empty_object_clears_all(admin_client):
    admin_client.post("/demo/vitals", json={"overrides": {"heart_rate": 150, "spo2": 85}})
    body = admin_client.post("/demo/vitals", json={"overrides": {"heart_rate": None}}).json()
    assert body["overrides"] == {"spo2": 85.0}
    body = admin_client.post("/demo/vitals", json={"overrides": {}}).json()
    assert body["overrides"] == {}


def test_profile_and_overrides_together(admin_client):
    body = admin_client.post("/demo/vitals", json={"profile": "asthma", "overrides": {"resp_rate": 35}}).json()
    assert body["profile"] == "asthma" and body["overrides"] == {"resp_rate": 35.0}


def test_other_patient_has_its_own_simulator(admin_client):
    admin_client.post("/demo/vitals", json={"patient_id": "pat_002", "profile": "asthma"})
    assert registry.get("pat_002").profile == "asthma"
    assert registry.get("PT-2026-0417").profile == "normal"


def test_empty_body_is_400(admin_client):
    assert admin_client.post("/demo/vitals", json={}).status_code == 400


def test_unknown_profile_is_400_and_changes_nothing(admin_client):
    response = admin_client.post("/demo/vitals", json={"profile": "pirate", "overrides": {"heart_rate": 90}})
    assert response.status_code == 400
    assert registry.get("PT-2026-0417").overrides == {}


def test_bad_override_is_400(admin_client):
    for bad in ({"temperature": 37}, {"spo2": 150}):
        assert admin_client.post("/demo/vitals", json={"overrides": bad}).status_code == 400


def test_unknown_field_is_400(admin_client):
    assert admin_client.post("/demo/vitals", json={"profile": "asthma", "color": "red"}).status_code == 400


def test_health_endpoint_still_works():
    assert TestClient(app).get("/health").json()["simulated"] is True


def test_the_default_patient_is_the_callers_own_patient():
    app.dependency_overrides[get_current_actor] = lambda: Actor("usr_x", "PATIENT", "PT-OWN-0001")
    body = TestClient(app).post("/demo/vitals", json={"profile": "stroke"}).json()
    assert body["patient_id"] == "PT-OWN-0001" and registry.get("PT-OWN-0001").profile == "stroke"
    assert registry.get("PT-2026-0417").profile == "normal"


def test_a_caller_without_a_patient_gets_the_demo_patient(admin_client):
    assert admin_client.post("/demo/vitals", json={"profile": "asthma"}).json()["patient_id"] == "PT-2026-0417"


def test_an_explicit_patient_id_wins(admin_client):
    body = admin_client.post("/demo/vitals", json={"patient_id": "PT-OTHER-9", "profile": "asthma"}).json()
    assert body["patient_id"] == "PT-OTHER-9"
