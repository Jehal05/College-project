"""The patient record rules (Task 3): validation, contacts, what each viewer sees, vitals."""
import random
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.orm import Session

from app.models.consent import ConsentLedger
from app.models.patient_data import Contact, Patient
from app.security.actor import Actor
from app.services import consent as consent_service
from app.services import patient_record as rec
from app.services.patient_record import RecordError
from app.services.vitals import current_vitals
from app.sim.wearable import SimulatorRegistry, WearableSimulator

PATIENT = Actor("usr_001", "PATIENT", "pat_001")
GOOD = {"name": "Sunita Mehta", "relation": "Mother", "phone": "+91 00000 00001"}


def refused(fn, *args):
    with pytest.raises(RecordError) as err:
        fn(*args)
    return str(err.value)


# ------------------------------------------------------------ clean_patch

def test_a_good_patch_is_cleaned():
    body = {"name": "  Rahul M  ", "age": 54, "sex": "M", "blood_group": "B+", "language": "hi",
            "allergies": ["  Penicillin ", "", "  "], "conditions": [], "medications": ["Aspirin"]}
    assert rec.clean_patch(body) == {"name": "Rahul M", "age": 54, "sex": "M", "blood_group": "B+", "language": "hi",
                                     "allergies": ["Penicillin"], "conditions": [], "medications": ["Aspirin"]}


@pytest.mark.parametrize("field, value", [("age", 0), ("age", 120), ("name", "x" * 100), ("blood_group", "AB-"),
                                          ("allergies", ["a" * 100] * 20), ("sex", "O"), ("language", "gu")])
def test_the_edges_are_accepted(field, value):
    assert rec.clean_patch({field: value})[field] == value


@pytest.mark.parametrize("body", [[], "name", None, 5, [{"name": "x"}]])
def test_a_body_that_is_not_an_object_is_refused(body):
    assert "JSON object" in refused(rec.clean_patch, body)


def test_an_empty_body_is_refused():
    assert "at least one" in refused(rec.clean_patch, {})


def test_unknown_fields_are_named():
    message = refused(rec.clean_patch, {"name": "x", "role": "ADMIN", "id": "PT-1"})
    assert "id" in message and "role" in message


def test_consents_and_contacts_cannot_be_changed_through_patch():
    assert "PUT /patients/{id}/consents" in refused(rec.clean_patch, {"consents": {"history": True}})
    assert "contacts endpoints" in refused(rec.clean_patch, {"contacts": []})


@pytest.mark.parametrize("name", ["", "   ", 5, None, ["x"], "x" * 101])
def test_a_bad_name(name):
    assert "name" in refused(rec.clean_patch, {"name": name})


@pytest.mark.parametrize("age", [-1, 121, "54", 54.5, True, None, [54], 10 ** 9])
def test_a_bad_age(age):
    assert "age" in refused(rec.clean_patch, {"age": age})


@pytest.mark.parametrize("group", ["C+", "b+", "AB", "", None, "O", 5, "A +"])
def test_a_bad_blood_group(group):
    assert "blood_group" in refused(rec.clean_patch, {"blood_group": group})


@pytest.mark.parametrize("language", ["fr", "EN", "", None, "en-IN", 1])
def test_a_bad_language(language):
    assert "language" in refused(rec.clean_patch, {"language": language})


@pytest.mark.parametrize("sex", ["X", "m", "", None, "Male", 1])
def test_a_bad_sex(sex):
    assert "sex" in refused(rec.clean_patch, {"sex": sex})


@pytest.mark.parametrize("value", ["Penicillin", [1], [None], [["a"]], {"a": "b"}, ["ok", 5], ["x" * 101], ["a"] * 21])
def test_a_bad_list(value):
    assert "allergies" in refused(rec.clean_patch, {"allergies": value})


def test_apply_patch_saves_and_a_new_blood_group_is_not_verified(patients):
    patient = patients.get(Patient, "pat_001")
    patient.blood_group_verified = True
    rec.apply_patch(patients, patient, {"age": 60})
    assert patient.age == 60 and patient.blood_group_verified is True       # untouched by other changes
    rec.apply_patch(patients, patient, {"blood_group": "O+"})
    assert patient.blood_group == "O+" and patient.blood_group_verified is False


# ------------------------------------------------------------ clean_contact

def test_a_good_contact():
    assert rec.clean_contact({**GOOD, "name": "  Sunita  ", "phone": "  +91 00000 00001 ", "is_primary": True}) == {
        "name": "Sunita", "relation": "Mother", "phone": "+91 00000 00001", "is_primary": True}


@pytest.mark.parametrize("relation", rec.RELATIONS)
def test_every_listed_relation_is_accepted(relation):
    assert rec.clean_contact({**GOOD, "relation": relation})["relation"] == relation


@pytest.mark.parametrize("phone", ["12345678", "+12345678", "+911234567890", "123456789012345", "+91 00000-00001", " 1234 5678 ", "+ 91 000 0000 01"])
def test_valid_phone_numbers(phone):
    assert rec.clean_contact({**GOOD, "phone": phone})["phone"] == phone.strip()


@pytest.mark.parametrize("phone", ["", "12ab", "1234567", "1234567890123456", "+", "++91000000000", "91+0000000000", "abcdefgh", "(91) 000 00001", None, 1234567890, ["+9100000000"]])
def test_invalid_phone_numbers(phone):
    assert refused(rec.clean_contact, {**GOOD, "phone": phone}) == "phone is not valid"


@pytest.mark.parametrize("body, text", [
    ({**GOOD, "name": ""}, "name is required"), ({**GOOD, "name": "  "}, "name is required"), ({**GOOD, "name": 5}, "name is required"),
    ({**GOOD, "name": "x" * 101}, "name must be at most"), ({**GOOD, "relation": "Boss"}, "relation must be one of"),
    ({**GOOD, "relation": "mother"}, "relation must be one of"), ({**GOOD, "is_primary": "yes"}, "is_primary must be true or false"),
    ({**GOOD, "is_primary": 1}, "is_primary must be true or false"), ([GOOD], "JSON object"), ("x", "JSON object"),
])
def test_other_bad_contacts(body, text):
    assert text in refused(rec.clean_contact, body)


def test_a_missing_field_is_refused():
    for missing in ("name", "relation", "phone"):
        assert refused(rec.clean_contact, {k: v for k, v in GOOD.items() if k != missing})


# ------------------------------------------------------------ contact rules (primary, limit, order)

def make(session, patient_id="pat_001", **kw):
    clean = rec.clean_contact({**GOOD, **kw})
    contact = rec.add_contact(session, patient_id, clean)
    session.commit()
    return contact


def state(session, patient_id="pat_001"):
    return [(c.name, c.is_primary, c.position) for c in rec.list_contacts(session, patient_id)]


def test_the_first_contact_is_primary(patients):
    make(patients, name="A")
    assert state(patients) == [("A", True, 1)]


def test_a_later_contact_is_not_primary_unless_asked(patients):
    make(patients, name="A"); make(patients, name="B")
    assert state(patients) == [("A", True, 1), ("B", False, 2)]


def test_asking_for_primary_moves_the_marker(patients):
    make(patients, name="A"); make(patients, name="B", is_primary=True)
    assert state(patients) == [("A", False, 1), ("B", True, 2)]


def test_updating_with_primary_moves_the_marker_and_without_keeps_it(patients):
    a, b = make(patients, name="A"), make(patients, name="B")
    rec.update_contact(patients, "pat_001", b.id, rec.clean_contact({**GOOD, "name": "B2", "is_primary": True})); patients.commit()
    assert state(patients) == [("A", False, 1), ("B2", True, 2)]
    rec.update_contact(patients, "pat_001", b.id, rec.clean_contact({**GOOD, "name": "B3"})); patients.commit()
    assert state(patients) == [("A", False, 1), ("B3", True, 2)]                 # still primary
    rec.update_contact(patients, "pat_001", b.id, rec.clean_contact({**GOOD, "name": "B4", "is_primary": False})); patients.commit()
    assert state(patients)[1][1] is True                                         # the marker never just disappears


def test_deleting_the_primary_makes_the_first_remaining_contact_primary(patients):
    a, b, c = make(patients, name="A"), make(patients, name="B"), make(patients, name="C")
    rec.delete_contact(patients, "pat_001", a.id); patients.commit()
    assert state(patients) == [("B", True, 1), ("C", False, 2)]                  # positions have no gap


def test_deleting_a_non_primary_changes_nothing_else(patients):
    make(patients, name="A"); b = make(patients, name="B")
    rec.delete_contact(patients, "pat_001", b.id); patients.commit()
    assert state(patients) == [("A", True, 1)]


def test_deleting_the_last_contact_leaves_none(patients):
    a = make(patients, name="A")
    rec.delete_contact(patients, "pat_001", a.id); patients.commit()
    assert state(patients) == []


def test_the_sixth_contact_is_refused(patients):
    for n in range(5):
        make(patients, name=f"C{n}")
    with pytest.raises(rec.ContactLimitReached, match="at most 5"):
        rec.add_contact(patients, "pat_001", rec.clean_contact(GOOD))
    assert len(rec.list_contacts(patients, "pat_001")) == 5


def test_the_limit_is_per_patient(patients):
    for n in range(5):
        make(patients, "pat_001", name=f"C{n}")
    make(patients, "pat_002", name="Other")
    assert len(rec.list_contacts(patients, "pat_002")) == 1


def test_a_contact_of_another_patient_cannot_be_touched(patients):
    other = make(patients, "pat_002", name="Theirs")
    with pytest.raises(rec.ContactNotFound):
        rec.update_contact(patients, "pat_001", other.id, rec.clean_contact(GOOD))
    with pytest.raises(rec.ContactNotFound):
        rec.delete_contact(patients, "pat_001", other.id)
    assert state(patients, "pat_002") == [("Theirs", True, 1)]


def test_an_unknown_contact_is_not_found(patients):
    with pytest.raises(rec.ContactNotFound):
        rec.delete_contact(patients, "pat_001", "C-NOPE")


def test_whatever_happens_there_is_exactly_one_primary_and_no_gaps(patients):
    """200 random operations: the rules always hold."""
    rng = random.Random(2026)
    for step in range(200):
        contacts = rec.list_contacts(patients, "pat_001")
        action = rng.choice(["add", "add", "update", "delete", "primary"])
        try:
            if action == "add":
                rec.add_contact(patients, "pat_001", rec.clean_contact({**GOOD, "name": f"N{step}", "is_primary": rng.random() < 0.3}))
            elif contacts and action == "update":
                rec.update_contact(patients, "pat_001", rng.choice(contacts).id, rec.clean_contact({**GOOD, "name": f"U{step}", "is_primary": rng.random() < 0.5}))
            elif contacts and action == "primary":
                rec.update_contact(patients, "pat_001", rng.choice(contacts).id, rec.clean_contact({**GOOD, "is_primary": True}))
            elif contacts and action == "delete":
                rec.delete_contact(patients, "pat_001", rng.choice(contacts).id)
        except rec.ContactLimitReached:
            pass
        patients.commit()
        now = rec.list_contacts(patients, "pat_001")
        assert len(now) <= 5
        assert sum(1 for c in now if c.is_primary) == (1 if now else 0)
        assert [c.position for c in now] == list(range(1, len(now) + 1))


# ------------------------------------------------------------ what each viewer sees

def test_the_owner_sees_everything_including_phone_numbers(patients):
    patients.get(Patient, "pat_001").sex = "M"
    make(patients, name="A")
    view = rec.patient_view(patients, patients.get(Patient, "pat_001"), owner=True)
    assert set(view) == {"id", "name", "age", "sex", "blood_group", "blood_group_verified", "language", "allergies",
                         "conditions", "medications", "contacts", "consents", "simulated"}
    assert view["conditions"] == ["hypertension"] and view["contacts"][0]["phone"] == GOOD["phone"]
    assert view["consents"] == {"location": False, "history": False, "vitals": False, "reports": False} and view["simulated"] is True


def test_someone_else_with_no_consent_sees_only_the_basics(patients):
    make(patients, name="A")
    view = rec.patient_view(patients, patients.get(Patient, "pat_001"), owner=False)
    assert set(view) == {"id", "name", "age", "blood_group", "blood_group_verified", "language", "consents", "simulated"}


def test_someone_else_with_history_consent_sees_the_lists_and_contacts_but_no_phone(patients):
    make(patients, name="A")
    consent_service.update_consents(patients, PATIENT, "pat_001", {"history": True}); patients.commit()
    view = rec.patient_view(patients, patients.get(Patient, "pat_001"), owner=False)
    assert view["allergies"] == ["penicillin"] and view["conditions"] == ["hypertension"] and view["medications"] == ["amlodipine"]
    assert view["contacts"] == [{"name": "A", "relation": "Mother", "is_primary": True}]
    assert "phone" not in repr(view) and GOOD["phone"] not in repr(view)


@pytest.mark.parametrize("owner", [True, False])
def test_an_unknown_sex_is_left_out_never_null(patients, owner):
    view = rec.patient_view(patients, patients.get(Patient, "pat_001"), owner=owner)
    assert "sex" not in view and None not in view.values()


def test_sex_is_always_shown_when_known(patients):
    patients.get(Patient, "pat_001").sex = "F"
    assert rec.patient_view(patients, patients.get(Patient, "pat_001"), owner=False)["sex"] == "F"


def test_released_names_list_only_names(patients):
    patient = patients.get(Patient, "pat_001")
    assert rec.released_names(rec.patient_view(patients, patient, owner=False)) == []
    consent_service.update_consents(patients, PATIENT, "pat_001", {"history": True}); patients.commit()
    assert rec.released_names(rec.patient_view(patients, patient, owner=False)) == ["history"]


def test_baseline(patients):
    patient = patients.get(Patient, "pat_001")
    assert rec.baseline_view(patient) is None
    patient.baseline = {"heart_rate": {"min": 60, "max": 85}}
    assert rec.baseline_view(patient) == {"heart_rate": {"min": 60, "max": 85}, "simulated": True}


# ------------------------------------------------------------ the consent change list

def test_changes_are_newest_first_and_leave_out_the_seed_rows(patients):
    for field in ("location", "history"):
        patients.add(ConsentLedger(patient_id="pat_001", field=field, granted=True, actor="seed", actor_role="SYSTEM"))
    patients.commit()
    assert rec.consent_changes(patients, "pat_001") == []
    for field, value in (("history", False), ("vitals", True), ("history", True)):
        consent_service.update_consents(patients, PATIENT, "pat_001", {field: value}); patients.commit()
    changes = rec.consent_changes(patients, "pat_001")
    assert [(c["key"], c["value"]) for c in changes] == [("history", True), ("vitals", True), ("history", False)]
    assert all(set(c) == {"key", "value", "timestamp"} and c["timestamp"].endswith("Z") for c in changes)


def test_only_the_last_twenty_changes_are_kept(patients):
    for n in range(25):
        consent_service.update_consents(patients, PATIENT, "pat_001", {"location": n % 2 == 0}); patients.commit()
    assert len(rec.consent_changes(patients, "pat_001")) == 20


def test_one_patients_changes_are_not_anothers(patients):
    consent_service.update_consents(patients, PATIENT, "pat_001", {"history": True}); patients.commit()
    assert rec.consent_changes(patients, "pat_002") == []


# ------------------------------------------------------------ vitals

T0 = datetime(2026, 11, 14, 10, 0, 0, tzinfo=timezone.utc)


def fake_registry(clock_box):
    return SimulatorRegistry(factory=lambda pid: WearableSimulator(pid, seed=1, clock=lambda: clock_box[0]))


def test_the_vitals_have_the_shape_the_apps_read():
    box = [T0]
    v = current_vitals("pat_001", registry=fake_registry(box), now=T0)
    assert set(v) == {"patient_id", "heart_rate", "spo2", "bp", "bp_sys", "bp_dia", "glucose", "resp_rate", "timestamp", "simulated"}
    assert v["bp"] == f"{v['bp_sys']}/{v['bp_dia']}" and v["simulated"] is True
    assert all(isinstance(v[k], (int, float)) for k in ("heart_rate", "spo2", "glucose", "resp_rate"))
    assert datetime.strptime(v["timestamp"], "%Y-%m-%dT%H:%M:%SZ")


def test_two_calls_in_the_same_second_give_the_same_reading():
    box, reg = [T0], None
    reg = fake_registry(box)
    first = current_vitals("pat_001", registry=reg, now=T0)
    assert current_vitals("pat_001", registry=reg, now=T0) == first


def test_each_new_second_takes_one_new_step():
    box = [T0]
    reg = fake_registry(box)
    seen = []
    for second in range(1, 6):
        box[0] = T0 + timedelta(seconds=second)
        seen.append(current_vitals("pat_001", registry=reg, now=box[0]))
    assert len({v["timestamp"] for v in seen}) == 5
    assert reg.get("pat_001").last_reading.timestamp == seen[-1]["timestamp"]


def test_vitals_drift_toward_the_chosen_profile():
    box = [T0]
    reg = fake_registry(box)
    reg.get("pat_001").set_profile("heart_attack")
    rates = []
    for second in range(1, 9):
        box[0] = T0 + timedelta(seconds=second)
        rates.append(current_vitals("pat_001", registry=reg, now=box[0])["heart_rate"])
    assert rates[-1] > 120 and rates[0] < rates[-1]


def test_each_patient_has_their_own_vitals():
    box = [T0]
    reg = fake_registry(box)
    reg.get("pat_001").set_profile("asthma")
    box[0] = T0 + timedelta(seconds=3)
    assert current_vitals("pat_001", registry=reg, now=box[0])["spo2"] < current_vitals("pat_002", registry=reg, now=box[0])["spo2"]
