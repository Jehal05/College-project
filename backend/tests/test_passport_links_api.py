"""The patient's QR passport link: create, show again, revoke, log, public read (J3)."""
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.accounts import User
from app.models.audit import AuditLog
from app.models.emergencies import EmergencyPassport
from app.models.extras import PassportOpen, PassportSecret
from app.models.patient_data import Patient
from app.security.actor import Actor
from app.security.passport_token import create_passport_token
from app.security.passwords import hash_password
from app.services import audit as audit_service
from app.services import consent as consent_service
from app.services import events

PID = "PT-2026-0417"
P = f"/patients/{PID}/passport"
STAFF = ("staff@demo.test", "demo1234")
ADMIN = ("admin@demo.test", "demo1234")
FAMILY = ("family1", "demo-password")
RESPONDER = ("responder1", "demo-password")
PATIENT = Actor("usr_001", "PATIENT", PID)


@pytest.fixture(autouse=True)
def seen():
    got = []
    events.clear_subscribers()
    events.subscribe(got.append)
    yield got
    events.clear_subscribers()


def H(demo, who=None):
    return demo.headers(*(who or ()))


def make(demo, hours=1, who=None):
    return demo.post(P, json={"hours": hours}, headers=H(demo, who))


def public(demo, token):
    return demo.get(f"/passport/{token}")


def set_consent(engine, **flags):
    with Session(engine) as s:
        consent_service.update_consents(s, PATIENT, PID, flags)
        s.commit()


def audit_rows(engine, action="passport.view"):
    with Session(engine) as s:
        return [audit_service.to_dict(r) for r in s.query(AuditLog).filter(AuditLog.action == action).order_by(AuditLog.id)]


def second_patient(engine):
    with Session(engine) as s:
        s.add(Patient(id="PT-2026-0002", name="Other"))
        s.flush()
        s.add(User(id="usr_0002", login="other@demo.test", display_name="Other", password_hash=hash_password("pw-123456"),
                   role="PATIENT", patient_id="PT-2026-0002"))
        s.commit()
    return ("other@demo.test", "pw-123456")


# ------------------------------------------------------------ create, show again, revoke

def test_create_answers_201_with_a_long_token_and_an_expiry(demo):
    r = make(demo, 1)
    assert r.status_code == 201 and set(r.json()) == {"token", "expires_at"}
    assert len(r.json()["token"]) >= 22 and r.json()["expires_at"].endswith("Z")
    expires = datetime.strptime(r.json()["expires_at"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    assert timedelta(minutes=58) < expires - datetime.now(timezone.utc) <= timedelta(hours=1, seconds=5)


@pytest.mark.parametrize("hours,span", [(1, 1), (24, 24), (168, 168)])
def test_the_three_validities(demo, hours, span):
    expires = datetime.strptime(make(demo, hours).json()["expires_at"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    assert abs((expires - datetime.now(timezone.utc)).total_seconds() - span * 3600) < 10


def test_hours_default_to_24_and_a_missing_body_is_fine(demo):
    r = demo.post(P, headers=H(demo))
    assert r.status_code == 201
    expires = datetime.strptime(r.json()["expires_at"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    assert abs((expires - datetime.now(timezone.utc)).total_seconds() - 24 * 3600) < 10
    assert demo.post(P, json={}, headers=H(demo)).status_code == 201


@pytest.mark.parametrize("hours", [0, 2, 5, 25, 169, -1, 1.5, "24", None, True, [1]])
def test_other_hours_are_400(demo, hours):
    r = demo.post(P, json={"hours": hours}, headers=H(demo))
    assert r.status_code == 400 and r.json()["error"] == r.json()["detail"]
    assert demo.get(P, headers=H(demo)).status_code == 404                   # nothing was created


def test_the_screen_can_show_the_same_link_again(demo):
    made = make(demo).json()
    again = demo.get(P, headers=H(demo))
    assert again.status_code == 200 and again.json() == made


def test_no_link_yet_is_404(demo):
    r = demo.get(P, headers=H(demo))
    assert r.status_code == 404 and r.json()["error"] == "No active passport"


def test_a_new_link_revokes_the_old_one(demo, engine):
    old = make(demo, 24).json()["token"]
    new = make(demo, 24).json()["token"]
    assert old != new
    assert public(demo, old).status_code == 410 and public(demo, new).status_code == 200
    assert demo.get(P, headers=H(demo)).json()["token"] == new
    with Session(engine) as s:
        assert s.query(EmergencyPassport).filter(EmergencyPassport.revoked_at.is_(None)).count() == 1
        assert s.query(PassportSecret).count() == 1                           # the old encrypted copy is gone


def test_revoke_answers_200_is_repeatable_and_the_link_then_answers_410(demo):
    token = make(demo).json()["token"]
    assert demo.delete(P, headers=H(demo)).json() == {"ok": True}
    assert demo.delete(P, headers=H(demo)).json() == {"ok": True}
    assert public(demo, token).status_code == 410
    assert demo.get(P, headers=H(demo)).status_code == 404


def test_revoking_with_no_link_is_fine(demo):
    assert demo.delete(P, headers=H(demo)).status_code == 200


def test_an_expired_link_is_not_shown_again_and_answers_410(demo, engine):
    token = make(demo).json()["token"]
    with Session(engine) as s:
        s.query(EmergencyPassport).update({"expires_at": datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(seconds=1)})
        s.commit()
    assert demo.get(P, headers=H(demo)).status_code == 404
    assert public(demo, token).status_code == 410


def test_the_database_holds_the_link_only_as_a_hash_and_an_encrypted_copy(demo, engine):
    token = make(demo).json()["token"]
    with Session(engine) as s:
        assert token not in s.execute(text("SELECT token_hash FROM emergency_passports")).scalar_one()
        stored = s.execute(text("SELECT token FROM passport_secrets")).scalar_one()
    assert token not in stored and stored.startswith("gAAAA")


# ------------------------------------------------------------ the public read

def test_a_live_link_opens_without_a_login_and_shows_only_what_is_shared(demo):
    token = make(demo).json()["token"]
    r = public(demo, token)
    assert r.status_code == 200
    b = r.json()
    assert b["name"] == "Rahul Mehta" and isinstance(b["age"], int) and b["blood_group"] and b["expires_at"].endswith("Z")
    assert b["shared"] == {"history": True, "reports": True} and b["simulated"] is True
    assert b["allergies"] is not None and b["contacts"][0]["relation"] and b["contacts"][0]["phone"]


def test_history_off_leaves_the_health_groups_out_not_null(demo, engine):
    token = make(demo).json()["token"]
    set_consent(engine, history=False)
    b = public(demo, token).json()
    for key in ("allergies", "conditions", "medications", "contacts"):
        assert key not in b
    assert b["shared"]["history"] is False and b["name"]
    set_consent(engine, history=True)
    assert "allergies" in public(demo, token).json()


def test_reports_off_leaves_the_report_list_out(demo, engine):
    upload = demo.post(f"/patients/{PID}/reports?name=a.pdf", content=b"%PDF-1", headers={**H(demo), "Content-Type": "application/pdf"})
    assert upload.status_code == 201
    token = make(demo).json()["token"]
    assert [r["name"] for r in public(demo, token).json()["reports"]] == ["a.pdf"]
    set_consent(engine, reports=False)
    assert "reports" not in public(demo, token).json()


def test_opening_the_link_writes_one_allowed_audit_row_with_no_token_in_it(demo, engine):
    token = make(demo).json()["token"]
    public(demo, token)
    [row] = audit_rows(engine)
    assert row["outcome"] == "allowed" and row["role"] == "TOKEN" and row["patient_id"] == PID
    assert row["fields_released"] == ["history", "reports"]
    with Session(engine) as s:
        assert token not in " ".join(str(vars(r)) for r in s.query(AuditLog))


def test_opening_the_link_is_logged_with_times_only_and_the_patient_is_told(demo, seen):
    token = make(demo).json()["token"]
    seen.clear()
    public(demo, token)
    public(demo, token)
    log = demo.get(f"{P}/log", headers=H(demo)).json()
    assert len(log) == 2 and all(set(e) == {"opened_at"} for e in log)
    assert log == sorted(log, key=lambda e: e["opened_at"])
    assert [e["event"] for e in seen] == ["passport.opened", "passport.opened"]
    assert seen[0]["audience"] == "patient:" + PID and seen[0]["emergency_id"] is None
    assert seen[0]["payload"] == {"patient_id": PID}


def test_the_log_belongs_to_the_latest_link(demo):
    old = make(demo).json()["token"]
    public(demo, old)
    new = make(demo).json()["token"]
    assert demo.get(f"{P}/log", headers=H(demo)).json() == []
    public(demo, new)
    assert len(demo.get(f"{P}/log", headers=H(demo)).json()) == 1


def test_with_no_link_the_log_is_empty(demo):
    assert demo.get(f"{P}/log", headers=H(demo)).json() == []


def test_a_revoked_link_is_410_audited_and_never_logged_as_opened(demo, engine):
    token = make(demo).json()["token"]
    demo.delete(P, headers=H(demo))
    r = public(demo, token)
    assert r.status_code == 410 and r.json() == {"error": "This passport is no longer available.",
                                                 "detail": "This passport is no longer available."}
    [row] = audit_rows(engine)
    assert row["outcome"] == "denied" and row["reason"] == "revoked_token"
    with Session(engine) as s:
        assert s.query(PassportOpen).count() == 0


def test_an_expired_link_is_410_with_its_own_reason(demo, engine):
    token = make(demo).json()["token"]
    with Session(engine) as s:
        s.query(EmergencyPassport).update({"expires_at": datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(seconds=1)})
        s.commit()
    assert public(demo, token).status_code == 410
    assert audit_rows(engine)[-1]["reason"] == "expired_token"


@pytest.mark.parametrize("junk", ["not-a-real-token-1234567", "x" * 200, "a.b.c", "%00", "ey" + "A" * 80])
def test_a_token_nobody_issued_is_410_and_the_junk_is_not_stored(demo, engine, junk):
    assert public(demo, junk).status_code == 410
    row = audit_rows(engine)[-1]
    assert row["reason"] == "tampered_token" and row["resource_id"] != junk or len(junk) < 40


def test_a_link_signed_by_us_but_never_stored_is_still_a_410_in_the_path_form(demo):
    stray = create_passport_token(PID, minutes=5)
    assert public(demo, stray).status_code == 410


def test_a_patient_id_in_the_address_is_never_a_link(demo):
    assert demo.get(f"/passport/{PID}").status_code == 401
    assert demo.get("/passport/pat_001").status_code == 401


def test_the_token_form_still_works_and_a_revoked_token_is_410_there_too(demo):
    token = make(demo).json()["token"]
    ok = demo.get(f"/passport/{PID}?token={token}")
    assert ok.status_code == 200 and ok.json()["patient_id"] == PID and ok.json()["shared"]["history"] is True
    assert len(demo.get(f"{P}/log", headers=H(demo)).json()) == 1             # that open is in the log too
    assert demo.get("/passport/PT-9999-0000?token=" + token).status_code == 403
    assert demo.get(f"/passport/{PID}?token=garbage").status_code == 401
    demo.delete(P, headers=H(demo))
    assert demo.get(f"/passport/{PID}?token={token}").status_code == 410


def test_a_signed_token_that_was_never_stored_keeps_working_in_the_token_form(demo):
    stray = create_passport_token(PID, minutes=5)
    assert demo.get(f"/passport/{PID}?token={stray}").status_code == 200


def test_a_link_for_one_patient_never_opens_another(demo, engine):
    token = make(demo).json()["token"]
    other = second_patient(engine)
    other_token = demo.post("/patients/PT-2026-0002/passport", json={"hours": 1}, headers=H(demo, other)).json()["token"]
    assert public(demo, other_token).json()["name"] == "Other"
    assert public(demo, token).json()["name"] == "Rahul Mehta"
    assert demo.get(f"/passport/PT-2026-0002?token={token}").status_code == 403
    demo.delete(P, headers=H(demo))
    assert public(demo, other_token).status_code == 200                       # revoking mine leaves theirs alone


def test_staff_still_read_by_patient_id_with_the_new_shared_field(demo):
    r = demo.get(f"/passport/{PID}", headers=H(demo, STAFF))
    assert r.status_code == 200 and r.json()["shared"] == {"history": True, "reports": True}
    assert r.json()["shared_fields"] == ["location", "history", "vitals", "reports"]


# ------------------------------------------------------------ who may manage the link

@pytest.mark.parametrize("who,status", [(None, 401), (STAFF, 403), (ADMIN, 403), (FAMILY, 403), (RESPONDER, 403)])
def test_only_the_owner_manages_the_link(demo, who, status):
    h = H(demo, who) if who else {}
    assert demo.post(P, json={"hours": 1}, headers=h).status_code == status
    assert demo.get(P, headers=h).status_code == status
    assert demo.delete(P, headers=h).status_code == status
    assert demo.get(f"{P}/log", headers=h).status_code == status


def test_another_patient_cannot_see_make_or_revoke_my_link(demo, engine):
    token = make(demo).json()["token"]
    other = second_patient(engine)
    assert demo.get(P, headers=H(demo, other)).status_code == 403
    assert demo.post(P, json={"hours": 1}, headers=H(demo, other)).status_code == 403
    assert demo.delete(P, headers=H(demo, other)).status_code == 403
    assert demo.get(f"{P}/log", headers=H(demo, other)).status_code == 403
    assert public(demo, token).status_code == 200                              # untouched
    assert demo.get("/patients/PT-2026-0002/passport", headers=H(demo, other)).status_code == 404


def test_refusals_are_audited(demo, engine):
    make(demo, who=STAFF)
    assert ("passport.create", "denied", "forbidden_role") in [
        (r["action"], r["outcome"], r["reason"]) for r in audit_rows(engine, "passport.create")]


def test_a_reset_clears_the_links_and_the_log(demo, engine):
    token = make(demo).json()["token"]
    public(demo, token)
    demo.post("/demo/reset", headers=H(demo))
    assert public(demo, token).status_code == 410
    assert demo.get(P, headers=H(demo)).status_code == 404
    with Session(engine) as s:
        assert s.query(PassportOpen).count() == s.query(PassportSecret).count() == s.query(EmergencyPassport).count() == 0
