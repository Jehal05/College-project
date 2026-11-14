"""Hospitals and ambulances through the REAL login (P1 and P3)."""
import pytest
from sqlalchemy.orm import Session

from app.models.audit import AuditLog
from app.models.emergencies import Emergency
from app.models.hospitals import Ambulance, Hospital
from app.seed.demo_data import DEMO_HOSPITAL_ID
from app.services import events

STAFF = ("staff@demo.test", "demo1234")
ADMIN = ("admin@demo.test", "demo1234")
PATIENT = ("patient@demo.test", "demo1234")
FAMILY = ("family1", "demo-password")
RESPONDER = ("responder1", "demo-password")

NEW = {"name": "Test Care Hospital", "address": "Ring Road, Ahmedabad", "phone": "+91 00000 10099",
       "lat": 23.05, "lng": 72.6,
       "capabilities": {"cath_lab": False, "stroke_unit": True, "icu": True, "emergency": True},
       "availability": {"beds_free": 5, "icu_free": 1, "cath_lab_ready": False, "stroke_unit_ready": True}}


@pytest.fixture(autouse=True)
def seen():
    got = []
    events.clear_subscribers()
    events.subscribe(got.append)
    yield got
    events.clear_subscribers()


def denied(engine, action):
    with Session(engine) as s:
        return s.query(AuditLog).filter(AuditLog.action == action, AuditLog.outcome == "denied").count()


# ------------------------------------------------------------ GET /hospitals

def test_staff_see_every_hospital_nearest_first_in_the_contract_shape(demo):
    r = demo.get("/hospitals?lat=23.02&lng=72.57", headers=demo.headers(*STAFF))
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 5
    assert [h["distance_km"] for h in body] == sorted(h["distance_km"] for h in body)
    first = body[0]
    assert {"id", "name", "lat", "lng", "capabilities", "availability", "verified", "distance_km", "simulated"} <= set(first)
    assert set(first["capabilities"]) == {"emergency", "cath_lab", "stroke_unit", "icu"}
    assert set(first["availability"]) == {"beds_free", "icu_free", "icu_beds", "cath_lab_ready", "stroke_unit_ready"}
    assert first["availability"]["icu_beds"] == first["availability"]["icu_free"]      # the old name, kept in step


def test_a_type_puts_the_hospitals_that_can_handle_it_first(demo):
    body = demo.get("/hospitals?type=STROKE", headers=demo.headers(*STAFF)).json()
    flags = [h["suitable"] for h in body]
    assert flags == sorted(flags, reverse=True) and flags[0] is True and flags[-1] is False
    ids = {h["id"] for h in body if h["suitable"]}
    assert ids == {"HSP-AMD-002", "HSP-AMD-004"}


def test_a_patient_sees_only_verified_hospitals(demo, engine):
    with Session(engine) as s:
        s.get(Hospital, "HSP-AMD-005").verified = False
        s.commit()
    assert len(demo.get("/hospitals", headers=demo.headers(*PATIENT)).json()) == 4
    assert len(demo.get("/hospitals", headers=demo.headers(*STAFF)).json()) == 5


@pytest.mark.parametrize("who", [FAMILY, RESPONDER])
def test_family_and_responders_cannot_list_hospitals(demo, engine, who):
    assert demo.get("/hospitals", headers=demo.headers(*who)).status_code == 403
    assert denied(engine, "hospital.list") == 1


def test_hospitals_need_a_login(demo):
    assert demo.get("/hospitals").status_code == 401


@pytest.mark.parametrize("query", ["lat=abc&lng=72", "lat=23", "lat=91&lng=72", "type=NOPE"])
def test_bad_queries_are_400(demo, query):
    assert demo.get("/hospitals?" + query, headers=demo.headers(*STAFF)).status_code == 400


# ------------------------------------------------------------ availability

def test_staff_update_their_own_hospital(demo, seen):
    r = demo.patch(f"/hospitals/{DEMO_HOSPITAL_ID}/availability", json={"beds_free": 9, "cath_lab_ready": False},
                   headers=demo.headers(*STAFF))
    assert r.status_code == 200
    assert r.json()["availability"]["beds_free"] == 9 and r.json()["availability"]["cath_lab_ready"] is False
    assert r.json()["availability"]["icu_free"] == 1                      # the rest is unchanged
    again = demo.get("/hospitals", headers=demo.headers(*STAFF)).json()
    assert [h for h in again if h["id"] == DEMO_HOSPITAL_ID][0]["availability"]["beds_free"] == 9
    assert [e["event"] for e in seen] == ["hospital.availability_updated"]
    assert seen[0]["audience"] == "hospitals" and seen[0]["payload"]["hospital_id"] == DEMO_HOSPITAL_ID


def test_staff_cannot_update_another_hospital(demo, engine):
    r = demo.patch("/hospitals/HSP-AMD-001/availability", json={"beds_free": 1}, headers=demo.headers(*STAFF))
    assert r.status_code == 403 and denied(engine, "hospital.availability") == 1
    with Session(engine) as s:
        assert s.get(Hospital, "HSP-AMD-001").beds_free == 12


def test_an_admin_may_update_any_hospital(demo):
    assert demo.patch("/hospitals/HSP-AMD-001/availability", json={"beds_free": 3}, headers=demo.headers(*ADMIN)).status_code == 200


def test_patients_cannot_update_availability(demo):
    assert demo.patch(f"/hospitals/{DEMO_HOSPITAL_ID}/availability", json={"beds_free": 3},
                      headers=demo.headers(*PATIENT)).status_code == 403


def test_an_unknown_hospital_is_404(demo):
    assert demo.patch("/hospitals/NOPE/availability", json={"beds_free": 3}, headers=demo.headers(*STAFF)).status_code == 404


@pytest.mark.parametrize("body", [{}, {"beds_free": -1}, {"beds_free": "ten"}, {"beds_free": True}, {"cath_lab_ready": "yes"},
                                  {"colour": 1}, {"beds_free": 1, "icu_free": 1, "icu_beds": 2}])
def test_bad_availability_is_400(demo, body):
    r = demo.patch(f"/hospitals/{DEMO_HOSPITAL_ID}/availability", json=body, headers=demo.headers(*STAFF))
    assert r.status_code == 400 and r.json()["error"] == r.json()["detail"]


def test_a_bad_availability_never_echoes_what_was_sent(demo):
    r = demo.patch(f"/hospitals/{DEMO_HOSPITAL_ID}/availability", json={"beds_free": "SECRET-VALUE-9"},
                   headers=demo.headers(*STAFF))
    assert r.status_code == 400 and "SECRET-VALUE-9" not in r.text


def test_a_cath_lab_cannot_be_ready_if_the_hospital_has_none(demo, engine):
    r = demo.patch("/hospitals/HSP-AMD-001/availability", json={"cath_lab_ready": True}, headers=demo.headers(*ADMIN))
    assert r.status_code == 400
    with Session(engine) as s:
        assert s.get(Hospital, "HSP-AMD-001").cath_lab_ready is False


def test_the_older_names_are_accepted(demo):
    r = demo.patch(f"/hospitals/{DEMO_HOSPITAL_ID}/availability", json={"icu_beds": 4, "stroke_unit_open": False},
                   headers=demo.headers(*STAFF))
    assert r.status_code == 200 and r.json()["availability"]["icu_free"] == 4


# ------------------------------------------------------------ add, edit, verify

def test_an_admin_adds_a_hospital_and_it_starts_unverified(demo):
    r = demo.post("/hospitals", json={**NEW, "verified": True}, headers=demo.headers(*ADMIN))
    assert r.status_code == 201 and r.json()["verified"] is False and r.json()["id"] == "HSP-AMD-006"
    assert demo.post("/hospitals", json=NEW, headers=demo.headers(*ADMIN)).json()["id"] == "HSP-AMD-007"


def test_an_unverified_hospital_is_never_alerted(demo):
    demo.post("/hospitals", json=NEW, headers=demo.headers(*ADMIN))
    r = demo.post("/emergencies", json={"symptoms": ["FACE_DROOP"]}, headers=demo.headers(*PATIENT))
    out = demo.post(f"/emergencies/{r.json()['id']}/sos", json={}, headers=demo.headers(*PATIENT)).json()
    assert out["hospital"]["id"] != "HSP-AMD-006"


@pytest.mark.parametrize("who", [STAFF, PATIENT, FAMILY])
def test_only_an_admin_adds_edits_or_verifies(demo, engine, who):
    h = demo.headers(*who)
    assert demo.post("/hospitals", json=NEW, headers=h).status_code == 403
    assert demo.put("/hospitals/HSP-AMD-001", json=NEW, headers=h).status_code == 403
    assert demo.patch("/hospitals/HSP-AMD-001/verify", json={"verified": False}, headers=h).status_code == 403
    assert denied(engine, "hospital.create") == 1 and denied(engine, "hospital.verify") == 1


def test_an_edit_changes_the_fields_but_never_verified(demo, engine):
    demo.patch("/hospitals/HSP-AMD-001/verify", json={"verified": False}, headers=demo.headers(*ADMIN))
    r = demo.put("/hospitals/HSP-AMD-001", json={**NEW, "verified": True}, headers=demo.headers(*ADMIN))
    assert r.status_code == 200 and r.json()["name"] == "Test Care Hospital" and r.json()["verified"] is False
    assert r.json()["capabilities"]["stroke_unit"] is True and r.json()["availability"]["beds_free"] == 5


def test_edit_of_an_unknown_hospital_is_404(demo):
    assert demo.put("/hospitals/NOPE", json=NEW, headers=demo.headers(*ADMIN)).status_code == 404


def test_verify_toggles_and_is_audited(demo, engine):
    r = demo.patch("/hospitals/HSP-AMD-001/verify", json={"verified": False}, headers=demo.headers(*ADMIN))
    assert r.json() == {"id": "HSP-AMD-001", "verified": False}
    with Session(engine) as s:
        assert s.get(Hospital, "HSP-AMD-001").verified is False
        assert s.query(AuditLog).filter(AuditLog.action == "hospital.verify", AuditLog.outcome == "allowed").count() == 1
    assert demo.patch("/hospitals/HSP-AMD-001/verify", json={"verified": "yes"}, headers=demo.headers(*ADMIN)).status_code == 400


@pytest.mark.parametrize("change", [
    {"name": "ab"}, {"name": 5}, {"address": ""}, {"phone": "abc"}, {"phone": "12"}, {"lat": 100}, {"lng": "x"},
    {"capabilities": {"cath_lab": False, "stroke_unit": False, "icu": False, "emergency": False}},
    {"capabilities": {"cath_lab": True}},
    {"availability": {"beds_free": -1, "icu_free": 0, "cath_lab_ready": False, "stroke_unit_ready": False}},
    {"availability": {"beds_free": 1, "icu_free": 0, "cath_lab_ready": True, "stroke_unit_ready": False}},
])
def test_a_bad_hospital_is_400_and_nothing_is_saved(demo, engine, change):
    r = demo.post("/hospitals", json={**NEW, **change}, headers=demo.headers(*ADMIN))
    assert r.status_code == 400
    with Session(engine) as s:
        assert s.query(Hospital).count() == 5


# ------------------------------------------------------------ ambulances

def test_staff_list_the_ambulances(demo):
    r = demo.get("/ambulances", headers=demo.headers(*STAFF))
    assert r.status_code == 200 and len(r.json()) == 5
    first = r.json()[0]
    assert {"id", "call_sign", "crew", "base_hospital_id", "lat", "lng", "status", "simulated"} <= set(first)
    assert set(first["crew"]) == {"driver", "paramedic"}


@pytest.mark.parametrize("who", [PATIENT, FAMILY, RESPONDER])
def test_others_cannot_list_ambulances(demo, who):
    assert demo.get("/ambulances", headers=demo.headers(*who)).status_code == 403


def test_the_position_of_an_own_ambulance_can_be_posted(demo, engine, seen):
    r = demo.post("/ambulances/AMB-AMD-02/location", json={"lat": 23.03, "lng": 72.56}, headers=demo.headers(*STAFF))
    assert r.status_code == 200
    with Session(engine) as s:
        a = s.get(Ambulance, "AMB-AMD-02")
        assert (a.lat, a.lng) == (23.03, 72.56)


def test_staff_cannot_move_another_hospitals_ambulance(demo, engine):
    r = demo.post("/ambulances/AMB-AMD-01/location", json={"lat": 23.0, "lng": 72.5}, headers=demo.headers(*STAFF))
    assert r.status_code == 403 and denied(engine, "ambulance.location") == 1


def test_an_unknown_ambulance_is_404(demo):
    assert demo.post("/ambulances/NOPE/location", json={"lat": 23.0, "lng": 72.5}, headers=demo.headers(*STAFF)).status_code == 404


@pytest.mark.parametrize("body", [{}, {"lat": 95, "lng": 72}, {"lat": "a", "lng": 72}, {"lat": 23, "lng": 72, "eta_seconds": -5},
                                  {"lat": 23, "lng": 72, "emergency_id": "EM-NOPE"}])
def test_a_bad_position_is_400(demo, body):
    assert demo.post("/ambulances/AMB-AMD-02/location", json=body, headers=demo.headers(*STAFF)).status_code == 400


def test_a_position_for_an_emergency_updates_the_eta_and_announces_it(demo, engine, seen):
    eid = demo.post("/emergencies", json={"symptoms": ["CHEST_PAIN"]}, headers=demo.headers(*PATIENT)).json()["id"]
    with Session(engine) as s:
        e = s.get(Emergency, eid)
        e.ambulance_id, e.hospital_id, e.state = "AMB-AMD-02", DEMO_HOSPITAL_ID, "AMBULANCE_DISPATCHED"
        s.commit()
    seen.clear()
    r = demo.post("/ambulances/AMB-AMD-02/location",
                  json={"lat": 23.03, "lng": 72.56, "eta_seconds": 240, "emergency_id": eid}, headers=demo.headers(*STAFF))
    assert r.status_code == 200
    assert [e["event"] for e in seen] == ["ambulance.location"]
    assert seen[0]["payload"] == {"ambulance_id": "AMB-AMD-02", "lat": 23.03, "lng": 72.56, "eta_seconds": 240}
    with Session(engine) as s:
        assert s.get(Emergency, eid).eta_seconds == 240
