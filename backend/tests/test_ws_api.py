"""The WebSocket: who connects and who hears what (P4). One path, /ws."""
import pytest
from sqlalchemy.orm import Session
from starlette.websockets import WebSocketDisconnect

from app.models.emergencies import Emergency, HospitalAlert
from app.seed.demo_data import DEMO_HOSPITAL_ID
from app.services import events, ws_hub

PATIENT = ("patient@demo.test", "demo1234")
STAFF = ("staff@demo.test", "demo1234")
ADMIN = ("admin@demo.test", "demo1234")
FAMILY = ("family1", "demo-password")


@pytest.fixture(autouse=True)
def clean_hub():
    events.clear_subscribers()
    yield
    events.clear_subscribers()


def hear(ws):
    return ws.receive_json()


def closed_with(demo, url):
    with pytest.raises(WebSocketDisconnect) as info:
        with demo.websocket_connect(url) as ws:
            ws.receive_json()
    return info.value.code


def my_alert(demo, engine):
    eid = demo.post("/emergencies", json={"symptoms": ["CHEST_PAIN"]}, headers=demo.headers(*PATIENT)).json()["id"]
    with Session(engine) as s:
        e = s.get(Emergency, eid)
        e.hospital_id = DEMO_HOSPITAL_ID
        s.commit()
    return eid


def sos_to_my_hospital(demo, engine, eid):
    demo.post(f"/emergencies/{eid}/sos", json={}, headers=demo.headers(*PATIENT))
    with Session(engine) as s:
        s.get(Emergency, eid).hospital_id = DEMO_HOSPITAL_ID
        for a in s.query(HospitalAlert).filter(HospitalAlert.emergency_id == eid):
            a.hospital_id = DEMO_HOSPITAL_ID
        s.commit()


def test_a_missing_or_bad_token_is_closed_with_1008(demo):
    assert closed_with(demo, "/ws?token=not-a-real-token") == 1008


def test_a_token_in_a_message_works_and_is_answered(demo):
    token = demo.token(*STAFF)
    with demo.websocket_connect("/ws") as ws:
        ws.send_json({"type": "auth", "token": token})
        assert hear(ws)["event"] == "auth.ok"


def test_a_wrong_token_in_a_message_is_closed(demo):
    with pytest.raises(WebSocketDisconnect) as info:
        with demo.websocket_connect("/ws") as ws:
            ws.send_json({"type": "auth", "token": "nope"})
            ws.receive_json()
    assert info.value.code == 1008


def test_the_desk_hears_its_own_acknowledge_and_the_patient_hears_it_too(demo, engine):
    eid = my_alert(demo, engine)
    sos_to_my_hospital(demo, engine, eid)
    staff_token, patient_token = demo.token(*STAFF), demo.token(*PATIENT)
    with demo.websocket_connect("/ws?token=" + staff_token) as desk, \
            demo.websocket_connect("/ws?token=" + patient_token) as patient:
        assert demo.post(f"/emergencies/{eid}/ack", json={}, headers=demo.headers(*STAFF)).status_code == 200
        for ws in (desk, patient):
            event = hear(ws)
            assert event["event"] == "hospital.acknowledged" and event["emergency_id"] == eid
            assert event["state"] == "HOSPITAL_ACKNOWLEDGED"


def test_a_hospital_that_was_not_alerted_hears_nothing_about_the_emergency(demo, engine):
    eid = my_alert(demo, engine)
    sos_to_my_hospital(demo, engine, eid)
    with Session(engine) as s:
        s.get(Emergency, eid).hospital_id = "HSP-AMD-001"
        for a in s.query(HospitalAlert).filter(HospitalAlert.emergency_id == eid):
            a.hospital_id = "HSP-AMD-001"
        s.commit()
    with demo.websocket_connect("/ws?token=" + demo.token(*STAFF)) as ws:
        # an availability update is hospital-wide news: it is the first thing this desk hears
        demo.patch(f"/hospitals/{DEMO_HOSPITAL_ID}/availability", json={"beds_free": 2}, headers=demo.headers(*STAFF))
        assert hear(ws)["event"] == "hospital.availability_updated"


def test_a_patient_never_hears_another_patients_emergency(demo, engine):
    ev = {"event": "emergency.sos_sent", "type": "emergency.sos_sent", "emergency_id": None, "state": None,
          "timestamp": "2026-11-14T10:00:00Z", "payload": {}, "audience": "all"}
    from app.security.actor import Actor
    other = Actor(user_id="usr_x", role="PATIENT", patient_id="PT-2026-0002", hospital_id=None)
    eid = my_alert(demo, engine)
    sos_to_my_hospital(demo, engine, eid)
    with Session(engine) as s:
        assert ws_hub.visible(s, other, {**ev, "emergency_id": eid}) is False
        mine = Actor(user_id="usr_001", role="PATIENT", patient_id=s.get(Emergency, eid).patient_id, hospital_id=None)
        assert ws_hub.visible(s, mine, {**ev, "emergency_id": eid}) is True


def test_family_and_responders_hear_nothing_yet(demo, engine):
    from app.security.actor import Actor
    eid = my_alert(demo, engine)
    sos_to_my_hospital(demo, engine, eid)
    ev = {"event": "emergency.sos_sent", "emergency_id": eid, "audience": "all"}
    with Session(engine) as s:
        for role in ("FAMILY", "RESPONDER"):
            assert ws_hub.visible(s, Actor(user_id="u", role=role, patient_id=None, hospital_id=None), ev) is False


def test_an_alert_before_the_sos_is_not_visible_to_a_hospital(demo, engine):
    from app.security.actor import Actor
    eid = my_alert(demo, engine)
    desk = Actor(user_id="u", role="HOSPITAL_STAFF", patient_id=None, hospital_id=DEMO_HOSPITAL_ID)
    admin = Actor(user_id="a", role="ADMIN", patient_id=None, hospital_id=None)
    with Session(engine) as s:
        for who in (desk, admin):
            assert ws_hub.visible(s, who, {"emergency_id": eid, "audience": "all"}) is False


def test_the_envelope_has_no_audience():
    event = events.build("hospital.acknowledged", {"x": 1}, audience="hospitals", emergency_id="EM-1", state="SOS_SENT")
    assert "audience" not in ws_hub.public(event) and ws_hub.public(event)["event"] == "hospital.acknowledged"
