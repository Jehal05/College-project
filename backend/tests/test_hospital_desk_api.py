"""The hospital desk's calls through the REAL login: acknowledge, dispatch, status and the lists (P2)."""
import pytest
from sqlalchemy.orm import Session

from app.models.audit import AuditLog
from app.models.emergencies import Emergency, HospitalAlert, StatusEvent
from app.models.hospitals import Ambulance
from app.seed.demo_data import DEMO_HOSPITAL_ID
from app.services import events

STAFF = ("staff@demo.test", "demo1234")
ADMIN = ("admin@demo.test", "demo1234")
PATIENT = ("patient@demo.test", "demo1234")
FAMILY = ("family1", "demo-password")
RESPONDER = ("responder1", "demo-password")
CHEST = {"symptoms": ["CHEST_PAIN", "SHORT_BREATH"]}
OTHER_HOSPITAL = "HSP-AMD-001"


@pytest.fixture(autouse=True)
def seen():
    got = []
    events.clear_subscribers()
    events.subscribe(got.append)
    yield got
    events.clear_subscribers()


def new_alert(demo, engine, hospital=DEMO_HOSPITAL_ID, sos=True):
    """A sent SOS whose alert sits with the demo desk's hospital (the ranking may pick another one)."""
    eid = demo.post("/emergencies", json=CHEST, headers=demo.headers(*PATIENT)).json()["id"]
    if sos:
        demo.post(f"/emergencies/{eid}/sos", json={}, headers=demo.headers(*PATIENT))
        with Session(engine) as s:
            e = s.get(Emergency, eid)
            e.hospital_id = hospital
            for a in s.query(HospitalAlert).filter(HospitalAlert.emergency_id == eid):
                a.hospital_id = hospital
            s.commit()
    return eid


def post(demo, eid, step, body=None, who=STAFF):
    return demo.post(f"/emergencies/{eid}/{step}", json=body if body is not None else {}, headers=demo.headers(*who))


def acked(demo, engine):
    eid = new_alert(demo, engine)
    assert post(demo, eid, "ack").status_code == 200
    return eid


def dispatched(demo, engine, ambulance="AMB-AMD-02"):
    eid = acked(demo, engine)
    assert post(demo, eid, "dispatch", {"ambulance_id": ambulance}).status_code == 200
    return eid


def state(engine, eid):
    with Session(engine) as s:
        return s.get(Emergency, eid).state


def denied(engine, action, reason=None):
    with Session(engine) as s:
        q = s.query(AuditLog).filter(AuditLog.action == action, AuditLog.outcome == "denied")
        return (q.filter(AuditLog.reason == reason) if reason else q).count()


# ------------------------------------------------------------ acknowledge

def test_the_desk_acknowledges_an_alert(demo, engine, seen):
    eid = new_alert(demo, engine)
    seen.clear()
    r = post(demo, eid, "ack", {"hospital_id": DEMO_HOSPITAL_ID, "note": "ready"})
    assert r.status_code == 200
    assert r.json()["state"] == "HOSPITAL_ACKNOWLEDGED" and r.json()["hospital"]["id"] == DEMO_HOSPITAL_ID
    assert state(engine, eid) == "HOSPITAL_ACKNOWLEDGED"
    assert [e["event"] for e in seen] == ["hospital.acknowledged"]
    assert seen[0]["payload"]["hospital_id"] == DEMO_HOSPITAL_ID and seen[0]["payload"]["acknowledged_by"].startswith("usr_")
    with Session(engine) as s:
        alert = s.query(HospitalAlert).filter(HospitalAlert.emergency_id == eid).one()
        assert alert.status == "ACKNOWLEDGED" and alert.acknowledged_at is not None
        states = [x.state for x in s.query(StatusEvent).filter(StatusEvent.emergency_id == eid).order_by(StatusEvent.id)]
        assert states[-1] == "HOSPITAL_ACKNOWLEDGED"
        assert s.query(AuditLog).filter(AuditLog.action == "emergency.ack", AuditLog.outcome == "allowed").count() == 1


def test_acknowledging_twice_is_harmless(demo, engine, seen):
    eid = acked(demo, engine)
    seen.clear()
    r = post(demo, eid, "ack")
    assert r.status_code == 200 and r.json()["state"] == "HOSPITAL_ACKNOWLEDGED" and seen == []


def test_an_alert_before_the_sos_is_not_there_for_a_hospital(demo, engine):
    eid = new_alert(demo, engine, sos=False)
    assert post(demo, eid, "ack").status_code == 404
    assert denied(engine, "emergency.ack", "emergency_not_found") == 1


def test_an_unknown_emergency_is_404(demo):
    assert post(demo, "EM-NOPE", "ack").status_code == 404


def test_staff_of_a_hospital_that_was_not_alerted_get_403(demo, engine):
    eid = new_alert(demo, engine, hospital=OTHER_HOSPITAL)
    assert post(demo, eid, "ack").status_code == 403
    assert state(engine, eid) == "SOS_SENT" and denied(engine, "emergency.ack", "forbidden_role") == 1


def test_a_body_hospital_id_must_be_the_callers_own(demo, engine):
    eid = new_alert(demo, engine)
    assert post(demo, eid, "ack", {"hospital_id": OTHER_HOSPITAL}).status_code == 403
    assert state(engine, eid) == "SOS_SENT"


@pytest.mark.parametrize("who", [PATIENT, ADMIN, FAMILY, RESPONDER])
def test_only_hospital_staff_may_acknowledge(demo, engine, who):
    eid = new_alert(demo, engine)
    assert post(demo, eid, "ack", who=who).status_code == 403
    assert state(engine, eid) == "SOS_SENT"


def test_a_cancelled_alert_cannot_be_acknowledged_and_the_409_carries_from_and_to(demo, engine):
    eid = new_alert(demo, engine)
    demo.post(f"/emergencies/{eid}/cancel", json={}, headers=demo.headers(*PATIENT))
    r = post(demo, eid, "ack")
    assert r.status_code == 409 and r.json()["from"] == "CANCELLED" and r.json()["to"] == "HOSPITAL_ACKNOWLEDGED"


def test_the_desk_needs_a_login(demo, engine):
    eid = new_alert(demo, engine)
    assert demo.post(f"/emergencies/{eid}/ack", json={}).status_code == 401


# ------------------------------------------------------------ dispatch

def test_the_desk_dispatches_an_ambulance(demo, engine, seen):
    eid = acked(demo, engine)
    seen.clear()
    r = post(demo, eid, "dispatch", {"hospital_id": DEMO_HOSPITAL_ID, "ambulance_id": "AMB-AMD-02", "eta_seconds": 420})
    assert r.status_code == 200
    assert r.json()["state"] == "AMBULANCE_DISPATCHED" and r.json()["ambulance"]["id"] == "AMB-AMD-02"
    assert r.json()["eta_seconds"] == 420
    assert [e["event"] for e in seen] == ["ambulance.dispatched"]
    assert seen[0]["payload"] == {"ambulance_id": "AMB-AMD-02", "eta_seconds": 420}
    with Session(engine) as s:
        assert s.get(Ambulance, "AMB-AMD-02").status == "dispatched"
        assert s.get(Emergency, eid).ambulance_id == "AMB-AMD-02"


def test_dispatch_needs_an_acknowledged_alert_and_the_409_carries_from_and_to(demo, engine):
    eid = new_alert(demo, engine)
    r = post(demo, eid, "dispatch", {"ambulance_id": "AMB-AMD-02"})
    assert r.status_code == 409 and (r.json()["from"], r.json()["to"]) == ("SOS_SENT", "AMBULANCE_DISPATCHED")
    with Session(engine) as s:
        assert s.get(Ambulance, "AMB-AMD-02").status == "available"


@pytest.mark.parametrize("body", [{}, {"ambulance_id": ""}, {"ambulance_id": 5}, {"ambulance_id": "NOPE"},
                                  {"ambulance_id": "AMB-AMD-02", "eta_seconds": -1}])
def test_dispatch_with_a_bad_ambulance_is_400(demo, engine, body):
    eid = acked(demo, engine)
    assert post(demo, eid, "dispatch", body).status_code == 400
    assert state(engine, eid) == "HOSPITAL_ACKNOWLEDGED"


def test_an_ambulance_that_is_busy_cannot_be_dispatched_again(demo, engine):
    dispatched(demo, engine)
    second = acked(demo, engine)
    r = post(demo, second, "dispatch", {"ambulance_id": "AMB-AMD-02"})
    assert r.status_code == 409 and state(engine, second) == "HOSPITAL_ACKNOWLEDGED"


def test_only_the_acknowledging_hospital_may_dispatch(demo, engine):
    eid = acked(demo, engine)
    with Session(engine) as s:
        s.get(Emergency, eid).hospital_id = OTHER_HOSPITAL
        s.commit()
    assert post(demo, eid, "dispatch", {"ambulance_id": "AMB-AMD-02"}).status_code == 403
    assert denied(engine, "emergency.dispatch", "forbidden_role") == 1


@pytest.mark.parametrize("who", [PATIENT, ADMIN, FAMILY, RESPONDER])
def test_only_hospital_staff_may_dispatch(demo, engine, who):
    eid = acked(demo, engine)
    assert post(demo, eid, "dispatch", {"ambulance_id": "AMB-AMD-02"}, who=who).status_code == 403


def test_a_patient_cannot_cancel_after_dispatch(demo, engine):
    eid = dispatched(demo, engine)
    r = demo.post(f"/emergencies/{eid}/cancel", json={}, headers=demo.headers(*PATIENT))
    assert r.status_code == 409 and r.json()["from"] == "AMBULANCE_DISPATCHED" and r.json()["to"] == "CANCELLED"


# ------------------------------------------------------------ status

def test_the_whole_journey_in_order(demo, engine, seen):
    eid = dispatched(demo, engine)
    seen.clear()
    r = post(demo, eid, "status", {"state": "EN_ROUTE"})
    assert r.status_code == 200 and r.json()["state"] == "EN_ROUTE"
    assert post(demo, eid, "status", {"state": "ARRIVED"}).json()["state"] == "ARRIVED"
    done = post(demo, eid, "status", {"state": "HANDOVER_DONE"})
    assert done.json()["state"] == "HANDOVER_DONE"
    assert [e["event"] for e in seen] == ["ambulance.location", "emergency.arrived", "emergency.handover_done"]
    assert seen[1]["payload"] == {"ambulance_id": "AMB-AMD-02"}
    assert seen[2]["payload"]["handover_by"].startswith("usr_")
    with Session(engine) as s:
        assert s.get(Ambulance, "AMB-AMD-02").status == "available"          # free again
        assert s.get(Emergency, eid).finished_at is not None


def test_a_step_cannot_be_skipped_and_the_409_carries_from_and_to(demo, engine):
    eid = dispatched(demo, engine)
    r = post(demo, eid, "status", {"state": "ARRIVED"})
    assert r.status_code == 409 and (r.json()["from"], r.json()["to"]) == ("AMBULANCE_DISPATCHED", "ARRIVED")
    assert state(engine, eid) == "AMBULANCE_DISPATCHED"


@pytest.mark.parametrize("body", [{}, {"state": "CANCELLED"}, {"state": "SOS_SENT"}, {"state": "en_route"}, {"state": 3}])
def test_status_only_takes_the_three_desk_steps(demo, engine, body):
    eid = dispatched(demo, engine)
    assert post(demo, eid, "status", body).status_code == 400


def test_only_the_hospital_on_the_case_may_move_it_on(demo, engine):
    eid = dispatched(demo, engine)
    with Session(engine) as s:
        s.get(Emergency, eid).hospital_id = OTHER_HOSPITAL
        s.commit()
    assert post(demo, eid, "status", {"state": "EN_ROUTE"}).status_code == 403


@pytest.mark.parametrize("who", [PATIENT, ADMIN, FAMILY, RESPONDER])
def test_only_hospital_staff_may_move_it_on(demo, engine, who):
    eid = dispatched(demo, engine)
    assert post(demo, eid, "status", {"state": "EN_ROUTE"}, who=who).status_code == 403


# ------------------------------------------------------------ the lists

def get_list(demo, query="", who=STAFF):
    return demo.get("/emergencies" + query, headers=demo.headers(*who))


def test_the_active_and_finished_lists(demo, engine):
    live = new_alert(demo, engine)
    done = dispatched(demo, engine)
    for step in ("EN_ROUTE", "ARRIVED", "HANDOVER_DONE"):
        post(demo, done, "status", {"state": step})
    active = get_list(demo, "?status=active").json()
    finished = get_list(demo, "?status=finished").json()
    assert [e["id"] for e in active] == [live] and [e["id"] for e in finished] == [done]
    assert active[0]["emergency_id"] == live and active[0]["state"] == "SOS_SENT"
    assert {e["id"] for e in get_list(demo).json()} == {live, done}


def test_the_list_holds_only_sent_alerts_and_only_the_hospitals_own(demo, engine):
    mine = new_alert(demo, engine)
    new_alert(demo, engine, sos=False)
    new_alert(demo, engine, hospital=OTHER_HOSPITAL)
    assert [e["id"] for e in get_list(demo).json()] == [mine]


def test_an_admin_sees_every_sent_alert(demo, engine):
    new_alert(demo, engine)
    new_alert(demo, engine, hospital=OTHER_HOSPITAL)
    new_alert(demo, engine, sos=False)
    assert len(get_list(demo, who=ADMIN).json()) == 2


def test_the_list_respects_consent_and_is_audited(demo, engine):
    body = {**CHEST, "consent": {"location": False, "vitals": False}, "location": {"lat": 23.0, "lng": 72.5}}
    eid = demo.post("/emergencies", json=body, headers=demo.headers(*PATIENT)).json()["id"]
    demo.post(f"/emergencies/{eid}/sos", json={}, headers=demo.headers(*PATIENT))
    with Session(engine) as s:
        s.get(Emergency, eid).hospital_id = DEMO_HOSPITAL_ID
        s.commit()
    row = get_list(demo, "?status=active").json()[0]
    assert "location" not in row and "vitals_at_alert" not in row
    with Session(engine) as s:
        assert s.query(AuditLog).filter(AuditLog.action == "emergency.list", AuditLog.outcome == "allowed").count() == 1


@pytest.mark.parametrize("who", [PATIENT, FAMILY, RESPONDER])
def test_others_cannot_read_the_desk_list(demo, engine, who):
    assert get_list(demo, who=who).status_code == 403


def test_a_bad_status_filter_is_400(demo):
    assert get_list(demo, "?status=everything").status_code == 400


def test_the_list_needs_a_login(demo):
    assert demo.get("/emergencies").status_code == 401
