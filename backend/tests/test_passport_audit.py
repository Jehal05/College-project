"""Passport endpoint plus audit rows (features 11 and 50)."""
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.orm import Session

from app.models.audit import AuditLog
from app.models.patient_data import Contact, Report
from app.security.actor import Actor
from app.security.passport_token import create_passport_token
from app.services import audit
from app.services import consent as consent_service

PATIENT = Actor("usr_001", "PATIENT", "pat_001")
OTHER_PATIENT = Actor("usr_002", "PATIENT", "pat_002")
STAFF = Actor("usr_010", "HOSPITAL_STAFF")
ADMIN = Actor("usr_020", "ADMIN")
FAMILY = Actor("usr_030", "FAMILY")
RESPONDER = Actor("usr_040", "RESPONDER")

SECRETS = ["hypertension", "penicillin", "amlodipine", "9876543210", "9123456780", "ECG_Demo"]


@pytest.fixture
def full(patients):
    """Patient 1 with two contacts (stored out of order) and a report."""
    patients.add_all([
        Contact(patient_id="pat_001", name="Second Contact", phone="+91-9123456780", position=2),
        Contact(patient_id="pat_001", name="First Contact", phone="+91-9876543210", position=1),
        Report(id="rep_001", patient_id="pat_001", file_name="ECG_Demo_Patient.pdf"),
    ])
    patients.commit()
    return patients


def rows(engine):
    with Session(engine) as s:
        return [audit.to_dict(r) for r in s.query(AuditLog).order_by(AuditLog.id)]


def share(engine, **flags):
    with Session(engine) as s:
        consent_service.update_consents(s, PATIENT, "pat_001", flags)
        s.commit()


def get(api, patient="pat_001", token=None):
    url = f"/passport/{patient}" + (f"?token={token}" if token is not None else "")
    return api.get(url)


# ------------------------------------------------------------ allowed views

def test_valid_token_opens_the_passport_and_writes_one_allowed_row(api, engine, full):
    response = get(api, token=create_passport_token("pat_001"))
    assert response.status_code == 200
    body = response.json()
    assert body["patient_id"] == "pat_001" and body["name"] == "Demo Patient" and body["simulated"] is True
    [row] = rows(engine)
    assert row["action"] == "passport.view" and row["outcome"] == "allowed" and row["reason"] is None
    assert row["role"] == "TOKEN" and row["user_id"] is None
    assert row["resource_id"] == "pat_001" and row["patient_id"] == "pat_001"


def test_every_view_adds_exactly_one_row(api, engine, full):
    token = create_passport_token("pat_001")
    for count in (1, 2, 3):
        assert get(api, token=token).status_code == 200
        assert len(rows(engine)) == count


def test_logged_in_staff_view_records_the_user(api, engine, full):
    api.view_as(STAFF)
    assert get(api).status_code == 200
    [row] = rows(engine)
    assert (row["user_id"], row["role"], row["outcome"]) == ("usr_010", "HOSPITAL_STAFF", "allowed")


def test_patient_can_view_their_own_passport(api, engine, full):
    api.view_as(PATIENT)
    assert get(api).status_code == 200
    assert rows(engine)[0]["role"] == "PATIENT"


# ------------------------------------------------------------ denied views are logged too

def test_expired_token_is_401_and_logged_as_denied(api, engine, full):
    old = datetime.now(timezone.utc) - timedelta(hours=3)
    response = get(api, token=create_passport_token("pat_001", minutes=30, now=old))
    assert response.status_code == 401
    [row] = rows(engine)
    assert (row["outcome"], row["reason"], row["role"]) == ("denied", "expired_token", "ANONYMOUS")
    assert row["resource_id"] == "pat_001" and row["fields_released"] == []


def test_tampered_token_is_401_and_logged_as_denied(api, engine, full):
    token = create_passport_token("pat_001")
    response = get(api, token=token[:-4] + "AAAA")
    assert response.status_code == 401
    [row] = rows(engine)
    assert (row["outcome"], row["reason"]) == ("denied", "tampered_token")


def test_garbage_token_is_401_and_logged(api, engine, full):
    assert get(api, token="not-a-token").status_code == 401
    assert rows(engine)[0]["reason"] == "tampered_token"


def test_token_for_a_different_patient_is_403_and_logged(api, engine, full):
    response = get(api, patient="pat_002", token=create_passport_token("pat_001"))
    assert response.status_code == 403
    [row] = rows(engine)
    assert (row["outcome"], row["reason"], row["role"], row["patient_id"]) == ("denied", "token_patient_mismatch", "TOKEN", "pat_002")


def test_no_token_and_no_login_is_401_and_logged(api, engine, full):
    assert get(api).status_code == 401
    [row] = rows(engine)
    assert (row["outcome"], row["reason"], row["role"]) == ("denied", "missing_credentials", "ANONYMOUS")


@pytest.mark.parametrize("actor", [FAMILY, ADMIN, RESPONDER, OTHER_PATIENT])
def test_other_roles_are_403_and_logged_with_who_tried(api, engine, full, actor):
    api.view_as(actor)
    assert get(api).status_code == 403
    [row] = rows(engine)
    assert (row["outcome"], row["reason"], row["user_id"], row["role"]) == ("denied", "forbidden_role", actor.user_id, actor.role)


def test_unknown_patient_is_404_and_logged(api, engine, full):
    assert get(api, patient="pat_999", token=create_passport_token("pat_999")).status_code == 404
    [row] = rows(engine)
    assert (row["outcome"], row["reason"], row["patient_id"]) == ("denied", "patient_not_found", "pat_999")


def test_junk_patient_id_is_logged_as_invalid_id(api, engine, full):
    assert get(api, patient="x" * 120).status_code == 401
    [row] = rows(engine)
    assert row["resource_id"] == "invalid_id" and row["patient_id"] == "invalid_id"


def test_a_denied_view_returns_no_patient_data(api, engine, full):
    body = get(api, token="bad").text
    assert not any(secret in body for secret in SECRETS) and "Demo Patient" not in body


# ------------------------------------------------------------ consent decides what is released

def test_without_consent_only_the_basics_go_out(api, engine, full):
    body = get(api, token=create_passport_token("pat_001")).json()
    for key in ("conditions", "allergies", "medications", "reports", "vitals", "location"):
        assert key not in body
    assert body["blood_group"] == "B+" and body["shared_fields"] == []
    assert rows(engine)[0]["fields_released"] == []


def test_granting_and_revoking_changes_the_next_view_and_the_row(api, engine, full):
    token = create_passport_token("pat_001")
    share(engine, history=True)
    body = get(api, token=token).json()
    assert body["conditions"] == ["hypertension"] and body["allergies"] == ["penicillin"]
    assert rows(engine)[-1]["fields_released"] == ["history"]

    share(engine, reports=True)
    body = get(api, token=token).json()
    assert body["reports"] == [{"id": "rep_001", "name": "ECG_Demo_Patient.pdf"}]
    assert rows(engine)[-1]["fields_released"] == ["history", "reports"]

    share(engine, history=False)                       # revoke
    body = get(api, token=token).json()
    assert "conditions" not in body and "allergies" not in body and "medications" not in body
    assert body["shared_fields"] == ["reports"]
    assert rows(engine)[-1]["fields_released"] == ["reports"]


def test_contacts_need_the_history_consent_and_come_out_in_notification_order(api, engine, full):
    token = create_passport_token("pat_001")
    assert "contacts" not in get(api, token=token).json()          # no history consent: left out, never null
    share(engine, history=True)
    contacts = get(api, token=token).json()["contacts"]
    assert [(c["order"], c["name"]) for c in contacts] == [(1, "First Contact"), (2, "Second Contact")]


# ------------------------------------------------------------ the log never holds secrets

def test_no_token_and_no_patient_value_ever_appears_in_the_log(api, engine, full):
    share(engine, history=True, reports=True)
    good = create_passport_token("pat_001")
    bad = create_passport_token("pat_001")[:-4] + "AAAA"
    get(api, token=good)
    get(api, token=bad)
    get(api, token="garbage-token-value")
    get(api, patient="pat_002", token=good)
    api.view_as(FAMILY)
    get(api)

    everything = repr(rows(engine))
    for forbidden in [good, bad, "garbage-token-value", "eyJ", *SECRETS, "Demo Patient", "B+", "+91"]:
        assert forbidden not in everything, forbidden


def test_log_columns_are_only_the_expected_ones(api, engine, full):
    get(api, token=create_passport_token("pat_001"))
    assert set(rows(engine)[0]) == {"id", "timestamp", "user_id", "role", "action", "resource_type",
                                    "resource_id", "patient_id", "outcome", "reason", "fields_released"}
