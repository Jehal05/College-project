"""Demo seed data (all fictional) and the rule that it never loads outside demo mode."""
import json
import re
from pathlib import Path

import pytest
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from app import db as db_module
from app.models.accounts import User
from app.models.consent import ConsentLedger
from app.models.hospitals import Ambulance, Hospital
from app.models.patient_data import Contact, Patient
from app.security.passwords import verify_password
from app.seed import demo_data
from app.seed.demo_data import DEMO_ACCOUNTS, SeedRefused, seed_demo
from app.services.consent import current_consents

APP_DIR = Path(demo_data.__file__).resolve().parent.parent

# The demo logins listed in CONTRACT.md and used by the patient app, the portal and the contract script.
LOGINS = [
    ("patient@demo.test", "demo1234"), ("staff@demo.test", "demo1234"), ("admin@demo.test", "demo1234"),
    ("staff@demo", "demo123"), ("admin@demo", "demo123"),
    ("patient1", "demo-password"), ("staff1", "demo-password"), ("admin1", "demo-password"),
    ("family1", "demo-password"), ("responder1", "demo-password"),
    ("family@demo.test", "demo1234"), ("responder@demo.test", "demo1234"),
]


@pytest.fixture
def seeded(engine, monkeypatch):
    monkeypatch.setenv("DEMO_MODE", "true")
    with Session(engine, expire_on_commit=False) as s:
        counts = seed_demo(s)
        s.counts = counts
        yield s


def user(session, login):
    return session.query(User).filter_by(login=login).one()


# ------------------------------------------------------------ never outside demo mode

def test_it_refuses_to_run_outside_demo_mode(engine):
    with Session(engine) as s:
        with pytest.raises(SeedRefused):
            seed_demo(s)
        assert s.query(User).count() == 0 and s.query(Hospital).count() == 0


@pytest.mark.parametrize("value", ["", "false", "0", "no"])
def test_only_a_true_demo_mode_counts(engine, monkeypatch, value):
    monkeypatch.setenv("DEMO_MODE", value)
    with Session(engine) as s:
        with pytest.raises(SeedRefused):
            seed_demo(s)


def test_the_command_line_refuses_without_demo_mode_and_prints_no_passwords(capsys):
    from app.seed.__main__ import main
    assert main() == 1
    out = capsys.readouterr().out
    assert "DEMO_MODE" in out and not any(p in out for _, p in LOGINS)


def test_the_command_line_seeds_in_demo_mode_and_prints_only_counts(file_db, monkeypatch, capsys):
    from app.seed.__main__ import main
    monkeypatch.setenv("DEMO_MODE", "true")
    assert main() == 0
    out = capsys.readouterr().out
    assert "'users': 12" in out and not any(p in out for _, p in LOGINS)


# ------------------------------------------------------------ what gets loaded

def test_the_counts(seeded):
    assert seeded.counts == {"hospitals": 5, "ambulances": 5, "patients": 1, "contacts": 2, "users": 12, "consents": 4}
    assert seeded.query(Hospital).count() == 5 and seeded.query(Ambulance).count() == 5 and seeded.query(Contact).count() == 2


def test_the_hospitals_match_the_portals_names_and_rules(seeded):
    h2 = seeded.get(Hospital, "HSP-AMD-002")
    assert h2.name == "Navrangpura Heart & Stroke Institute" and h2.portal_id == "H2"
    assert h2.capabilities == {"cath_lab": True, "stroke_unit": True, "icu": True, "emergency": True}
    assert h2.availability == {"beds_free": 6, "icu_free": 1, "cath_lab_ready": True, "stroke_unit_ready": True}
    h5 = seeded.get(Hospital, "HSP-AMD-005")
    assert h5.capabilities == {"cath_lab": False, "stroke_unit": False, "icu": False, "emergency": True}


def test_every_hospital_has_emergency_and_is_verified(seeded):
    assert all(h.cap_emergency and h.verified for h in seeded.query(Hospital))


def test_the_ambulances_belong_to_real_hospitals(seeded):
    ids = {h.id for h in seeded.query(Hospital)}
    ambulances = seeded.query(Ambulance).all()
    assert all(a.base_hospital_id in ids and a.status == "available" and a.crew_driver for a in ambulances)
    assert {a.id for a in ambulances} == {f"AMB-AMD-0{n}" for n in range(1, 6)}


def test_the_demo_patient_and_contacts(seeded):
    p = seeded.get(Patient, "PT-2026-0417")
    assert (p.name, p.age, p.sex, p.blood_group, p.language) == ("Rahul Mehta", 54, "M", "B+", "en")
    assert "Penicillin" in p.allergies and p.baseline["heart_rate"] == {"min": 60, "max": 85}
    contacts = seeded.query(Contact).order_by(Contact.position).all()
    assert [(c.id, c.relation, c.is_primary, c.position) for c in contacts] == [("C-1", "Mother", True, 1), ("C-2", "Friend", False, 2)]
    assert contacts[0].phone == "+91 00000 00001"


def test_the_demo_patient_shares_everything_through_the_ledger(seeded):
    assert current_consents(seeded, "PT-2026-0417") == {"location": True, "history": True, "vitals": True, "reports": True}
    rows = seeded.query(ConsentLedger).all()
    assert len(rows) == 4 and all(r.actor == "seed" and r.actor_role == "SYSTEM" for r in rows)


# ------------------------------------------------------------ the logins

@pytest.mark.parametrize("login, password", LOGINS)
def test_each_documented_login_works(seeded, login, password):
    assert verify_password(password, user(seeded, login).password_hash)


@pytest.mark.parametrize("login, password", LOGINS)
def test_a_wrong_password_never_works(seeded, login, password):
    assert not verify_password(password + "x", user(seeded, login).password_hash)
    others = {p for _, p in LOGINS} - {password}
    assert not any(verify_password(o, user(seeded, login).password_hash) for o in others)


def test_roles_and_scopes(seeded):
    for login in ("staff@demo", "staff@demo.test", "staff1"):
        u = user(seeded, login)
        assert (u.role, u.hospital_id) == ("HOSPITAL_STAFF", "HSP-AMD-002")
    for login in ("admin@demo", "admin@demo.test", "admin1"):
        assert user(seeded, login).role == "ADMIN"
    for login in ("patient@demo.test", "patient1"):
        u = user(seeded, login)
        assert (u.role, u.patient_id) == ("PATIENT", "PT-2026-0417")
    assert user(seeded, "family1").role == "FAMILY" and user(seeded, "responder1").role == "RESPONDER"


def test_ids_and_logins_are_unique_and_lowercase(seeded):
    users = seeded.query(User).all()
    assert len({u.id for u in users}) == len({u.login for u in users}) == 12
    assert all(u.login == u.login.lower() for u in users)


def test_the_login_is_matched_in_lowercase(seeded):
    assert user(seeded, "staff@demo").display_name == "Desk Staff (Demo)"
    assert all(a[1] == a[1].lower() for a in DEMO_ACCOUNTS)


# ------------------------------------------------------------ passwords and personal data are not readable

def test_no_demo_password_is_stored_anywhere_in_the_database(seeded):
    seeded.commit()
    found = []
    for table in inspect(seeded.get_bind()).get_table_names():
        for row in seeded.execute(text(f"SELECT * FROM {table}")).fetchall():
            blob = " ".join(str(v) for v in row)
            found += [(table, p) for _, p in LOGINS if p in blob]
    assert found == []


def test_the_stored_hashes_are_bcrypt(seeded):
    assert all(u.password_hash.startswith("$2b$") and len(u.password_hash) == 60 for u in seeded.query(User))


def test_the_patients_health_data_and_the_contact_phones_are_ciphertext(seeded):
    seeded.commit()
    conditions = seeded.execute(text("SELECT conditions FROM patients")).scalar_one()
    phones = [r[0] for r in seeded.execute(text("SELECT phone FROM contacts"))]
    assert "Hypertension" not in conditions and conditions.startswith("gAAAA")
    assert all("00000" not in p and p.startswith("gAAAA") for p in phones)


def test_demo_passwords_appear_in_exactly_one_source_file():
    holders = [f.name for f in APP_DIR.rglob("*.py") if any(f'"{p}"' in f.read_text(encoding="utf-8") for _, p in LOGINS)]
    assert holders == ["demo_data.py"]


# ------------------------------------------------------------ careful behaviour

def test_seeding_twice_changes_nothing(seeded):
    assert seed_demo(seeded) == {"already_seeded": True}
    assert (seeded.query(User).count(), seeded.query(Hospital).count(), seeded.query(ConsentLedger).count()) == (12, 5, 4)


def test_each_demo_password_is_hashed_once_per_process(monkeypatch, engine):
    monkeypatch.setenv("DEMO_MODE", "true")
    calls = []
    real = demo_data.hash_password
    monkeypatch.setattr(demo_data, "hash_password", lambda p: calls.append(p) or real(p))
    demo_data._hash_cache.clear()
    other = db_module.make_engine("sqlite://")
    db_module.init_db(other)
    with Session(engine) as a, Session(other) as b:
        seed_demo(a); seed_demo(b)
    assert sorted(calls) == ["demo-password", "demo123", "demo1234"]       # 3 hashes for 20 users, so a reset stays fast


def test_the_seed_data_files_are_valid_json_and_marked_fictional():
    for name in ("hospitals.json", "ambulances.json", "patient.json", "baseline.json"):
        json.loads((demo_data.DATA_DIR / name).read_text(encoding="utf-8"))
    assert "FICTIONAL" in (demo_data.DATA_DIR / "README.txt").read_text(encoding="utf-8")
    assert re.fullmatch(r"\+91 00000 \d{5}", json.loads((demo_data.DATA_DIR / "patient.json").read_text())["contacts"][0]["phone"])
