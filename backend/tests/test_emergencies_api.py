"""Emergencies through the REAL login: create, SOS, cancel, read, reasons, history, summary (J1)."""
import pytest
from sqlalchemy.orm import Session

from app.models.accounts import User
from app.models.audit import AuditLog
from app.models.emergencies import Emergency, HospitalAlert, StatusEvent
from app.models.hospitals import Hospital
from app.models.patient_data import Patient
from app.security.passwords import hash_password
from app.services import audit as audit_service
from app.services import events

PID = "PT-2026-0417"
CHEST = {"patient_id": PID, "type": "HEART", "symptoms": ["CHEST_PAIN", "SHORT_BREATH"]}
STAFF = ("staff@demo.test", "demo1234")
ADMIN = ("admin@demo.test", "demo1234")
FAMILY = ("family1", "demo-password")
RESPONDER = ("responder1", "demo-password")


@pytest.fixture(autouse=True)
def seen():
    got = []
    events.clear_subscribers()
    events.subscribe(got.append)
    yield got
    events.clear_subscribers()


def create(demo, body=None, who=None):
    return demo.post("/emergencies", json=CHEST if body is None else body, headers=demo.headers(*(who or ())))


def sos(demo, eid, body=None, who=None):
    return demo.post(f"/emergencies/{eid}/sos", json=body or {}, headers=demo.headers(*(who or ())))


def cancel(demo, eid, body=None, who=None):
    return demo.post(f"/emergencies/{eid}/cancel", json=body, headers=demo.headers(*(who or ())))


def get(demo, eid, who=None, path=""):
    return demo.get(f"/emergencies/{eid}{path}", headers=demo.headers(*(who or ())))


def audit_rows(engine, action="emergency.read"):
    with Session(engine) as s:
        return [audit_service.to_dict(r) for r in s.query(AuditLog).filter(AuditLog.action == action).order_by(AuditLog.id)]


def force(engine, eid, state):
    with Session(engine) as s:
        s.get(Emergency, eid).state = state
        s.commit()


def second_patient(engine):
    with Session(engine) as s:
        s.add(Patient(id="PT-2026-0002", name="Other"))
        s.flush()
        s.add(User(id="usr_0002", login="other@demo.test", display_name="Other", password_hash=hash_password("pw-123456"),
                   role="PATIENT", patient_id="PT-2026-0002"))
        s.commit()
    return ("other@demo.test", "pw-123456")


# ------------------------------------------------------------ create

def test_create_returns_201_with_the_contract_fields(demo):
    r = create(demo)
    assert r.status_code == 201
    b = r.json()
    assert b["state"] == "EMERGENCY_DETECTED" and b["type"] == "HEART" and b["severity"] == "EMERGENCY"
    assert b["patient_id"] == PID and b["simulated"] is True and b["source"] == "MANUAL"
    assert b["id"].startswith("EM-") and b["created_at"].endswith("Z")
    assert b["reasons"] and all(isinstance(x, str) for x in b["reasons"])


def test_the_type_is_optional_and_the_rules_engine_decides_it(demo):
    r = create(demo, {"symptoms": ["chest_pain", "breathlessness"]})
    assert r.status_code == 201 and r.json()["type"] == "HEART"
    r = create(demo, {"symptoms": ["FACE_DROOP"]})
    assert r.status_code == 201 and r.json()["type"] == "STROKE"


def test_ids_count_up_per_day(demo):
    a, b = create(demo).json()["id"], create(demo).json()["id"]
    assert a[:-4] == b[:-4] and int(b[-4:]) == int(a[-4:]) + 1


@pytest.mark.parametrize("body", [
    {"patient_id": PID, "type": "HEART", "symptoms": ["NOT_A_SYMPTOM"]},
    {"patient_id": PID, "type": "HEART", "symptoms": []},
    {"patient_id": PID, "type": "HEART"},
    {"patient_id": PID, "type": "NOPE", "symptoms": ["CHEST_PAIN"]},
    {"patient_id": PID, "type": "HEART", "symptoms": ["CHEST_PAIN"], "source": "BOGUS"},
    {"patient_id": PID, "type": "HEART", "symptoms": "CHEST_PAIN"},
    {"patient_id": PID, "type": "HEART", "symptoms": [1, 2]},
    {"patient_id": PID, "type": "HEART", "symptoms": ["CHEST_PAIN"], "consent": {"location": "yes"}},
    {"patient_id": PID, "type": "HEART", "symptoms": ["CHEST_PAIN"], "consent": {"photos": True}},
    {"patient_id": PID, "type": "HEART", "symptoms": ["CHEST_PAIN"], "location": {"lat": 200, "lng": 0}},
    {"patient_id": PID, "type": "HEART", "symptoms": ["CHEST_PAIN"], "location": "here"},
    {"patient_id": PID, "type": "HEART", "symptoms": ["X"] * 31},
    {"patient_id": 5, "type": "HEART", "symptoms": ["CHEST_PAIN"]},
])
def test_bad_requests_are_400_in_the_one_error_shape(demo, body):
    r = create(demo, body)
    assert r.status_code == 400
    assert r.json()["error"] == r.json()["detail"] and r.json()["error"]


def test_a_bad_request_never_echoes_what_was_sent(demo):
    r = create(demo, {"patient_id": PID, "type": "HEART", "symptoms": ["SECRET-VALUE-123"]})
    assert r.status_code == 400 and "SECRET-VALUE-123" not in r.text


def test_the_body_must_be_json(demo):
    r = demo.post("/emergencies", content=b"not json", headers={**demo.headers(), "Content-Type": "application/json"})
    assert r.status_code == 400


def test_partly_unknown_symptoms_are_stored_not_dropped(demo, engine):
    eid = create(demo, {"patient_id": PID, "type": "HEART", "symptoms": ["CHEST_PAIN", "MYSTERY_ONE"]}).json()["id"]
    with Session(engine) as s:
        e = s.get(Emergency, eid)
        assert e.unmapped_symptoms == ["MYSTERY_ONE"] and e.symptoms == ["CHEST_PAIN", "MYSTERY_ONE"]


def test_a_safety_check_in_needs_no_symptoms_and_no_type(demo):
    r = create(demo, {"patient_id": PID, "type": "UNKNOWN", "symptoms": [], "source": "FALL_CHECK"})
    assert r.status_code == 201 and r.json()["type"] == "UNKNOWN" and r.json()["source"] == "FALL_CHECK"
    assert r.json()["severity"] == "EMERGENCY"
    r = create(demo, {"patient_id": PID, "source": "INACTIVITY_CHECK"})
    assert r.status_code == 201 and r.json()["type"] == "UNKNOWN"


def test_a_check_in_source_without_the_check_in_symptom_still_needs_symptoms_when_manual(demo):
    assert create(demo, {"patient_id": PID, "symptoms": []}).status_code == 400


def test_the_patient_id_may_be_left_out(demo):
    assert create(demo, {"symptoms": ["CHEST_PAIN"]}).status_code == 201


def test_the_engine_severity_is_kept_and_chest_pain_is_always_an_emergency(demo, engine):
    eid = create(demo, {"patient_id": PID, "type": "HEART", "symptoms": ["CHEST_PAIN"]}).json()["id"]
    with Session(engine) as s:
        e = s.get(Emergency, eid)
        assert e.engine_severity == "EMERGENCY" and e.severity == "EMERGENCY" and e.severity_floor_applied is False


def test_a_milder_alert_is_raised_to_emergency_at_the_sos_and_the_engine_answer_is_kept(demo, engine):
    made = create(demo, {"patient_id": PID, "symptoms": ["NAUSEA"]}).json()
    assert made["severity"] == "WATCH" and made["type"] == "HEART"          # the engine's own answer
    sos(demo, made["id"])
    with Session(engine) as s:
        e = s.get(Emergency, made["id"])
        assert e.engine_severity == "WATCH" and e.severity == "EMERGENCY" and e.severity_floor_applied is True
    assert get(demo, made["id"]).json()["severity"] == "EMERGENCY"
    assert get(demo, made["id"], path="/reasons").json()["severity"] == "WATCH"


def test_nothing_is_stored_for_location_or_vitals_without_consent(demo, engine):
    body = {**CHEST, "consent": {"location": False, "vitals": False, "history": False, "reports": False},
            "location": {"lat": 23.0, "lng": 72.5}}
    eid = create(demo, body).json()["id"]
    sos(demo, eid, {"location": {"lat": 23.1, "lng": 72.6}})
    with Session(engine) as s:
        e = s.get(Emergency, eid)
        assert e.location is None and e.vitals_at_alert is None


def test_location_and_vitals_are_stored_with_consent(demo, engine):
    body = {**CHEST, "consent": {"location": True, "vitals": True}, "location": {"lat": 23.0, "lng": 72.5, "accuracy": 12}}
    eid = create(demo, body).json()["id"]
    with Session(engine) as s:
        e = s.get(Emergency, eid)
        assert e.location["lat"] == 23.0 and set(e.vitals_at_alert) >= {"heart_rate", "spo2", "timestamp"}


def test_who_may_create(demo):
    assert demo.post("/emergencies", json=CHEST).status_code == 401
    for who in (STAFF, ADMIN, FAMILY, RESPONDER):
        assert create(demo, who=who).status_code == 403


def test_a_patient_cannot_create_for_someone_else(demo, engine):
    r = create(demo, {**CHEST, "patient_id": "PT-2026-0002"})
    assert r.status_code == 403
    [row] = audit_rows(engine, "emergency.create")
    assert row["outcome"] == "denied" and row["reason"] == "forbidden_role"


def test_creating_sends_no_hospital_event(demo, seen):
    create(demo)
    assert [e["event"] for e in seen] == ["emergency.detected"]
    assert all(e["audience"].startswith("patient:") for e in seen)


def test_create_writes_the_first_status_event(demo, engine):
    eid = create(demo).json()["id"]
    with Session(engine) as s:
        [row] = s.query(StatusEvent).filter(StatusEvent.emergency_id == eid).all()
        assert row.state == "EMERGENCY_DETECTED" and row.actor == "usr_001"


# ------------------------------------------------------------ SOS

def test_sos_moves_to_sos_sent_and_names_the_hospital(demo):
    eid = create(demo).json()["id"]
    r = sos(demo, eid, {"location": {"lat": 23.0225, "lng": 72.5714, "accuracy": 20, "source": "gps"}})
    assert r.status_code == 200
    b = r.json()
    assert b["state"] == "SOS_SENT" and b["simulated"] is True
    assert b["hospital"]["id"].startswith("HSP-AMD-") and b["hospital"]["name"]


def test_a_heart_alert_goes_to_a_hospital_with_a_ready_cath_lab(demo, engine):
    with Session(engine) as s:
        ready = {h.id for h in s.query(Hospital) if h.cap_emergency and h.cath_lab_ready and h.verified}
    eid = create(demo).json()["id"]
    assert sos(demo, eid).json()["hospital"]["id"] in ready


def test_an_unverified_hospital_is_never_alerted(demo, engine):
    with Session(engine) as s:
        for h in s.query(Hospital):
            h.verified = False
        s.commit()
    eid = create(demo).json()["id"]
    r = sos(demo, eid)
    assert r.status_code == 200 and r.json()["state"] == "SOS_SENT" and r.json()["hospital"] is None


def test_sending_the_sos_twice_is_harmless(demo, engine, seen):
    eid = create(demo).json()["id"]
    first = sos(demo, eid).json()
    count = len(seen)
    again = sos(demo, eid)
    assert again.status_code == 200 and again.json()["state"] == "SOS_SENT" and again.json()["hospital"] == first["hospital"]
    assert len(seen) == count
    with Session(engine) as s:
        assert s.query(StatusEvent).filter(StatusEvent.emergency_id == eid, StatusEvent.state == "SOS_SENT").count() == 1
        assert s.query(HospitalAlert).filter(HospitalAlert.emergency_id == eid).count() == 1


def test_sos_after_the_hospital_answered_changes_nothing(demo, engine):
    eid = create(demo).json()["id"]
    sos(demo, eid)
    force(engine, eid, "HOSPITAL_ACKNOWLEDGED")
    r = sos(demo, eid)
    assert r.status_code == 200 and r.json()["state"] == "HOSPITAL_ACKNOWLEDGED"


def test_sos_on_a_cancelled_emergency_is_409_with_from_and_to(demo):
    eid = create(demo).json()["id"]
    cancel(demo, eid)
    r = sos(demo, eid)
    assert r.status_code == 409
    assert r.json()["detail"] == "Invalid transition" and r.json()["from"] == "CANCELLED" and r.json()["to"] == "SOS_SENT"


def test_sos_publishes_the_hospital_events_after_the_commit(demo, seen):
    eid = create(demo).json()["id"]
    seen.clear()
    sos(demo, eid)
    kinds = [e["event"] for e in seen]
    assert kinds[:3] == ["emergency.created", "emergency.created", "emergency.sos_sent"] and "hospital.alerted" in kinds
    created = seen[0]
    mine = seen[1]                                     # the same event for the patient, who owns that data
    assert mine["audience"] == "patient:" + PID and mine["payload"] == created["payload"]
    assert created["payload"]["symptoms"] == created["payload"]["symptom_ids"] == CHEST["symptoms"]
    assert created["audience"] == "hospitals" and created["state"] == "SOS_SENT" and created["emergency_id"] == eid
    assert created["payload"]["type"] == "HEART" and created["payload"]["hospital"]["id"].startswith("HSP-")


def test_the_created_event_leaves_out_what_the_patient_did_not_share(demo, seen):
    body = {**CHEST, "consent": {"location": False, "history": False, "vitals": False, "reports": False},
            "location": {"lat": 23.0, "lng": 72.5}}
    eid = create(demo, body).json()["id"]
    seen.clear()
    sos(demo, eid, {"location": {"lat": 23.0, "lng": 72.5}})
    payload = next(e for e in seen if e["event"] == "emergency.created")["payload"]
    for missing in ("location", "vitals"):
        assert missing not in payload
    assert payload["passport_available"] is False
    for key in ("allergies", "conditions", "medications"):
        assert key not in payload["patient"]
    assert payload["patient"]["name"]


def test_the_created_event_has_the_shared_history_and_no_phone_numbers(demo, seen):
    body = {**CHEST, "consent": {"location": True, "history": True, "vitals": True, "reports": True},
            "location": {"lat": 23.0, "lng": 72.5, "accuracy": 9}}
    eid = create(demo, body).json()["id"]
    seen.clear()
    sos(demo, eid)
    payload = next(e for e in seen if e["event"] == "emergency.created")["payload"]
    assert payload["location"]["lat"] == 23.0 and "bp" in payload["vitals"] and payload["patient"]["allergies"] is not None
    assert "00000 00001" not in str(seen) and "phone" not in str(seen).lower()


def test_contacts_are_notified_by_name_only(demo, seen):
    eid = create(demo).json()["id"]
    seen.clear()
    sos(demo, eid)
    note = next(e for e in seen if e["event"] == "contacts.notified")
    assert [c["name"] for c in note["payload"]["contacts"]] == ["Sunita Mehta", "Karan Mehta"]
    assert all(set(c) == {"name", "relation"} for c in note["payload"]["contacts"])


def test_sos_status_event_and_hospital_alert_rows(demo, engine):
    eid = create(demo).json()["id"]
    sos(demo, eid)
    with Session(engine) as s:
        states = [r.state for r in s.query(StatusEvent).filter(StatusEvent.emergency_id == eid).order_by(StatusEvent.id)]
        assert states == ["EMERGENCY_DETECTED", "SOS_SENT"]
        [alert] = s.query(HospitalAlert).filter(HospitalAlert.emergency_id == eid).all()
        assert alert.rank == 1 and alert.status == "ALERTED"
        assert s.get(Emergency, eid).sos_at is not None


def test_sos_bad_location_is_400(demo):
    eid = create(demo).json()["id"]
    assert sos(demo, eid, {"location": {"lat": "x", "lng": 1}}).status_code == 400
    assert sos(demo, eid, {"location": {"lat": 1, "lng": 1, "source": "GPS;DROP"}}).status_code == 400


def test_sos_without_a_body_is_fine(demo):
    eid = create(demo).json()["id"]
    r = demo.post(f"/emergencies/{eid}/sos", headers=demo.headers())
    assert r.status_code == 200


def test_who_may_send_the_sos(demo, engine):
    eid = create(demo).json()["id"]
    assert demo.post(f"/emergencies/{eid}/sos", json={}).status_code == 401
    for who in (STAFF, ADMIN, FAMILY, RESPONDER):
        assert sos(demo, eid, who=who).status_code == 403
    other = second_patient(engine)
    assert sos(demo, eid, who=other).status_code == 404
    assert sos(demo, "EM-NOPE", who=other).status_code == 404
    assert get(demo, eid).json()["state"] == "EMERGENCY_DETECTED"


# ------------------------------------------------------------ cancel

def test_cancel_before_the_sos(demo, seen):
    eid = create(demo).json()["id"]
    seen.clear()
    r = cancel(demo, eid)
    assert r.status_code == 200 and r.json()["state"] == "CANCELLED"
    ev = seen[-1]
    assert ev["event"] == "emergency.cancelled" and ev["payload"]["reason"] == "false_alarm"
    assert ev["audience"].startswith("patient:")          # the hospital never heard of it


def test_cancel_after_the_sos_tells_everybody_and_closes_the_alert(demo, engine, seen):
    eid = create(demo).json()["id"]
    sos(demo, eid)
    seen.clear()
    assert cancel(demo, eid, {"reason": "feeling_better"}).json()["state"] == "CANCELLED"
    assert seen[-1]["audience"] == "all" and seen[-1]["payload"]["reason"] == "feeling_better"
    with Session(engine) as s:
        assert s.query(HospitalAlert).filter(HospitalAlert.emergency_id == eid).one().status == "CANCELLED"
        assert s.get(Emergency, eid).finished_at is not None


def test_cancel_twice_is_harmless(demo, engine):
    eid = create(demo).json()["id"]
    cancel(demo, eid)
    assert cancel(demo, eid).json()["state"] == "CANCELLED"
    with Session(engine) as s:
        assert s.query(StatusEvent).filter(StatusEvent.emergency_id == eid, StatusEvent.state == "CANCELLED").count() == 1


@pytest.mark.parametrize("state", ["AMBULANCE_DISPATCHED", "EN_ROUTE", "ARRIVED", "HANDOVER_DONE"])
def test_cancel_is_refused_from_dispatch_on(demo, engine, state):
    eid = create(demo).json()["id"]
    force(engine, eid, state)
    r = cancel(demo, eid)
    assert r.status_code == 409
    assert r.json() == {"error": "Invalid transition", "detail": "Invalid transition", "from": state, "to": "CANCELLED"}
    assert get(demo, eid).json()["state"] == state


@pytest.mark.parametrize("state", ["SOS_SENT", "ESCALATED", "HOSPITAL_ACKNOWLEDGED"])
def test_cancel_is_allowed_before_dispatch(demo, engine, state):
    eid = create(demo).json()["id"]
    force(engine, eid, state)
    assert cancel(demo, eid).status_code == 200


def test_cancel_reason_must_be_a_fixed_code(demo):
    eid = create(demo).json()["id"]
    assert cancel(demo, eid, {"reason": "because I felt like it"}).status_code == 400
    assert cancel(demo, eid, {"reason": "other"}).status_code == 200


def test_cancel_unknown_and_wrong_roles(demo, engine):
    assert cancel(demo, "EM-NOPE").status_code == 404
    eid = create(demo).json()["id"]
    assert demo.post(f"/emergencies/{eid}/cancel").status_code == 401
    for who in (STAFF, ADMIN, FAMILY, RESPONDER):
        assert cancel(demo, eid, who=who).status_code == 403
    assert cancel(demo, eid, who=second_patient(engine)).status_code == 404
    assert get(demo, eid).json()["state"] == "EMERGENCY_DETECTED"


# ------------------------------------------------------------ GET /emergencies/{id}

def test_the_owner_reads_the_whole_record(demo):
    eid = create(demo).json()["id"]
    sos(demo, eid, {"location": {"lat": 23.0225, "lng": 72.5714}})
    b = get(demo, eid).json()
    assert b["id"] == eid and b["patient_id"] == PID and b["state"] == "SOS_SENT" and b["type"] == "HEART"
    assert b["symptoms"] == ["CHEST_PAIN", "SHORT_BREATH"] and b["simulated"] is True
    assert b["hospital"]["name"] and b["ambulance"] is None
    assert [t["state"] for t in b["timeline"]] == ["EMERGENCY_DETECTED", "SOS_SENT"]
    assert b["timeline"][0]["seconds_since_start"] == 0 and b["timeline"][0]["actor"] == "usr_001"
    assert [e["state"] for e in b["status_events"]] == ["EMERGENCY_DETECTED", "SOS_SENT"]
    assert set(b["consents"]) == {"location", "history", "vitals", "reports"}


def test_the_owners_own_reads_are_not_audited(demo, engine):
    eid = create(demo).json()["id"]
    get(demo, eid)
    assert audit_rows(engine) == []


def test_unknown_emergency_is_404(demo):
    assert get(demo, "E-DOES-NOT-EXIST").status_code == 404
    assert get(demo, "E-DOES-NOT-EXIST", path="/reasons").status_code == 404


def test_reading_needs_a_login(demo):
    eid = create(demo).json()["id"]
    assert demo.get(f"/emergencies/{eid}").status_code == 401
    assert demo.get(f"/emergencies/{eid}/reasons").status_code == 401


def test_another_patient_gets_the_same_404_and_the_refusal_is_audited(demo, engine):
    eid = create(demo).json()["id"]
    other = second_patient(engine)
    mine = get(demo, eid, who=other)
    nope = get(demo, "EM-NOPE", who=other)
    assert mine.status_code == nope.status_code == 404 and mine.json() == nope.json()
    [row] = audit_rows(engine)
    assert row["outcome"] == "denied" and row["reason"] == "forbidden_role" and row["patient_id"] == PID


def test_staff_see_nothing_before_the_sos(demo, engine):
    eid = create(demo).json()["id"]
    assert get(demo, eid, who=STAFF).status_code == 404
    [row] = audit_rows(engine)
    assert row["outcome"] == "denied" and row["reason"] == "emergency_not_found" and row["role"] == "HOSPITAL_STAFF"


def test_staff_read_after_the_sos_and_it_is_audited(demo, engine):
    body = {**CHEST, "consent": {"location": True, "history": True, "vitals": True, "reports": True},
            "location": {"lat": 23.0, "lng": 72.5}}
    eid = create(demo, body).json()["id"]
    sos(demo, eid)
    r = get(demo, eid, who=STAFF)
    assert r.status_code == 200
    b = r.json()
    assert b["location"]["lat"] == 23.0 and "heart_rate" in b["vitals_at_alert"] and b["passport_available"] is True
    assert "severity_floor_applied" not in b and "engine_severity" not in b
    [row] = audit_rows(engine)
    assert row["outcome"] == "allowed" and row["role"] == "HOSPITAL_STAFF" and row["fields_released"] == ["location", "vitals"]


def test_staff_never_get_what_the_patient_did_not_share(demo):
    body = {**CHEST, "consent": {"location": False, "history": False, "vitals": False, "reports": False},
            "location": {"lat": 23.0, "lng": 72.5}}
    eid = create(demo, body).json()["id"]
    sos(demo, eid, {"location": {"lat": 23.0, "lng": 72.5}})
    b = get(demo, eid, who=STAFF).json()
    assert "location" not in b and "vitals_at_alert" not in b and b["passport_available"] is False


def test_admin_reads_like_staff_and_is_audited(demo, engine):
    eid = create(demo).json()["id"]
    sos(demo, eid)
    assert get(demo, eid, who=ADMIN).status_code == 200
    assert audit_rows(engine)[-1]["role"] == "ADMIN"


def test_responders_and_unlinked_family_are_refused_and_audited(demo, engine):
    eid = create(demo).json()["id"]
    sos(demo, eid)
    assert get(demo, eid, who=RESPONDER).status_code == 403
    assert get(demo, eid, who=FAMILY).status_code == 403
    assert get(demo, "EM-NOPE", who=FAMILY).status_code == 403          # no clue whether the id exists
    assert [r["reason"] for r in audit_rows(engine)] == ["forbidden_role"] * 3


def test_a_linked_relative_sees_a_plain_status_only(demo, engine):
    from app.api.deps import get_family_link_checker
    from app.main import app
    app.dependency_overrides[get_family_link_checker] = lambda: (lambda session, actor, patient_id: patient_id == PID)
    try:
        eid = create(demo).json()["id"]
        assert get(demo, eid, who=FAMILY).status_code == 404            # nothing is shared before the SOS
        sos(demo, eid)
        b = get(demo, eid, who=FAMILY).json()
        assert set(b) == {"id", "patient_id", "state", "started_at", "simulated"} and b["state"] == "SOS_SENT"
        assert get(demo, eid, who=FAMILY, path="/reasons").status_code == 403
    finally:
        app.dependency_overrides.pop(get_family_link_checker, None)


# ------------------------------------------------------------ reasons

def test_reasons_explain_why_without_diagnosing(demo):
    eid = create(demo).json()["id"]
    r = get(demo, eid, path="/reasons")
    assert r.status_code == 200
    b = r.json()
    assert b["severity"] == "EMERGENCY" and b["type"] == "HEART" and b["simulated"] is True
    assert b["reviewed"] is False and b["review_status"] == "pending doctor review"
    assert b["matched_rules"] and set(b["matched_rules"][0]) == {"id", "type", "severity", "reason", "reviewed"}
    assert all(m["reviewed"] is False for m in b["matched_rules"])
    assert b["inputs"]["symptoms"] == ["CHEST_PAIN", "SHORT_BREATH"] and isinstance(b["inputs"]["vitals"], dict)
    assert "diagnos" not in str(b).lower().replace("does not diagnos", "")


def test_the_safety_floor_rule_is_listed_when_the_yaml_has_no_chest_pain_rule(demo, monkeypatch):
    from app.rules import engine
    monkeypatch.setattr(engine, "default_rules", lambda: ())
    eid = create(demo).json()["id"]
    b = get(demo, eid, path="/reasons").json()
    assert [m["id"] for m in b["matched_rules"]] == ["SAFETY_FLOOR_CHEST_PAIN"] and b["severity"] == "EMERGENCY"


def test_staff_reasons_follow_the_vitals_consent_and_are_audited(demo, engine):
    eid = create(demo, {**CHEST, "consent": {"vitals": False}}).json()["id"]
    sos(demo, eid)
    b = get(demo, eid, who=STAFF, path="/reasons").json()
    assert b["inputs"]["vitals"] == {} and b["inputs"]["vitals_at"] is None
    assert audit_rows(engine)[-1]["role"] == "HOSPITAL_STAFF"


def test_reasons_are_refused_to_responders(demo):
    eid = create(demo).json()["id"]
    sos(demo, eid)
    assert get(demo, eid, who=RESPONDER, path="/reasons").status_code == 403


# ------------------------------------------------------------ history and summary

def test_the_patient_lists_their_emergencies_newest_first(demo):
    a = create(demo).json()["id"]
    b = create(demo, {"patient_id": PID, "type": "UNKNOWN", "symptoms": [], "source": "FALL_CHECK"}).json()["id"]
    r = demo.get(f"/patients/{PID}/emergencies", headers=demo.headers())
    assert r.status_code == 200
    assert [e["id"] for e in r.json()] == [b, a]
    assert set(r.json()[0]) == {"id", "started_at", "final_state", "type", "source"} and r.json()[0]["source"] == "FALL_CHECK"


def test_the_list_is_the_owners_only(demo, engine):
    assert demo.get(f"/patients/{PID}/emergencies").status_code == 401
    for who in (STAFF, ADMIN, FAMILY, RESPONDER, second_patient(engine)):
        assert demo.get(f"/patients/{PID}/emergencies", headers=demo.headers(*who)).status_code == 403
    assert demo.get("/patients/PT-NOBODY/emergencies", headers=demo.headers()).status_code == 403


def test_the_summary_is_a_plain_record(demo):
    eid = create(demo).json()["id"]
    sos(demo, eid)
    force_cancel = cancel(demo, eid)
    assert force_cancel.status_code == 200
    r = demo.get(f"/patients/{PID}/emergencies/{eid}/summary", headers=demo.headers())
    assert r.status_code == 200
    b = r.json()
    assert b["id"] == eid and b["final_state"] == "CANCELLED" and b["source"] == "MANUAL" and b["simulated"] is True
    assert [t["state"] for t in b["timeline"]] == ["EMERGENCY_DETECTED", "SOS_SENT", "CANCELLED"]
    assert b["ended_at"] and b["started_at"]
    assert set(b["durations"]) == {"to_acknowledged", "to_dispatched", "to_arrived", "to_handover"}
    assert all(v is None for v in b["durations"].values())
    assert set(b["shared"]) == {"location", "history", "vitals", "reports"} and b["symptoms"] == ["CHEST_PAIN", "SHORT_BREATH"]
    assert b["contacts_notified"] == [{"name": "Sunita Mehta"}, {"name": "Karan Mehta"}]
    assert b["hospital"]["name"] and "phone" not in str(b).lower()


def test_summary_durations_count_from_the_start(demo, engine):
    from datetime import timedelta
    eid = create(demo).json()["id"]
    sos(demo, eid)
    with Session(engine) as s:
        start = s.query(StatusEvent).filter(StatusEvent.emergency_id == eid, StatusEvent.state == "EMERGENCY_DETECTED").one()
        s.add(StatusEvent(emergency_id=eid, state="HOSPITAL_ACKNOWLEDGED", timestamp=start.timestamp + timedelta(seconds=7),
                          actor="usr_003"))
        s.commit()
    b = demo.get(f"/patients/{PID}/emergencies/{eid}/summary", headers=demo.headers()).json()
    assert b["durations"]["to_acknowledged"] == 7 and b["durations"]["to_dispatched"] is None


def test_summary_unknown_and_foreign_emergencies_are_404(demo, engine):
    eid = create(demo).json()["id"]
    assert demo.get(f"/patients/{PID}/emergencies/E-NOPE/summary", headers=demo.headers()).status_code == 404
    other = second_patient(engine)
    assert demo.get(f"/patients/{PID}/emergencies/{eid}/summary", headers=demo.headers(*other)).status_code == 403
    assert demo.get("/patients/PT-2026-0002/emergencies/" + eid + "/summary", headers=demo.headers(*other)).status_code == 404


# ------------------------------------------------------------ wording

def test_no_response_says_diagnosis_or_dispatched(demo):
    eid = create(demo).json()["id"]
    sos(demo, eid)
    text = " ".join(x.text for x in (get(demo, eid), get(demo, eid, path="/reasons"),
                                     demo.get(f"/patients/{PID}/emergencies/{eid}/summary", headers=demo.headers()))).lower()
    for word in ("diagnosed", "you have ", "heart attack", "stroke detected"):
        assert word not in text
    assert "ambulance dispatched" not in text
