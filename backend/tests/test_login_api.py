"""POST /auth/login and the real logins in front of the other endpoints (feature 33)."""
import re
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.orm import Session

from app.models.accounts import User
from app.models.audit import AuditLog
from app.models.patient_data import Patient
from app.security import login_limiter as ll
from app.security.access_token import create_access_token
from app.security.login_limiter import LoginLimiter
from app.security.passport_token import create_passport_token

# login, password, id, role shown in the answer, patient, hospital
LOGINS = [
    ("patient@demo.test", "demo1234", "usr_001", "PATIENT", "PT-2026-0417", None),
    ("patient1", "demo-password", "usr_002", "PATIENT", "PT-2026-0417", None),
    ("staff@demo.test", "demo1234", "usr_003", "HOSPITAL_STAFF", None, "HSP-AMD-002"),
    ("staff@demo", "demo123", "usr_004", "staff", None, "HSP-AMD-002"),          # the portal's own account
    ("staff1", "demo-password", "usr_005", "HOSPITAL_STAFF", None, "HSP-AMD-002"),
    ("admin@demo.test", "demo1234", "usr_006", "ADMIN", None, "HSP-AMD-002"),
    ("admin@demo", "demo123", "usr_007", "admin", None, "HSP-AMD-002"),           # the portal's own account
    ("admin1", "demo-password", "usr_008", "ADMIN", None, "HSP-AMD-002"),
    ("family1", "demo-password", "usr_009", "FAMILY", None, None),
    ("responder1", "demo-password", "usr_010", "RESPONDER", None, None),
]
ANSWER_KEYS = {"token", "role", "user_id", "patient_id", "hospital_id", "name", "expires_at", "simulated"}
WRONG = "Wrong login or password"


# ------------------------------------------------------------ a good login

@pytest.mark.parametrize("login, password, user_id, role, patient, hospital", LOGINS)
def test_each_demo_login_works_and_answers_with_the_agreed_fields(demo, login, password, user_id, role, patient, hospital):
    response = demo.login(login, password)
    assert response.status_code == 200
    body = response.json()
    assert set(body) == ANSWER_KEYS
    assert (body["user_id"], body["role"], body["patient_id"], body["hospital_id"]) == (user_id, role, patient, hospital)
    assert body["simulated"] is True and body["name"] and re.fullmatch(r"[\w-]+\.[\w-]+\.[\w-]+", body["token"])


def test_the_answer_is_never_cached(demo):
    assert demo.login("patient@demo.test", "demo1234").headers["cache-control"] == "no-store"


def test_the_token_expires_in_the_future(demo):
    text = demo.login("patient@demo.test", "demo1234").json()["expires_at"]
    expires = datetime.strptime(text, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    assert timedelta(hours=7) < expires - datetime.now(timezone.utc) <= timedelta(hours=8, minutes=1)


@pytest.mark.parametrize("field", ["username", "email", "login"])
def test_the_login_may_be_sent_as_username_email_or_login(demo, field):
    assert demo.login("patient@demo.test", "demo1234", field=field).status_code == 200


def test_username_wins_when_several_fields_are_sent(demo):
    r = demo.client.post("/auth/login", json={"username": "staff@demo.test", "email": "patient@demo.test", "password": "demo1234"})
    assert r.json()["user_id"] == "usr_003"


@pytest.mark.parametrize("typed", ["STAFF@DEMO.TEST", "  staff@demo.test  ", "Staff@Demo.Test"])
def test_the_login_ignores_case_and_surrounding_spaces(demo, typed):
    assert demo.login(typed, "demo1234").json()["user_id"] == "usr_003"


def test_the_password_is_case_sensitive_and_exact(demo):
    assert demo.login("staff@demo.test", "DEMO1234").status_code == 401
    assert demo.login("staff@demo.test", " demo1234").status_code == 401


def test_the_answer_holds_no_hash_and_no_other_users(demo):
    text = demo.login("patient@demo.test", "demo1234").text
    for leak in ("$2b$", "password", "staff@demo", "admin@demo", "usr_003"):
        assert leak not in text


def test_two_logins_give_two_different_tokens(demo):
    assert demo.token() != demo.token("staff@demo.test")


# ------------------------------------------------------------ a bad login

def test_a_wrong_password_is_401_with_the_agreed_words(demo):
    r = demo.login("patient@demo.test", "nope")
    assert r.status_code == 401 and r.json() == {"error": WRONG, "detail": WRONG}


def test_an_unknown_login_gets_exactly_the_same_answer_as_a_wrong_password(demo):
    wrong, unknown = demo.login("patient@demo.test", "nope"), demo.login("nobody@demo.test", "nope")
    assert wrong.status_code == unknown.status_code == 401 and wrong.json() == unknown.json()
    assert dict(wrong.headers).keys() == dict(unknown.headers).keys()


def test_a_disabled_account_gets_the_same_answer_too(demo):
    with Session(demo.engine) as s:
        s.get(User, "usr_001").is_active = False
        s.commit()
    r = demo.login("patient@demo.test", "demo1234")
    assert r.status_code == 401 and r.json() == {"error": WRONG, "detail": WRONG}


def test_a_password_longer_than_bcrypt_allows_is_just_wrong_not_a_crash(demo):
    assert demo.login("patient@demo.test", "x" * 100).status_code == 401


@pytest.mark.parametrize("attack", ["' OR '1'='1", "admin@demo.test'--", "\" OR 1=1 --", "%", "admin@demo.test; DROP TABLE users;", "ａｄｍｉｎ", "a\u0000b", "<script>x</script>"])
def test_odd_and_hostile_logins_are_just_unknown(demo, attack):
    assert demo.login(attack, "demo1234").status_code == 401
    assert demo.login("patient@demo.test", "demo1234").status_code == 200      # and the database is fine


def test_a_hostile_password_is_just_wrong(demo):
    assert demo.login("patient@demo.test", "' OR '1'='1").status_code == 401


@pytest.mark.parametrize("body", [{}, {"username": "x"}, {"password": "x"}, {"username": "", "password": "x"}, {"username": "   ", "password": "x"}, {"username": "x", "password": ""}])
def test_missing_or_empty_fields_are_400(demo, body):
    r = demo.client.post("/auth/login", json=body)
    assert r.status_code == 400 and r.json()["error"] == r.json()["detail"]


@pytest.mark.parametrize("body", [{"username": 5, "password": "x"}, {"username": "x", "password": ["x"]}, {"username": {"a": 1}, "password": "x"}, {"username": None, "password": None}])
def test_wrong_types_are_400(demo, body):
    assert demo.client.post("/auth/login", json=body).status_code == 400


def test_a_very_long_login_or_password_is_400_not_a_crash(demo):
    assert demo.client.post("/auth/login", json={"username": "a" * 300, "password": "x"}).status_code == 400
    assert demo.client.post("/auth/login", json={"username": "a", "password": "x" * 2000}).status_code == 400


def test_a_body_that_is_not_json_is_400(demo):
    r = demo.client.post("/auth/login", content=b"username=a&password=b", headers={"Content-Type": "application/x-www-form-urlencoded"})
    assert r.status_code == 400


def test_the_password_is_never_echoed_back_in_an_error(demo):
    r = demo.client.post("/auth/login", json={"username": 5, "password": "Sup3rSecret!"})
    assert "Sup3rSecret" not in r.text


def test_get_is_not_allowed_on_login(demo):
    assert demo.get("/auth/login").status_code == 405


# ------------------------------------------------------------ the rate limit

def test_five_wrong_passwords_are_401_and_the_sixth_attempt_is_429(demo):
    for _ in range(5):
        assert demo.login("patient@demo.test", "wrong").status_code == 401
    blocked = demo.login("patient@demo.test", "wrong")
    assert blocked.status_code == 429 and blocked.json()["error"] == blocked.json()["detail"]
    assert 1 <= int(blocked.headers["retry-after"]) <= 60


def test_even_the_right_password_is_refused_while_blocked(demo):
    for _ in range(5):
        demo.login("patient@demo.test", "wrong")
    assert demo.login("patient@demo.test", "demo1234").status_code == 429


def test_a_success_before_the_limit_resets_the_count(demo):
    for _ in range(4):
        demo.login("patient@demo.test", "wrong")
    assert demo.login("patient@demo.test", "demo1234").status_code == 200
    for _ in range(4):
        assert demo.login("patient@demo.test", "wrong").status_code == 401
    assert demo.login("patient@demo.test", "demo1234").status_code == 200


def test_blocking_one_login_does_not_block_another(demo):
    for _ in range(6):
        demo.login("patient@demo.test", "wrong")
    assert demo.login("staff@demo.test", "demo1234").status_code == 200


def test_an_unknown_login_is_limited_in_exactly_the_same_way(demo):
    codes = [demo.login("ghost@demo.test", "x").status_code for _ in range(6)]
    assert codes == [401] * 5 + [429]


def test_the_block_ends_after_the_window(demo):
    now = [1000.0]
    ll._limiter = LoginLimiter(clock=lambda: now[0])
    for _ in range(5):
        demo.login("patient@demo.test", "wrong")
    assert demo.login("patient@demo.test", "demo1234").status_code == 429
    now[0] += 61
    assert demo.login("patient@demo.test", "demo1234").status_code == 200


def test_the_limit_comes_from_the_environment(demo, monkeypatch):
    monkeypatch.setenv("LOGIN_MAX_FAILURES", "2")
    ll.reset_limiter()
    assert [demo.login("patient@demo.test", "x").status_code for _ in range(3)] == [401, 401, 429]


# ------------------------------------------------------------ the login in front of other endpoints

CONSENTS = "/patients/PT-2026-0417/consents"


def test_a_patient_login_opens_their_own_consents(demo):
    r = demo.get(CONSENTS, headers=demo.headers())
    assert r.status_code == 200 and r.json()["consents"]["history"] is True


def test_no_login_is_401_with_a_bearer_challenge(demo):
    r = demo.get(CONSENTS)
    assert r.status_code == 401 and r.headers["www-authenticate"] == "Bearer"


@pytest.mark.parametrize("header", ["Basic dXNlcjpwYXNz", "Bearer", "Bearer ", "bearer", "Token abc", "abc", "Bearer not.a.token", "Bearer " + "x" * 3000])
def test_a_malformed_authorization_header_is_401(demo, header):
    assert demo.get(CONSENTS, headers={"Authorization": header}).status_code == 401


def test_the_bearer_word_is_case_insensitive(demo):
    token = demo.token()
    assert demo.get(CONSENTS, headers={"Authorization": f"bearer {token}"}).status_code == 200


def test_an_expired_login_is_401(demo):
    token, _ = create_access_token("usr_001", "PATIENT", minutes=-1)
    assert demo.get(CONSENTS, headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_a_login_for_a_user_that_does_not_exist_is_401(demo):
    token, _ = create_access_token("usr_999", "PATIENT")
    assert demo.get(CONSENTS, headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_a_disabled_user_is_locked_out_at_once(demo):
    headers = demo.headers()
    assert demo.get(CONSENTS, headers=headers).status_code == 200
    with Session(demo.engine) as s:
        s.get(User, "usr_001").is_active = False
        s.commit()
    assert demo.get(CONSENTS, headers=headers).status_code == 401


def test_a_deleted_user_is_locked_out_at_once(demo):
    headers = demo.headers("staff1", "demo-password")
    with Session(demo.engine) as s:
        s.delete(s.get(User, "usr_005"))
        s.commit()
    assert demo.get(CONSENTS, headers=headers).status_code == 401


def test_a_changed_role_forces_a_new_login(demo):
    headers = demo.headers()
    with Session(demo.engine) as s:
        user = s.get(User, "usr_001")
        user.role, user.patient_id = "ADMIN", None
        s.commit()
    assert demo.get(CONSENTS, headers=headers).status_code == 401


def test_a_passport_token_is_not_a_login(demo):
    assert demo.get(CONSENTS, headers={"Authorization": f"Bearer {create_passport_token('PT-2026-0417')}"}).status_code == 401


def test_a_login_token_does_not_open_a_passport(demo):
    r = demo.get(f"/passport/PT-2026-0417?token={demo.token()}")
    assert r.status_code == 401
    with Session(demo.engine) as s:
        assert s.query(AuditLog).order_by(AuditLog.id.desc()).first().reason == "tampered_token"


def test_each_role_gets_the_right_answer_from_the_consent_endpoints(demo):
    assert demo.get(CONSENTS, headers=demo.headers("admin1", "demo-password")).status_code == 200        # admin may read
    assert demo.get(CONSENTS, headers=demo.headers("staff1", "demo-password")).status_code == 403
    assert demo.get(CONSENTS, headers=demo.headers("family1", "demo-password")).status_code == 403
    assert demo.put(CONSENTS, json={"history": False}, headers=demo.headers("admin1", "demo-password")).status_code == 403
    assert demo.put(CONSENTS, json={"history": False}, headers=demo.headers()).status_code == 200


def test_a_patient_cannot_read_another_patients_consents(demo):
    with Session(demo.engine) as s:
        s.add(Patient(id="PT-2026-0001", name="Someone Else"))
        s.commit()
    assert demo.get("/patients/PT-2026-0001/consents", headers=demo.headers()).status_code == 403


def test_the_audit_log_is_for_admins_only(demo):
    assert demo.get("/audit", headers=demo.headers("admin@demo.test", "demo1234")).status_code == 200
    assert demo.get("/audit", headers=demo.headers()).status_code == 403
    assert demo.get("/audit", headers=demo.headers("staff1", "demo-password")).status_code == 403
    assert demo.get("/audit").status_code == 401


def test_a_patient_reads_their_own_insights(demo):
    assert demo.get("/patients/PT-2026-0417/insights", headers=demo.headers()).status_code == 200
    assert demo.get("/patients/PT-2026-0417/insights", headers=demo.headers("staff1", "demo-password")).status_code == 403


def test_a_hospital_desk_user_opens_the_staff_passport_and_it_is_audited(demo):
    r = demo.get("/passport/PT-2026-0417", headers=demo.headers("staff@demo", "demo123"))
    assert r.status_code == 200 and r.json()["name"] == "Rahul Mehta"
    with Session(demo.engine) as s:
        row = s.query(AuditLog).order_by(AuditLog.id.desc()).first()
        assert (row.user_id, row.role, row.outcome) == ("usr_004", "HOSPITAL_STAFF", "allowed")


def test_a_bad_login_on_the_passport_is_401_not_treated_as_a_stranger(demo):
    r = demo.get("/passport/PT-2026-0417", headers={"Authorization": "Bearer not.a.token"})
    assert r.status_code == 401 and r.json()["error"] != "A valid token or login is required"


def test_the_demo_panel_works_for_any_login_in_demo_mode_and_not_outside_it(demo, monkeypatch):
    assert demo.post("/demo/vitals", json={"profile": "asthma"}, headers=demo.headers()).status_code == 200
    assert demo.post("/demo/vitals", json={"profile": "asthma"}).status_code == 401
    monkeypatch.setenv("DEMO_MODE", "false")
    assert demo.post("/demo/vitals", json={"profile": "asthma"}, headers=demo.headers()).status_code == 404
