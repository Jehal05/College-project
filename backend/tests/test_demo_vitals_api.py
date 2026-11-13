"""Tests for POST /demo/vitals."""
import pytest
from fastapi.testclient import TestClient

from app.api.demo_vitals import require_admin
from app.main import app
from app.sim.wearable import registry


@pytest.fixture(autouse=True)
def clean_state():
    registry.reset_all()
    app.dependency_overrides.clear()
    yield
    registry.reset_all()
    app.dependency_overrides.clear()


@pytest.fixture
def admin_client():
    app.dependency_overrides[require_admin] = lambda: None
    return TestClient(app)


def test_endpoint_fails_closed_without_admin_auth():
    response = TestClient(app).post("/demo/vitals", json={"profile": "asthma"})
    assert response.status_code == 501
    assert registry.get("pat_001").profile == "normal"


def test_profile_switch(admin_client):
    response = admin_client.post("/demo/vitals", json={"profile": "heart_attack"})
    assert response.status_code == 200
    body = response.json()
    assert body["profile"] == "heart_attack" and body["simulated"] is True
    assert body["patient_id"] == "pat_001"


def test_scenario_name_is_accepted(admin_client):
    assert admin_client.post("/demo/vitals", json={"profile": "STROKE"}).json()["profile"] == "stroke"


def test_override_is_applied_and_shows_in_the_stream(admin_client):
    admin_client.post("/demo/vitals", json={"overrides": {"heart_rate": 150}})
    assert registry.get("pat_001").tick().values["heart_rate"] == 150


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
    assert registry.get("pat_001").profile == "normal"


def test_empty_body_is_400(admin_client):
    assert admin_client.post("/demo/vitals", json={}).status_code == 400


def test_unknown_profile_is_400_and_changes_nothing(admin_client):
    response = admin_client.post("/demo/vitals", json={"profile": "pirate", "overrides": {"heart_rate": 90}})
    assert response.status_code == 400
    assert registry.get("pat_001").overrides == {}


def test_bad_override_is_400(admin_client):
    for bad in ({"temperature": 37}, {"spo2": 150}):
        assert admin_client.post("/demo/vitals", json={"overrides": bad}).status_code == 400


def test_unknown_field_is_422(admin_client):
    assert admin_client.post("/demo/vitals", json={"profile": "asthma", "color": "red"}).status_code == 422


def test_health_endpoint_still_works():
    assert TestClient(app).get("/health").json()["simulated"] is True
