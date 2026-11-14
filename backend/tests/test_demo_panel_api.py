"""POST /demo/reset and POST /demo/scenario through the REAL login (J2)."""
import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from app.models.accounts import User
from app.models.audit import AuditLog
from app.models.consent import ConsentLedger
from app.models.emergencies import Emergency, HospitalAlert, StatusEvent
from app.models.hospitals import Hospital
from app.models.patient_data import Contact, Patient
from app.security.passwords import hash_password
from app.services import consent as consent_service
from app.services import demo as demo_service
from app.services import events
from app.sim.wearable import registry

PID = "PT-2026-0417"
STAFF = ("staff@demo.test", "demo1234")
ADMIN = ("admin@demo.test", "demo1234")
FAMILY = ("family1", "demo-password")


@pytest.fixture(autouse=True)
def seen():
    demo_service.set_speed(1)
    got = []
    events.clear_subscribers()
    events.subscribe(got.append)
    demo_service.clear_reset_hooks()
    yield got
    events.clear_subscribers()
    demo_service.clear_reset_hooks()


def reset(demo, who=None):
    return demo.post("/demo/reset", headers=demo.headers(*(who or ())))


def scenario(demo, body, who=None):
    return demo.post("/demo/scenario", json=body, headers=demo.headers(*(who or ())))


def count(engine, model):
    with Session(engine) as s:
        return s.query(model).count()


# ------------------------------------------------------------ outside demo mode

@pytest.mark.parametrize("path,body", [("/demo/reset", None), ("/demo/scenario", {"type": "HEART"})])
def test_outside_demo_mode_the_demo_routes_do_not_exist(demo, monkeypatch, path, body):
    headers = demo.headers()
    monkeypatch.delenv("DEMO_MODE")
    assert demo.post(path, json=body, headers=headers).status_code == 404
    assert demo.post(path, json=body).status_code == 404                    # not even a 401 for strangers


def test_a_reset_outside_demo_mode_never_touches_the_data(demo, engine, monkeypatch):
    before = count(engine, Patient)
    headers = demo.headers()
    monkeypatch.delenv("DEMO_MODE")
    demo.post("/demo/reset", headers=headers)
    with pytest.raises(PermissionError):
        with Session(engine) as s:
            demo_service.reset_everything(s)
    assert count(engine, Patient) == before


@pytest.mark.parametrize("path,body", [("/demo/reset", None), ("/demo/scenario", {"type": "HEART"})])
def test_the_demo_routes_need_a_login(demo, path, body):
    assert demo.post(path, json=body).status_code == 401


# ------------------------------------------------------------ reset

def test_reset_answers_in_both_spellings(demo):
    r = reset(demo)
    assert r.status_code == 200
    assert r.json()["status"] == "reset" and r.json()["ok"] is True and r.json()["simulated"] is True
    assert r.json()["seeded"]["hospitals"] == 5


def test_reset_works_for_every_role(demo):
    for who in (None, STAFF, ADMIN, FAMILY):
        assert reset(demo, who).status_code == 200


def test_reset_clears_emergencies_alerts_and_the_timeline(demo, engine):
    for _ in range(2):
        scenario(demo, {"type": "HEART"})
    assert count(engine, Emergency) == 2 and count(engine, HospitalAlert) == 2
    reset(demo)
    assert count(engine, Emergency) == count(engine, HospitalAlert) == count(engine, StatusEvent) == 0


def test_emergency_numbers_start_at_0001_again(demo):
    first = scenario(demo, {"type": "HEART"}).json()["id"]
    scenario(demo, {"type": "STROKE"})
    reset(demo)
    again = scenario(demo, {"type": "HEART"}).json()["id"]
    assert first[:-4] == again[:-4] and again.endswith("0001")


def test_reset_restores_the_seed_data_and_removes_everything_else(demo, engine):
    with Session(engine) as s:
        s.add(Patient(id="PT-X", name="Extra"))
        s.flush()
        s.add(User(id="usr_x", login="x@demo.test", display_name="X", password_hash=hash_password("pw-123456"),
                   role="PATIENT", patient_id="PT-X"))
        s.get(Patient, PID).name = "Changed"
        s.get(Hospital, "HSP-AMD-002").beds_free = 0
        s.add(Contact(patient_id=PID, name="Extra Contact", phone="+91 99999 99999", position=3))
        s.commit()
    reset(demo)
    with Session(engine) as s:
        assert s.get(Patient, "PT-X") is None and s.query(User).filter(User.login == "x@demo.test").count() == 0
        assert s.get(Patient, PID).name == "Rahul Mehta"
        assert s.get(Hospital, "HSP-AMD-002").beds_free > 0
        assert [c.name for c in s.query(Contact).filter(Contact.patient_id == PID).order_by(Contact.position)] == [
            "Sunita Mehta", "Karan Mehta"]
        assert s.query(User).count() == 12 and s.query(Hospital).count() == 5


def test_reset_puts_the_consents_and_the_audit_log_back_to_the_start(demo, engine):
    with Session(engine) as s:
        from app.security.actor import Actor
        consent_service.update_consents(s, Actor("usr_001", "PATIENT", PID), PID, {"location": False, "vitals": False})
        s.commit()
    demo.get(f"/patients/{PID}", headers=demo.headers(*ADMIN))                      # writes an audit row
    assert count(engine, AuditLog) >= 1
    reset(demo)
    assert count(engine, AuditLog) == 0
    with Session(engine) as s:
        assert consent_service.current_consents(s, PID) == {"location": True, "history": True, "vitals": True, "reports": True}
        assert s.query(ConsentLedger).count() == 4


def test_reset_keeps_the_append_only_protection(demo, engine):
    reset(demo)
    scenario(demo, {"type": "HEART"})                                       # a status timeline row
    demo.get(f"/patients/{PID}", headers=demo.headers(*ADMIN))              # an audit row
    for sql in ("DELETE FROM consents", "UPDATE audit_log SET role = 'X'", "DELETE FROM audit_log",
                "DELETE FROM status_events", "UPDATE status_events SET actor = 'X'"):
        with Session(engine) as s:
            with pytest.raises(DBAPIError):
                s.execute(text(sql))
            s.rollback()


def test_a_login_issued_before_the_reset_still_works_after_it(demo):
    headers = demo.headers()
    reset(demo)
    assert demo.get(f"/patients/{PID}", headers=headers).status_code == 200


def test_the_simulators_go_back_to_normal(demo):
    scenario(demo, {"type": "HEART"})
    assert registry.get(PID).profile == "heart_attack"
    reset(demo)
    assert registry.get(PID).profile == "normal"


def test_reset_clears_the_login_limiter(demo):
    for _ in range(4):
        demo.post("/auth/login", json={"username": "patient@demo.test", "password": "wrong-password"})
    reset(demo)
    assert demo.login("patient@demo.test", "demo1234").status_code == 200


def test_reset_twice_in_a_row_is_fine(demo, engine):
    assert reset(demo).status_code == reset(demo).status_code == 200
    assert count(engine, User) == 12


def test_reset_runs_the_registered_hooks_and_sends_no_events(demo, seen):
    ran = []
    demo_service.register_reset_hook(lambda: ran.append(1))
    scenario(demo, {"type": "HEART"})
    seen.clear()
    reset(demo)
    assert ran == [1] and seen == []


def test_the_whole_demo_can_be_run_again_after_a_reset(demo):
    scenario(demo, {"type": "HEART"})
    reset(demo)
    r = scenario(demo, {"type": "STROKE"})
    assert r.status_code == 201 and r.json()["type"] == "STROKE"


# ------------------------------------------------------------ scenario

@pytest.mark.parametrize("kind", ["HEART", "STROKE", "DIABETIC", "ASTHMA"])
def test_each_scenario_raises_the_alert_and_sends_the_sos(demo, kind):
    r = scenario(demo, {"type": kind})
    assert r.status_code == 201
    b = r.json()
    assert b["state"] == "SOS_SENT" and b["type"] == kind and b["severity"] == "EMERGENCY" and b["simulated"] is True
    full = demo.get(f"/emergencies/{b['id']}", headers=demo.headers()).json()
    assert full["state"] == "SOS_SENT" and full["hospital"]["name"] and full["symptoms"]
    assert full["location"]["source"] == "demo"
    assert [t["state"] for t in full["timeline"]] == ["EMERGENCY_DETECTED", "SOS_SENT"]


@pytest.mark.parametrize("kind", ["HEART", "STROKE", "DIABETIC", "ASTHMA"])
def test_the_engine_agrees_with_the_scenario_type(demo, kind):
    eid = scenario(demo, {"type": kind}).json()["id"]
    reasons = demo.get(f"/emergencies/{eid}/reasons", headers=demo.headers()).json()
    assert reasons["type"] == kind and reasons["matched_rules"] and reasons["reviewed"] is False


def test_the_scenario_sets_the_wearable_so_the_alert_carries_matching_readings(demo):
    eid = scenario(demo, {"type": "HEART"}).json()["id"]
    vitals = demo.get(f"/emergencies/{eid}", headers=demo.headers()).json()["vitals_at_alert"]
    assert vitals["heart_rate"] > 110 and vitals["spo2"] < 96


def test_both_spellings_and_cases_are_accepted(demo):
    assert scenario(demo, {"scenario": "heart"}).json()["type"] == "HEART"
    assert scenario(demo, {"type": "heart_attack"}).json()["type"] == "HEART"
    assert scenario(demo, {"scenario": "Low-Glucose"}).json()["type"] == "DIABETIC"
    assert scenario(demo, {"type": " stroke "}).json()["type"] == "STROKE"


def test_the_fall_scenario_is_a_safety_check_in(demo):
    r = scenario(demo, {"type": "FALL"})
    assert r.status_code == 201 and r.json()["type"] == "UNKNOWN"
    full = demo.get(f"/emergencies/{r.json()['id']}", headers=demo.headers()).json()
    assert full["source"] == "FALL_CHECK" and full["state"] == "SOS_SENT"


@pytest.mark.parametrize("body", [{}, {"type": "NOPE"}, {"type": ""}, {"type": 5}, {"type": None}, {"type": ["HEART"]}])
def test_an_unknown_scenario_is_400_and_creates_nothing(demo, engine, body):
    r = scenario(demo, body)
    assert r.status_code == 400 and r.json()["error"] == r.json()["detail"]
    assert count(engine, Emergency) == 0


def test_a_staff_login_runs_the_scenario_for_the_demo_patient(demo, engine):
    r = scenario(demo, {"type": "HEART"}, who=STAFF)
    assert r.status_code == 201
    with Session(engine) as s:
        e = s.get(Emergency, r.json()["id"])
        assert e.patient_id == PID
        assert s.query(StatusEvent).filter(StatusEvent.emergency_id == e.id).first().actor == "usr_003"


def test_the_scenario_sends_the_hospital_events_and_nothing_with_a_phone_number(demo, seen):
    scenario(demo, {"type": "HEART"})
    kinds = [e["event"] for e in seen]
    assert "emergency.created" in kinds and "hospital.alerted" in kinds and "emergency.sos_sent" in kinds
    assert "00000 00001" not in str(seen)


def test_the_scenario_works_with_the_patients_current_consents(demo, engine):
    with Session(engine) as s:
        from app.security.actor import Actor
        consent_service.update_consents(s, Actor("usr_001", "PATIENT", PID), PID, {"location": False, "vitals": False})
        s.commit()
    eid = scenario(demo, {"type": "HEART"}).json()["id"]
    with Session(engine) as s:
        e = s.get(Emergency, eid)
        assert e.location is None and e.vitals_at_alert is None


def test_a_scenario_fails_cleanly_when_the_demo_patient_is_missing(demo, engine, monkeypatch):
    monkeypatch.setattr(demo_service, "DEMO_PATIENT_ID", "PT-MISSING")
    assert scenario(demo, {"type": "HEART"}, who=STAFF).status_code == 404
    assert count(engine, Emergency) == 0


# ------------------------------------------------------------ state and speed

def test_state_shows_the_speed_and_the_wearable(demo):
    b = demo.get("/demo/state", headers=demo.headers()).json()
    assert b["speed"] == 1 and b["allowed_speeds"] == [1, 2, 5, 10, 20] and b["simulated"] is True
    assert b["vitals"]["profile"] == "normal" and b["vitals"]["overrides"] == {}
    assert set(b["vitals"]["profiles"]) == {"normal", "heart_attack", "stroke", "low_glucose", "asthma"}


def test_state_follows_demo_vitals_and_a_reset(demo):
    demo.post("/demo/vitals", json={"profile": "stroke", "overrides": {"heart_rate": 140}}, headers=demo.headers())
    b = demo.get("/demo/state", headers=demo.headers()).json()
    assert b["vitals"]["profile"] == "stroke" and b["vitals"]["overrides"]["heart_rate"] == 140
    reset(demo)
    assert demo.get("/demo/state", headers=demo.headers()).json()["vitals"]["profile"] == "normal"


def test_speed_accepts_only_the_allowed_values(demo):
    for good in (1, 2, 5, 10, 20):
        r = demo.post("/demo/speed", json={"multiplier": good}, headers=demo.headers())
        assert r.status_code == 200 and r.json() == {"speed": good}
    for bad in (3, 0, -1, 2.5, "5", True, None, 100):
        assert demo.post("/demo/speed", json={"multiplier": bad}, headers=demo.headers()).status_code == 400
    assert demo.post("/demo/speed", json={}, headers=demo.headers()).status_code == 400
    assert demo.get("/demo/state", headers=demo.headers()).json()["speed"] == 20      # a bad value changed nothing


def test_reset_puts_the_speed_back_to_1(demo):
    demo.post("/demo/speed", json={"multiplier": 10}, headers=demo.headers())
    reset(demo)
    assert demo_service.get_speed() == 1


@pytest.mark.parametrize("method,path", [("get", "/demo/state"), ("post", "/demo/speed")])
def test_state_and_speed_follow_the_same_demo_rules(demo, monkeypatch, method, path):
    assert getattr(demo, method)(path).status_code == 401
    headers = demo.headers()
    monkeypatch.delenv("DEMO_MODE")
    assert getattr(demo, method)(path, headers=headers).status_code == 404
    assert getattr(demo, method)(path).status_code == 404
