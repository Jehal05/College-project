"""Emergency contacts through the REAL login (Task 3). Includes a replay of Jehal's own contract scenario."""
import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.accounts import User
from app.models.audit import AuditLog
from app.models.patient_data import Contact, Patient
from app.security.passwords import hash_password
from app.services.audit import to_dict

C = "/patients/PT-2026-0417/contacts"
GOOD = {"name": "Contract Test", "relation": "Friend", "phone": "+91 00000 00099"}


def names(demo):
    return [(c["name"], c["is_primary"]) for c in demo.get(C, headers=demo.headers()).json()]


def second_patient(engine):
    with Session(engine) as s:
        s.add(Patient(id="PT-2026-0002", name="Other"))
        s.flush()
        s.add(User(id="usr_0002", login="other@demo.test", display_name="Other", password_hash=hash_password("pw-123456"), role="PATIENT", patient_id="PT-2026-0002"))
        s.add(Contact(id="C-OTHER", patient_id="PT-2026-0002", name="Theirs", relation="Mother", phone="+91 11111 11111", is_primary=True, position=1))
        s.commit()


def other_headers(demo):
    second_patient(demo.engine)
    return demo.headers("other@demo.test", "pw-123456")


# ------------------------------------------------------------ list

def test_the_owner_lists_their_contacts_in_order(demo):
    r = demo.get(C, headers=demo.headers())
    assert r.status_code == 200 and isinstance(r.json(), list)
    assert [(c["id"], c["name"], c["relation"], c["phone"], c["is_primary"]) for c in r.json()] == [
        ("C-1", "Sunita Mehta", "Mother", "+91 00000 00001", True), ("C-2", "Karan Mehta", "Friend", "+91 00000 00002", False)]


@pytest.mark.parametrize("who, status", [(None, 401), (("admin1", "demo-password"), 403), (("staff1", "demo-password"), 403), (("family1", "demo-password"), 403)])
def test_only_the_owner_sees_the_contacts(demo, who, status):
    headers = demo.headers(*who) if who else {}
    assert demo.get(C, headers=headers).status_code == status


def test_another_patient_cannot_read_or_change_my_contacts(demo):
    h = other_headers(demo)
    assert demo.get(C, headers=h).status_code == 403
    assert demo.post(C, json=GOOD, headers=h).status_code == 403
    assert demo.put(C + "/C-1", json=GOOD, headers=h).status_code == 403
    assert demo.delete(C + "/C-1", headers=h).status_code == 403
    assert len(demo.get(C, headers=demo.headers()).json()) == 2


def test_a_refused_attempt_is_audited_without_any_phone_number(demo):
    demo.post(C, json=GOOD, headers=demo.headers("staff1", "demo-password"))
    with Session(demo.engine) as s:
        rows = [to_dict(r) for r in s.query(AuditLog)]
    assert [(r["action"], r["outcome"]) for r in rows] == [("contacts.write", "denied")]
    assert "+91" not in repr(rows) and "Contract Test" not in repr(rows)


# ------------------------------------------------------------ create

def test_a_contact_is_created(demo):
    h = demo.headers()
    r = demo.post(C, json=GOOD, headers=h)
    assert r.status_code == 201
    body = r.json()
    assert set(body) == {"id", "name", "relation", "phone", "is_primary", "simulated"}
    assert body["name"] == "Contract Test" and body["is_primary"] is False and isinstance(body["id"], str) and body["id"]
    assert names(demo)[-1] == ("Contract Test", False)


def test_created_ids_are_unique_and_opaque(demo):
    h = demo.headers()
    demo.delete(C + "/C-2", headers=h)
    ids = {demo.post(C, json={**GOOD, "name": f"N{n}"}, headers=h).json()["id"] for n in range(2)}
    assert len(ids) == 2 and "C-2" not in ids


def test_the_phone_is_stored_encrypted(demo):
    demo.post(C, json={**GOOD, "phone": "+91 77777 12345"}, headers=demo.headers())
    with Session(demo.engine) as s:
        phones = [r[0] for r in s.execute(text("SELECT phone FROM contacts"))]
    assert phones and all("12345" not in p and "7777" not in p and p.startswith("gAAAA") for p in phones)


def test_the_first_contact_of_a_patient_with_none_becomes_primary(demo):
    h = demo.headers()
    demo.delete(C + "/C-1", headers=h); demo.delete(C + "/C-2", headers=h)
    assert demo.get(C, headers=h).json() == []
    assert demo.post(C, json=GOOD, headers=h).json()["is_primary"] is True


def test_asking_for_primary_moves_the_marker(demo):
    h = demo.headers()
    demo.post(C, json={**GOOD, "is_primary": True}, headers=h)
    assert names(demo) == [("Sunita Mehta", False), ("Karan Mehta", False), ("Contract Test", True)]


@pytest.mark.parametrize("body, text", [
    ({"name": "", "relation": "Friend", "phone": "12ab"}, "name is required"),                # Jehal's own invalid body
    ({"name": "  ", "relation": "Friend", "phone": "+91 00000 00099"}, "name is required"),
    ({"relation": "Friend", "phone": "+91 00000 00099"}, "name is required"),
    ({"name": "A", "relation": "Boss", "phone": "+91 00000 00099"}, "relation must be one of"),
    ({"name": "A", "relation": "Friend", "phone": "12ab"}, "phone is not valid"),
    ({"name": "A", "relation": "Friend", "phone": "1234567"}, "phone is not valid"),
    ({"name": "A", "relation": "Friend", "phone": "+"}, "phone is not valid"),
    ({"name": "A", "relation": "Friend", "phone": 12345678}, "phone is not valid"),
    ({"name": "A", "relation": "Friend", "phone": "+91 00000 00099", "is_primary": "yes"}, "is_primary"),
    ({"name": "x" * 101, "relation": "Friend", "phone": "+91 00000 00099"}, "name must be at most"),
])
def test_a_bad_contact_is_400_with_a_plain_sentence(demo, body, text):
    r = demo.post(C, json=body, headers=demo.headers())
    assert r.status_code == 400 and text in r.json()["error"] and r.json()["error"] == r.json()["detail"]
    assert len(demo.get(C, headers=demo.headers()).json()) == 2


@pytest.mark.parametrize("raw", [b"[]", b'"x"', b"null", b"{oops"])
def test_a_body_that_is_not_an_object_is_400(demo, raw):
    assert demo.post(C, content=raw, headers={**demo.headers(), "Content-Type": "application/json"}).status_code == 400


def test_the_sixth_contact_is_409(demo):
    h = demo.headers()
    for n in range(3):
        assert demo.post(C, json={**GOOD, "name": f"N{n}"}, headers=h).status_code == 201
    r = demo.post(C, json=GOOD, headers=h)
    assert r.status_code == 409 and "at most 5" in r.json()["error"] and len(demo.get(C, headers=h).json()) == 5


def test_a_bad_body_is_checked_before_the_limit(demo):
    h = demo.headers()
    for n in range(3):
        demo.post(C, json={**GOOD, "name": f"N{n}"}, headers=h)
    assert demo.post(C, json={**GOOD, "phone": "1"}, headers=h).status_code == 400


# ------------------------------------------------------------ update and delete

def test_a_contact_is_updated(demo):
    h = demo.headers()
    made = demo.post(C, json=GOOD, headers=h).json()
    r = demo.put(C + "/" + made["id"], json={**GOOD, "name": "Contract Edited", "relation": "Sibling"}, headers=h)
    assert r.status_code == 200 and r.json()["name"] == "Contract Edited" and r.json()["relation"] == "Sibling" and r.json()["id"] == made["id"]
    assert ("Contract Edited", False) in names(demo)


def test_updating_with_primary_moves_the_marker_and_without_keeps_it(demo):
    h = demo.headers()
    demo.put(C + "/C-2", json={"name": "Karan Mehta", "relation": "Friend", "phone": "+91 00000 00002", "is_primary": True}, headers=h)
    assert names(demo) == [("Sunita Mehta", False), ("Karan Mehta", True)]
    demo.put(C + "/C-2", json={"name": "Karan M", "relation": "Friend", "phone": "+91 00000 00002"}, headers=h)
    assert names(demo) == [("Sunita Mehta", False), ("Karan M", True)]


def test_an_invalid_update_is_400_and_changes_nothing(demo):
    h = demo.headers()
    assert demo.put(C + "/C-1", json={**GOOD, "phone": "bad"}, headers=h).status_code == 400
    assert names(demo)[0] == ("Sunita Mehta", True)


def test_updating_an_unknown_contact_is_404(demo):
    assert demo.put(C + "/C-NOPE", json=GOOD, headers=demo.headers()).status_code == 404


def test_a_contact_is_deleted_with_204_and_then_404(demo):
    h = demo.headers()
    made = demo.post(C, json=GOOD, headers=h).json()
    assert demo.delete(C + "/" + made["id"], headers=h).status_code == 204
    r = demo.delete(C + "/" + made["id"], headers=h)
    assert r.status_code == 404 and r.json()["error"] == r.json()["detail"]


def test_deleting_the_primary_makes_the_first_remaining_contact_primary(demo):
    h = demo.headers()
    demo.delete(C + "/C-1", headers=h)
    assert names(demo) == [("Karan Mehta", True)]


def test_a_204_has_no_body(demo):
    assert demo.delete(C + "/C-2", headers=demo.headers()).content == b""


def test_another_patients_contact_id_is_not_found_not_changed(demo):
    other_headers(demo)
    h = demo.headers()
    assert demo.put(C + "/C-OTHER", json={**GOOD, "name": "Hacked"}, headers=h).status_code == 404
    assert demo.delete(C + "/C-OTHER", headers=h).status_code == 404
    with Session(demo.engine) as s:
        assert s.get(Contact, "C-OTHER").name == "Theirs"


def test_the_patient_record_shows_the_same_contacts(demo):
    h = demo.headers()
    demo.post(C, json=GOOD, headers=h)
    assert demo.get("/patients/PT-2026-0417", headers=h).json()["contacts"] == demo.get(C, headers=h).json()


def test_the_unknown_patient_in_the_path_is_403_for_a_patient(demo):
    assert demo.get("/patients/NOPE/contacts", headers=demo.headers()).status_code == 403


# ------------------------------------------------------------ Jehal's own contract scenario, step by step

def test_jehals_contract_scenario(demo):
    h = demo.headers()
    listing = demo.get(C, headers=h)
    assert listing.status_code == 200 and isinstance(listing.json(), list) and len(listing.json()) < 5
    made = demo.post(C, json=GOOD, headers=h)
    assert made.status_code == 201
    for key, kind in (("id", str), ("name", str), ("relation", str), ("phone", str), ("is_primary", bool)):
        assert isinstance(made.json()[key], kind)
    assert demo.post(C, json={"name": "", "relation": "Friend", "phone": "12ab"}, headers=h).status_code == 400
    updated = demo.put(C + "/" + made.json()["id"], json={**GOOD, "name": "Contract Edited"}, headers=h)
    assert updated.status_code == 200 and updated.json()["name"] == "Contract Edited"
    assert demo.delete(C + "/" + made.json()["id"], headers=h).status_code == 204
    assert demo.delete(C + "/" + made.json()["id"], headers=h).status_code == 404
