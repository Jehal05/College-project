"""Notes, chat and checklist ticks the hospital desk writes on an emergency (P2). ALL DATA IS SIMULATED.

PROPOSED by the portal (ENDPOINTS_TO_AGREE.md E1 to E3), not yet agreed with Daksh and Jehal.
Rules: only staff of a hospital that was alerted write here; a closed emergency (HANDOVER_DONE, CANCELLED) refuses;
text is at most 500 characters; `fields` is stored exactly as sent but is limited in size; an error never repeats
what the caller sent.
"""
import json
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple

from sqlalchemy.orm import Session

from app.models.emergencies import DeskEntry, Emergency
from app.models.enums import EmergencyState
from app.security.actor import Actor

NOTE_KINDS = ("handover", "desk", "pickup", "corridor", "assignment", "responder")
CHAT_ROLES = ("desk", "crew")
MAX_TEXT = 500
MAX_FIELDS_JSON = 2000
CLOSED = (EmergencyState.HANDOVER_DONE.value, EmergencyState.CANCELLED.value)
_ITEM = re.compile(r"[A-Za-z0-9_\-]{1,40}")


class DeskInputError(ValueError):
    """The request is not valid. The message never repeats what the caller sent. The API answers 400."""


def _iso(moment: datetime) -> str:
    moment = moment if moment.tzinfo else moment.replace(tzinfo=timezone.utc)
    return moment.strftime("%Y-%m-%dT%H:%M:%SZ")


def _text(value: Any, name: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise DeskInputError(f"{name} is required")
    if len(value) > MAX_TEXT:
        raise DeskInputError(f"{name} must be {MAX_TEXT} characters at most")
    return value.strip()


def clean_note(body: Any) -> Tuple[str, str, Dict[str, Any]]:
    if not isinstance(body, dict):
        raise DeskInputError("The body must be a JSON object")
    kind = body.get("kind", "desk")
    if kind not in NOTE_KINDS:
        raise DeskInputError("kind must be one of " + ", ".join(NOTE_KINDS))
    fields = body.get("fields", {})
    if fields is None:
        fields = {}
    if not isinstance(fields, dict) or not all(isinstance(k, str) for k in fields):
        raise DeskInputError("fields must be an object")
    try:
        if len(json.dumps(fields)) > MAX_FIELDS_JSON:
            raise DeskInputError(f"fields must be {MAX_FIELDS_JSON} characters at most")
    except (TypeError, ValueError):
        raise DeskInputError("fields must be plain JSON") from None
    return kind, _text(body.get("note"), "note"), fields


def clean_chat(body: Any) -> Tuple[str, str, str]:
    if not isinstance(body, dict):
        raise DeskInputError("The body must be a JSON object")
    role = body.get("sender_role", "desk")
    if role not in CHAT_ROLES:
        raise DeskInputError("sender_role must be one of " + ", ".join(CHAT_ROLES))
    name = body.get("sender_name", "")
    if name is None:
        name = ""
    if not isinstance(name, str) or len(name) > 80:
        raise DeskInputError("sender_name must be text of 80 characters at most")
    return role, name.strip(), _text(body.get("text"), "text")


def clean_check(body: Any) -> Tuple[str, bool]:
    if not isinstance(body, dict):
        raise DeskInputError("The body must be a JSON object")
    item, done = body.get("item_id"), body.get("done")
    if not isinstance(item, str) or not _ITEM.fullmatch(item):
        raise DeskInputError("item_id must be 1 to 40 letters, digits, dashes or underscores")
    if not isinstance(done, bool):
        raise DeskInputError("done must be true or false")
    return item, done


def is_closed(emergency: Emergency) -> bool:
    return emergency.state in CLOSED


def add(session: Session, emergency: Emergency, actor: Actor, kind: str, label: str, content: Dict[str, Any]) -> DeskEntry:
    entry = DeskEntry(emergency_id=emergency.id, kind=kind, label=label, content=content,
                      hospital_id=actor.hospital_id, actor=actor.user_id)
    session.add(entry)
    session.flush()
    return entry


def note_view(entry: DeskEntry) -> dict:
    c = entry.content
    return {"note_id": f"N-{entry.id}", "kind": entry.label, "note": c["note"], "fields": c.get("fields", {}),
            "timestamp": _iso(entry.created_at), "actor": entry.actor}


def chat_view(entry: DeskEntry) -> dict:
    c = entry.content
    return {"message_id": f"M-{entry.id}", "sender_role": entry.label, "sender_name": c.get("sender_name", ""),
            "text": c["text"], "timestamp": _iso(entry.created_at)}


def _entries(session: Session, emergency: Emergency, kind: str) -> List[DeskEntry]:
    return (session.query(DeskEntry).filter(DeskEntry.emergency_id == emergency.id, DeskEntry.kind == kind)
            .order_by(DeskEntry.id).all())


def checklist(session: Session, emergency: Emergency) -> Dict[str, dict]:
    """The latest tick for each item: { item_id: { done, by, at } }."""
    state: Dict[str, dict] = {}
    for entry in _entries(session, emergency, "check"):
        state[entry.label] = {"done": bool(entry.content["done"]), "by": entry.actor, "at": _iso(entry.created_at)}
    return state


def desk_view(session: Session, emergency: Emergency) -> dict:
    return {"checklist": checklist(session, emergency),
            "notes": [note_view(e) for e in _entries(session, emergency, "note")],
            "chat": [chat_view(e) for e in _entries(session, emergency, "chat")]}
