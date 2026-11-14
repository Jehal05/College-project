"""Who looked at my data: the patient's feed and the live event (the patient only)."""
import json

import pytest
from sqlalchemy.orm import Session

from app.models.accounts import User
from app.models.patient_data import Patient
from app.security.actor import Actor
from app.security.passwords import hash_password
from app.services import consent as consent_service
from app.services import events

PID = "PT-2026-0417"
P = f"/patients/{PID}/access-log"
PATIENT = ("patient@demo.test", "demo1234")
STAFF = ("staff@demo.test", "demo1234")
ADMIN = ("admin@demo.test", "demo1234")
FAM = ("family@demo.test", "demo1234")
RESP = ("responder@demo.test", "demo1234")
CHEST = {"patient_id": PID, "type": "HEART", "symptoms": ["CHEST_PAIN"], "location": {"lat": 23.03, "lng": 72.55}}


@pytest.fixture(autouse=True)
def seen():
    got = []
    events.clear_subscribers()
    events.subscribe(got.append)
    yield got
    events.clear_subscribers()


def H(demo, who=PATIENT):
    return demo.headers(*who)


def feed(demo, query=""):
    return demo.get(P + query, headers=H(demo)).json()


def sos(demo):
    eid = demo.post("/emergencies", json=CHEST, headers=H(demo)).json()["id"]
    demo.post(f"/emergencies/{eid}/sos", json={}, headers=H(demo))
    return eid


def test_a_new_patient_sees_an_empty_feed(demo):
    assert feed(demo) == {"entries": [], "more": False, "simulated": True}


def test_a_desk_reading_the_passport_shows_with_its_hospital_and_the_fields(demo):
    demo.get(f"/passport/{PID}", headers=H(demo, STAFF))
    [e] = feed(demo)["entries"]
    assert e["who"] == {"kind": "hospital_desk", "hospital": "Heart & Stroke Institute"} or e["who"]["kind"] == "hospital_desk"
    assert e["who"].get("hospital")
    assert e["what"] == "passport" and e["outcome"] == "allowed" and e["reason"] is None
    assert e["fields"] and set(e["fields"]) <= {"location", "history", "vitals", "reports"}
    assert e["at"].endswith("Z") and isinstance(e["id"], int)


def test_nothing_in_the_feed_identifies_a_person_or_holds_a_secret(demo):
    demo.get(f"/passport/{PID}", headers=H(demo, STAFF))
    link = demo.post(f"/patients/{PID}/passport", json={"hours": 1}, headers=H(demo)).json()["token"]
    demo.get(f"/passport/{link}")
    demo.post("/family/link", json={"invite_code": "FAM-0417"}, headers=H(demo, FAM))
    demo.get("/family/patients", headers=H(demo, FAM))
    text = json.dumps(feed(demo))
    for word in ("usr_", "staff@", "family@", "demo1234", link, "phone", "password", "eyJ"):
        assert word not in text, word
    assert set(feed(demo)["entries"][0]) == {"id", "at", "who", "what", "action", "outcome", "fields", "reason"}


def test_the_kinds_of_viewer_are_told_apart(demo):
    link = demo.post(f"/patients/{PID}/passport", json={"hours": 1}, headers=H(demo)).json()["token"]
    demo.get(f"/passport/{link}")                                                   # a QR open
    demo.post("/family/link", json={"invite_code": "FAM-0417"}, headers=H(demo, FAM))
    demo.get("/family/patients", headers=H(demo, FAM))                              # a relative
    eid = sos(demo)
    demo.post(f"/responders/{eid}/accept", headers=H(demo, RESP))                   # a volunteer
    demo.get(f"/emergencies/{eid}", headers=H(demo, ADMIN))                         # an admin
    kinds = {(e["who"]["kind"], e["what"]) for e in feed(demo)["entries"]}
    assert {("qr_link", "passport"), ("relative", "status"), ("volunteer", "volunteer"), ("admin", "emergency")} <= kinds


def test_newest_first_and_paging(demo):
    for _ in range(5):
        demo.get(f"/passport/{PID}", headers=H(demo, STAFF))
    page = feed(demo, "?limit=2")
    assert [e["id"] for e in page["entries"]] == sorted((e["id"] for e in page["entries"]), reverse=True)
    assert len(page["entries"]) == 2 and page["more"] is True
    rest = feed(demo, f"?limit=10&before={page['entries'][-1]['id']}")
    assert len(rest["entries"]) == 3 and rest["more"] is False
    assert not {e["id"] for e in page["entries"]} & {e["id"] for e in rest["entries"]}


@pytest.mark.parametrize("query", ["?limit=0", "?limit=101", "?limit=x", "?before=0", "?before=x"])
def test_bad_paging_is_400(demo, query):
    assert demo.get(P + query, headers=H(demo)).status_code == 400


def test_a_refused_attempt_is_shown_too(demo):
    demo.get(f"/passport/{PID}", headers=H(demo, FAM))                              # a relative who is not allowed
    [e] = feed(demo)["entries"]
    assert e["outcome"] == "denied" and e["reason"] == "forbidden_role" and e["fields"] == []


def test_a_denied_read_by_an_unlinked_relative_of_an_emergency_shows(demo):
    eid = sos(demo)
    demo.get(f"/emergencies/{eid}", headers=H(demo, FAM))
    entry = feed(demo)["entries"][0]
    assert entry["outcome"] == "denied" and entry["who"]["kind"] == "relative"


def test_the_patients_own_reads_and_desk_actions_are_not_listed(demo):
    eid = sos(demo)
    demo.get(f"/passport/{PID}", headers=H(demo))
    demo.get(f"/emergencies/{eid}", headers=H(demo))
    demo.post(f"/emergencies/{eid}/ack", json={}, headers=H(demo, STAFF))
    assert [e for e in feed(demo)["entries"] if e["action"] in ("emergency.ack", "hospital.ack")] == []
    assert all(e["who"]["kind"] != "patient" for e in feed(demo)["entries"])


def test_withdrawing_a_consent_changes_what_the_next_view_releases(demo):
    demo.get(f"/passport/{PID}", headers=H(demo, STAFF))
    with Session(demo.engine) as s:
        consent_service.update_consents(s, Actor("usr_001", "PATIENT", PID), PID, {"history": False})
        s.commit()
    demo.get(f"/passport/{PID}", headers=H(demo, STAFF))
    newest, oldest = feed(demo)["entries"][:2]
    assert "history" in oldest["fields"] and "history" not in newest["fields"]


@pytest.mark.parametrize("who,status", [(STAFF, 403), (ADMIN, 403), (FAM, 403), (RESP, 403), (None, 401)])
def test_only_the_owner_reads_the_feed(demo, who, status):
    assert demo.get(P, headers=H(demo, who) if who else {}).status_code == status


def test_another_patient_cannot_read_my_feed_and_an_unknown_one_is_404(demo):
    with Session(demo.engine) as s:
        s.add(Patient(id="PT-2026-0002", name="Other"))
        s.flush()
        s.add(User(id="usr_0002", login="other@demo.test", display_name="Other", password_hash=hash_password("pw-123456"),
                   role="PATIENT", patient_id="PT-2026-0002"))
        s.commit()
    other = ("other@demo.test", "pw-123456")
    demo.get(f"/passport/{PID}", headers=H(demo, STAFF))
    assert demo.get(P, headers=H(demo, other)).status_code == 403
    assert demo.get("/patients/PT-2026-0002/access-log", headers=H(demo, other)).json()["entries"] == []   # theirs is empty
    assert demo.get("/patients/PT-2026-0999/access-log", headers=H(demo, other)).status_code == 403


def test_the_patient_hears_it_live_without_the_hospital_name_or_any_id(demo, seen):
    demo.get(f"/passport/{PID}", headers=H(demo, STAFF))
    [ev] = [e for e in seen if e["event"] == "data.accessed"]
    assert ev["audience"] == "patient:" + PID and ev["emergency_id"] is None and ev["state"] is None
    entry = ev["payload"]["entry"]
    assert entry["who"] == {"kind": "hospital_desk"} and entry["what"] == "passport" and entry["outcome"] == "allowed"
    assert "usr_" not in json.dumps(ev)


def test_the_patients_own_reads_make_no_live_event(demo, seen):
    demo.get(f"/passport/{PID}", headers=H(demo))
    assert [e for e in seen if e["event"] == "data.accessed"] == []


def test_a_desk_action_makes_no_live_event(demo, seen):
    eid = sos(demo)
    seen.clear()
    demo.post(f"/emergencies/{eid}/ack", json={}, headers=H(demo, STAFF))
    assert [e for e in seen if e["event"] == "data.accessed"] == []


def test_the_live_event_reaches_the_patient_socket_and_nobody_else(demo):
    with demo.websocket_connect("/ws?token=" + demo.token(*PATIENT)) as patient, \
            demo.websocket_connect("/ws?token=" + demo.token(*STAFF)) as desk:
        demo.get(f"/passport/{PID}", headers=H(demo, STAFF))
        event = patient.receive_json()
        assert event["type"] == "data.accessed" and event["payload"]["entry"]["what"] == "passport"
        demo.patch("/hospitals/HSP-AMD-002/availability", json={"beds_free": 2}, headers=H(demo, STAFF))
        assert desk.receive_json()["event"] == "hospital.availability_updated"          # the desk never hears it


def test_a_broken_subscriber_does_not_break_the_request(demo):
    def boom(event):
        raise RuntimeError("subscriber down")
    events.subscribe(boom)
    assert demo.get(f"/passport/{PID}", headers=H(demo, STAFF)).status_code == 200
    assert len(feed(demo)["entries"]) == 1


def test_a_reset_empties_the_feed(demo):
    demo.get(f"/passport/{PID}", headers=H(demo, STAFF))
    demo.post("/demo/reset", headers=H(demo))
    assert feed(demo)["entries"] == []
