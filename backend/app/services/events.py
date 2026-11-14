"""One place where the backend announces what happened (the hook for the WebSocket, feature 8).

Nothing here talks to a socket. A service calls `queue(...)` while it works, the route calls `flush(session)` AFTER
the database commit, and every subscriber gets each event. Until the WebSocket manager subscribes, events go
nowhere, and that is fine: the REST answers never depend on it.

Rules
- An event is sent only after the change is saved, so a client never hears about something that was rolled back.
- A subscriber that crashes never breaks the request (the error is logged without the payload).
- Payloads must already be consent-filtered by the caller. This module never adds patient data.
- `audience` tells the WebSocket manager who may receive the event:
  "hospitals" (staff), "patient:<patient_id>", "family:<patient_id>", "responders", or "all".
"""
import logging
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

from sqlalchemy.orm import Session

log = logging.getLogger("healthtwin.events")

Subscriber = Callable[[Dict[str, Any]], None]
_subscribers: List[Subscriber] = []


def subscribe(fn: Subscriber) -> None:
    if fn not in _subscribers:
        _subscribers.append(fn)


def unsubscribe(fn: Subscriber) -> None:
    if fn in _subscribers:
        _subscribers.remove(fn)


def clear_subscribers() -> None:
    _subscribers.clear()


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def build(event_type: str, payload: Optional[Dict[str, Any]] = None, *, audience: str = "all",
          emergency_id: Optional[str] = None, state: Optional[str] = None) -> Dict[str, Any]:
    """The envelope of CONTRACT.md section 5.1. `type` is sent as well as `event` (the patient app reads `type`)."""
    return {"event": event_type, "type": event_type, "emergency_id": emergency_id, "state": state,
            "timestamp": _now(), "payload": dict(payload or {}), "audience": audience}


def publish(event_type: str, payload: Optional[Dict[str, Any]] = None, *, audience: str = "all",
            emergency_id: Optional[str] = None, state: Optional[str] = None) -> Dict[str, Any]:
    """Send one event to every subscriber now."""
    event = build(event_type, payload, audience=audience, emergency_id=emergency_id, state=state)
    for fn in list(_subscribers):
        try:
            fn(event)
        except Exception:                        # noqa: BLE001  a broken subscriber must not break the API
            log.exception("event subscriber failed for %s", event_type)
    return event


_KEY = "pending_events"


def queue(session: Session, event_type: str, payload: Optional[Dict[str, Any]] = None, *, audience: str = "all",
          emergency_id: Optional[str] = None, state: Optional[str] = None) -> None:
    """Remember an event until the change is committed."""
    session.info.setdefault(_KEY, []).append(
        build(event_type, payload, audience=audience, emergency_id=emergency_id, state=state))


def flush(session: Session) -> List[Dict[str, Any]]:
    """Call after `session.commit()`. Sends and returns the queued events."""
    events = session.info.pop(_KEY, [])
    for event in events:
        for fn in list(_subscribers):
            try:
                fn(event)
            except Exception:                    # noqa: BLE001
                log.exception("event subscriber failed for %s", event["event"])
    return events


def discard(session: Session) -> None:
    """Call after a rollback: events for a change that did not happen are dropped."""
    session.info.pop(_KEY, None)
