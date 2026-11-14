"""No acknowledgement in time: the alert goes to the next hospital (P4)."""
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.orm import Session

from app.models.emergencies import Emergency, HospitalAlert, StatusEvent
from app.models.hospitals import Hospital
from app.services import escalation, events

PATIENT = ("patient@demo.test", "demo1234")
STAFF = ("staff@demo.test", "demo1234")


@pytest.fixture(autouse=True)
def seen():
    got = []
    events.clear_subscribers()
    events.subscribe(got.append)
    yield got
    events.clear_subscribers()


def sent(demo):
    eid = demo.post("/emergencies", json={"symptoms": ["CHEST_PAIN"]}, headers=demo.headers(*PATIENT)).json()["id"]
    demo.post(f"/emergencies/{eid}/sos", json={}, headers=demo.headers(*PATIENT))
    return eid


def later(seconds=31):
    return datetime.now(timezone.utc) + timedelta(seconds=seconds)


def test_nothing_happens_before_the_timeout(demo, engine):
    eid = sent(demo)
    with Session(engine) as s:
        assert escalation.run_once(s, later(5)) == []
        assert s.get(Emergency, eid).state == "SOS_SENT"


def test_the_alert_moves_to_the_next_ranked_hospital_after_the_timeout(demo, engine, seen):
    eid = sent(demo)
    with Session(engine) as s:
        first = s.get(Emergency, eid).hospital_id
        ranking = s.get(Emergency, eid).engine_result["sos"]["ranking"]
    seen.clear()
    with Session(engine) as s:
        assert escalation.run_once(s, later()) == [eid]
    with Session(engine) as s:
        e = s.get(Emergency, eid)
        assert e.state == "SOS_SENT" and e.hospital_id == ranking[1] != first
        alerts = s.query(HospitalAlert).filter(HospitalAlert.emergency_id == eid).order_by(HospitalAlert.rank).all()
        assert [(a.hospital_id, a.rank, a.status) for a in alerts] == [(ranking[0], 1, "ESCALATED_AWAY"), (ranking[1], 2, "ALERTED")]
        states = [x.state for x in s.query(StatusEvent).filter(StatusEvent.emergency_id == eid).order_by(StatusEvent.id)]
        assert states[-3:] == ["SOS_SENT", "ESCALATED", "SOS_SENT"]
    names = [x["event"] for x in seen]
    assert names == ["hospital.escalated", "emergency.created", "hospital.alerted", "hospital.alerted"]
    assert [x["audience"] for x in seen[2:]] == ["hospitals", "patient:PT-2026-0417"]       # the patient is told too
    assert seen[0]["payload"] == {"from_hospital_id": ranking[0], "to_hospital_id": ranking[1]}
    assert seen[1]["audience"] == "hospitals" and seen[1]["payload"]["hospital"]["rank"] == 2


def test_it_keeps_going_until_the_ranking_is_used_up_and_then_stops(demo, engine):
    eid = sent(demo)
    with Session(engine) as s:
        count = len(s.get(Emergency, eid).engine_result["sos"]["ranking"])
    moves = 0
    for step in range(count + 3):
        with Session(engine) as s:
            moves += len(escalation.run_once(s, later(31 * (step + 1))))
    assert moves == count - 1
    with Session(engine) as s:
        assert s.get(Emergency, eid).state == "SOS_SENT"


def test_an_acknowledged_alert_is_not_escalated(demo, engine):
    eid = sent(demo)
    with Session(engine) as s:
        e = s.get(Emergency, eid)
        e.hospital_id = "HSP-AMD-002"
        for a in s.query(HospitalAlert).filter(HospitalAlert.emergency_id == eid):
            a.hospital_id = "HSP-AMD-002"
        s.commit()
    assert demo.post(f"/emergencies/{eid}/ack", json={}, headers=demo.headers(*STAFF)).status_code == 200
    with Session(engine) as s:
        assert escalation.run_once(s, later()) == []
        assert s.get(Emergency, eid).state == "HOSPITAL_ACKNOWLEDGED"


def test_a_cancelled_or_unsent_emergency_is_left_alone(demo, engine):
    eid = sent(demo)
    demo.post(f"/emergencies/{eid}/cancel", json={}, headers=demo.headers(*PATIENT))
    unsent = demo.post("/emergencies", json={"symptoms": ["CHEST_PAIN"]}, headers=demo.headers(*PATIENT)).json()["id"]
    with Session(engine) as s:
        assert escalation.run_once(s, later(300)) == []
        assert s.get(Emergency, unsent).state == "EMERGENCY_DETECTED"


def test_an_unverified_next_hospital_is_never_alerted(demo, engine):
    eid = sent(demo)
    with Session(engine) as s:
        for h in s.query(Hospital).all():
            h.verified = h.id == s.get(Emergency, eid).hospital_id
        s.commit()
    with Session(engine) as s:
        assert escalation.run_once(s, later()) == []
        assert s.get(Emergency, eid).state == "SOS_SENT"


def test_the_timeout_comes_from_the_environment(monkeypatch):
    assert escalation.timeout_seconds() == 30
    monkeypatch.setenv("ESCALATION_TIMEOUT_SECONDS", "5")
    assert escalation.timeout_seconds() == 5
    monkeypatch.setenv("ESCALATION_TIMEOUT_SECONDS", "nonsense")
    assert escalation.timeout_seconds() == 30
    monkeypatch.setenv("ESCALATION_TIMEOUT_SECONDS", "-4")
    assert escalation.timeout_seconds() == 30
