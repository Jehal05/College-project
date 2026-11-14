"""The database must hold ciphertext for sensitive fields (feature 51)."""
import pytest
from cryptography.fernet import Fernet
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.patient_data import Contact, Patient, Report
from app.security import crypto
from app.security.crypto import DecryptionError


def raw(session, sql):
    return session.execute(text(sql)).fetchall()


def test_patient_fields_round_trip(patients):
    p = patients.get(Patient, "pat_001")
    assert p.conditions == ["hypertension"]
    assert p.allergies == ["penicillin"]
    assert p.medications == ["amlodipine"]


def test_raw_select_shows_ciphertext_for_patient_fields(patients):
    row = raw(patients, "SELECT conditions, allergies, medications FROM patients WHERE id='pat_001'")[0]
    for value, plain in zip(row, ("hypertension", "penicillin", "amlodipine")):
        assert plain not in value
        assert value.startswith("gAAAA")


def test_contact_phone_is_ciphertext_in_the_database(patients):
    patients.add(Contact(patient_id="pat_001", name="Demo Relative", phone="+91-9876543210", position=1))
    patients.commit()
    stored = raw(patients, "SELECT phone FROM contacts")[0][0]
    assert "9876543210" not in stored and stored.startswith("gAAAA")
    assert patients.query(Contact).one().phone == "+91-9876543210"


def test_report_file_name_is_ciphertext_in_the_database(patients):
    patients.add(Report(id="rep_001", patient_id="pat_001", file_name="ECG_Demo_Patient.pdf"))
    patients.commit()
    stored = raw(patients, "SELECT file_name FROM reports")[0][0]
    assert "ECG" not in stored
    assert patients.get(Report, "rep_001").file_name == "ECG_Demo_Patient.pdf"


def test_empty_list_and_none_are_handled(patients):
    patients.add(Patient(id="pat_003", name="No Data", conditions=[], allergies=None))
    patients.commit()
    p = patients.get(Patient, "pat_003")
    assert p.conditions == [] and p.allergies is None
    assert raw(patients, "SELECT allergies FROM patients WHERE id='pat_003'")[0][0] is None


def test_name_and_age_are_not_encrypted(patients):
    assert raw(patients, "SELECT name, age FROM patients WHERE id='pat_001'")[0] == ("Demo Patient", 58)


def test_reading_with_the_wrong_key_fails(patients, engine, monkeypatch):
    monkeypatch.setenv("FERNET_KEY", Fernet.generate_key().decode())
    crypto.reset_cipher()
    with Session(engine) as fresh:
        with pytest.raises(DecryptionError):
            fresh.get(Patient, "pat_001").conditions


def test_old_key_still_reads_after_rotation(patients, engine, monkeypatch):
    old_key = __import__("os").environ["FERNET_KEY"]
    monkeypatch.setenv("FERNET_KEY", Fernet.generate_key().decode())
    monkeypatch.setenv("FERNET_OLD_KEYS", old_key)
    crypto.reset_cipher()
    with Session(engine) as fresh:
        assert fresh.get(Patient, "pat_001").conditions == ["hypertension"]
