"""Phase 1 of the two-city network: the cities config, the Pune seed data and the additive migration.

Everything here is fictional. The tests also guard against a real hospital name or a routable phone number.
"""
import json
import re
from pathlib import Path

import pytest
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session

from app import db as db_module
from app.models.cities import City
from app.models.consent import ConsentLedger
from app.models.hospitals import Ambulance, Hospital
from app.models.patient_data import Contact, Patient
from app.seed import demo_data
from app.seed.demo_data import seed_demo
from app.services.cities import ensure_cities
from app.services.hospital_match import distance_km

DATA = Path(demo_data.__file__).resolve().parent / "data"

# Names of real Indian hospitals and chains. A seeded name must not contain any of these.
REAL_NAMES = ["ruby hall", "sahyadri", "jehangir", "deenanath", "apollo", "fortis", "manipal", "aditya birla",
              "sassoon", "kem ", "noble", "columbia asia", "poona hospital", "inamdar", "medicover", "max ", "aiims",
              "civil hospital", "sterling", "zydus", "krishna", "shalby", "hcg", "narayana", "lilavati", "kokilaben"]


@pytest.fixture
def seeded(engine, monkeypatch):
    monkeypatch.setenv("DEMO_MODE", "true")
    with Session(engine, expire_on_commit=False) as s:
        s.counts = seed_demo(s)
        yield s


def by_city(rows, city_id):
    return [r for r in rows if r.city_id == city_id]


# ------------------------------------------------------------------ the cities config

def test_the_cities_file_lists_exactly_ahmedabad_and_pune():
    cities = json.loads((DATA / "cities.json").read_text(encoding="utf-8"))["cities"]
    assert [(c["city_id"], c["city_name"], c["state"]) for c in cities] == [
        ("AMD", "Ahmedabad", "Gujarat"), ("PNQ", "Pune", "Maharashtra")]
    for c in cities:
        assert -90 <= c["lat"] <= 90 and -180 <= c["lng"] <= 180
        assert c["timezone"] == "Asia/Kolkata" and 8 <= c["zoom"] <= 16
        assert set(c["simulation_start"]) >= {"lat", "lng", "label"}


def test_init_db_creates_the_cities(engine):
    with Session(engine) as s:
        assert {c.city_id for c in s.query(City)} == {"AMD", "PNQ"}


def test_ensure_cities_is_idempotent_and_updates_a_changed_row(engine):
    with Session(engine) as s:
        s.query(City).filter_by(city_id="PNQ").one().zoom = 9
        s.commit()
        ensure_cities(s); ensure_cities(s)
        s.commit()
        assert s.query(City).count() == 2
        assert s.query(City).filter_by(city_id="PNQ").one().zoom == 12     # the file is the truth


def test_the_simulation_start_of_each_city_is_inside_that_city(engine):
    with Session(engine) as s:
        for c in s.query(City):
            assert distance_km(c.lat, c.lng, c.start_lat, c.start_lng) < 15, c.city_id


# ------------------------------------------------------------------ hospitals

def test_each_city_has_five_hospitals_with_the_agreed_ids(seeded):
    hs = seeded.query(Hospital).all()
    assert len(hs) == 10
    assert sorted(h.id for h in by_city(hs, "AMD")) == ["HSP-AMD-00%d" % i for i in range(1, 6)]
    assert sorted(h.id for h in by_city(hs, "PNQ")) == ["HSP-PNQ-00%d" % i for i in range(1, 6)]


def test_a_hospital_id_prefix_always_matches_its_city(seeded):
    for h in seeded.query(Hospital):
        assert h.id.startswith("HSP-" + h.city_id + "-"), h.id


def test_hospital_city_name_and_state_come_from_the_city_row(seeded):
    h = seeded.get(Hospital, "HSP-PNQ-001")
    assert (h.city_name, h.state) == ("Pune", "Maharashtra")
    h = seeded.get(Hospital, "HSP-AMD-002")
    assert (h.city_name, h.state) == ("Ahmedabad", "Gujarat")


def test_the_five_ahmedabad_hospitals_are_unchanged(seeded):
    h = seeded.get(Hospital, "HSP-AMD-002")
    assert h.name == "Navrangpura Heart & Stroke Institute"
    assert (h.lat, h.lng) == (23.037, 72.55) and h.cap_cath_lab and h.cap_stroke_unit


@pytest.mark.parametrize("city", ["AMD", "PNQ"])
def test_each_city_mixes_capabilities(seeded, city):
    hs = by_city(seeded.query(Hospital).all(), city)
    assert any(h.cap_cath_lab for h in hs) and any(h.cap_stroke_unit for h in hs) and any(h.cap_icu for h in hs)
    small = [h for h in hs if h.cap_emergency and not (h.cap_cath_lab or h.cap_stroke_unit or h.cap_icu)]
    assert len(small) >= 1, "one small hospital with few capabilities"
    assert all(h.cap_emergency for h in hs if h.cap_cath_lab or h.cap_stroke_unit)


@pytest.mark.parametrize("city", ["AMD", "PNQ"])
def test_hospitals_stand_inside_their_own_city(seeded, city):
    c = seeded.get(City, city)
    for h in by_city(seeded.query(Hospital).all(), city):
        assert distance_km(c.lat, c.lng, h.lat, h.lng) < 25, (h.id, "is too far from " + city)


def test_the_two_cities_are_far_apart(seeded):
    a, p = seeded.get(City, "AMD"), seeded.get(City, "PNQ")
    assert 450 < distance_km(a.lat, a.lng, p.lat, p.lng) < 600     # about 550 km by air


def test_no_hospital_name_matches_a_real_hospital(seeded):
    for h in seeded.query(Hospital):
        low = " " + h.name.lower() + " "
        for real in REAL_NAMES:
            assert real not in low, (h.name, real)


def test_hospital_names_are_unique_and_phones_are_not_routable(seeded):
    hs = seeded.query(Hospital).all()
    assert len({h.name for h in hs}) == 10
    for h in hs:
        assert re.fullmatch(r"\+91 00000 \d{5}", h.phone), (h.id, h.phone)
    assert len({h.phone for h in hs}) == 10


def test_all_hospitals_are_verified_and_labelled_simulated_in_the_file(seeded):
    raw = json.loads((DATA / "hospitals.json").read_text(encoding="utf-8"))["hospitals"]
    assert len(raw) == 10 and all(r["simulated"] is True for r in raw)
    assert all(h.verified for h in seeded.query(Hospital))


# ------------------------------------------------------------------ ambulances

def test_each_city_has_five_ambulances_with_the_agreed_ids(seeded):
    ambs = seeded.query(Ambulance).all()
    assert sorted(a.id for a in by_city(ambs, "AMD")) == ["AMB-AMD-0%d" % i for i in range(1, 6)]
    assert sorted(a.id for a in by_city(ambs, "PNQ")) == ["AMB-PNQ-0%d" % i for i in range(1, 6)]


def test_an_ambulance_is_based_at_a_hospital_of_its_own_city_and_starts_near_it(seeded):
    for a in seeded.query(Ambulance):
        base = seeded.get(Hospital, a.base_hospital_id)
        assert base.city_id == a.city_id, a.id
        assert distance_km(a.lat, a.lng, base.lat, base.lng) < 3, a.id


def test_ambulance_call_signs_are_unique_inside_a_city_and_all_start_available(seeded):
    for city in ("AMD", "PNQ"):
        signs = [a.call_sign for a in by_city(seeded.query(Ambulance).all(), city)]
        assert len(signs) == len(set(signs)) == 5
    assert all(a.status == "available" for a in seeded.query(Ambulance))
    assert all(a.crew_driver and a.crew_paramedic for a in seeded.query(Ambulance))


# ------------------------------------------------------------------ patients

def test_three_patients_per_city(seeded):
    ps = seeded.query(Patient).all()
    assert len(ps) == 6
    assert len(by_city_p(ps, "AMD")) == 3 and len(by_city_p(ps, "PNQ")) == 3
    assert seeded.counts["patients"] == 6


def by_city_p(rows, city_id):
    return [r for r in rows if r.home_city_id == city_id]


def test_the_original_patient_is_unchanged_and_lives_in_ahmedabad(seeded):
    p = seeded.get(Patient, "PT-2026-0417")
    assert (p.name, p.age, p.home_city_id) == ("Rahul Mehta", 54, "AMD")


def test_every_patient_has_a_baseline_contacts_and_consents(seeded):
    for p in seeded.query(Patient):
        assert p.baseline and set(p.baseline) >= {"heart_rate", "spo2", "bp_systolic", "glucose"}, p.id
        assert 1 <= seeded.query(Contact).filter_by(patient_id=p.id).count() <= 5
        assert seeded.query(ConsentLedger).filter_by(patient_id=p.id).count() == 4


def test_patient_names_are_varied_and_unique(seeded):
    names = [p.name for p in seeded.query(Patient)]
    assert len(set(names)) == 6
    assert len({n.split()[-1] for n in names}) >= 5, "several families and communities, not one"


def test_patient_contact_phones_are_not_routable_and_ids_are_unique(seeded):
    phones = [c.phone for c in seeded.query(Contact)]
    assert all(re.fullmatch(r"\+91 00000 \d{5}", p) for p in phones)
    ids = [c.id for c in seeded.query(Contact)]
    assert len(ids) == len(set(ids))


def test_one_contact_is_primary_for_every_patient(seeded):
    for p in seeded.query(Patient):
        prim = [c for c in seeded.query(Contact).filter_by(patient_id=p.id) if c.is_primary]
        assert len(prim) == 1, p.id


# ------------------------------------------------------------------ the reset restores both cities

def test_a_reset_restores_both_cities(engine, monkeypatch):
    monkeypatch.setenv("DEMO_MODE", "true")
    from app.services.demo import reset_everything
    with Session(engine) as s:
        seed_demo(s)
        s.query(Hospital).filter_by(id="HSP-PNQ-001").one().beds_free = 0
        s.commit()
        reset_everything(s)
        assert {c.city_id for c in s.query(City)} == {"AMD", "PNQ"}
        assert s.query(Hospital).count() == 10 and s.query(Ambulance).count() == 10 and s.query(Patient).count() == 6
        assert s.get(Hospital, "HSP-PNQ-001").beds_free > 0


def test_a_reset_works_when_the_session_already_holds_a_city_row(engine, monkeypatch):
    monkeypatch.setenv("DEMO_MODE", "true")
    from app.services.demo import reset_everything
    with Session(engine) as s:
        seed_demo(s)
        s.commit()
        assert s.get(City, "PNQ") is not None          # cached in the session, then deleted underneath it by the reset
        reset_everything(s)
        assert s.get(City, "PNQ").city_name == "Pune" and s.query(Hospital).filter_by(city_id="PNQ").count() == 5


# ------------------------------------------------------------------ the additive migration

OLD_SCHEMA = [
    "CREATE TABLE hospitals (id VARCHAR PRIMARY KEY, portal_id VARCHAR, name VARCHAR NOT NULL, address VARCHAR, phone VARCHAR,"
    " lat FLOAT NOT NULL, lng FLOAT NOT NULL, verified BOOLEAN NOT NULL DEFAULT 0, cap_emergency BOOLEAN NOT NULL DEFAULT 0,"
    " cap_cath_lab BOOLEAN NOT NULL DEFAULT 0, cap_stroke_unit BOOLEAN NOT NULL DEFAULT 0, cap_icu BOOLEAN NOT NULL DEFAULT 0,"
    " beds_free INTEGER NOT NULL DEFAULT 0, icu_free INTEGER NOT NULL DEFAULT 0, cath_lab_ready BOOLEAN NOT NULL DEFAULT 0,"
    " stroke_unit_ready BOOLEAN NOT NULL DEFAULT 0, updated_at DATETIME NOT NULL)",
    "CREATE TABLE ambulances (id VARCHAR PRIMARY KEY, portal_id VARCHAR, call_sign VARCHAR NOT NULL, crew_driver VARCHAR,"
    " crew_paramedic VARCHAR, base_hospital_id VARCHAR REFERENCES hospitals(id), lat FLOAT NOT NULL, lng FLOAT NOT NULL,"
    " status VARCHAR NOT NULL DEFAULT 'available' CHECK (status IN ('available','dispatched','en_route')),"
    " updated_at DATETIME)",
    "INSERT INTO hospitals (id, name, lat, lng, verified, cap_emergency, beds_free, updated_at) VALUES"
    " ('HSP-AMD-001', 'Sabarmati Civil Care Hospital', 23.03, 72.565, 1, 1, 12, '2026-11-01 00:00:00')",
    "INSERT INTO hospitals (id, name, lat, lng, verified, cap_emergency, beds_free, updated_at) VALUES"
    " ('HSP-AMD-002', 'Navrangpura Heart & Stroke Institute', 23.037, 72.55, 1, 1, 6, '2026-11-01 00:00:00')",
    "INSERT INTO ambulances (id, call_sign, base_hospital_id, lat, lng, status) VALUES"
    " ('AMB-AMD-01', 'Alpha 1', 'HSP-AMD-001', 23.0335, 72.569, 'available')",
]


@pytest.fixture
def old_db(tmp_path):
    url = "sqlite:///" + str(tmp_path / "old.db")
    eng = create_engine(url)
    with eng.begin() as c:
        for stmt in OLD_SCHEMA:
            c.execute(text(stmt))
    return eng


def cols(eng, table):
    return {c["name"] for c in inspect(eng).get_columns(table)}


def test_the_migration_adds_the_new_columns_without_losing_a_row(old_db):
    assert "city_id" not in cols(old_db, "hospitals")
    db_module.init_db(old_db)
    assert {"city_id"} <= cols(old_db, "hospitals") and {"city_id"} <= cols(old_db, "ambulances")
    with old_db.connect() as c:
        rows = c.execute(text("SELECT id, name, beds_free, city_id FROM hospitals ORDER BY id")).all()
        assert [tuple(r) for r in rows] == [("HSP-AMD-001", "Sabarmati Civil Care Hospital", 12, "AMD"),
                                            ("HSP-AMD-002", "Navrangpura Heart & Stroke Institute", 6, "AMD")]
        amb = c.execute(text("SELECT id, call_sign, base_hospital_id, city_id FROM ambulances")).all()
        assert [tuple(r) for r in amb] == [("AMB-AMD-01", "Alpha 1", "HSP-AMD-001", "AMD")]


def test_the_migration_is_safe_to_run_twice(old_db):
    db_module.init_db(old_db)
    db_module.init_db(old_db)
    with old_db.connect() as c:
        assert c.execute(text("SELECT COUNT(*) FROM hospitals")).scalar() == 2
        assert c.execute(text("SELECT COUNT(*) FROM cities")).scalar() == 2


def test_the_migration_backfills_pune_ids_too(old_db):
    with old_db.begin() as c:
        c.execute(text("INSERT INTO hospitals (id, name, lat, lng, updated_at) VALUES ('HSP-PNQ-009', 'Test', 18.5, 73.8, '2026-11-01')"))
    db_module.init_db(old_db)
    with old_db.connect() as c:
        assert c.execute(text("SELECT city_id FROM hospitals WHERE id='HSP-PNQ-009'")).scalar() == "PNQ"


def test_an_unknown_id_prefix_keeps_a_null_city_instead_of_a_wrong_one(old_db):
    with old_db.begin() as c:
        c.execute(text("INSERT INTO hospitals (id, name, lat, lng, updated_at) VALUES ('HSP-XYZ-001', 'Other', 1, 1, '2026-11-01')"))
    db_module.init_db(old_db)
    with old_db.connect() as c:
        assert c.execute(text("SELECT city_id FROM hospitals WHERE id='HSP-XYZ-001'")).scalar() is None


def test_a_fresh_database_already_has_the_columns(engine):
    assert "city_id" in cols(engine, "hospitals") and "home_city_id" in cols(engine, "patients")
