"""WebSocket boundaries, written as a review of who may hear what (Phase 1).

These tests try to CROSS the lines in app/services/ws_hub.py (visible) and app/api/ws.py (login):
another hospital, a desk with no hospital, patient-only streams, and a disabled account.
They only describe what the code does today; they do not change it.
Known and NOT covered here (a finding, not a test): the token is checked once, when the socket opens.
"""
import pytest
from sqlalchemy.orm import Session
from starlette.websockets import WebSocketDisconnect

from app.models.accounts import User
from app.models.emergencies import Emergency, HospitalAlert
from app.security.actor import Actor
from app.seed.demo_data import DEMO_HOSPITAL_ID
from app.services import events, ws_hub

PATIENT = ("patient@demo.test", "demo1234")
STAFF = ("staff@demo.test", "demo1234")
OTHER_HOSPITAL = "HSP-AMD-001"

DESK_A = Actor(user_id="u_a", role="HOSPITAL_STAFF", patient_id=None, hospital_id=DEMO_HOSPITAL_ID)
DESK_B = Actor(user_id="u_b", role="HOSPITAL_STAFF", patient_id=None, hospital_id=OTHER_HOSPITAL)
DESK_NONE = Actor(user_id="u_n", role="HOSPITAL_STAFF", patient_id=None, hospital_id=None)
ADMIN = Actor(user_id="u_adm", role="ADMIN", patient_id=None, hospital_id=None)


@pytest.fixture(autouse=True)
def clean_hub():
    events.clear_subscribers()
    yield
    events.clear_subscribers()


def sent_emergency(demo, engine, hospital_id):
    """A patient emergency whose SOS was sent and whose only alert went to `hospital_id`."""
    eid = demo.post("/emergencies", json={"symptoms": ["CHEST_PAIN"]}, headers=demo.headers(*PATIENT)).json()["id"]
    demo.post(f"/emergencies/{eid}/sos", json={}, headers=demo.headers(*PATIENT))
    with Session(engine) as s:
        s.get(Emergency, eid).hospital_id = hospital_id
        for alert in s.query(HospitalAlert).filter(HospitalAlert.emergency_id == eid):
            alert.hospital_id = hospital_id
        s.commit()
    return eid


def event(eid, audience="all"):
    return {"event": "emergency.test", "emergency_id": eid, "audience": audience}


# ---------------------------------------------------- the filter (visible)

def test_only_the_alerted_hospital_may_see_the_emergency(demo, engine):
    eid = sent_emergency(demo, engine, DEMO_HOSPITAL_ID)
    with Session(engine) as s:
        assert ws_hub.visible(s, DESK_A, event(eid)) is True
        assert ws_hub.visible(s, DESK_B, event(eid)) is False


def test_a_desk_with_no_hospital_sees_no_emergency(demo, engine):
    eid = sent_emergency(demo, engine, DEMO_HOSPITAL_ID)
    with Session(engine) as s:
        assert ws_hub.visible(s, DESK_NONE, event(eid)) is False


def test_an_escalation_alert_gives_the_next_hospital_sight_of_it(demo, engine):
    eid = sent_emergency(demo, engine, DEMO_HOSPITAL_ID)
    with Session(engine) as s:
        assert ws_hub.visible(s, DESK_B, event(eid)) is False
        s.add(HospitalAlert(emergency_id=eid, hospital_id=OTHER_HOSPITAL))
        s.commit()
        assert ws_hub.visible(s, DESK_B, event(eid)) is True


def test_patient_only_streams_never_reach_a_hospital_or_admin(demo, engine):
    for audience in ("patient:PT-2026-0417", "family:PT-2026-0417", "responders"):
        ev = {"event": "vitals.update", "emergency_id": None, "audience": audience}
        with Session(engine) as s:
            for who in (DESK_A, DESK_B, DESK_NONE, ADMIN):
                assert ws_hub.visible(s, who, ev) is False, (audience, who.role)


def test_a_patient_hears_only_their_own_patient_stream(demo, engine):
    mine = Actor(user_id="p1", role="PATIENT", patient_id="PT-2026-0417", hospital_id=None)
    other = Actor(user_id="p2", role="PATIENT", patient_id="PT-2026-0002", hospital_id=None)
    ev = {"event": "vitals.update", "emergency_id": None, "audience": "patient:PT-2026-0417"}
    with Session(engine) as s:
        assert ws_hub.visible(s, mine, ev) is True
        assert ws_hub.visible(s, other, ev) is False


# ---------------------------------------------------- the socket itself

def test_a_desk_of_another_hospital_never_hears_the_emergency_on_a_live_socket(demo, engine):
    eid = sent_emergency(demo, engine, OTHER_HOSPITAL)          # the alert went to hospital 001, the desk is hospital 002
    with demo.websocket_connect("/ws?token=" + demo.token(*STAFF)) as ws:
        events.publish("emergency.test", {"x": 1}, audience="all", emergency_id=eid)
        events.publish("hospital.availability_updated", {"y": 2}, audience="hospitals")
        first = ws.receive_json()
    # events arrive in order: if the emergency event had been delivered it would be first
    assert first["event"] == "hospital.availability_updated"


def test_a_disabled_account_cannot_open_a_socket(demo, engine):
    token = demo.token(*STAFF)
    with Session(engine) as s:
        user = s.query(User).filter(User.login == STAFF[0]).first()
        user.is_active = False
        s.commit()
    with pytest.raises(WebSocketDisconnect) as info:
        with demo.websocket_connect("/ws?token=" + token) as ws:
            ws.receive_json()
    assert info.value.code == 1008
