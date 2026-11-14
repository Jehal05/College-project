"""Writing and reading the audit log (feature 50).

Safety by design: the writer accepts only fixed reason codes, plain
identifiers for names and tidy ids. Free text, tokens and patient values
cannot be stored, even by mistake.
"""
import json
import logging
import re
from datetime import datetime
from typing import Iterable, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.audit import AuditLog
from app.security.actor import Actor

log = logging.getLogger("healthtwin.audit")
OUTCOMES = ("allowed", "denied")

# Every reason that may appear in the log.
REASONS = frozenset({
    "missing_credentials", "expired_token", "tampered_token", "token_patient_mismatch",
    "forbidden_role", "patient_not_found", "emergency_not_found", "consent_missing", "revoked_token",
})

# fullmatch (not match with $) so a trailing newline can never slip through
_ACTION = re.compile(r"[a-z_]{1,30}\.[a-z_]{1,30}")
_NAME = re.compile(r"[a-z][a-z_]{0,30}")
_ID = re.compile(r"[A-Za-z0-9_\-]{1,64}")
INVALID_ID = "invalid_id"


def _safe_id(value: Optional[str]) -> Optional[str]:
    """Ids come from URLs, so they may be junk (or a pasted token). Never store junk."""
    if value is None:
        return None
    return value if _ID.fullmatch(value) else INVALID_ID


def who(actor: Optional[Actor], via_token: bool = False) -> Tuple[Optional[str], str]:
    if actor is not None:
        return actor.user_id, actor.role
    return (None, "TOKEN") if via_token else (None, "ANONYMOUS")


def record(
    session: Session,
    *,
    action: str,
    resource_type: str,
    resource_id: Optional[str],
    outcome: str,
    actor: Optional[Actor] = None,
    via_token: bool = False,
    patient_id: Optional[str] = None,
    reason: Optional[str] = None,
    fields_released: Iterable[str] = (),
) -> AuditLog:
    """Add one audit row and commit it, so a denied request is still recorded."""
    if outcome not in OUTCOMES:
        raise ValueError(f"outcome must be one of {OUTCOMES}")
    if not _ACTION.fullmatch(action):
        raise ValueError("action must look like 'passport.view'")
    if not _NAME.fullmatch(resource_type):
        raise ValueError("resource_type must be a plain lowercase name")
    if reason is not None and reason not in REASONS:
        raise ValueError("reason must be one of the fixed reason codes")
    names = sorted(set(fields_released))
    if not all(_NAME.fullmatch(n) for n in names):
        raise ValueError("fields_released must hold field NAMES only, never values")

    user_id, role = who(actor, via_token)
    row = AuditLog(
        user_id=_safe_id(user_id), role=role, action=action, resource_type=resource_type,
        resource_id=_safe_id(resource_id), patient_id=_safe_id(patient_id),
        outcome=outcome, reason=reason, fields_released=json.dumps(names),
    )
    session.add(row)
    session.commit()
    _tell_the_patient(row)
    return row


def _tell_the_patient(row: AuditLog) -> None:
    """Someone other than the patient touched their data: the patient's open screen hears it at once (no ids, no values)."""
    if row.role == "PATIENT" or not row.patient_id or row.patient_id == INVALID_ID:
        return
    try:
        from app.services import access_log, events
        if row.action not in access_log.WHAT:           # desk actions (acknowledge, notes ...) are not "looking at data"
            return
        events.publish("data.accessed", {"entry": access_log.entry_light(row)}, audience="patient:" + row.patient_id)
    except Exception:                                  # noqa: BLE001  telling the patient must never break the request
        log.exception("could not announce a data access")


def record_emergency_read(session: Session, *, emergency_id: str, outcome: str, actor: Optional[Actor] = None,
                          patient_id: Optional[str] = None, reason: Optional[str] = None,
                          fields_released: Iterable[str] = ()) -> AuditLog:
    """GET /emergencies/{id} calls this (the endpoint itself is built in Phase 2)."""
    return record(session, action="emergency.read", resource_type="emergency", resource_id=emergency_id,
                  outcome=outcome, actor=actor, patient_id=patient_id, reason=reason,
                  fields_released=fields_released)


def _iso(moment: datetime) -> str:
    return moment.strftime("%Y-%m-%dT%H:%M:%SZ")


def to_dict(row: AuditLog) -> dict:
    return {
        "id": row.id, "timestamp": _iso(row.timestamp), "user_id": row.user_id, "role": row.role,
        "action": row.action, "resource_type": row.resource_type, "resource_id": row.resource_id,
        "patient_id": row.patient_id, "outcome": row.outcome, "reason": row.reason,
        "fields_released": json.loads(row.fields_released),
    }


MAX_PAGE_SIZE = 200


def query_audit(
    session: Session,
    *,
    patient_id: Optional[str] = None,
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    page: int = 1,
    page_size: int = 50,
) -> Tuple[List[dict], int]:
    """Newest first. Times are naive UTC. Returns (rows, total matching)."""
    page = max(page, 1)
    page_size = min(max(page_size, 1), MAX_PAGE_SIZE)
    query = session.query(AuditLog)
    if patient_id is not None:
        query = query.filter(AuditLog.patient_id == patient_id)
    if user_id is not None:
        query = query.filter(AuditLog.user_id == user_id)
    if action is not None:
        query = query.filter(AuditLog.action == action)
    if start is not None:
        query = query.filter(AuditLog.timestamp >= start)
    if end is not None:
        query = query.filter(AuditLog.timestamp <= end)
    total = query.count()
    rows = query.order_by(AuditLog.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return [to_dict(r) for r in rows], total
