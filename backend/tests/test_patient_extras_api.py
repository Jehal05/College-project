"""Reports, reminders and preferences through the REAL login (J3)."""
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.audit import AuditLog
from app.models.extras import Reminder, ReminderLog
from app.models.patient_data import Patient, Report
from app.models.accounts import User
from app.security.passwords import hash_password

PID = "PT-2026-0417"
R = f"/patients/{PID}/reports"
M = f"/patients/{PID}/reminders"
PREF = f"/patients/{PID}/preferences"
PDF = b"%PDF-1.4 a small test report"
PNG = b"\x89PNG\r\n\x1a\n" + b"x" * 40
JPG = b"\xff\xd8\xff\xe0" + b"x" * 40
STAFF = ("staff@demo.test", "demo1234")
ADMIN = ("admin@demo.test", "demo1234")
FAMILY = ("family1", "demo-password")
RESPONDER = ("responder1", "demo-password")


def H(demo, who=None, ctype=None):
    h = demo.headers(*(who or ()))
    if ctype:
        h["Content-Type"] = ctype
    return h


def upload(demo, data=PDF, ctype="application/pdf", name="ecg.pdf", who=None, path=R):
    return demo.post(f"{path}?name={name}", content=data, headers=H(demo, who, ctype))


def second_patient(engine):
    with Session(engine) as s:
        s.add(Patient(id="PT-2026-0002", name="Other"))
        s.flush()
        s.add(User(id="usr_0002", login="other@demo.test", display_name="Other", password_hash=hash_password("pw-123456"),
                   role="PATIENT", patient_id="PT-2026-0002"))
        s.commit()
    return ("other@demo.test", "pw-123456")


def audit_rows(engine):
    with Session(engine) as s:
        return [(r.action, r.outcome, r.reason) for r in s.query(AuditLog).order_by(AuditLog.id)]


# ================================================================== reports

@pytest.mark.parametrize("data,ctype", [(PDF, "application/pdf"), (PNG, "image/png"), (JPG, "image/jpeg")])
def test_the_three_allowed_types_upload(demo, data, ctype):
    r = upload(demo, data, ctype)
    assert r.status_code == 201
    b = r.json()
    assert b["name"] == "ecg.pdf" and b["content_type"] == ctype and b["size"] == len(data) and b["id"]
    assert b["uploaded_at"].endswith("Z") and "content" not in b and "data" not in b


def test_the_list_never_holds_file_bytes_and_the_file_comes_back_byte_for_byte(demo):
    rid = upload(demo).json()["id"]
    listing = demo.get(R, headers=H(demo)).json()
    assert [x["id"] for x in listing] == [rid]
    assert all(set(x) == {"id", "name", "content_type", "size", "uploaded_at"} for x in listing)
    f = demo.get(f"{R}/{rid}/file", headers=H(demo))
    assert f.status_code == 200 and f.content == PDF and f.headers["content-type"].startswith("application/pdf")
    assert f.headers["x-content-type-options"] == "nosniff" and f.headers["cache-control"] == "no-store"


def test_a_wrong_type_is_415_before_the_body_matters(demo):
    for ctype in ("text/plain", "application/json", "application/octet-stream", "image/gif", ""):
        r = upload(demo, b"hello", ctype or "x/y")
        assert r.status_code == 415 and r.json()["error"] == r.json()["detail"]
    assert demo.get(R, headers=H(demo)).json() == []


def test_the_first_bytes_must_match_the_type(demo):
    assert upload(demo, b"hello world", "application/pdf").status_code == 400
    assert upload(demo, PNG, "application/pdf").status_code == 400
    assert upload(demo, PDF, "image/png").status_code == 400


def test_an_empty_file_is_400(demo):
    assert upload(demo, b"", "application/pdf").status_code == 400


def test_over_2mb_is_413_and_nothing_is_saved(demo):
    big = b"%PDF-" + b"x" * (2 * 1024 * 1024)
    r = upload(demo, big)
    assert r.status_code == 413
    assert upload(demo, b"%PDF-" + b"x" * (2 * 1024 * 1024 - 5)).status_code == 201       # exactly 2 MB is fine
    assert len(demo.get(R, headers=H(demo)).json()) == 1


def test_at_most_ten_reports(demo):
    for _ in range(10):
        assert upload(demo).status_code == 201
    r = upload(demo)
    assert r.status_code == 409 and "10" in r.json()["error"]


def test_the_name_is_cleaned(demo):
    assert upload(demo, name="../../etc/passwd").json()["name"] == "....etcpasswd"
    assert upload(demo, name="%3Cscript%3E.pdf").json()["name"] == "script.pdf"
    assert upload(demo, name="").json()["name"] == "report"
    assert upload(demo, name="!!!").json()["name"] == "report"
    assert len(upload(demo, name="a" * 200).json()["name"]) == 80
    r = demo.post(R, content=PDF, headers=H(demo, None, "application/pdf"))
    assert r.json()["name"] == "report"


def test_delete_then_gone(demo):
    rid = upload(demo).json()["id"]
    assert demo.delete(f"{R}/{rid}", headers=H(demo)).status_code == 204
    assert demo.delete(f"{R}/{rid}", headers=H(demo)).status_code == 404
    assert demo.get(f"{R}/{rid}/file", headers=H(demo)).status_code == 404
    assert demo.get(R, headers=H(demo)).json() == []


def test_the_contracts_own_upload_call_saves_to_the_callers_record(demo):
    r = upload(demo, path="/reports")
    assert r.status_code == 201
    assert [x["id"] for x in demo.get(R, headers=H(demo)).json()] == [r.json()["id"]]
    assert upload(demo, b"hi", "text/plain", path="/reports").status_code == 415


def test_stored_files_and_names_are_encrypted_at_rest(demo, engine):
    upload(demo, b"%PDF-1.4 hypertension penicillin", name="Secret-Name.pdf")
    with Session(engine) as s:
        raw_content = s.execute(text("SELECT content FROM reports")).scalar_one()
        raw_name = s.execute(text("SELECT file_name FROM reports")).scalar_one()
    assert b"hypertension" not in raw_content and "Secret-Name" not in raw_name


@pytest.mark.parametrize("who,status", [(None, 401), (STAFF, 403), (ADMIN, 403), (FAMILY, 403), (RESPONDER, 403)])
def test_only_the_owner_touches_reports(demo, who, status):
    rid = upload(demo).json()["id"]
    headers = H(demo, who) if who else {}
    assert demo.get(R, headers=headers).status_code == status
    assert demo.get(f"{R}/{rid}/file", headers=headers).status_code == status
    assert demo.delete(f"{R}/{rid}", headers=headers).status_code == status
    h = {**headers, "Content-Type": "application/pdf"}
    assert demo.post(R, content=PDF, headers=h).status_code == status
    assert demo.post("/reports", content=PDF, headers=h).status_code == status


def test_another_patient_cannot_read_or_change_my_reports(demo, engine):
    rid = upload(demo).json()["id"]
    other = second_patient(engine)
    assert demo.get(R, headers=H(demo, other)).status_code == 403
    assert demo.get(f"{R}/{rid}/file", headers=H(demo, other)).status_code == 403
    assert demo.delete(f"{R}/{rid}", headers=H(demo, other)).status_code == 403
    assert upload(demo, who=other).status_code == 403
    # and a report id from my record is not found in theirs
    theirs = f"/patients/PT-2026-0002/reports/{rid}/file"
    assert demo.get(theirs, headers=H(demo, other)).status_code == 404
    assert len(demo.get(R, headers=H(demo)).json()) == 1


def test_a_refused_upload_is_audited_and_the_contents_never_are(demo, engine):
    upload(demo, who=STAFF)
    assert ("report.write", "denied", "forbidden_role") in audit_rows(engine)
    assert upload(demo).status_code == 201
    with Session(engine) as s:
        assert "ecg" not in " ".join(str(vars(r)) for r in s.query(AuditLog))


def test_unknown_patient_and_unknown_report(demo):
    assert demo.get(f"{R}/NOPE/file", headers=H(demo)).status_code == 404


# ================================================================== reminders

GOOD = {"name": "Contract medicine", "dose_note": "as written by your doctor", "times": ["09:30"], "days": [1, 2, 3]}


def add(demo, body=None, who=None):
    return demo.post(M, json=GOOD if body is None else body, headers=H(demo, who))


def test_add_list_update_delete(demo):
    r = add(demo)
    assert r.status_code == 201
    b = r.json()
    assert set(b) == {"id", "name", "dose_note", "times", "days", "paused"} and b["paused"] is False
    assert demo.get(M, headers=H(demo)).json() == [b]
    up = demo.put(f"{M}/{b['id']}", json={**GOOD, "paused": True, "times": ["21:00", "08:00"], "days": [3, 1]}, headers=H(demo))
    assert up.status_code == 200 and up.json()["paused"] is True
    assert up.json()["times"] == ["08:00", "21:00"] and up.json()["days"] == [1, 3]            # sorted
    d = demo.delete(f"{M}/{b['id']}", headers=H(demo))
    assert d.status_code == 200 and d.json() == {"ok": True}
    assert demo.delete(f"{M}/{b['id']}", headers=H(demo)).status_code == 404
    assert demo.get(M, headers=H(demo)).json() == []


def test_the_dose_note_is_optional(demo):
    body = {k: v for k, v in GOOD.items() if k != "dose_note"}
    assert add(demo, body).json()["dose_note"] == ""
    assert add(demo, {**body, "dose_note": None}).json()["dose_note"] == ""


@pytest.mark.parametrize("patch", [
    {"name": ""}, {"name": "   "}, {"name": "x" * 61}, {"name": 5}, {"name": None},
    {"dose_note": "x" * 61}, {"dose_note": 5},
    {"times": []}, {"times": ["25:99"]}, {"times": ["9:30"]}, {"times": ["09:30", "09:30"]}, {"times": "09:30"},
    {"times": ["00:00", "01:00", "02:00", "03:00", "04:00"]}, {"times": [930]},
    {"days": []}, {"days": [7]}, {"days": [-1]}, {"days": [1, 1]}, {"days": [True]}, {"days": ["1"]}, {"days": 1},
    {"paused": "yes"}, {"paused": 1},
])
def test_bad_reminders_are_400(demo, patch):
    r = add(demo, {**GOOD, **patch})
    assert r.status_code == 400 and r.json()["error"] == r.json()["detail"]
    assert demo.get(M, headers=H(demo)).json() == []


def test_missing_fields_are_400(demo):
    assert add(demo, {}).status_code == 400
    assert add(demo, {"name": "x"}).status_code == 400
    assert add(demo, {k: v for k, v in GOOD.items() if k != "times"}).status_code == 400


def test_an_error_never_echoes_the_medicine_name(demo):
    r = add(demo, {**GOOD, "name": "SecretMedicine" * 10})
    assert r.status_code == 400 and "SecretMedicine" not in r.text


def test_at_most_eight_reminders(demo):
    for i in range(8):
        assert add(demo, {**GOOD, "name": f"M{i}"}).status_code == 201
    r = add(demo)
    assert r.status_code == 409 and "8" in r.json()["error"]


def test_update_of_an_unknown_reminder_is_404_and_a_bad_body_changes_nothing(demo):
    assert demo.put(f"{M}/NOPE", json=GOOD, headers=H(demo)).status_code == 404
    rid = add(demo).json()["id"]
    assert demo.put(f"{M}/{rid}", json={**GOOD, "name": ""}, headers=H(demo)).status_code == 400
    assert demo.get(M, headers=H(demo)).json()[0]["name"] == "Contract medicine"


def test_reminders_are_listed_in_the_order_they_were_made(demo):
    ids = [add(demo, {**GOOD, "name": f"M{i}"}).json()["id"] for i in range(3)]
    assert [x["id"] for x in demo.get(M, headers=H(demo)).json()] == ids


def test_names_and_notes_are_encrypted_at_rest(demo, engine):
    add(demo, {**GOOD, "name": "Lisinopril-XYZ", "dose_note": "morning with food"})
    with Session(engine) as s:
        row = s.execute(text("SELECT name, dose_note, times FROM reminders")).one()
    assert "Lisinopril" not in row[0] and "morning" not in row[1] and "09:30" not in row[2]


SLOT = "2026-11-14T09:30:00Z"


def shown(demo, rid, slot=SLOT, who=None):
    return demo.post(f"{M}/{rid}/shown", json={"scheduled_for": slot}, headers=H(demo, who))


def taken(demo, rid, slot=SLOT, at=None, who=None):
    return demo.post(f"{M}/{rid}/taken", json={"scheduled_for": slot, "at": at or slot}, headers=H(demo, who))


def test_shown_then_taken_is_one_row(demo, engine):
    rid = add(demo).json()["id"]
    s = shown(demo, rid)
    assert s.status_code == 201 and s.json() == {"reminder_id": rid, "scheduled_for": SLOT, "taken_at": None}
    assert shown(demo, rid).status_code == 201                                   # again: the same slot
    t = taken(demo, rid, at="2026-11-14T09:41:00+00:00")
    assert t.status_code == 200 and t.json()["taken_at"] == "2026-11-14T09:41:00Z" and t.json()["scheduled_for"] == SLOT
    with Session(engine) as ses:
        assert ses.query(ReminderLog).count() == 1


def test_taken_without_shown_still_logs_the_slot(demo):
    rid = add(demo).json()["id"]
    assert taken(demo, rid).status_code == 200


def test_offsets_and_milliseconds_are_normalised_to_utc_seconds(demo):
    rid = add(demo).json()["id"]
    r = shown(demo, rid, "2026-11-14T15:00:00.789+05:30")
    assert r.json()["scheduled_for"] == "2026-11-14T09:30:00Z"
    assert len(demo.get(f"{M}/log", headers=H(demo)).json()) in (0, 1)


@pytest.mark.parametrize("body", [{}, {"at": SLOT}, {"scheduled_for": "yesterday"}, {"scheduled_for": 5}, {"scheduled_for": ""},
                                  {"scheduled_for": None}])
def test_shown_and_taken_need_a_real_slot(demo, body):
    rid = add(demo).json()["id"]
    assert demo.post(f"{M}/{rid}/shown", json=body, headers=H(demo)).status_code == 400
    assert demo.post(f"{M}/{rid}/taken", json={**body, "at": SLOT}, headers=H(demo)).status_code == 400


def test_taken_needs_a_real_time(demo):
    rid = add(demo).json()["id"]
    assert demo.post(f"{M}/{rid}/taken", json={"scheduled_for": SLOT}, headers=H(demo)).status_code == 400
    assert demo.post(f"{M}/{rid}/taken", json={"scheduled_for": SLOT, "at": "soon"}, headers=H(demo)).status_code == 400


def test_logging_an_unknown_reminder_is_404(demo):
    assert shown(demo, "NOPE").status_code == 404 and taken(demo, "NOPE").status_code == 404


def test_the_log_is_the_last_seven_days_newest_first_and_goes_when_the_reminder_goes(demo):
    rid = add(demo).json()["id"]
    now = datetime.now(timezone.utc)
    fmt = lambda d: d.strftime("%Y-%m-%dT%H:%M:%SZ")  # noqa: E731
    old, mid, new = now - timedelta(days=9), now - timedelta(days=3), now - timedelta(hours=1)
    for slot in (new, old, mid):
        shown(demo, rid, fmt(slot))
    taken(demo, rid, fmt(mid), fmt(mid))
    log = demo.get(f"{M}/log", headers=H(demo)).json()
    assert [e["scheduled_for"] for e in log] == [fmt(new.replace(microsecond=0)), fmt(mid.replace(microsecond=0))]
    assert log[0]["taken_at"] is None and log[1]["taken_at"] is not None
    demo.delete(f"{M}/{rid}", headers=H(demo))
    assert demo.get(f"{M}/log", headers=H(demo)).json() == []


def test_the_log_says_nothing_about_doses_or_advice(demo):
    rid = add(demo).json()["id"]
    shown(demo, rid, datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))
    text_ = demo.get(f"{M}/log", headers=H(demo)).text.lower()
    for word in ("missed", "should", "take ", "advice", "dose"):
        assert word not in text_


@pytest.mark.parametrize("who,status", [(None, 401), (STAFF, 403), (ADMIN, 403), (FAMILY, 403), (RESPONDER, 403)])
def test_only_the_owner_touches_reminders(demo, who, status):
    rid = add(demo).json()["id"]
    h = H(demo, who) if who else {}
    assert demo.get(M, headers=h).status_code == status
    assert demo.get(f"{M}/log", headers=h).status_code == status
    assert demo.post(M, json=GOOD, headers=h).status_code == status
    assert demo.put(f"{M}/{rid}", json=GOOD, headers=h).status_code == status
    assert demo.delete(f"{M}/{rid}", headers=h).status_code == status
    assert demo.post(f"{M}/{rid}/shown", json={"scheduled_for": SLOT}, headers=h).status_code == status
    assert demo.post(f"{M}/{rid}/taken", json={"scheduled_for": SLOT, "at": SLOT}, headers=h).status_code == status


def test_another_patient_cannot_see_or_change_my_reminders(demo, engine):
    rid = add(demo).json()["id"]
    other = second_patient(engine)
    assert demo.get(M, headers=H(demo, other)).status_code == 403
    assert demo.delete(f"{M}/{rid}", headers=H(demo, other)).status_code == 403
    mine_in_theirs = f"/patients/PT-2026-0002/reminders/{rid}"
    assert demo.delete(mine_in_theirs, headers=H(demo, other)).status_code == 404       # not in their record
    assert demo.put(mine_in_theirs, json=GOOD, headers=H(demo, other)).status_code == 404
    assert demo.post(mine_in_theirs + "/shown", json={"scheduled_for": SLOT}, headers=H(demo, other)).status_code == 404
    assert len(demo.get(M, headers=H(demo)).json()) == 1


def test_no_medicine_name_ever_reaches_the_audit_log(demo, engine):
    add(demo, {**GOOD, "name": "Lisinopril-XYZ"})
    add(demo, who=STAFF)
    with Session(engine) as s:
        assert "Lisinopril" not in " ".join(str(vars(r)) for r in s.query(AuditLog))


# ================================================================== preferences

def test_preferences_default_to_off_and_15(demo):
    assert demo.get(PREF, headers=H(demo)).json() == {"safety_checkin": {"enabled": False, "minutes": 15}}


def test_preferences_are_saved_and_read_back(demo):
    for minutes in (5, 15, 30):
        r = demo.put(PREF, json={"safety_checkin": {"enabled": True, "minutes": minutes}}, headers=H(demo))
        assert r.status_code == 200 and r.json() == {"safety_checkin": {"enabled": True, "minutes": minutes}}
    assert demo.get(PREF, headers=H(demo)).json()["safety_checkin"] == {"enabled": True, "minutes": 30}
    demo.put(PREF, json={"safety_checkin": {"enabled": False, "minutes": 5}}, headers=H(demo))
    assert demo.get(PREF, headers=H(demo)).json()["safety_checkin"] == {"enabled": False, "minutes": 5}


@pytest.mark.parametrize("body", [{}, {"safety_checkin": None}, {"safety_checkin": {}},
                                  {"safety_checkin": {"enabled": "yes", "minutes": 7}},
                                  {"safety_checkin": {"enabled": True, "minutes": 7}},
                                  {"safety_checkin": {"enabled": True, "minutes": "15"}},
                                  {"safety_checkin": {"enabled": True, "minutes": 15.0}},
                                  {"safety_checkin": {"enabled": True, "minutes": True}},
                                  {"safety_checkin": {"enabled": 1, "minutes": 15}},
                                  {"safety_checkin": {"minutes": 15}}, {"safety_checkin": "on"}])
def test_bad_preferences_are_400_and_change_nothing(demo, body):
    demo.put(PREF, json={"safety_checkin": {"enabled": True, "minutes": 30}}, headers=H(demo))
    assert demo.put(PREF, json=body, headers=H(demo)).status_code == 400
    assert demo.get(PREF, headers=H(demo)).json()["safety_checkin"] == {"enabled": True, "minutes": 30}


@pytest.mark.parametrize("who,status", [(None, 401), (STAFF, 403), (ADMIN, 403), (FAMILY, 403), (RESPONDER, 403)])
def test_only_the_owner_touches_preferences(demo, who, status):
    h = H(demo, who) if who else {}
    assert demo.get(PREF, headers=h).status_code == status
    assert demo.put(PREF, json={"safety_checkin": {"enabled": True, "minutes": 5}}, headers=h).status_code == status


def test_preferences_are_per_patient(demo, engine):
    other = second_patient(engine)
    demo.put(PREF, json={"safety_checkin": {"enabled": True, "minutes": 5}}, headers=H(demo))
    assert demo.get("/patients/PT-2026-0002/preferences", headers=H(demo, other)).json() == {
        "safety_checkin": {"enabled": False, "minutes": 15}}
    assert demo.get("/patients/PT-2026-0002/preferences", headers=H(demo)).status_code == 403


def test_a_reset_clears_reports_reminders_and_preferences(demo, engine):
    upload(demo)
    rid = add(demo).json()["id"]
    shown(demo, rid)
    demo.put(PREF, json={"safety_checkin": {"enabled": True, "minutes": 5}}, headers=H(demo))
    assert demo.post("/demo/reset", headers=H(demo)).status_code == 200
    assert demo.get(R, headers=H(demo)).json() == [] and demo.get(M, headers=H(demo)).json() == []
    assert demo.get(PREF, headers=H(demo)).json()["safety_checkin"] == {"enabled": False, "minutes": 15}
    with Session(engine) as s:
        assert s.query(Report).count() == s.query(Reminder).count() == s.query(ReminderLog).count() == 0
