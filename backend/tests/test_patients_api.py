"""GET and PATCH /patients/{id}, vitals, baseline and the consent change list, through the REAL login (Task 3)."""
import re
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api import patients as patients_api
from app.models.accounts import User
from app.models.audit import AuditLog
from app.models.patient_data import Patient
from app.security.passwords import hash_password
from app.services import vitals as vitals_service
from app.services.audit import to_dict
from app.sim.wearable import SimulatorRegistry, WearableSimulator

ME = "/patients/PT-2026-0417"
OWNER_KEYS = {"id", "name", "age", "sex", "blood_group", "blood_group_verified", "language", "allergies", "conditions",
              "medications", "contacts", "consents", "simulated"}
STAFF = ("staff1", "demo-password")
ADMIN = ("admin1", "demo-password")
FAMILY = ("family1", "demo-password")
RESPONDER = ("responder1", "demo-password")


def add_patient(engine, patient_id="PT-2026-0002", login="other@demo.test", baseline=None):
    with Session(engine) as s:
        s.add(Patient(id=patient_id, name="Other Person", age=30, sex="F", blood_group="O+", baseline=baseline,
                      allergies=["dust"], conditions=["asthma"], medications=[]))
        s.flush()
        s.add(User(id="usr_" + patient_id[-4:], login=login, display_name="Other", password_hash=hash_password("pw-123456"),
                   role="PATIENT", patient_id=patient_id))
        s.commit()


def audit_rows(engine):
    with Session(engine) as s:
        return [to_dict(r) for r in s.query(AuditLog).order_by(AuditLog.id)]


def values(obj):
    """Every value in a nested answer."""
    if isinstance(obj, dict):
        for v in obj.values():
            yield from values(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from values(v)
    else:
        yield obj


# ------------------------------------------------------------ GET /patients/{id}

def test_the_owner_gets_the_full_record(demo):
    r = demo.get(ME, headers=demo.headers())
    assert r.status_code == 200
    body = r.json()
    assert set(body) == OWNER_KEYS and body["id"] == "PT-2026-0417"
    assert (body["name"], body["age"], body["sex"], body["blood_group"], body["language"]) == ("Rahul Mehta", 54, "M", "B+", "en")
    assert body["consents"] == {"location": True, "history": True, "vitals": True, "reports": True} and body["simulated"] is True
    assert [(c["id"], c["is_primary"]) for c in body["contacts"]] == [("C-1", True), ("C-2", False)]
    assert body["contacts"][0]["phone"] == "+91 00000 00001"


def test_the_answer_has_the_types_jehals_contract_check_expects(demo):
    body = demo.get(ME, headers=demo.headers()).json()
    for key, kind in (("id", str), ("name", str), ("age", int), ("blood_group", str), ("allergies", list), ("conditions", list),
                      ("medications", list), ("language", str), ("contacts", list), ("consents", dict)):
        assert isinstance(body[key], kind), key
    assert all(isinstance(body["consents"][k], bool) for k in ("location", "history", "vitals", "reports"))


def test_nothing_is_ever_null(demo):
    assert None not in list(values(demo.get(ME, headers=demo.headers()).json()))


def test_no_login_is_401(demo):
    assert demo.get(ME).status_code == 401


@pytest.mark.parametrize("who", [STAFF, FAMILY, RESPONDER])
def test_other_roles_are_refused(demo, who):
    assert demo.get(ME, headers=demo.headers(*who)).status_code == 403


def test_another_patient_is_refused(demo):
    add_patient(demo.engine)
    assert demo.get("/patients/PT-2026-0002", headers=demo.headers()).status_code == 403
    assert demo.get(ME, headers=demo.headers("other@demo.test", "pw-123456")).status_code == 403


@pytest.mark.parametrize("pid", ["HT-DOES-NOT-EXIST", "PT-9999-9999", "x" * 300, "%27%20OR%201=1"])
def test_an_unknown_id_looks_exactly_like_a_forbidden_one_to_a_patient(demo, pid):
    forbidden = demo.get("/patients/PT-2026-0002", headers=demo.headers())
    r = demo.get("/patients/" + pid, headers=demo.headers())
    assert r.status_code == 403 and r.json() == forbidden.json()        # no hint whether the id exists


def test_a_refused_attempt_is_audited_with_names_only(demo):
    demo.get(ME, headers=demo.headers(*STAFF))
    [row] = audit_rows(demo.engine)
    assert (row["action"], row["outcome"], row["reason"], row["user_id"], row["role"]) == ("patient.read", "denied", "forbidden_role", "usr_005", "HOSPITAL_STAFF")
    assert row["patient_id"] == "PT-2026-0417" and row["fields_released"] == []


def test_the_owner_reading_their_own_record_is_not_audited(demo):
    demo.get(ME, headers=demo.headers())
    assert audit_rows(demo.engine) == []


# ------------------------------------------------------------ the admin's view

def test_an_admin_sees_what_the_patient_shared_and_no_phone_numbers(demo):
    r = demo.get(ME, headers=demo.headers(*ADMIN))
    assert r.status_code == 200
    body = r.json()
    assert body["allergies"] == ["Penicillin"] and body["conditions"] == ["Hypertension", "Type 2 Diabetes"]
    assert body["contacts"] == [{"name": "Sunita Mehta", "relation": "Mother", "is_primary": True},
                                {"name": "Karan Mehta", "relation": "Friend", "is_primary": False}]
    assert "phone" not in r.text and "+91" not in r.text


def test_when_history_is_not_shared_the_admin_gets_the_basics_only(demo):
    assert demo.put(ME + "/consents", json={"history": False}, headers=demo.headers()).status_code == 200
    body = demo.get(ME, headers=demo.headers(*ADMIN)).json()
    for left_out in ("allergies", "conditions", "medications", "contacts"):
        assert left_out not in body
    assert body["name"] == "Rahul Mehta" and body["blood_group"] == "B+" and body["sex"] == "M"


def test_revoking_history_takes_effect_on_the_admins_very_next_read(demo):
    assert "allergies" in demo.get(ME, headers=demo.headers(*ADMIN)).json()
    demo.put(ME + "/consents", json={"history": False}, headers=demo.headers())
    assert "allergies" not in demo.get(ME, headers=demo.headers(*ADMIN)).json()
    demo.put(ME + "/consents", json={"history": True}, headers=demo.headers())
    assert "allergies" in demo.get(ME, headers=demo.headers(*ADMIN)).json()


def test_every_admin_read_is_audited_with_the_names_that_were_released(demo):
    demo.get(ME, headers=demo.headers(*ADMIN))
    demo.put(ME + "/consents", json={"history": False}, headers=demo.headers())
    demo.get(ME, headers=demo.headers(*ADMIN))
    rows = [r for r in audit_rows(demo.engine) if r["action"] == "patient.read"]
    assert [(r["outcome"], r["role"], r["fields_released"]) for r in rows] == [("allowed", "ADMIN", ["history"]), ("allowed", "ADMIN", [])]
    assert "Penicillin" not in repr(rows) and "Hypertension" not in repr(rows)


def test_an_admin_asking_for_an_unknown_patient_gets_404(demo):
    assert demo.get("/patients/PT-9999-9999", headers=demo.headers(*ADMIN)).status_code == 404


# ------------------------------------------------------------ PATCH

def test_the_language_can_be_changed_and_changed_back(demo):
    h = demo.headers()
    r = demo.patch(ME, json={"language": "hi"}, headers=h)
    assert r.status_code == 200 and r.json()["language"] == "hi"
    assert demo.get(ME, headers=h).json()["language"] == "hi"
    assert demo.patch(ME, json={"language": "en"}, headers=h).json()["language"] == "en"


def test_the_profile_form_the_patient_app_sends_is_accepted(demo):
    h = demo.headers()
    body = {"name": "Rahul Mehta", "age": 55, "blood_group": "O-", "allergies": ["Penicillin", "Dust"], "conditions": ["Asthma"], "medications": []}
    r = demo.patch(ME, json=body, headers=h)
    assert r.status_code == 200
    got = demo.get(ME, headers=h).json()
    assert (got["age"], got["blood_group"], got["allergies"], got["conditions"], got["medications"]) == (55, "O-", ["Penicillin", "Dust"], ["Asthma"], [])


def test_a_patch_answers_with_the_updated_record(demo):
    r = demo.patch(ME, json={"age": 61}, headers=demo.headers())
    assert set(r.json()) == OWNER_KEYS and r.json()["age"] == 61


def test_a_change_of_blood_group_is_not_verified(demo):
    with Session(demo.engine) as s:
        s.get(Patient, "PT-2026-0417").blood_group_verified = True
        s.commit()
    assert demo.get(ME, headers=demo.headers()).json()["blood_group_verified"] is True
    assert demo.patch(ME, json={"blood_group": "A+"}, headers=demo.headers()).json()["blood_group_verified"] is False


@pytest.mark.parametrize("body, text", [
    ({"age": 200}, "age"), ({"age": "54"}, "age"), ({"blood_group": "Z+"}, "blood_group"), ({"language": "fr"}, "language"),
    ({"name": "  "}, "name"), ({"sex": "X"}, "sex"), ({"allergies": "dust"}, "allergies"), ({"conditions": [1]}, "conditions"),
    ({}, "at least one"), ({"role": "ADMIN"}, "role"), ({"id": "PT-1"}, "id"),
    ({"consents": {"history": False}}, "PUT /patients/{id}/consents"), ({"contacts": []}, "contacts endpoints"),
])
def test_a_bad_patch_is_400_with_a_plain_sentence_and_changes_nothing(demo, body, text):
    h = demo.headers()
    before = demo.get(ME, headers=h).json()
    r = demo.patch(ME, json=body, headers=h)
    assert r.status_code == 400 and text in r.json()["error"] and r.json()["error"] == r.json()["detail"]
    assert demo.get(ME, headers=h).json() == before


@pytest.mark.parametrize("raw", [b"[1,2]", b'"text"', b"123", b"null", b"{not json"])
def test_a_body_that_is_not_an_object_is_400(demo, raw):
    assert demo.patch(ME, content=raw, headers={**demo.headers(), "Content-Type": "application/json"}).status_code == 400


def test_a_valid_field_next_to_a_bad_one_changes_nothing(demo):
    h = demo.headers()
    assert demo.patch(ME, json={"age": 70, "blood_group": "nope"}, headers=h).status_code == 400
    assert demo.get(ME, headers=h).json()["age"] == 54


def test_patch_never_touches_consents_or_contacts(demo):
    h = demo.headers()
    before = demo.get(ME, headers=h).json()
    demo.patch(ME, json={"age": 56}, headers=h)
    after = demo.get(ME, headers=h).json()
    assert after["consents"] == before["consents"] and after["contacts"] == before["contacts"]


@pytest.mark.parametrize("who, status", [(None, 401), (ADMIN, 403), (STAFF, 403), (FAMILY, 403)])
def test_only_the_owner_may_patch(demo, who, status):
    headers = demo.headers(*who) if who else {}
    assert demo.patch(ME, json={"age": 99}, headers=headers).status_code == status
    assert demo.get(ME, headers=demo.headers()).json()["age"] == 54


def test_another_patient_cannot_patch(demo):
    add_patient(demo.engine)
    assert demo.patch(ME, json={"age": 99}, headers=demo.headers("other@demo.test", "pw-123456")).status_code == 403
    assert demo.patch("/patients/PT-2026-0002", json={"age": 99}, headers=demo.headers()).status_code == 403


def test_the_lists_are_stored_encrypted(demo):
    demo.patch(ME, json={"allergies": ["Peanut-XYZ"], "conditions": ["Condition-XYZ"]}, headers=demo.headers())
    with Session(demo.engine) as s:
        stored = s.execute(text("SELECT allergies, conditions FROM patients WHERE id='PT-2026-0417'")).fetchone()
    assert all("XYZ" not in value and value.startswith("gAAAA") for value in stored)


# ------------------------------------------------------------ vitals

@pytest.fixture
def clock(monkeypatch):
    """A fake clock shared by the vitals endpoint and the demo panel."""
    box = [datetime(2026, 11, 14, 10, 0, 0, tzinfo=timezone.utc)]
    registry = SimulatorRegistry(factory=lambda pid: WearableSimulator(pid, seed=1, clock=lambda: box[0]))
    monkeypatch.setattr(patients_api, "current_vitals", lambda pid: vitals_service.current_vitals(pid, registry=registry, now=box[0]))
    monkeypatch.setattr("app.api.demo_vitals.registry", registry)

    class Clock:
        def tick(self, seconds=1):
            box[0] += timedelta(seconds=seconds)
    return Clock()


def test_vitals_have_the_shape_the_contract_check_expects(demo):
    r = demo.get(ME + "/vitals", headers=demo.headers())
    assert r.status_code == 200
    v = r.json()
    for key in ("heart_rate", "spo2", "glucose"):
        assert isinstance(v[key], (int, float)) and not isinstance(v[key], bool)
    assert re.fullmatch(r"\d+/\d+", v["bp"]) and v["patient_id"] == "PT-2026-0417" and v["simulated"] is True
    assert datetime.strptime(v["timestamp"], "%Y-%m-%dT%H:%M:%SZ")


def test_normal_vitals_are_in_a_normal_range(demo):
    v = demo.get(ME + "/vitals", headers=demo.headers()).json()
    assert 55 <= v["heart_rate"] <= 90 and v["spo2"] >= 95 and 80 <= v["glucose"] <= 120 and 10 <= v["resp_rate"] <= 20


def test_the_same_second_gives_the_same_numbers_and_a_new_second_a_new_step(demo, clock):
    h = demo.headers()
    first, again = demo.get(ME + "/vitals", headers=h).json(), demo.get(ME + "/vitals", headers=h).json()
    assert first == again
    clock.tick()
    assert demo.get(ME + "/vitals", headers=h).json()["timestamp"] != first["timestamp"]


def test_the_demo_panel_changes_what_the_patient_sees_within_two_seconds(demo, clock):
    h = demo.headers()
    start = demo.get(ME + "/vitals", headers=h).json()["heart_rate"]
    assert demo.post("/demo/vitals", json={"profile": "heart_attack"}, headers=h).status_code == 200     # no patient_id: the caller's own
    seen = []
    for _ in range(2):
        clock.tick()
        seen.append(demo.get(ME + "/vitals", headers=h).json()["heart_rate"])
    assert seen[-1] - start >= 0.6 * (140 - start) - 8             # about 75% of the way after 2 seconds (the simulator's promise)


def test_an_override_set_in_the_demo_panel_shows_exactly(demo, clock):
    h = demo.headers()
    demo.post("/demo/vitals", json={"overrides": {"spo2": 85}}, headers=h)
    clock.tick()
    assert demo.get(ME + "/vitals", headers=h).json()["spo2"] == 85


@pytest.mark.parametrize("who, status", [(None, 401), (ADMIN, 403), (STAFF, 403), (FAMILY, 403)])
def test_only_the_owner_reads_vitals(demo, who, status):
    headers = demo.headers(*who) if who else {}
    assert demo.get(ME + "/vitals", headers=headers).status_code == status


def test_vitals_of_an_unknown_or_other_patient_are_403_and_audited(demo):
    add_patient(demo.engine)
    assert demo.get("/patients/PT-2026-0002/vitals", headers=demo.headers()).status_code == 403
    assert demo.get("/patients/NOPE/vitals", headers=demo.headers()).status_code == 403
    assert [r["action"] for r in audit_rows(demo.engine)] == ["vitals.read", "vitals.read"]


# ------------------------------------------------------------ baseline

def test_the_baseline_has_five_ranges(demo):
    r = demo.get(ME + "/baseline", headers=demo.headers())
    assert r.status_code == 200
    for key in ("heart_rate", "spo2", "bp_systolic", "bp_diastolic", "glucose"):
        assert isinstance(r.json()[key]["min"], int) and r.json()[key]["min"] <= r.json()[key]["max"]
    assert r.json()["simulated"] is True and r.json()["updated_at"]


def test_a_patient_without_a_baseline_gets_404(demo):
    add_patient(demo.engine)
    r = demo.get("/patients/PT-2026-0002/baseline", headers=demo.headers("other@demo.test", "pw-123456"))
    assert r.status_code == 404 and "baseline" in r.json()["error"]


@pytest.mark.parametrize("who, status", [(None, 401), (ADMIN, 403), (STAFF, 403)])
def test_only_the_owner_reads_the_baseline(demo, who, status):
    headers = demo.headers(*who) if who else {}
    assert demo.get(ME + "/baseline", headers=headers).status_code == status


# ------------------------------------------------------------ consents: the change list

def test_a_fresh_patient_has_no_changes_yet(demo):
    r = demo.get(ME + "/consents", headers=demo.headers())
    assert r.json()["changes"] == [] and set(r.json()) == {"patient_id", "consents", "changes", "simulated"}


def test_a_change_shows_in_the_list_newest_first(demo):
    h = demo.headers()
    demo.put(ME + "/consents", json={"history": False}, headers=h)
    demo.put(ME + "/consents", json={"vitals": False}, headers=h)
    changes = demo.get(ME + "/consents", headers=h).json()["changes"]
    assert [(c["key"], c["value"]) for c in changes] == [("vitals", False), ("history", False)]
    assert all(c["timestamp"].endswith("Z") for c in changes)


def test_putting_the_current_values_again_adds_nothing(demo):
    h = demo.headers()
    consents = demo.get(ME + "/consents", headers=h).json()["consents"]
    r = demo.put(ME + "/consents", json=consents, headers=h)
    assert r.status_code == 200 and r.json()["changes"] == [] and r.json()["changed"] == []


def test_the_put_answer_has_both_changes_and_changed(demo):
    r = demo.put(ME + "/consents", json={"history": False}, headers=demo.headers())
    assert r.json()["changed"] == ["history"] and r.json()["changes"][0]["key"] == "history" and r.json()["consents"]["history"] is False


def test_a_word_instead_of_true_or_false_is_400(demo):
    r = demo.put(ME + "/consents", json={"location": "yes"}, headers=demo.headers())
    assert r.status_code == 400 and r.json()["error"] == r.json()["detail"]


def test_only_twenty_changes_are_kept(demo):
    h = demo.headers()
    for n in range(25):
        demo.put(ME + "/consents", json={"location": n % 2 == 1}, headers=h)
    assert len(demo.get(ME + "/consents", headers=h).json()["changes"]) == 20
