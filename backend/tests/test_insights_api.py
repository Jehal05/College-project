"""GET /patients/{id}/insights (feature 54): access, consent, audit, safety."""
import re
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import get_family_link_checker, get_history_provider
from app.main import app
from app.models.audit import AuditLog
from app.rules.engine import evaluate
from app.security.actor import Actor
from app.services import audit
from app.services import consent as consent_service
from app.services.wording import find_banned
from app.sim.history import History, generate_history

PATIENT = Actor("usr_001", "PATIENT", "pat_001")
OTHER_PATIENT = Actor("usr_002", "PATIENT", "pat_002")
STAFF = Actor("usr_010", "HOSPITAL_STAFF")
ADMIN = Actor("usr_020", "ADMIN")
FAMILY = Actor("usr_030", "FAMILY")
RESPONDER = Actor("usr_040", "RESPONDER")

REF = date(2026, 11, 16)
URL = "/patients/pat_001/insights"


def audit_rows(engine):
    with Session(engine) as s:
        return [audit.to_dict(r) for r in s.query(AuditLog).order_by(AuditLog.id)]


def share(engine, **flags):
    with Session(engine) as s:
        consent_service.update_consents(s, PATIENT, "pat_001", flags)
        s.commit()


def link_family(linked=True):
    app.dependency_overrides[get_family_link_checker] = lambda: (lambda session, actor, patient_id: linked)


def use_history(maker):
    app.dependency_overrides[get_history_provider] = lambda: maker


# ------------------------------------------------------------ the patient reads their own

def test_endpoint_fails_closed_without_login():
    app.dependency_overrides.clear()
    assert TestClient(app).get(URL).status_code == 501


def test_patient_reads_their_own_insights(api, engine):
    use_history(lambda pid: generate_history(pid, reference_date=REF))
    api.login_as(PATIENT)
    response = api.get(URL)
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"patient_id", "period_days", "sleep", "activity", "stress", "summary",
                         "wording_review", "data_note", "simulated"}
    assert body["patient_id"] == "pat_001" and body["period_days"] == 7 and body["simulated"] is True
    assert body["wording_review"] == "pending doctor review"
    assert body["data_note"] == "based on simulated wearable data, not a diagnosis"
    assert [body[p]["status"] for p in ("sleep", "activity", "stress")] == ["ok"] * 3


def test_default_provider_also_works(api):
    api.login_as(PATIENT)
    assert api.get(URL).json()["sleep"]["status"] == "ok"


def test_a_patient_reading_their_own_data_writes_no_audit_row(api, engine):
    api.login_as(PATIENT)
    api.get(URL)
    assert audit_rows(engine) == []


def test_unknown_patient_is_404_for_that_patient(api):
    api.login_as(Actor("usr_099", "PATIENT", "pat_999"))
    assert api.get("/patients/pat_999/insights").status_code == 404


def test_same_data_every_time(api):
    api.login_as(PATIENT)
    assert api.get(URL).json() == api.get(URL).json()


# ------------------------------------------------------------ everyone else is refused and logged

@pytest.mark.parametrize("actor", [STAFF, ADMIN, RESPONDER, FAMILY, OTHER_PATIENT])
def test_others_are_403_and_the_attempt_is_logged(api, engine, actor):
    api.login_as(actor)
    response = api.get(URL)
    assert response.status_code == 403
    [row] = audit_rows(engine)
    assert (row["action"], row["outcome"], row["reason"]) == ("insights.read", "denied", "forbidden_role")
    assert (row["user_id"], row["role"], row["patient_id"]) == (actor.user_id, actor.role, "pat_001")
    assert row["resource_type"] == "insights" and row["fields_released"] == []


def test_a_refusal_leaks_no_data(api):
    api.login_as(STAFF)
    text = api.get(URL).text
    assert "sleep" not in text.lower() and "steps" not in text.lower()


def test_an_unlinked_family_member_gets_no_hint_about_links_or_consent(api, engine):
    share(engine, vitals=True)                       # consent is on, but nobody is linked yet
    api.login_as(FAMILY)
    assert api.get(URL).status_code == 403
    assert audit_rows(engine)[0]["reason"] == "forbidden_role"


# ------------------------------------------------------------ linked family: vitals consent decides

def test_linked_family_with_vitals_consent_can_read_and_is_logged(api, engine):
    link_family()
    share(engine, vitals=True)
    api.login_as(FAMILY)
    response = api.get(URL)
    assert response.status_code == 200 and response.json()["patient_id"] == "pat_001"
    [row] = audit_rows(engine)
    assert (row["outcome"], row["reason"], row["role"], row["user_id"]) == ("allowed", None, "FAMILY", "usr_030")
    assert row["fields_released"] == ["vitals"]


def test_linked_family_without_vitals_consent_is_refused_and_logged(api, engine):
    link_family()
    api.login_as(FAMILY)
    assert api.get(URL).status_code == 403
    [row] = audit_rows(engine)
    assert (row["outcome"], row["reason"]) == ("denied", "consent_missing")


def test_other_consents_do_not_unlock_insights(api, engine):
    link_family()
    share(engine, history=True, location=True, reports=True)
    api.login_as(FAMILY)
    assert api.get(URL).status_code == 403


def test_revoking_vitals_consent_blocks_the_very_next_request(api, engine):
    link_family()
    api.login_as(FAMILY)
    share(engine, vitals=True)
    assert api.get(URL).status_code == 200
    share(engine, vitals=False)
    assert api.get(URL).status_code == 403
    share(engine, vitals=True)
    assert api.get(URL).status_code == 200
    assert [r["outcome"] for r in audit_rows(engine)] == ["allowed", "denied", "allowed"]


def test_linked_family_member_of_another_patient_is_still_refused(api, engine):
    link_family(linked=False)
    share(engine, vitals=True)
    api.login_as(FAMILY)
    assert api.get(URL).status_code == 403


# ------------------------------------------------------------ data variants through the API

def test_empty_history_gives_not_enough_data(api):
    use_history(lambda pid: History.empty(pid))
    api.login_as(PATIENT)
    body = api.get(URL).json()
    assert body["period_days"] == 0
    assert [body[p]["status"] for p in ("sleep", "activity", "stress")] == ["not_enough_data"] * 3
    assert "not enough data" in body["summary"]


@pytest.mark.parametrize("profile, band", [("calm", "lower"), ("typical", "typical"), ("stressed", "higher")])
def test_profiles_show_through_the_api(api, profile, band):
    use_history(lambda pid: generate_history(pid, profile=profile, reference_date=REF))
    api.login_as(PATIENT)
    assert api.get(URL).json()["stress"]["band"] == band


# ------------------------------------------------------------ safety and honesty

def test_response_text_has_no_diagnosis_or_urgency_words(api):
    api.login_as(PATIENT)
    body = api.get(URL).text
    assert find_banned(body.replace("not a diagnosis", "")) == []


def test_response_has_no_severity_fields_or_words(api):
    api.login_as(PATIENT)
    words = set(re.findall(r"[a-z]+", api.get(URL).text.lower()))
    assert not (words & {"severity", "emergency", "urgent", "watch", "alert", "notify", "dispatched"})


def test_the_rules_engine_answers_the_same_after_an_insights_call(api):
    cases = [(["chest_pain"], None), (None, {"heart_rate": 130}), (["wheeze"], {"spo2": 88}), (None, None)]
    before = [evaluate(s, v).to_dict() for s, v in cases]
    api.login_as(PATIENT)
    assert api.get(URL).status_code == 200
    assert [evaluate(s, v).to_dict() for s, v in cases] == before


def test_audit_rows_hold_names_only_never_insight_values(api, engine):
    link_family()
    share(engine, vitals=True)
    api.login_as(FAMILY)
    body = api.get(URL).json()
    api.login_as(STAFF)
    api.get(URL)
    dump = repr(audit_rows(engine))
    for value in (body["summary"], body["sleep"]["message"], str(body["sleep"]["avg_hours"]), "steps", "strain", "typical"):
        assert value not in dump, value


def test_no_nan_in_the_json(api):
    api.login_as(PATIENT)
    assert "NaN" not in api.get(URL).text
