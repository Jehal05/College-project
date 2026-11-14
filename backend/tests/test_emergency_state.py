"""The state helper, the event hook and the hospital ranking, tested without the API (J1)."""
from datetime import datetime, timezone

import pytest
from sqlalchemy.orm import Session

from app.models.emergencies import Emergency, StatusEvent
from app.models.enums import ALLOWED_TRANSITIONS, EmergencyState, InvalidTransition
from app.models.hospitals import Hospital
from app.security.actor import Actor
from app.services import emergency_state, events, hospital_match

S = EmergencyState
STAFF = Actor("usr_003", "HOSPITAL_STAFF", None, "HSP-AMD-002")


@pytest.fixture(autouse=True)
def clean_events():
    events.clear_subscribers()
    yield
    events.clear_subscribers()


def make(session, state="EMERGENCY_DETECTED"):
    e = Emergency(id="EM-T-0001", patient_id="pat_001", type="HEART", state=state, engine_severity="EMERGENCY",
                  severity="EMERGENCY", created_at=datetime.now(timezone.utc))
    session.add(e)
    session.commit()
    return e


def test_a_legal_move_changes_the_state_and_writes_one_status_event(patients):
    e = make(patients)
    emergency_state.transition(patients, e, S.SOS_SENT, STAFF)
    patients.commit()
    assert e.state == "SOS_SENT"
    [row] = patients.query(StatusEvent).all()
    assert (row.state, row.actor) == ("SOS_SENT", "usr_003")


def test_the_actor_is_system_when_nobody_clicked(patients):
    e = make(patients)
    emergency_state.transition(patients, e, S.CANCELLED)
    assert patients.query(StatusEvent).one().actor == "system"


@pytest.mark.parametrize("frm,to", [(a, b) for a in S for b in S if b not in ALLOWED_TRANSITIONS[a]])
def test_every_illegal_move_is_refused_and_changes_nothing(patients, frm, to):
    e = make(patients, frm.value)
    with pytest.raises(InvalidTransition) as err:
        emergency_state.transition(patients, e, to)
    assert (err.value.from_state, err.value.to_state) == (frm, to)
    assert e.state == frm.value and patients.query(StatusEvent).count() == 0


def test_staying_in_the_same_state_is_not_a_move(patients):
    e = make(patients, "SOS_SENT")
    with pytest.raises(InvalidTransition):
        emergency_state.transition(patients, e, S.SOS_SENT)


def test_a_final_state_sets_finished_at(patients):
    e = make(patients, "ARRIVED")
    emergency_state.transition(patients, e, S.HANDOVER_DONE, STAFF)
    assert e.finished_at is not None


def test_nothing_skips_a_step(patients):
    e = make(patients, "SOS_SENT")
    with pytest.raises(InvalidTransition):
        emergency_state.transition(patients, e, S.ARRIVED)


# ------------------------------------------------------------ events

def test_events_wait_for_the_flush(patients):
    got = []
    events.subscribe(got.append)
    e = make(patients, "ARRIVED")
    emergency_state.transition(patients, e, S.HANDOVER_DONE, STAFF)
    assert got == []
    patients.commit()
    events.flush(patients)
    assert [x["event"] for x in got] == ["emergency.handover_done"]
    assert events.flush(patients) == []                 # nothing is sent twice


def test_a_rollback_drops_the_events(patients):
    got = []
    events.subscribe(got.append)
    e = make(patients, "ARRIVED")
    emergency_state.transition(patients, e, S.HANDOVER_DONE, STAFF)
    patients.rollback()
    events.discard(patients)
    events.flush(patients)
    assert got == []


def test_the_envelope_has_event_and_type_and_the_audience():
    ev = events.build("emergency.created", {"a": 1}, audience="hospitals", emergency_id="EM-1", state="SOS_SENT")
    assert ev["event"] == ev["type"] == "emergency.created" and ev["audience"] == "hospitals"
    assert ev["emergency_id"] == "EM-1" and ev["state"] == "SOS_SENT" and ev["payload"] == {"a": 1}
    assert ev["timestamp"].endswith("Z")


def test_a_broken_subscriber_never_breaks_the_request_or_the_others():
    got = []

    def boom(_event):
        raise RuntimeError("secret patient data in here")

    events.subscribe(boom)
    events.subscribe(got.append)
    events.publish("x.y")
    assert len(got) == 1


def test_a_subscriber_is_added_once():
    got = []
    events.subscribe(got.append)
    events.subscribe(got.append)
    events.publish("x.y")
    assert len(got) == 1


# ------------------------------------------------------------ ranking

def hosp(id, lat, lng, *, verified=True, emergency=True, cath=False, ready=False, stroke=False, stroke_ready=False, icu=False):
    return Hospital(id=id, name=id, lat=lat, lng=lng, verified=verified, cap_emergency=emergency, cap_cath_lab=cath,
                    cath_lab_ready=ready, cap_stroke_unit=stroke, stroke_unit_ready=stroke_ready, cap_icu=icu)


def test_a_ready_cath_lab_beats_a_nearer_hospital_without_one():
    near = hosp("NEAR", 23.0226, 72.5715)
    far = hosp("FAR", 23.10, 72.60, cath=True, ready=True)
    ranked = hospital_match.rank_hospitals([near, far], "HEART")
    assert [r["hospital"].id for r in ranked] == ["FAR", "NEAR"] and [r["rank"] for r in ranked] == [1, 2]
    assert ranked[0]["suitable"] and not ranked[1]["suitable"]


def test_a_cath_lab_that_is_not_ready_does_not_count():
    a = hosp("A", 23.0226, 72.5715, cath=True, ready=False)
    b = hosp("B", 23.10, 72.60, cath=True, ready=True)
    assert hospital_match.rank_hospitals([a, b], "HEART")[0]["hospital"].id == "B"


def test_stroke_needs_a_ready_stroke_unit_and_asthma_an_icu():
    s = hosp("S", 23.10, 72.60, stroke=True, stroke_ready=True)
    i = hosp("I", 23.10, 72.60, icu=True)
    plain = hosp("P", 23.0226, 72.5715)
    assert hospital_match.rank_hospitals([plain, s], "STROKE")[0]["hospital"].id == "S"
    assert hospital_match.rank_hospitals([plain, i], "ASTHMA")[0]["hospital"].id == "I"


def test_unverified_hospitals_and_hospitals_without_an_emergency_department_are_never_candidates():
    ranked = hospital_match.rank_hospitals([hosp("U", 23.0, 72.5, verified=False), hosp("N", 23.0, 72.5, emergency=False),
                                            hosp("OK", 23.5, 72.9)], "DIABETIC")
    assert [r["hospital"].id for r in ranked] == ["OK"]


def test_with_equal_scores_the_nearest_wins_and_ties_are_stable():
    a, b = hosp("B", 23.05, 72.60), hosp("A", 23.05, 72.60)
    assert [r["hospital"].id for r in hospital_match.rank_hospitals([a, b], "DIABETIC")] == ["A", "B"]
    near, far = hosp("NEAR", 23.03, 72.58), hosp("FAR", 23.30, 72.90)
    assert hospital_match.rank_hospitals([far, near], "DIABETIC")[0]["hospital"].id == "NEAR"


def test_no_location_uses_the_demo_point_and_nothing_gives_an_empty_list():
    assert hospital_match.rank_hospitals([hosp("X", 23.0225, 72.5714)], "HEART")[0]["distance_km"] == 0
    assert hospital_match.rank_hospitals([], "HEART") == []


def test_the_distance_is_about_right():
    assert 0.9 < hospital_match.distance_km(23.0, 72.5, 23.0, 72.51) < 1.1
    assert hospital_match.distance_km(10, 10, 10, 10) == 0
