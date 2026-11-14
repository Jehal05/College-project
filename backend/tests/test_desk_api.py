"""Desk notes, chat and the checklist, plus the desk read (P2, endpoints PROPOSED and not yet agreed)."""
import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.audit import AuditLog
from app.models.emergencies import DeskEntry, Emergency, HospitalAlert
from app.seed.demo_data import DEMO_HOSPITAL_ID
from app.services import events

STAFF = ("staff@demo.test", "demo1234")
ADMIN = ("admin@demo.test", "demo1234")
PATIENT = ("patient@demo.test", "demo1234")
FAMILY = ("family1", "demo-password")
RESPONDER = ("responder1", "demo-password")


@pytest.fixture(autouse=True)
def seen():
    got = []
    events.clear_subscribers()
    events.subscribe(got.append)
    yield got
    events.clear_subscribers()


def alert(demo, engine, hospital=DEMO_HOSPITAL_ID, sos=True):
    eid = demo.post("/emergencies", json={"symptoms": ["CHEST_PAIN"]}, headers=demo.headers(*PATIENT)).json()["id"]
    if sos:
        demo.post(f"/emergencies/{eid}/sos", json={}, headers=demo.headers(*PATIENT))
        with Session(engine) as s:
            s.get(Emergency, eid).hospital_id = hospital
            for a in s.query(HospitalAlert).filter(HospitalAlert.emergency_id == eid):
                a.hospital_id = hospital
            s.commit()
    return eid


def note(demo, eid, body=None, who=STAFF):
    return demo.post(f"/emergencies/{eid}/notes", json=body if body is not None else {"kind": "desk", "note": "Bay 2 is ready"},
                     headers=demo.headers(*who))


def chat(demo, eid, body=None, who=STAFF):
    return demo.post(f"/emergencies/{eid}/chat", json=body if body is not None else {"text": "On our way", "sender_role": "desk",
                                                                                       "sender_name": "Desk A"},
                     headers=demo.headers(*who))


def tick(demo, eid, body=None, who=STAFF):
    return demo.patch(f"/emergencies/{eid}/checklist", json=body if body is not None else {"item_id": "heart-1", "done": True},
                      headers=demo.headers(*who))


def close(engine, eid, state="HANDOVER_DONE"):
    with Session(engine) as s:
        s.get(Emergency, eid).state = state
        s.commit()


# ------------------------------------------------------------ notes

def test_a_note_is_stored_and_announced(demo, engine, seen):
    eid = alert(demo, engine)
    seen.clear()
    r = note(demo, eid, {"kind": "pickup", "note": "Patient picked up", "fields": {"picked_up": True}})
    assert r.status_code == 201
    b = r.json()
    assert b["note_id"].startswith("N-") and b["kind"] == "pickup" and b["fields"] == {"picked_up": True}
    assert b["actor"].startswith("usr_") and b["timestamp"].endswith("Z")
    assert [e["event"] for e in seen] == ["emergency.note"]
    assert seen[0]["payload"] == {"note_id": b["note_id"], "kind": "pickup", "note": "Patient picked up",
                                  "actor": b["actor"], "fields": {"picked_up": True}}
    assert seen[0]["audience"] == "hospitals" and seen[0]["emergency_id"] == eid


@pytest.mark.parametrize("kind", ["handover", "desk", "pickup", "corridor", "assignment", "responder"])
def test_all_six_note_kinds_are_accepted(demo, engine, kind):
    assert note(demo, alert(demo, engine), {"kind": kind, "note": "x"}).status_code == 201


@pytest.mark.parametrize("body", [{}, {"kind": "desk"}, {"kind": "desk", "note": ""}, {"kind": "desk", "note": "   "},
                                  {"kind": "desk", "note": 5}, {"kind": "diagnosis", "note": "x"},
                                  {"kind": "desk", "note": "x" * 501}, {"kind": "desk", "note": "x", "fields": "no"},
                                  {"kind": "desk", "note": "x", "fields": {"k": "v" * 2100}}])
def test_a_bad_note_is_400_and_nothing_is_saved(demo, engine, body):
    eid = alert(demo, engine)
    assert note(demo, eid, body).status_code == 400
    with Session(engine) as s:
        assert s.query(DeskEntry).count() == 0


def test_a_bad_note_never_echoes_what_was_sent(demo, engine):
    r = note(demo, alert(demo, engine), {"kind": "SECRET-KIND-1", "note": "x"})
    assert r.status_code == 400 and "SECRET-KIND-1" not in r.text


def test_the_text_is_encrypted_at_rest(demo, engine):
    note(demo, alert(demo, engine), {"kind": "desk", "note": "VISIBLE-NOTE-TEXT-77"})
    with Session(engine) as s:
        raw = " ".join(str(v) for row in s.execute(text("SELECT * FROM desk_entries")).fetchall() for v in row)
    assert "VISIBLE-NOTE-TEXT-77" not in raw


# ------------------------------------------------------------ chat

def test_a_chat_line_is_stored_and_announced_as_chat_message(demo, engine, seen):
    eid = alert(demo, engine)
    seen.clear()
    r = chat(demo, eid)
    assert r.status_code == 201
    b = r.json()
    assert b == {"message_id": b["message_id"], "sender_role": "desk", "sender_name": "Desk A", "text": "On our way",
                 "timestamp": b["timestamp"]}
    assert [e["event"] for e in seen] == ["chat.message"] and seen[0]["payload"] == b


@pytest.mark.parametrize("body", [{}, {"text": ""}, {"text": "x" * 501}, {"text": "hi", "sender_role": "patient"},
                                  {"text": "hi", "sender_name": "n" * 81}, {"text": 7}])
def test_a_bad_chat_line_is_400(demo, engine, body):
    assert chat(demo, alert(demo, engine), body).status_code == 400


# ------------------------------------------------------------ checklist

def test_a_tick_returns_the_whole_checklist(demo, engine, seen):
    eid = alert(demo, engine)
    seen.clear()
    r = tick(demo, eid)
    assert r.status_code == 200
    item = r.json()["checklist"]["heart-1"]
    assert item["done"] is True and item["by"].startswith("usr_") and item["at"].endswith("Z")
    both = tick(demo, eid, {"item_id": "heart-2", "done": True}).json()["checklist"]
    assert set(both) == {"heart-1", "heart-2"}
    assert [e["event"] for e in seen] == ["emergency.checklist", "emergency.checklist"]


def test_the_latest_tick_wins(demo, engine):
    eid = alert(demo, engine)
    tick(demo, eid)
    assert tick(demo, eid, {"item_id": "heart-1", "done": False}).json()["checklist"]["heart-1"]["done"] is False


@pytest.mark.parametrize("body", [{}, {"item_id": "a b", "done": True}, {"item_id": "", "done": True},
                                  {"item_id": "x" * 41, "done": True}, {"item_id": "heart-1", "done": "yes"},
                                  {"item_id": "heart-1"}])
def test_a_bad_tick_is_400(demo, engine, body):
    assert tick(demo, alert(demo, engine), body).status_code == 400


# ------------------------------------------------------------ who may write

@pytest.mark.parametrize("write", [note, chat, tick])
@pytest.mark.parametrize("who", [PATIENT, ADMIN, FAMILY, RESPONDER])
def test_only_hospital_staff_write(demo, engine, write, who):
    assert write(demo, alert(demo, engine), who=who).status_code == 403


@pytest.mark.parametrize("write", [note, chat, tick])
def test_staff_of_a_hospital_that_was_not_alerted_get_403_and_it_is_audited(demo, engine, write):
    eid = alert(demo, engine, hospital="HSP-AMD-001")
    assert write(demo, eid).status_code == 403
    with Session(engine) as s:
        assert s.query(AuditLog).filter(AuditLog.outcome == "denied", AuditLog.reason == "forbidden_role").count() >= 1
        assert s.query(DeskEntry).count() == 0


@pytest.mark.parametrize("write", [note, chat, tick])
def test_before_the_sos_a_hospital_hears_nothing_so_it_is_404(demo, engine, write):
    assert write(demo, alert(demo, engine, sos=False)).status_code == 404


@pytest.mark.parametrize("write", [note, chat, tick])
@pytest.mark.parametrize("state", ["HANDOVER_DONE", "CANCELLED"])
def test_a_closed_emergency_refuses(demo, engine, write, state):
    eid = alert(demo, engine)
    close(engine, eid, state)
    assert write(demo, eid).status_code == 409


@pytest.mark.parametrize("write", [note, chat, tick])
def test_the_desk_calls_need_a_login(demo, engine, write):
    eid = alert(demo, engine)
    url = {note: "notes", chat: "chat", tick: "checklist"}[write]
    assert demo.post(f"/emergencies/{eid}/{url}", json={}).status_code in (401, 405)


# ------------------------------------------------------------ reading it back

def test_the_desk_read_returns_everything_in_order(demo, engine):
    eid = alert(demo, engine)
    note(demo, eid, {"kind": "desk", "note": "first"})
    note(demo, eid, {"kind": "handover", "note": "second"})
    chat(demo, eid)
    tick(demo, eid)
    r = demo.get(f"/emergencies/{eid}/desk", headers=demo.headers(*STAFF))
    assert r.status_code == 200
    b = r.json()
    assert [n["note"] for n in b["notes"]] == ["first", "second"]
    assert [m["text"] for m in b["chat"]] == ["On our way"] and b["checklist"]["heart-1"]["done"] is True


def test_the_active_list_carries_the_desk_record(demo, engine):
    eid = alert(demo, engine)
    note(demo, eid)
    row = demo.get("/emergencies?status=active", headers=demo.headers(*STAFF)).json()[0]
    assert row["id"] == eid and row["notes"][0]["note"] == "Bay 2 is ready" and row["chat"] == [] and row["checklist"] == {}


def test_an_admin_may_read_the_desk_record_and_it_is_audited(demo, engine):
    eid = alert(demo, engine)
    note(demo, eid)
    assert demo.get(f"/emergencies/{eid}/desk", headers=demo.headers(*ADMIN)).status_code == 200
    with Session(engine) as s:
        assert s.query(AuditLog).filter(AuditLog.action == "emergency.read", AuditLog.outcome == "allowed").count() == 1


@pytest.mark.parametrize("who", [PATIENT, FAMILY, RESPONDER])
def test_others_cannot_read_the_desk_record(demo, engine, who):
    assert demo.get(f"/emergencies/{alert(demo, engine)}/desk", headers=demo.headers(*who)).status_code == 403


def test_another_hospital_cannot_read_the_desk_record(demo, engine):
    eid = alert(demo, engine, hospital="HSP-AMD-001")
    assert demo.get(f"/emergencies/{eid}/desk", headers=demo.headers(*STAFF)).status_code == 403
