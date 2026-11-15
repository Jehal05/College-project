"""Stored lab values (Phase 3): save what the patient confirmed, list it, delete it.

Rules
- Only values the patient sends are stored, always as status "confirmed_by_patient". Nothing from /reports/extract is saved
  by that route; the app saves after the person has checked each value.
- The unit must be the app unit for the test (see report_text.APP_UNIT), so one test always has one unit.
- Errors name FIELDS and positions only, never the values sent.
"""
import re
from datetime import date, datetime, timedelta, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.patient_data import LabValue, Report
from app.services.report_text import APP_UNIT, TESTS

MAX_PER_REQUEST = 20
MAX_PER_PATIENT = 1000
MAX_VALUE = 1_000_000.0
_REPORT_ID = re.compile(r"[A-Za-z0-9_\-]{1,64}")


class LabError(ValueError):
    """The values cannot be saved (the route answers 400). The message never repeats a value."""


def audit_name(test: str) -> str:
    """The audit log accepts letters and underscores only, so 'hba1c' is written as 'hba_c'."""
    return test.replace("1", "_")


def stamp(moment: Optional[datetime]) -> Optional[str]:
    return moment.strftime("%Y-%m-%dT%H:%M:%SZ") if moment else None


def range_of(row: LabValue) -> Optional[dict]:
    if row.ref_low is None and row.ref_high is None:
        return None
    return {"low": row.ref_low, "high": row.ref_high}


def info(row: LabValue) -> dict:
    return {"id": row.id, "test": row.test, "value": row.value, "unit": row.unit, "reference_range": range_of(row),
            "taken_on": row.taken_on.isoformat(), "status": row.status, "source": row.source,
            "report_id": row.report_id, "created_at": stamp(row.created_at)}


def check_test(test: str) -> None:
    if test not in TESTS:
        raise LabError("test is not one of: " + ", ".join(TESTS))


def _check_one(position: int, item, today: date) -> None:
    where = f"values[{position}]"
    if item.test not in TESTS:
        raise LabError(f"{where}.test is not one of: " + ", ".join(TESTS))
    if item.unit != APP_UNIT[item.test]:
        raise LabError(f"{where}.unit must be the app unit for this test")
    if not 0 < item.value <= MAX_VALUE:
        raise LabError(f"{where}.value is outside the accepted range")
    rng = item.reference_range
    if rng is not None:
        bounds = [b for b in (rng.low, rng.high) if b is not None]
        if not bounds:
            raise LabError(f"{where}.reference_range needs a low or a high")
        if any(not 0 <= b <= MAX_VALUE for b in bounds):
            raise LabError(f"{where}.reference_range is outside the accepted range")
        if rng.low is not None and rng.high is not None and rng.low > rng.high:
            raise LabError(f"{where}.reference_range low is above high")
    if item.taken_on > today + timedelta(days=1) or item.taken_on < date(1900, 1, 1):
        raise LabError(f"{where}.taken_on is not a plausible date")
    if item.report_id is not None and not _REPORT_ID.fullmatch(item.report_id):
        raise LabError(f"{where}.report_id is not valid")


def add_values(db: Session, patient_id: str, items: list) -> List[LabValue]:
    """Validates every item first and saves all or none."""
    today = datetime.now(timezone.utc).date()
    for position, item in enumerate(items):
        _check_one(position, item, today)
    if db.query(LabValue).filter(LabValue.patient_id == patient_id).count() + len(items) > MAX_PER_PATIENT:
        raise LabError("the limit of stored lab values has been reached; delete some first")
    owned = {r.id for r in db.query(Report.id).filter(Report.patient_id == patient_id).all()}
    rows = []
    for position, item in enumerate(items):
        if item.report_id is not None and item.report_id not in owned:
            raise LabError(f"values[{position}].report_id is not one of your reports")
        rng = item.reference_range
        rows.append(LabValue(patient_id=patient_id, test=item.test, value=float(item.value), unit=item.unit,
                             ref_low=None if rng is None else rng.low, ref_high=None if rng is None else rng.high,
                             taken_on=item.taken_on, status="confirmed_by_patient", source=item.source,
                             report_id=item.report_id))
    db.add_all(rows)
    db.commit()
    return rows


def list_values(db: Session, patient_id: str, test: Optional[str] = None, limit: Optional[int] = None) -> List[LabValue]:
    """Newest first: by the date the test was taken, then by when it was saved."""
    query = db.query(LabValue).filter(LabValue.patient_id == patient_id)
    if test is not None:
        query = query.filter(LabValue.test == test)
    query = query.order_by(LabValue.taken_on.desc(), LabValue.created_at.desc(), LabValue.id.desc())
    return query.limit(limit).all() if limit else query.all()


def find(db: Session, patient_id: str, lab_id: str) -> Optional[LabValue]:
    return db.query(LabValue).filter(LabValue.patient_id == patient_id, LabValue.id == lab_id).first()
