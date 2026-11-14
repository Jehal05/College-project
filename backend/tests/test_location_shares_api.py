"""Time-limited location sharing with linked relatives (POST /location-shares, DELETE /location-shares/{id})."""
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.orm import Session

from app.models.accounts import User
from app.models.apps import LocationShare
from app.models.audit import AuditLog
from app.models.patient_data import Patient
from app.security.actor import Actor
from app.security.passwords import hash_password
from app.services import audit as audit_service
from app.services import consent as consent_service

PID = "PT-2026-0417"
PATIENT = ("patient@demo.test", "demo1234")
STAFF = ("staff@demo.test", "demo1234")
ADMIN = ("admin@demo.test", "demo1234")
FAM = ("family@demo.test", "demo1234")
FAM1 = ("family1", "demo-password")
RESP = ("responder@demo.test", "demo1234")
WHERE = {"lat": 23.0225, "lng": 72.5714, "accuracy": 12, "source": "gps"}


def H(demo, who=PATIENT):
    return demo.headers(*who)


def share(demo, body=None, who=PATIENT):
    return demo.post("/location-shares", json={"minutes": 15, "location": WHERE} if body is None else body, headers=H(demo, who))


def family_view(demo, who=FAM):
    return demo.get("/family/patients", headers=H(demo, who)).json()[0]


def link(demo, who=FAM):
    assert demo.post("/family/link", json={"invite_code": "FAM-0417"}, headers=H(demo, who)).status_code == 200


def set_consent(engine, **flags):
    with Session(engine) as s:
        consent_service.update_consents(s, Actor("usr_001", "PATIENT", PID), PID, flags)
        s.commit()


def audit_rows(engine, action):
    with Session(engine) as s:
        return [audit_service.to_dict(r) for r in s.query(AuditLog).filter(AuditLog.action == action).order_by(AuditLog.id)]


def test_a_share_answers_201_with_an_id_and_an_expiry(demo):
    r = share(demo)
    assert r.status_code == 201 and set(r.json()) == {"id", "expires_at", "simulated", "minutes"}
    assert r.json()["id"].startswith("LS-") and r.json()["minutes"] == 15
    exp = datetime.strptime(r.json()["expires_at"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    assert timedelta(minutes=14) < exp - datetime.now(timezone.utc) <= timedelta(minutes=15, seconds=5)


@pytest.mark.parametrize("minutes", [15, 30, 60])
def test_the_three_lengths(demo, minutes):
    r = share(demo, {"minutes": minutes, "location": WHERE})
    exp = datetime.strptime(r.json()["expires_at"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    assert abs((exp - datetime.now(timezone.utc)).total_seconds() - minutes * 60) < 10


def test_the_default_is_30_and_lat_lng_may_be_at_the_top_level(demo):
    r = share(demo, {"lat": 23.0, "lng": 72.5})
    assert r.status_code == 201 and r.json()["minutes"] == 30


@pytest.mark.parametrize("body", [
    {"minutes": 10, "location": WHERE}, {"minutes": "15", "location": WHERE}, {"minutes": True, "location": WHERE},
    {"minutes": None, "location": WHERE}, {"minutes": 15}, {"minutes": 15, "location": "here"},
    {"minutes": 15, "location": {"lat": 200, "lng": 0}}, {"minutes": 15, "location": {"lat": 1}},
    {"minutes": 15, "location": {"lat": "a", "lng": 1}}, {"minutes": 15, "location": {"lat": 1, "lng": 1, "accuracy": -1}}])
def test_bad_shares_are_400(demo, body):
    r = share(demo, body)
    assert r.status_code == 400 and r.json()["error"] == r.json()["detail"]


def test_only_the_patient_shares(demo):
    for who in (STAFF, ADMIN, FAM, RESP):
        assert share(demo, who=who).status_code == 403
    assert demo.post("/location-shares", json={"minutes": 15, "location": WHERE}).status_code == 401


def test_a_patient_cannot_name_another_patient(demo):
    assert share(demo, {"minutes": 15, "location": WHERE, "patient_id": "PT-2026-0002"}).status_code == 403
    assert share(demo, {"minutes": 15, "location": WHERE, "patient_id": PID}).status_code == 201


def test_with_the_location_consent_off_nothing_is_shared_and_it_is_audited(demo, engine):
    set_consent(engine, location=False)
    r = share(demo)
    assert r.status_code == 403
    assert audit_rows(engine, "location.share")[-1]["reason"] == "consent_missing"
    with Session(engine) as s:
        assert s.query(LocationShare).count() == 0


def test_a_linked_relative_sees_the_live_share(demo):
    link(demo)
    assert "location_share" not in family_view(demo)
    sid = share(demo).json()
    seen = family_view(demo)["location_share"]
    assert seen == {"lat": 23.0225, "lng": 72.5714, "expires_at": sid["expires_at"]}


def test_an_unlinked_relative_sees_nothing(demo):
    share(demo)
    assert demo.get("/family/patients", headers=H(demo, FAM1)).json() == []
    assert "location_share" not in str(demo.get("/family/patients", headers=H(demo, FAM)).json())


def test_withdrawing_the_location_consent_hides_it_at_once_and_it_returns_with_the_consent(demo, engine):
    link(demo)
    share(demo)
    set_consent(engine, location=False)
    view = family_view(demo)
    assert "location_share" not in view and "location" not in view["shared_fields"]
    set_consent(engine, location=True)
    assert "location_share" in family_view(demo)


def test_an_expired_share_is_not_shown(demo, engine):
    link(demo)
    share(demo)
    with Session(engine) as s:
        s.query(LocationShare).update({"expires_at": datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(seconds=1)})
        s.commit()
    assert "location_share" not in family_view(demo)


def test_a_new_share_replaces_the_old_one(demo, engine):
    link(demo)
    share(demo, {"minutes": 15, "location": {"lat": 1.0, "lng": 2.0}})
    share(demo, {"minutes": 60, "location": {"lat": 3.0, "lng": 4.0}})
    assert family_view(demo)["location_share"]["lat"] == 3.0
    with Session(engine) as s:
        assert s.query(LocationShare).filter(LocationShare.revoked_at.is_(None)).count() == 1


def test_stopping_hides_it_and_stopping_twice_is_fine(demo):
    link(demo)
    sid = share(demo).json()["id"]
    assert demo.delete(f"/location-shares/{sid}", headers=H(demo)).json() == {"ok": True}
    assert demo.delete(f"/location-shares/{sid}", headers=H(demo)).json() == {"ok": True}
    assert "location_share" not in family_view(demo)


def test_nobody_else_can_stop_my_share_and_it_looks_like_an_unknown_id(demo, engine):
    sid = share(demo).json()["id"]
    with Session(engine) as s:
        s.add(Patient(id="PT-2026-0002", name="Other"))
        s.flush()
        s.add(User(id="usr_0002", login="other@demo.test", display_name="Other", password_hash=hash_password("pw-123456"),
                   role="PATIENT", patient_id="PT-2026-0002"))
        s.commit()
    other = ("other@demo.test", "pw-123456")
    mine = demo.delete(f"/location-shares/{sid}", headers=H(demo, other))
    assert mine.status_code == 404 and mine.json() == demo.delete("/location-shares/LS-NOPE", headers=H(demo, other)).json()
    for who in (STAFF, ADMIN, FAM):
        assert demo.delete(f"/location-shares/{sid}", headers=H(demo, who)).status_code == 403
    with Session(engine) as s:
        assert s.get(LocationShare, sid).revoked_at is None


def test_the_location_is_encrypted_and_never_in_the_audit_log(demo, engine):
    link(demo)
    share(demo)
    family_view(demo)
    with Session(engine) as s:
        raw = str(s.connection().exec_driver_sql("SELECT location FROM location_shares").scalar())
        assert "23.0225" not in raw and raw.startswith("gAAAA")
        assert "23.0225" not in " ".join(str(vars(r)) for r in s.query(AuditLog))
    assert "location" in audit_rows(engine, "family.view")[-1]["fields_released"]
    assert audit_rows(engine, "location.share")[-1]["fields_released"] == ["location"]


def test_a_reset_forgets_shares(demo, engine):
    share(demo)
    demo.post("/demo/reset", headers=H(demo))
    with Session(engine) as s:
        assert s.query(LocationShare).count() == 0
