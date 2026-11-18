"""POST /reports/extract (Phase 3): proposes values from a text PDF and saves NOTHING.

The tests that read a real PDF need the optional `pypdf` package and are skipped where it is not installed.
"""
import sys

import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.audit import AuditLog
from tests.pdf_text_helper import make_pdf

PATIENT = ("patient@demo.test", "demo1234")
STAFF = ("staff@demo.test", "demo1234")
ADMIN = ("admin@demo.test", "demo1234")
LINES = ["CITY LAB   Page 1 of 1", "HbA1c   6.4 %   4.0 - 5.6", "Glucose, Fasting   5.1 mmol/L   3.9 - 5.5",
         "ALT (SGPT)   52 U/L   < 41", "HDL Cholesterol   45 mg/dL"]
JPG = b"\xff\xd8\xff\xe0" + b"0" * 64
PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 64


def extract(demo, data, ctype="application/pdf", who=PATIENT):
    return demo.post("/reports/extract", content=data, headers={**demo.headers(*who), "Content-Type": ctype})


def count(engine, table):
    with engine.connect() as conn:
        return conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()


# ------------------------------------------------------------------------------------------- refusals (no PDF reader needed)
def test_a_text_file_is_415(demo):
    r = extract(demo, b"HbA1c 6.4 %", "text/plain")
    assert r.status_code == 415 and r.json()["error"] == r.json()["detail"]


@pytest.mark.parametrize("data,ctype", [(JPG, "image/jpeg"), (PNG, "image/png")])
def test_a_scanned_image_is_400_and_says_ocr(demo, data, ctype):
    r = extract(demo, data, ctype)
    assert r.status_code == 400 and "OCR" in r.json()["error"]


def test_a_file_over_2_mb_is_413(demo):
    assert extract(demo, b"%PDF-" + b"0" * (2 * 1024 * 1024 + 10)).status_code == 413


def test_an_empty_body_and_a_fake_pdf_are_400(demo):
    assert extract(demo, b"").status_code == 400
    assert extract(demo, b"this is not a pdf").status_code == 400


@pytest.mark.parametrize("who", [STAFF, ADMIN])
def test_staff_and_admin_are_403_and_audited(demo, engine, who):
    assert extract(demo, make_pdf(LINES), who=who).status_code == 403
    with Session(engine) as s:
        row = s.query(AuditLog).filter(AuditLog.action == "report.extract", AuditLog.outcome == "denied").first()
    assert row is not None and row.reason == "forbidden_role"
    assert row.resource_id == "none"        # unchanged by the single-check cleanup: no patient id is revealed or guessed


def test_a_refusal_comes_before_the_type_check(demo):
    assert extract(demo, b"x", "text/plain", STAFF).status_code == 403


def test_no_login_is_401(demo):
    assert demo.post("/reports/extract", content=make_pdf(LINES), headers={"Content-Type": "application/pdf"}).status_code == 401


def test_without_pypdf_the_answer_is_503_and_nothing_else_breaks(demo, monkeypatch):
    monkeypatch.setitem(sys.modules, "pypdf", None)                 # makes `import pypdf` raise ImportError
    r = extract(demo, make_pdf(LINES))
    assert r.status_code == 503 and "not installed" in r.json()["error"]
    assert demo.get("/health").status_code == 200


# ------------------------------------------------------------------------------------------- reading a real PDF
@pytest.fixture
def pypdf():
    return pytest.importorskip("pypdf")


def test_a_text_pdf_gives_proposed_values(demo, pypdf):
    r = extract(demo, make_pdf(LINES))
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "proposed" and body["notice"] and "Nothing has been saved" in body["notice"]
    by_test = {v["test"]: v for v in body["values"]}
    assert set(by_test) == {"hba1c", "fasting_glucose", "alt"}
    assert by_test["hba1c"]["value"] == 6.4 and by_test["hba1c"]["flag"] == "high"
    assert by_test["fasting_glucose"]["value"] == pytest.approx(91.88, abs=0.01) and by_test["fasting_glucose"]["unit"] == "mg/dL"
    assert by_test["alt"]["reference_range"] == {"low": None, "high": 41.0} and by_test["alt"]["flag"] == "high"
    assert [u["raw_text"] for u in body["unreadable"]] == ["HDL Cholesterol 45 mg/dL"]


def test_nothing_is_saved_by_extracting(demo, engine, pypdf):
    before = (count(engine, "lab_values"), count(engine, "reports"))
    assert extract(demo, make_pdf(LINES)).status_code == 200
    assert (count(engine, "lab_values"), count(engine, "reports")) == before


def test_a_pdf_with_no_text_layer_is_400_and_says_ocr(demo, pypdf):
    r = extract(demo, make_pdf([]))
    assert r.status_code == 400 and "OCR" in r.json()["error"]


def test_a_damaged_pdf_is_400(demo, pypdf):
    r = extract(demo, b"%PDF-1.4\n1 0 obj\n<< garbage")
    assert r.status_code == 400


def test_a_successful_extract_is_audited_with_names_only(demo, engine, pypdf):
    assert extract(demo, make_pdf(LINES)).status_code == 200
    with Session(engine) as s:
        row = s.query(AuditLog).filter(AuditLog.action == "report.extract", AuditLog.outcome == "allowed").one()
        released = row.fields_released
    assert "hba_c" in released and "alt" in released and "6.4" not in released


def test_proposed_values_can_be_saved_only_through_the_lab_values_route(demo, pypdf):
    proposed = extract(demo, make_pdf(LINES)).json()["values"]
    body = [{"test": v["test"], "value": v["value"], "unit": v["unit"], "reference_range": v["reference_range"],
             "taken_on": "2026-11-01", "source": "report_extracted"} for v in proposed]
    r = demo.post("/patients/PT-2026-0417/lab-values", json={"values": body}, headers=demo.headers(*PATIENT))
    assert r.status_code == 201 and len(r.json()["values"]) == 3
