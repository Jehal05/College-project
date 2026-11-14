"""The patient's QR passport link (J3): create, show again, revoke, open log.

The link is a signed token (see security/passport_token.py). The database keeps only its SHA-256 hash for lookups,
plus an ENCRYPTED copy so the patient's screen can show the same QR after a reload. Only one link is live at a
time: making a new one revokes the old one. A revoked or expired link answers 410, never data.
"""
import hashlib
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.emergencies import EmergencyPassport
from app.models.extras import PassportOpen, PassportSecret
from app.models.idgen import new_id
from app.security.passport_token import create_passport_token

HOURS = (1, 24, 168)                      # one hour, one day or seven days


class PassportLinkError(ValueError):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)         # the columns hold naive UTC


def _iso(moment: datetime) -> str:
    return moment.strftime("%Y-%m-%dT%H:%M:%SZ")


def clean_hours(body) -> int:
    hours = body.get("hours", 24) if isinstance(body, dict) else None
    if isinstance(hours, bool) or not isinstance(hours, int) or hours not in HOURS:
        raise PassportLinkError("hours must be 1, 24 or 168")
    return hours


def lookup(session: Session, token: str) -> Optional[EmergencyPassport]:
    return session.query(EmergencyPassport).filter(EmergencyPassport.token_hash == token_hash(token)).first()


def is_revoked(row: EmergencyPassport) -> bool:
    return row.revoked_at is not None


def is_expired(row: EmergencyPassport) -> bool:
    return row.expires_at <= _now()


def is_live(row: Optional[EmergencyPassport]) -> bool:
    return row is not None and not is_revoked(row) and not is_expired(row)


def latest(session: Session, patient_id: str) -> Optional[EmergencyPassport]:
    return (session.query(EmergencyPassport).filter(EmergencyPassport.patient_id == patient_id)
            .order_by(EmergencyPassport.created_at.desc(), EmergencyPassport.id.desc()).first())


def revoke_current(session: Session, patient_id: str) -> None:
    """Revoke every live link of this patient and delete the encrypted copies. The hash stays, so the old
    address answers 410 (gone) and not 404."""
    now = _now()
    for row in session.query(EmergencyPassport).filter(EmergencyPassport.patient_id == patient_id,
                                                       EmergencyPassport.revoked_at.is_(None)):
        row.revoked_at = now
        session.query(PassportSecret).filter(PassportSecret.passport_id == row.id).delete()
    session.flush()


def create(session: Session, patient_id: str, hours: int) -> Tuple[str, EmergencyPassport]:
    revoke_current(session, patient_id)
    now = _now()
    token = create_passport_token(patient_id, minutes=hours * 60)
    row = EmergencyPassport(id=new_id("PP"), patient_id=patient_id, token_hash=token_hash(token), created_at=now,
                            expires_at=now + timedelta(hours=hours))
    session.add(row)
    session.flush()
    session.add(PassportSecret(passport_id=row.id, token=token))
    session.flush()
    return token, row


def current(session: Session, patient_id: str) -> Optional[Tuple[str, EmergencyPassport]]:
    """The live link and its token, or None."""
    row = latest(session, patient_id)
    if not is_live(row):
        return None
    secret = session.get(PassportSecret, row.id)
    return (secret.token, row) if secret else None


def expires_iso(row: EmergencyPassport) -> str:
    return _iso(row.expires_at)


def record_open(session: Session, row: EmergencyPassport) -> datetime:
    opened = _now()
    session.add(PassportOpen(passport_id=row.id, opened_at=opened))
    session.flush()
    return opened


def open_log(session: Session, patient_id: str) -> List[dict]:
    """When the current (or latest) link was opened, oldest first. Only times: no IP address, no device."""
    row = latest(session, patient_id)
    if row is None:
        return []
    opens = (session.query(PassportOpen).filter(PassportOpen.passport_id == row.id)
             .order_by(PassportOpen.opened_at, PassportOpen.id).all())
    return [{"opened_at": _iso(o.opened_at)} for o in opens]
