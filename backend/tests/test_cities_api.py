"""GET /cities, city fields, the city_id filter and home_city_id, through the REAL login."""
import pytest

STAFF = ("staff@demo.test", "demo1234")
ADMIN = ("admin@demo.test", "demo1234")
PATIENT = ("patient@demo.test", "demo1234")
FAMILY = ("family1", "demo-password")
RESPONDER = ("responder1", "demo-password")
ME = "/patients/PT-2026-0417"

ALL_ROLES = [STAFF, ADMIN, PATIENT, FAMILY, RESPONDER]


@pytest.mark.parametrize("who", ALL_ROLES)
def test_every_logged_in_role_can_read_the_cities(demo, who):
    r = demo.get("/cities", headers=demo.headers(*who))
    assert r.status_code == 200
    assert [c["city_id"] for c in r.json()] == ["AMD", "PNQ"]


def test_cities_need_a_login(demo):
    assert demo.get("/cities").status_code == 401


def test_a_city_has_the_agreed_shape(demo):
    amd, pnq = demo.get("/cities", headers=demo.headers(*PATIENT)).json()
    assert set(amd) == {"city_id", "city_name", "state", "lat", "lng", "timezone", "zoom", "simulation_start", "simulated"}
    assert set(amd["simulation_start"]) == {"lat", "lng", "label"}
    assert (amd["city_name"], amd["state"]) == ("Ahmedabad", "Gujarat")
    assert (pnq["city_name"], pnq["state"]) == ("Pune", "Maharashtra")
    assert amd["timezone"] == "Asia/Kolkata" and amd["simulated"] is True
    assert 18 < pnq["lat"] < 19 and 73 < pnq["lng"] < 74


def test_hospitals_carry_their_city(demo):
    rows = demo.get("/hospitals", headers=demo.headers(*STAFF)).json()
    by_id = {h["id"]: h for h in rows}
    assert by_id["HSP-AMD-001"]["city_id"] == "AMD" and by_id["HSP-AMD-001"]["city_name"] == "Ahmedabad"
    assert by_id["HSP-PNQ-001"]["city_id"] == "PNQ" and by_id["HSP-PNQ-001"]["state"] == "Maharashtra"
    assert all("city_id" in h for h in rows)


def test_the_hospital_filter_keeps_only_that_city(demo):
    pnq = demo.get("/hospitals?city_id=PNQ", headers=demo.headers(*STAFF)).json()
    assert {h["id"] for h in pnq} == {f"HSP-PNQ-00{n}" for n in range(1, 6)}
    amd = demo.get("/hospitals?city_id=AMD", headers=demo.headers(*PATIENT)).json()
    assert {h["city_id"] for h in amd} == {"AMD"} and len(amd) == 5


def test_the_filter_keeps_the_other_parameters_working(demo):
    body = demo.get("/hospitals?city_id=PNQ&type=STROKE&lat=18.52&lng=73.85", headers=demo.headers(*STAFF)).json()
    assert body[0]["suitable"] is True and all(h["city_id"] == "PNQ" for h in body)
    assert [h["distance_km"] for h in body if h["suitable"]] == sorted(h["distance_km"] for h in body if h["suitable"])


def test_an_unknown_city_is_a_400_not_an_empty_list(demo):
    r = demo.get("/hospitals?city_id=XYZ", headers=demo.headers(*STAFF))
    assert r.status_code == 400 and "city_id" in r.text


def test_ambulances_carry_their_city_and_filter(demo):
    allrows = demo.get("/ambulances", headers=demo.headers(*STAFF)).json()
    assert len(allrows) == 10 and all(a["city_id"] in ("AMD", "PNQ") for a in allrows)
    pnq = demo.get("/ambulances?city_id=PNQ", headers=demo.headers(*ADMIN)).json()
    assert {a["id"] for a in pnq} == {f"AMB-PNQ-0{n}" for n in range(1, 6)}
    assert demo.get("/ambulances?city_id=XYZ", headers=demo.headers(*ADMIN)).status_code == 400


def test_the_old_fields_are_still_there(demo):
    first = demo.get("/hospitals", headers=demo.headers(*STAFF)).json()[0]
    assert {"id", "name", "lat", "lng", "capabilities", "availability", "verified", "distance_km", "simulated"} <= set(first)


def test_the_patient_answer_has_home_city_id(demo):
    body = demo.get(ME, headers=demo.headers(*PATIENT)).json()
    assert body["home_city_id"] == "AMD"


def test_the_home_city_can_be_changed_to_a_known_city(demo):
    h = demo.headers(*PATIENT)
    assert demo.patch(ME, json={"home_city_id": "PNQ"}, headers=h).json()["home_city_id"] == "PNQ"
    assert demo.get(ME, headers=h).json()["home_city_id"] == "PNQ"


@pytest.mark.parametrize("bad", ["XYZ", "", None, 7, "amd"])
def test_a_bad_home_city_is_400_and_nothing_changes(demo, bad):
    h = demo.headers(*PATIENT)
    assert demo.patch(ME, json={"home_city_id": bad}, headers=h).status_code == 400
    assert demo.get(ME, headers=h).json()["home_city_id"] == "AMD"
