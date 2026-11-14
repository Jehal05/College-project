"""GET /audit (feature 50). ADMIN only. For Shagun's audit viewer (feature 76)."""
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_actor
from app.db import get_db
from app.security.actor import Actor
from app.services import audit

router = APIRouter(tags=["audit"])


def _parse_time(value: Optional[str], name: str) -> Optional[datetime]:
    """Accepts 2026-11-16T10:00:00Z or with an offset. Returns naive UTC."""
    if value is None:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail=f"'{name}' must be an ISO 8601 time, e.g. 2026-11-16T10:00:00Z") from None
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed


@router.get("/audit")
def read_audit(
    patient_id: Optional[str] = None,
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    start: Optional[str] = Query(None, alias="from"),
    end: Optional[str] = Query(None, alias="to"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=audit.MAX_PAGE_SIZE),
    actor: Actor = Depends(get_current_actor),
    db: Session = Depends(get_db),
) -> dict:
    if actor.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only an admin can read the audit log")
    items, total = audit.query_audit(
        db, patient_id=patient_id, user_id=user_id, action=action,
        start=_parse_time(start, "from"), end=_parse_time(end, "to"), page=page, page_size=page_size,
    )
    # `rows` is the same list in the names the portal and the mock use (at, user, fields). `items` stays for the contract.
    rows = [{**i, "at": i["timestamp"], "user": i["user_id"], "fields": i["fields_released"]} for i in items]
    return {"items": items, "rows": rows, "page": page, "page_size": page_size, "total": total, "simulated": True}
