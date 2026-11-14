"""Family, volunteer responders, admin users, content, feedback and privacy requests through the REAL login (J4)."""
import json
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.orm import Session

from app.models.accounts import User
from app.models.apps import (ContentItem, FamilyCheckin, FamilyInvite, FamilyLink, Feedback, PrivacyRequest,
                             ResponderAcceptance, ResponderProfile)
from app.models.audit import AuditLog
from app.models.emergencies import Emergency
from app.models.patient_data import Patient
from app.security.actor import Actor
from app.security.passwords import hash_password
from app.services import audit as audit_service
from app.services import consent as consent_service
from app.services import events

PID = "PT-2026-0417"
PATIENT = ("patient@demo.test", "demo1234")
STAFF = ("staff@demo.test", "demo1234")
ADMIN = ("admin@demo.test", "demo1234")
FAM = ("family@demo.test", "demo1234")
FAM1 = ("family1", "demo-password")
RESP = ("responder@demo.test", "demo1234")          # verified
RESP1 = ("responder1", "demo-password")             # not verified
CHEST = {"patient_id": PID, "type": "HEART", "symptoms": ["CHEST_PAIN"], "location": {"lat": 23.03, "lng": 72.55}}
BAD_WORDS = ("allerg", "medication", "condition", "phone", "token", "password", "severity", "symptom", "diagnos")


@pytest.fixture(autouse=True)
def seen():
    got = []
    events.clear_subscribers()
    events.subscribe(got.append)
    yield got
    events.clear_subscribers()


def H(demo, who=PATIENT):
    return demo.headers(*who)


def sos(demo, body=None):
    eid = demo.post("/emergencies", json=body or CHEST, headers=H(demo)).json()["id"]
    assert demo.post(f"/emergencies/{eid}/sos", json={}, headers=H(demo)).status_code == 200
    return eid


def link(demo, who=FAM, code="FAM-0417"):
    return demo.post("/family/link", json={"invite_code": code}, headers=H(demo, who))


def set_consent(engine, **flags):
    with Session(engine) as s:
        consent_service.update_consents(s, Actor("usr_001", "PATIENT", PID), PID, flags)
        s.commit()


def audit_rows(engine, action):
    with Session(engine) as s:
        return [audit_service.to_dict(r) for r in s.query(AuditLog).filter(AuditLog.action == action).order_by(AuditLog.id)]


def all_audit_text(engine):
    with Session(engine) as s:
        return " ".join(str(vars(r)) for r in s.query(AuditLog))


def has_none(obj, words=BAD_WORDS):
    text = json.dumps(obj).lower()
    return [w for w in words if w in text]


def user_id(demo, login):
    with Session(demo.engine) as s:
        return s.query(User).filter(User.login == login).one().id


def other_patient(engine):
    with Session(engine) as s:
        s.add(Patient(id="PT-2026-0002", name="Other"))
        s.flush()
        s.add(User(id="usr_0002", login="other@demo.test", display_name="Other", password_hash=hash_password("pw-123456"),
                   role="PATIENT", patient_id="PT-2026-0002"))
        s.commit()
    return ("other@demo.test", "pw-123456")


# ================================================================ family invites and linking

def test_the_patient_makes_a_one_time_invite_code(demo, engine):
    r = demo.post(f"/patients/{PID}/family-invites", headers=H(demo))
    assert r.status_code == 201 and set(r.json()) == {"code", "expires_at", "simulated"}
    code = r.json()["code"]
    assert code.startswith("FAM-") and len(code) == 13 and r.json()["simulated"] is True
    exp = datetime.strptime(r.json()["expires_at"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    assert timedelta(hours=23, minutes=58) < exp - datetime.now(timezone.utc) <= timedelta(hours=24, seconds=5)
    with Session(engine) as s:
        assert s.get(FamilyInvite, code).reusable is False


def test_two_invites_differ(demo):
    a = demo.post(f"/patients/{PID}/family-invites", headers=H(demo)).json()["code"]
    b = demo.post(f"/patients/{PID}/family-invites", headers=H(demo)).json()["code"]
    assert a != b


@pytest.mark.parametrize("who,status", [(STAFF, 403), (ADMIN, 403), (FAM, 403), (RESP, 403), (None, 401)])
def test_only_the_owner_makes_invites(demo, who, status):
    h = H(demo, who) if who else {}
    assert demo.post(f"/patients/{PID}/family-invites", headers=h).status_code == status


def test_another_patient_cannot_invite_for_me_and_an_unknown_patient_is_404(demo, engine):
    other = other_patient(engine)
    assert demo.post(f"/patients/{PID}/family-invites", headers=H(demo, other)).status_code == 403
    assert demo.post("/patients/PT-2026-0099/family-invites", headers=H(demo)).status_code == 403
    assert demo.post("/patients/PT-2026-0002/family-invites", headers=H(demo, other)).status_code == 201
    assert ("family.invite", "denied") in [(r["action"], r["outcome"]) for r in audit_rows(engine, "family.invite")]


def test_linking_with_a_real_code_answers_200_and_the_code_is_single_use(demo, engine):
    code = demo.post(f"/patients/{PID}/family-invites", headers=H(demo)).json()["code"]
    r = link(demo, FAM, code)
    assert r.status_code == 200 and r.json() == {"patient_id": PID, "name": "Rahul Mehta", "linked": True, "simulated": True}
    again = link(demo, FAM, code)                                     # the same relative again: fine, nothing used up
    assert again.status_code == 200
    stranger = link(demo, FAM1, code)
    assert stranger.status_code == 410 and stranger.json()["error"] == stranger.json()["detail"]
    with Session(engine) as s:
        assert s.query(FamilyLink).count() == 1 and s.get(FamilyInvite, code).used_at is not None


def test_codes_are_found_whatever_the_case_and_spaces(demo):
    code = demo.post(f"/patients/{PID}/family-invites", headers=H(demo)).json()["code"]
    assert link(demo, FAM, "  " + code.lower() + " ").status_code == 200


def test_an_expired_code_is_410(demo, engine):
    code = demo.post(f"/patients/{PID}/family-invites", headers=H(demo)).json()["code"]
    with Session(engine) as s:
        s.get(FamilyInvite, code).expires_at = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(seconds=1)
        s.commit()
    assert link(demo, FAM, code).status_code == 410


def test_the_demo_code_works_again_and_again_for_everyone(demo):
    assert link(demo, FAM).status_code == 200 and link(demo, FAM1).status_code == 200 and link(demo, FAM).status_code == 200


def test_link_errors(demo):
    assert link(demo, FAM, "FAM-0000-NOPE").status_code == 404
    assert demo.post("/family/link", json={}, headers=H(demo, FAM)).status_code == 400
    assert demo.post("/family/link", json={"invite_code": "  "}, headers=H(demo, FAM)).status_code == 400
    assert demo.post("/family/link", json={"invite_code": 5}, headers=H(demo, FAM)).status_code == 400
    assert demo.post("/family/link", json={"invite_code": "x" * 500}, headers=H(demo, FAM)).status_code == 404
    assert demo.post("/family/link", json={"invite_code": "FAM-0417"}).status_code == 401


@pytest.mark.parametrize("who", [PATIENT, STAFF, ADMIN, RESP])
def test_only_family_links_and_reads(demo, who):
    assert link(demo, who).status_code == 403
    assert demo.get("/family/patients", headers=H(demo, who)).status_code == 403
    assert demo.post("/family/checkin", json={"patient_id": PID, "message": "ON_MY_WAY"}, headers=H(demo, who)).status_code == 403


def test_linking_is_audited_without_the_code(demo, engine):
    link(demo, FAM)
    [row] = audit_rows(engine, "family.link")
    assert row["outcome"] == "allowed" and row["role"] == "FAMILY" and row["patient_id"] == PID
    assert "FAM-0417" not in all_audit_text(engine)


# ================================================================ what a relative sees

def test_an_unlinked_relative_sees_nothing(demo):
    assert demo.get("/family/patients", headers=H(demo, FAM)).json() == []


def test_a_linked_relative_sees_the_name_and_what_is_shared_and_nothing_private(demo):
    link(demo, FAM)
    [view] = demo.get("/family/patients", headers=H(demo, FAM)).json()
    assert view["patient_id"] == PID and view["name"] == "Rahul Mehta" and view["simulated"] is True
    assert view["shared_fields"] == ["location", "history", "vitals", "reports"]
    assert view["active_emergency"] is None and view["vitals"]["heart_rate"] and "patient_id" not in view["vitals"]
    assert has_none(view) == []


def test_vitals_disappear_when_the_patient_withdraws_that_consent(demo, engine):
    link(demo, FAM)
    assert "vitals" in demo.get("/family/patients", headers=H(demo, FAM)).json()[0]
    set_consent(engine, vitals=False)
    view = demo.get("/family/patients", headers=H(demo, FAM)).json()[0]
    assert "vitals" not in view and "vitals" not in view["shared_fields"]
    set_consent(engine, vitals=True)
    assert "vitals" in demo.get("/family/patients", headers=H(demo, FAM)).json()[0]


def test_an_active_emergency_is_a_plain_status(demo):
    link(demo, FAM)
    eid = sos(demo)
    [view] = demo.get("/family/patients", headers=H(demo, FAM)).json()
    ae = view["active_emergency"]
    assert ae["id"] == eid and ae["state"] == "SOS_SENT" and ae["started_at"].endswith("Z") and ae["checkins"] == []
    assert ae["hospital"]["name"] and set(ae["hospital"]) == {"name"}
    assert ae["location"] == {"lat": 23.03, "lng": 72.55}
    assert has_none(ae) == []


def test_before_the_sos_there_is_no_active_emergency(demo):
    link(demo, FAM)
    demo.post("/emergencies", json=CHEST, headers=H(demo))
    assert demo.get("/family/patients", headers=H(demo, FAM)).json()[0]["active_emergency"] is None


def test_a_finished_emergency_is_no_longer_active(demo):
    link(demo, FAM)
    eid = sos(demo)
    demo.post(f"/emergencies/{eid}/cancel", json=None, headers=H(demo))
    assert demo.get("/family/patients", headers=H(demo, FAM)).json()[0]["active_emergency"] is None


def test_the_location_needs_the_consent_at_the_sos_and_now(demo, engine):
    link(demo, FAM)
    eid = sos(demo)
    set_consent(engine, location=False)                               # withdrawn after the SOS
    ae = demo.get("/family/patients", headers=H(demo, FAM)).json()[0]["active_emergency"]
    assert ae["id"] == eid and "location" not in ae
    set_consent(engine, location=True)                                # back on now, and it was on at the SOS
    assert "location" in demo.get("/family/patients", headers=H(demo, FAM)).json()[0]["active_emergency"]


def test_a_location_not_shared_at_the_sos_stays_hidden_even_if_allowed_later(demo, engine):
    link(demo, FAM)
    set_consent(engine, location=False)
    sos(demo)
    set_consent(engine, location=True)                                # allowed only AFTER the SOS
    assert "location" not in demo.get("/family/patients", headers=H(demo, FAM)).json()[0]["active_emergency"]


def test_vitals_during_an_emergency_need_both_too(demo, engine):
    link(demo, FAM)
    set_consent(engine, vitals=False)
    sos(demo)
    set_consent(engine, vitals=True)
    assert "vitals" not in demo.get("/family/patients", headers=H(demo, FAM)).json()[0]


def test_the_state_follows_the_emergency_and_the_hospital_and_eta_appear(demo, engine):
    link(demo, FAM)
    eid = sos(demo)
    with Session(engine) as s:
        e = s.get(Emergency, eid)
        e.state, e.eta_seconds = "AMBULANCE_DISPATCHED", 420
        s.commit()
    ae = demo.get("/family/patients", headers=H(demo, FAM)).json()[0]["active_emergency"]
    assert ae["state"] == "AMBULANCE_DISPATCHED" and ae["eta_seconds"] == 420


def test_each_family_read_is_audited_with_field_names_only(demo, engine):
    link(demo, FAM)
    eid = sos(demo)
    demo.get("/family/patients", headers=H(demo, FAM))
    [row] = audit_rows(engine, "family.view")
    assert row["outcome"] == "allowed" and row["role"] == "FAMILY" and row["patient_id"] == PID
    assert row["fields_released"] == ["location", "vitals"]
    assert "23.03" not in all_audit_text(engine)


def test_a_relative_sees_only_their_own_links(demo, engine):
    link(demo, FAM)
    assert demo.get("/family/patients", headers=H(demo, FAM1)).json() == []


# ================================================================ linked family reads (feature 61 switched on)

def test_a_linked_relative_reads_the_status_of_an_emergency_and_nothing_else(demo, engine):
    link(demo, FAM)
    eid = sos(demo)
    r = demo.get(f"/emergencies/{eid}", headers=H(demo, FAM))
    assert r.status_code == 200 and set(r.json()) == {"id", "patient_id", "state", "started_at", "simulated"}
    assert demo.get(f"/emergencies/{eid}/reasons", headers=H(demo, FAM)).status_code == 403
    assert demo.get(f"/emergencies/{eid}", headers=H(demo, FAM1)).status_code == 403          # not linked


def test_a_linked_relative_reads_insights_only_while_vitals_are_shared(demo, engine):
    path = f"/patients/{PID}/insights"
    assert demo.get(path, headers=H(demo, FAM)).status_code == 403                             # not linked yet
    link(demo, FAM)
    assert demo.get(path, headers=H(demo, FAM)).status_code == 200
    set_consent(engine, vitals=False)
    assert demo.get(path, headers=H(demo, FAM)).status_code == 403
    assert demo.get(path, headers=H(demo, FAM1)).status_code == 403


def test_a_relative_still_cannot_read_the_record_or_vitals_endpoints(demo):
    link(demo, FAM)
    for path in (f"/patients/{PID}", f"/patients/{PID}/vitals", f"/patients/{PID}/contacts", f"/patients/{PID}/reports",
                 f"/passport/{PID}", f"/patients/{PID}/reminders"):
        assert demo.get(path, headers=H(demo, FAM)).status_code in (401, 403), path


# ================================================================ family check-in

def checkin(demo, body, who=FAM):
    return demo.post("/family/checkin", json=body, headers=H(demo, who))


def test_a_checkin_answers_201_shows_in_the_view_and_tells_the_patient(demo, seen):
    link(demo, FAM)
    eid = sos(demo)
    seen.clear()
    r = checkin(demo, {"patient_id": PID, "emergency_id": eid, "message": "ON_MY_WAY"})
    assert r.status_code == 201 and set(r.json()) == {"id", "emergency_id", "message", "at", "simulated"}
    assert r.json()["id"].startswith("FC-") and r.json()["emergency_id"] == eid
    [ev] = seen
    assert ev["event"] == "family.checkin" and ev["audience"] == "patient:" + PID and ev["payload"] == {"message": "ON_MY_WAY"}
    assert ev["emergency_id"] == eid
    ae = demo.get("/family/patients", headers=H(demo, FAM)).json()[0]["active_emergency"]
    assert [c["message"] for c in ae["checkins"]] == ["ON_MY_WAY"] and set(ae["checkins"][0]) == {"message", "at"}


@pytest.mark.parametrize("message", ["ON_MY_WAY", "CALLING_NOW", "CANNOT_REACH"])
def test_the_three_messages(demo, message):
    link(demo, FAM)
    eid = sos(demo)
    assert checkin(demo, {"patient_id": PID, "emergency_id": eid, "message": message}).status_code == 201


def test_without_an_emergency_id_the_live_emergency_is_used(demo):
    link(demo, FAM)
    eid = sos(demo)
    assert checkin(demo, {"patient_id": PID, "message": "CALLING_NOW"}).json()["emergency_id"] == eid


@pytest.mark.parametrize("body", [
    {"patient_id": PID, "message": "HELLO"}, {"patient_id": PID}, {"patient_id": PID, "message": None},
    {"message": "ON_MY_WAY"}, {"patient_id": 5, "message": "ON_MY_WAY"}, {"patient_id": PID, "message": ["ON_MY_WAY"]},
    {"patient_id": PID, "emergency_id": 7, "message": "ON_MY_WAY"}])
def test_a_bad_checkin_is_400(demo, body):
    link(demo, FAM)
    sos(demo)
    r = checkin(demo, body)
    assert r.status_code == 400 and r.json()["error"] == r.json()["detail"]


def test_a_checkin_for_a_patient_not_linked_is_403_and_audited(demo, engine):
    sos(demo)
    r = checkin(demo, {"patient_id": PID, "message": "ON_MY_WAY"})
    assert r.status_code == 403
    assert checkin(demo, {"patient_id": "PT-0000-0000", "message": "ON_MY_WAY"}).status_code == 403
    assert audit_rows(engine, "family.checkin")[0]["reason"] == "forbidden_role"
    with Session(engine) as s:
        assert s.query(FamilyCheckin).count() == 0


def test_checkin_404_when_there_is_no_live_emergency_or_a_wrong_one(demo, engine):
    link(demo, FAM)
    assert checkin(demo, {"patient_id": PID, "message": "ON_MY_WAY"}).status_code == 404
    assert checkin(demo, {"patient_id": PID, "emergency_id": "EM-NOPE", "message": "ON_MY_WAY"}).status_code == 404
    unsent = demo.post("/emergencies", json=CHEST, headers=H(demo)).json()["id"]
    assert checkin(demo, {"patient_id": PID, "emergency_id": unsent, "message": "ON_MY_WAY"}).status_code == 404


def test_checkin_on_a_finished_emergency_is_409(demo):
    link(demo, FAM)
    eid = sos(demo)
    demo.post(f"/emergencies/{eid}/cancel", json=None, headers=H(demo))
    assert checkin(demo, {"patient_id": PID, "emergency_id": eid, "message": "ON_MY_WAY"}).status_code == 409


def test_checkins_are_audited_without_a_message_and_no_relative_details_in_the_event(demo, engine, seen):
    link(demo, FAM)
    eid = sos(demo)
    seen.clear()
    checkin(demo, {"patient_id": PID, "emergency_id": eid, "message": "CANNOT_REACH"})
    assert audit_rows(engine, "family.checkin")[-1]["outcome"] == "allowed"
    assert "CANNOT_REACH" not in all_audit_text(engine)
    assert has_none(seen, ("family@demo", "usr_011", "phone")) == []


# ================================================================ responders: sign-up

REG = {"name": "Test Volunteer", "email": "Volunteer@Demo.Test", "password": "volunteer-pass-1"}


def test_signup_starts_unverified_and_can_log_in_but_sees_no_alerts(demo, engine):
    r = demo.post("/responders/register", json=REG)
    assert r.status_code == 201 and r.json()["verified"] is False and r.json()["id"].startswith("usr_") and r.json()["simulated"]
    assert set(r.json()) == {"id", "verified", "simulated"}
    who = ("volunteer@demo.test", "volunteer-pass-1")
    login = demo.login(*who)
    assert login.status_code == 200 and login.json()["role"] == "RESPONDER"
    assert demo.get("/responders/alerts", headers=H(demo, who)).status_code == 403
    assert demo.post("/responders/EM-X/accept", headers=H(demo, who)).status_code == 403
    with Session(engine) as s:
        assert s.get(ResponderProfile, r.json()["id"]).verified is False
        assert s.get(User, r.json()["id"]).password_hash.startswith("$2")


def test_signup_ids_do_not_collide(demo):
    a = demo.post("/responders/register", json=REG).json()["id"]
    b = demo.post("/responders/register", json={**REG, "email": "two@demo.test"}).json()["id"]
    assert a == "usr_013" and b == "usr_014"


def test_the_same_email_twice_is_409_even_in_another_case_and_for_a_demo_login(demo):
    demo.post("/responders/register", json=REG)
    assert demo.post("/responders/register", json={**REG, "email": "VOLUNTEER@demo.test"}).status_code == 409
    assert demo.post("/responders/register", json={**REG, "email": "patient@demo.test"}).status_code == 409


@pytest.mark.parametrize("patch", [
    {"name": ""}, {"name": "   "}, {"name": "x" * 81}, {"name": 5}, {"email": "nope"}, {"email": "a@b"}, {"email": 7},
    {"email": "a b@demo.test"}, {"password": "short"}, {"password": "x" * 129}, {"password": 12345678}])
def test_bad_signups_are_400(demo, patch):
    r = demo.post("/responders/register", json={**REG, **patch})
    assert r.status_code == 400 and r.json()["error"] == r.json()["detail"]


@pytest.mark.parametrize("missing", ["name", "email", "password"])
def test_missing_fields_are_400(demo, missing):
    body = {k: v for k, v in REG.items() if k != missing}
    assert demo.post("/responders/register", json=body).status_code == 400
    assert demo.post("/responders/register", json={"name": "x"}).status_code == 400


def test_the_password_never_comes_back_or_reaches_the_audit_log(demo, engine):
    r = demo.post("/responders/register", json=REG)
    assert "volunteer-pass-1" not in r.text and "volunteer-pass-1" not in all_audit_text(engine)
    assert audit_rows(engine, "responder.register")[0]["role"] == "ANONYMOUS"


def test_an_admin_can_verify_a_new_volunteer(demo):
    rid = demo.post("/responders/register", json=REG).json()["id"]
    who = ("volunteer@demo.test", "volunteer-pass-1")
    assert demo.patch("/admin/users", json={"id": rid, "verified": True}, headers=H(demo, ADMIN)).json()["verified"] is True
    assert demo.get("/responders/alerts", headers=H(demo, who)).status_code == 200


# ================================================================ responders: alerts and accept

def test_a_verified_responder_sees_live_alerts_with_no_identity(demo):
    eid = sos(demo)
    r = demo.get("/responders/alerts", headers=H(demo, RESP))
    assert r.status_code == 200
    [alert] = r.json()
    assert set(alert) == {"id", "type", "distance_m", "state", "accepted", "simulated"}
    assert alert["id"] == eid and alert["type"] == "HEART" and alert["accepted"] is False and isinstance(alert["distance_m"], int)
    assert 400 <= alert["distance_m"] <= 1300
    assert has_none(alert, ("rahul", "name", "allerg", "phone", '"lat"', '"lng"', "location", "patient")) == []


def test_the_distance_is_stable_for_one_alert(demo):
    sos(demo)
    a = demo.get("/responders/alerts", headers=H(demo, RESP)).json()[0]["distance_m"]
    assert demo.get("/responders/alerts", headers=H(demo, RESP)).json()[0]["distance_m"] == a


def test_alerts_hold_only_live_emergencies_after_the_sos(demo):
    demo.post("/emergencies", json=CHEST, headers=H(demo))                    # no SOS yet
    assert demo.get("/responders/alerts", headers=H(demo, RESP)).json() == []
    eid = sos(demo)
    demo.post(f"/emergencies/{eid}/cancel", json=None, headers=H(demo))
    assert demo.get("/responders/alerts", headers=H(demo, RESP)).json() == []


def test_the_unverified_demo_responder_and_every_other_role_are_refused(demo, engine):
    sos(demo)
    assert demo.get("/responders/alerts", headers=H(demo, RESP1)).status_code == 403
    for who in (PATIENT, STAFF, ADMIN, FAM):
        assert demo.get("/responders/alerts", headers=H(demo, who)).status_code == 403
    assert demo.get("/responders/alerts").status_code == 401
    assert audit_rows(engine, "responder.alerts")[0]["reason"] == "forbidden_role"


def test_accepting_releases_name_age_allergies_and_location_as_shared(demo, engine, seen):
    eid = sos(demo)
    seen.clear()
    r = demo.post(f"/responders/{eid}/accept", headers=H(demo, RESP))
    assert r.status_code == 200
    b = r.json()
    assert b["id"] == eid and b["accepted"] is True and b["simulated"] is True
    assert b["patient"]["name"] == "Rahul Mehta" and isinstance(b["patient"]["age"], int) and b["patient"]["allergies"] is not None
    assert b["location"] == {"lat": 23.03, "lng": 72.55}
    assert has_none(b, ("phone", "password", "token", "medication", "condition", "severity", "symptom")) == []
    [ev] = seen
    assert ev["event"] == "responder.accepted" and ev["audience"] == "patient:" + PID and ev["payload"] == {}
    [row] = audit_rows(engine, "responder.accept")
    assert row["outcome"] == "allowed" and row["role"] == "RESPONDER" and row["fields_released"] == ["age", "allergies", "location", "name"]
    assert "Rahul" not in all_audit_text(engine) and "23.03" not in all_audit_text(engine)
    assert demo.get("/responders/alerts", headers=H(demo, RESP)).json()[0]["accepted"] is True


def test_accepting_twice_is_fine_and_counted_once(demo, engine, seen):
    eid = sos(demo)
    seen.clear()
    assert demo.post(f"/responders/{eid}/accept", headers=H(demo, RESP)).status_code == 200
    assert demo.post(f"/responders/{eid}/accept", headers=H(demo, RESP)).status_code == 200
    with Session(engine) as s:
        assert s.query(ResponderAcceptance).count() == 1
    assert len(seen) == 1


def test_history_consent_withdrawn_removes_the_allergies_from_accept(demo, engine):
    eid = sos(demo)
    set_consent(engine, history=False)
    b = demo.post(f"/responders/{eid}/accept", headers=H(demo, RESP)).json()
    assert "allergies" not in b["patient"] and b["patient"]["name"] == "Rahul Mehta"
    assert "allergies" not in audit_rows(engine, "responder.accept")[-1]["fields_released"]


def test_history_not_shared_at_the_sos_stays_hidden_even_if_allowed_later(demo, engine):
    set_consent(engine, history=False)
    eid = sos(demo)
    set_consent(engine, history=True)
    assert "allergies" not in demo.post(f"/responders/{eid}/accept", headers=H(demo, RESP)).json()["patient"]


def test_location_withdrawn_or_never_shared_is_left_out_not_null(demo, engine):
    eid = sos(demo)
    set_consent(engine, location=False)
    b = demo.post(f"/responders/{eid}/accept", headers=H(demo, RESP)).json()
    assert "location" not in b and "location" not in audit_rows(engine, "responder.accept")[-1]["fields_released"]
    set_consent(engine, location=True)
    assert "location" in demo.post(f"/responders/{eid}/accept", headers=H(demo, RESP)).json()
    set_consent(engine, location=False)
    eid2 = sos(demo)
    set_consent(engine, location=True)                                    # allowed only after the SOS
    assert "location" not in demo.post(f"/responders/{eid2}/accept", headers=H(demo, RESP)).json()


def test_accept_errors(demo, engine):
    assert demo.post("/responders/EM-NOPE/accept", headers=H(demo, RESP)).status_code == 404
    unsent = demo.post("/emergencies", json=CHEST, headers=H(demo)).json()["id"]
    assert demo.post(f"/responders/{unsent}/accept", headers=H(demo, RESP)).status_code == 404
    eid = sos(demo)
    demo.post(f"/emergencies/{eid}/cancel", json=None, headers=H(demo))
    assert demo.post(f"/responders/{eid}/accept", headers=H(demo, RESP)).status_code == 404
    assert demo.post(f"/responders/{eid}/accept", headers=H(demo, RESP1)).status_code == 403
    assert demo.post(f"/responders/{eid}/accept", headers=H(demo, PATIENT)).status_code == 403
    assert demo.post(f"/responders/{eid}/accept").status_code == 401


# ================================================================ admin users

def patch(demo, body, who=ADMIN):
    return demo.patch("/admin/users", json=body, headers=H(demo, who))


def test_the_admin_lists_users_with_no_secrets(demo):
    r = demo.get("/admin/users", headers=H(demo, ADMIN))
    assert r.status_code == 200 and len(r.json()) == 12
    row = next(u for u in r.json() if u["email"] == "patient@demo.test")
    assert row == {"id": "usr_001", "email": "patient@demo.test", "role": "PATIENT", "disabled": False, "patient_id": PID}
    assert has_none(r.json(), ("password", "hash", "token", "$2")) == []
    staff = next(u for u in r.json() if u["email"] == "staff@demo.test")
    assert staff["hospital_id"] == "HSP-AMD-002" and "verified" not in staff
    assert next(u for u in r.json() if u["email"] == "responder@demo.test")["verified"] is True
    assert next(u for u in r.json() if u["email"] == "responder1")["verified"] is False
    assert [u["id"] for u in r.json()] == sorted(u["id"] for u in r.json())


def test_the_label_logins_show_their_real_role(demo):
    rows = {u["email"]: u for u in demo.get("/admin/users", headers=H(demo, ADMIN)).json()}
    assert rows["staff@demo"]["role"] == "HOSPITAL_STAFF" and rows["admin@demo"]["role"] == "ADMIN"


def test_filter_by_role(demo):
    r = demo.get("/admin/users?role=FAMILY", headers=H(demo, ADMIN))
    assert [u["email"] for u in r.json()] == ["family1", "family@demo.test"]
    assert demo.get("/admin/users?role=KING", headers=H(demo, ADMIN)).status_code == 400


@pytest.mark.parametrize("who,status", [(PATIENT, 403), (STAFF, 403), (FAM, 403), (RESP, 403), (None, 401)])
def test_only_an_admin_manages_users(demo, engine, who, status):
    h = H(demo, who) if who else {}
    assert demo.get("/admin/users", headers=h).status_code == status
    assert demo.patch("/admin/users", json={"id": "usr_001", "disabled": True}, headers=h).status_code == status
    if who:
        assert demo.login(*PATIENT).status_code == 200                       # nothing changed


def test_disabling_signs_the_user_out_at_once_and_blocks_login(demo):
    fam_headers = H(demo, FAM)
    assert demo.get("/family/patients", headers=fam_headers).status_code == 200
    r = patch(demo, {"id": "usr_011", "disabled": True})
    assert r.status_code == 200 and r.json()["disabled"] is True and r.json()["email"] == "family@demo.test"
    assert demo.get("/family/patients", headers=fam_headers).status_code == 401
    assert demo.login(*FAM).status_code == 401
    assert patch(demo, {"id": "usr_011", "disabled": False}).json()["disabled"] is False
    assert demo.login(*FAM).status_code == 200


def test_changing_the_role_signs_the_old_login_out(demo):
    old = H(demo, FAM)
    assert patch(demo, {"id": "usr_011", "role": "RESPONDER"}).json()["role"] == "RESPONDER"
    assert demo.get("/family/patients", headers=old).status_code == 401
    assert demo.get("/admin/users", headers=H(demo, ("family@demo.test", "demo1234"))).status_code == 403


def test_the_admin_cannot_disable_or_demote_themselves(demo):
    assert patch(demo, {"id": "usr_006", "disabled": True}).status_code == 409
    assert patch(demo, {"id": "usr_006", "role": "PATIENT"}).status_code == 409
    assert patch(demo, {"id": "usr_006", "disabled": False}).status_code == 200
    assert patch(demo, {"id": "usr_006", "role": "ADMIN"}).status_code == 200
    assert demo.get("/admin/users", headers=H(demo, ADMIN)).status_code == 200


def test_roles_that_cannot_fit_are_409(demo):
    assert patch(demo, {"id": "usr_011", "role": "PATIENT"}).status_code == 409            # no patient behind that account
    assert patch(demo, {"id": "usr_011", "role": "HOSPITAL_STAFF"}).status_code == 409
    assert patch(demo, {"id": "usr_001", "verified": True}).status_code == 409             # only volunteers are verified
    assert patch(demo, {"id": "usr_003", "role": "ADMIN"}).status_code == 200              # a desk account can become an admin


@pytest.mark.parametrize("body,status", [
    ({"id": "usr_999", "disabled": True}, 404), ({"id": "usr_011"}, 400), ({"disabled": True}, 400), ({"id": 5, "disabled": True}, 400),
    ({"id": "usr_011", "role": "KING"}, 400), ({"id": "usr_011", "role": 5}, 400),
    ({"id": "usr_011", "disabled": "yes"}, 400), ({"id": "usr_011", "disabled": 1}, 400), ({"id": "usr_012", "verified": "yes"}, 400)])
def test_admin_patch_errors(demo, body, status):
    r = patch(demo, body)
    assert r.status_code == status and r.json()["error"] == r.json()["detail"]


def test_the_admin_can_verify_and_unverify_a_responder(demo):
    assert patch(demo, {"id": "usr_010", "verified": True}).json()["verified"] is True
    assert demo.get("/responders/alerts", headers=H(demo, RESP1)).status_code == 200
    assert patch(demo, {"id": "usr_010", "verified": False}).json()["verified"] is False
    assert demo.get("/responders/alerts", headers=H(demo, RESP1)).status_code == 403


def test_user_changes_are_audited_by_field_name_only(demo, engine):
    patch(demo, {"id": "usr_011", "disabled": True, "role": "FAMILY"})
    [row] = audit_rows(engine, "admin.update")
    assert row["role"] == "ADMIN" and row["resource_id"] == "usr_011" and row["fields_released"] == ["disabled", "role"]
    demo.get("/admin/users", headers=H(demo, STAFF))
    assert audit_rows(engine, "admin.users")[0]["reason"] == "forbidden_role"


# ================================================================ content

def put(demo, name, body, who=ADMIN):
    return demo.put(f"/content/{name}", json=body, headers=H(demo, who))


def test_everyone_reads_approved_content(demo):
    for who in (PATIENT, STAFF, FAM, RESP, ADMIN):
        r = demo.get("/content/emergency_numbers", headers=H(demo, who))
        assert r.status_code == 200 and r.json()["approved"] is True and r.json()["version"] == 1
        assert r.json()["items"] == ["Ambulance: 108", "Emergency: 112"] and r.json()["simulated"] is True
    assert demo.get("/content/emergency_numbers").status_code == 401


def test_unapproved_content_is_hidden_from_everyone_but_an_admin(demo):
    for who in (PATIENT, STAFF, FAM, RESP):
        assert demo.get("/content/first_aid_basics", headers=H(demo, who)).status_code == 404
    r = demo.get("/content/first_aid_basics", headers=H(demo, ADMIN))
    assert r.status_code == 200 and r.json()["approved"] is False and r.json()["approved_by"] is None


@pytest.mark.parametrize("name", ["nothing", "UPPER", "a" * 60, "x.y", "1abc"])
def test_unknown_or_odd_content_names_are_404(demo, name):
    assert demo.get(f"/content/{name}", headers=H(demo, ADMIN)).status_code == 404


def test_an_edit_bumps_the_version_and_is_unapproved_until_an_admin_says_so(demo):
    before = demo.get("/content/emergency_numbers", headers=H(demo)).json()
    r = put(demo, "emergency_numbers", {"items": before["items"]})
    assert r.status_code == 200 and r.json()["version"] == before["version"] + 1 and r.json()["approved"] is False
    assert r.json()["approved_by"] is None
    assert demo.get("/content/emergency_numbers", headers=H(demo)).status_code == 404       # hidden again until approved
    ok = put(demo, "emergency_numbers", {"items": ["Ambulance: 108"], "approved": True})
    assert ok.json()["version"] == before["version"] + 2 and ok.json()["approved"] is True and ok.json()["approved_by"] == "usr_006"
    assert demo.get("/content/emergency_numbers", headers=H(demo)).json()["items"] == ["Ambulance: 108"]


def test_a_new_content_type_starts_at_version_1(demo):
    r = put(demo, "faq_text", {"items": ["One", " Two "]})
    assert r.status_code == 200 and r.json()["version"] == 1 and r.json()["items"] == ["One", "Two"]


@pytest.mark.parametrize("body", [
    {"items": []}, {"items": "text"}, {"items": [""]}, {"items": ["  "]}, {"items": [5]}, {"items": ["x" * 501]},
    {"items": ["x"] * 51}, {}, {"items": ["ok"], "approved": "yes"}, {"items": ["ok"], "approved": 1}])
def test_bad_content_is_400(demo, body):
    r = put(demo, "emergency_numbers", body)
    assert r.status_code == 400 and r.json()["error"] == r.json()["detail"]
    assert demo.get("/content/emergency_numbers", headers=H(demo)).json()["version"] == 1      # nothing changed


@pytest.mark.parametrize("who,status", [(PATIENT, 403), (STAFF, 403), (FAM, 403), (RESP, 403), (None, 401)])
def test_only_an_admin_writes_content(demo, who, status):
    r = demo.put("/content/emergency_numbers", json={"items": ["x"]}, headers=H(demo, who) if who else {})
    assert r.status_code == status
    assert demo.get("/content/emergency_numbers", headers=H(demo)).json()["version"] == 1


def test_a_bad_content_name_on_put_is_400(demo):
    assert put(demo, "Bad-Name", {"items": ["x"]}).status_code == 400


def test_content_edits_are_audited_without_the_text(demo, engine):
    put(demo, "emergency_numbers", {"items": ["SECRET-TEXT-123"]})
    [row] = audit_rows(engine, "content.update")
    assert row["outcome"] == "allowed" and row["resource_id"] == "emergency_numbers"
    assert "SECRET-TEXT-123" not in all_audit_text(engine)


# ================================================================ feedback

def feedback(demo, body, who=PATIENT):
    return demo.post("/feedback", json=body, headers=H(demo, who))


def test_feedback_answers_201_and_the_comment_is_stored_encrypted(demo, engine):
    eid = sos(demo)
    r = feedback(demo, {"emergency_id": eid, "rating": 4, "comment": "Clear steps"})
    assert r.status_code == 201 and set(r.json()) == {"id", "simulated"} and r.json()["id"].startswith("FB-")
    with Session(engine) as s:
        row = s.get(Feedback, r.json()["id"])
        assert row.rating == 4 and row.comment == "Clear steps"
        assert "Clear steps" not in str(s.connection().exec_driver_sql("SELECT comment FROM feedback").scalar())


@pytest.mark.parametrize("rating", [1, 2, 3, 4, 5])
def test_every_valid_rating(demo, rating):
    assert feedback(demo, {"emergency_id": sos(demo), "rating": rating}).status_code == 201


@pytest.mark.parametrize("body", [
    {"rating": 4}, {"emergency_id": "", "rating": 4}, {"emergency_id": 5, "rating": 4}])
def test_feedback_needs_an_emergency_id(demo, body):
    assert feedback(demo, body).status_code == 400


@pytest.mark.parametrize("rating", [0, 6, 9, -1, 3.5, "4", None, True, [4]])
def test_a_bad_rating_is_400(demo, rating):
    eid = sos(demo)
    r = feedback(demo, {"emergency_id": eid, "rating": rating})
    assert r.status_code == 400 and r.json()["error"] == r.json()["detail"]


def test_a_bad_comment_is_400_and_an_empty_one_is_fine(demo):
    eid = sos(demo)
    assert feedback(demo, {"emergency_id": eid, "rating": 4, "comment": "x" * 501}).status_code == 400
    assert feedback(demo, {"emergency_id": eid, "rating": 4, "comment": 5}).status_code == 400
    assert feedback(demo, {"emergency_id": eid, "rating": 4, "comment": "x" * 500}).status_code == 201


def test_an_unknown_emergency_is_404(demo):
    assert feedback(demo, {"emergency_id": "EM-NOPE", "rating": 4}).status_code == 404


def test_one_feedback_per_person_and_emergency(demo):
    eid = sos(demo)
    assert feedback(demo, {"emergency_id": eid, "rating": 4}).status_code == 201
    dup = feedback(demo, {"emergency_id": eid, "rating": 5})
    assert dup.status_code == 409 and dup.json()["error"] == dup.json()["detail"]
    link(demo, FAM)
    assert feedback(demo, {"emergency_id": eid, "rating": 5}, FAM).status_code == 201       # another person: fine
    assert feedback(demo, {"emergency_id": sos(demo), "rating": 5}).status_code == 201        # another emergency: fine


def test_feedback_works_after_the_emergency_is_finished(demo):
    eid = sos(demo)
    demo.post(f"/emergencies/{eid}/cancel", json=None, headers=H(demo))
    assert feedback(demo, {"emergency_id": eid, "rating": 3}).status_code == 201


def test_a_patient_cannot_rate_someone_elses_emergency_and_it_looks_like_an_unknown_id(demo, engine):
    eid = sos(demo)
    other = other_patient(engine)
    r = feedback(demo, {"emergency_id": eid, "rating": 4}, other)
    assert r.status_code == 404 and r.json() == feedback(demo, {"emergency_id": "EM-NOPE", "rating": 4}, other).json()
    assert audit_rows(engine, "feedback.send")[0]["reason"] == "forbidden_role"


def test_only_a_linked_relative_can_rate(demo):
    eid = sos(demo)
    assert feedback(demo, {"emergency_id": eid, "rating": 4}, FAM).status_code == 403
    link(demo, FAM)
    assert feedback(demo, {"emergency_id": eid, "rating": 4}, FAM).status_code == 201


@pytest.mark.parametrize("who", [STAFF, ADMIN, RESP])
def test_staff_admin_and_responders_cannot_send_feedback(demo, who):
    assert feedback(demo, {"emergency_id": sos(demo), "rating": 4}, who).status_code == 403
    assert demo.post("/feedback", json={}).status_code == 401


# ================================================================ privacy requests

def privacy(demo, body, who=PATIENT):
    return demo.post("/privacy-requests", json=body, headers=H(demo, who))


@pytest.mark.parametrize("kind", ["EXPORT", "DELETE"])
def test_a_patient_asks_about_their_own_data(demo, engine, kind):
    r = privacy(demo, {"type": kind})
    assert r.status_code == 202
    assert r.json()["type"] == kind and r.json()["status"] == "RECEIVED" and r.json()["simulated"] is True
    assert r.json()["id"].startswith("PR-") and "Nothing is exported or deleted" in r.json()["note"]
    [row] = audit_rows(engine, "privacy." + kind.lower() + "_request")
    assert row["outcome"] == "allowed" and row["patient_id"] == PID


def test_nothing_is_exported_or_deleted(demo, engine):
    privacy(demo, {"type": "DELETE"})
    with Session(engine) as s:
        assert s.get(Patient, PID) is not None and s.query(PrivacyRequest).count() == 1
    assert demo.get(f"/patients/{PID}", headers=H(demo)).status_code == 200


def test_a_patient_may_name_their_own_id(demo):
    assert privacy(demo, {"type": "EXPORT", "patient_id": PID}).status_code == 202


@pytest.mark.parametrize("body", [{"type": "SHRED"}, {"type": "export"}, {}, {"type": None}, {"type": ["EXPORT"]},
                                  {"type": "EXPORT", "patient_id": 5}, {"type": "EXPORT", "patient_id": " "}])
def test_bad_privacy_requests_are_400(demo, body):
    r = privacy(demo, body)
    assert r.status_code == 400 and r.json()["error"] == r.json()["detail"]


def test_a_patient_cannot_ask_about_someone_else(demo, engine):
    assert privacy(demo, {"type": "DELETE", "patient_id": "PT-0000-0000"}).status_code == 403
    assert privacy(demo, {"type": "EXPORT", "patient_id": "PT-2026-0002"}).status_code == 403
    assert audit_rows(engine, "privacy.request")[0]["reason"] == "forbidden_role"
    with Session(engine) as s:
        assert s.query(PrivacyRequest).count() == 0


def test_an_admin_names_the_patient(demo):
    assert privacy(demo, {"type": "EXPORT"}, ADMIN).status_code == 400
    assert privacy(demo, {"type": "EXPORT", "patient_id": PID}, ADMIN).status_code == 202
    assert privacy(demo, {"type": "EXPORT", "patient_id": "PT-0000-0000"}, ADMIN).status_code == 404


@pytest.mark.parametrize("who", [STAFF, FAM, RESP])
def test_other_roles_cannot_make_privacy_requests(demo, who):
    assert privacy(demo, {"type": "EXPORT"}, who).status_code == 403
    assert demo.post("/privacy-requests", json={"type": "EXPORT"}).status_code == 401


# ================================================================ demo seeds and reset

def test_the_new_demo_logins_exist_and_the_old_ones_still_work(demo):
    for who in (FAM, RESP, FAM1, RESP1, PATIENT, STAFF, ADMIN):
        assert demo.login(*who).status_code == 200
    assert demo.login(*FAM).json()["role"] == "FAMILY" and demo.login(*RESP).json()["patient_id"] is None


def test_a_reset_forgets_links_signups_feedback_and_changes(demo, engine):
    link(demo, FAM)
    sos(demo)
    demo.post("/responders/register", json=REG)
    patch(demo, {"id": "usr_011", "disabled": True})
    put(demo, "emergency_numbers", {"items": ["x"]})
    eid = sos(demo)
    feedback(demo, {"emergency_id": eid, "rating": 4})
    privacy(demo, {"type": "EXPORT"})
    assert demo.post("/demo/reset", headers=H(demo)).status_code == 200
    assert demo.get("/family/patients", headers=H(demo, FAM)).json() == []
    assert demo.login("volunteer@demo.test", "volunteer-pass-1").status_code == 401
    assert demo.get("/content/emergency_numbers", headers=H(demo)).json()["version"] == 1
    assert link(demo, FAM).status_code == 200                                              # the demo code is back
    with Session(engine) as s:
        assert s.query(User).count() == 12 and s.query(FamilyCheckin).count() == 0 and s.query(Feedback).count() == 0 and s.query(PrivacyRequest).count() == 0
        assert s.get(ResponderProfile, "usr_012").verified is True and s.get(ResponderProfile, "usr_010").verified is False
        assert s.get(User, "usr_011").is_active is True and s.query(ContentItem).count() == 2
