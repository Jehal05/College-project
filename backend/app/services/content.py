"""Medical text with an approval step (J4). A changed text is not shown to the apps until an admin approves it."""
import re
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.models.apps import ContentItem

_TYPE = re.compile(r"[a-z][a-z_]{0,39}")
MAX_ITEMS, MAX_ITEM_LENGTH = 50, 500

SEED = {
    "emergency_numbers": (True, "seed", ["Ambulance: 108", "Emergency: 112"]),
    "first_aid_basics": (False, None, ["Sample text. A doctor has not reviewed this yet, so apps do not show it."]),
}


class ContentError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status


def valid_type(name: str) -> bool:
    return bool(_TYPE.fullmatch(name))


def seed_content(session: Session) -> int:
    for name, (approved, by, items) in SEED.items():
        session.add(ContentItem(type=name, version=1, approved=approved, approved_by=by, items=list(items)))
    return len(SEED)


def view(item: ContentItem) -> dict:
    return {"type": item.type, "version": item.version, "approved": bool(item.approved),
            "approved_by": item.approved_by, "items": list(item.items), "simulated": True}


def read(session: Session, name: str, is_admin: bool) -> dict:
    item = session.get(ContentItem, name) if valid_type(name) else None
    if item is None or (not item.approved and not is_admin):          # apps only ever see approved text
        raise ContentError(404, "Content not found")
    return view(item)


def clean_put(body) -> Dict[str, Any]:
    if not isinstance(body, dict):
        raise ContentError(400, "Send a JSON object")
    items, approved = body.get("items"), body.get("approved")
    if (not isinstance(items, list) or not items or len(items) > MAX_ITEMS
            or any(not isinstance(i, str) or not i.strip() or len(i) > MAX_ITEM_LENGTH for i in items)):
        raise ContentError(400, f"items must be a list of 1 to {MAX_ITEMS} texts of {MAX_ITEM_LENGTH} characters or less")
    if approved is not None and not isinstance(approved, bool):
        raise ContentError(400, "approved must be true or false")
    return {"items": [i.strip() for i in items], "approved": approved is True}


def write(session: Session, name: str, admin_id: str, data: Dict[str, Any]) -> dict:
    if not valid_type(name):
        raise ContentError(400, "The content name must be lowercase letters and underscores")
    item = session.get(ContentItem, name)
    version = (item.version + 1) if item else 1
    fields = dict(version=version, approved=data["approved"], approved_by=admin_id if data["approved"] else None,
                  items=data["items"], updated_at=datetime.now(timezone.utc))
    if item is None:
        item = ContentItem(type=name, **fields)
        session.add(item)
    else:
        for key, value in fields.items():
            setattr(item, key, value)
    session.flush()
    return view(item)
