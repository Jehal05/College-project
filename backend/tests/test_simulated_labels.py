"""Every response that describes a patient carries "simulated": true, and nothing claims a dispatch."""
import re

import pytest

from app.security.actor import Actor
from app.security.passport_token import create_passport_token

PATIENT = Actor("usr_001", "PATIENT", "pat_001")
ADMIN = Actor("usr_020", "ADMIN")


def call_health(api):
    return api.get("/health")


def call_passport(api):
    return api.get(f"/passport/pat_001?token={create_passport_token('pat_001')}")


def call_consents(api):
    api.login_as(PATIENT)
    return api.get("/patients/pat_001/consents")


def call_consent_update(api):
    api.login_as(PATIENT)
    return api.put("/patients/pat_001/consents", json={"history": True})


def call_consent_history(api):
    api.login_as(PATIENT)
    return api.get("/patients/pat_001/consents/history")


def call_insights(api):
    api.login_as(PATIENT)
    return api.get("/patients/pat_001/insights")


def call_audit(api):
    api.login_as(ADMIN)
    return api.get("/audit")


def call_demo_vitals(api):
    api.login_as(PATIENT)
    return api.post("/demo/vitals", json={"profile": "asthma"})


@pytest.fixture(autouse=True)
def demo_mode_on(monkeypatch):
    monkeypatch.setenv("DEMO_MODE", "true")


CALLS = [call_health, call_passport, call_consents, call_consent_update, call_consent_history,
         call_insights, call_audit, call_demo_vitals]


@pytest.mark.parametrize("call", CALLS, ids=lambda c: c.__name__)
def test_the_response_is_labelled_simulated(api, call):
    response = call(api)
    assert response.status_code == 200, response.text
    assert response.json()["simulated"] is True


@pytest.mark.parametrize("call", CALLS, ids=lambda c: c.__name__)
def test_no_response_claims_a_dispatch(api, call):
    words = set(re.findall(r"[a-z_]+", call(api).text.lower()))
    assert not (words & {"dispatched", "ambulance_dispatched"})


def test_the_passport_names_what_it_shares_and_is_labelled(api):
    body = call_passport(api).json()
    assert body["simulated"] is True and "shared_fields" in body
