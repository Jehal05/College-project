"""The ONE way an emergency changes state (CONTRACT.md section 2).

`transition()` checks the table in app/models/enums.py, updates the emergency, writes one status_events row and
queues the matching event. The patient routes use it, and the hospital routes (acknowledge, dispatch, status)
must use it too, so the table is enforced in one place only.

It never commits: the caller commits, then calls `events.flush(session)`.
"""
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.models.emergencies import Emergency, StatusEvent
from app.models.enums import TERMINAL_STATES, EmergencyState, InvalidTransition, check_transition  # noqa: F401
from app.security.actor import Actor
from app.services import events

# The event each new state announces (hospital.* and ambulance.* events carry their own payload from the caller).
STATE_EVENT = {
    EmergencyState.SOS_SENT: "emergency.sos_sent",
    EmergencyState.HOSPITAL_ACKNOWLEDGED: "hospital.acknowledged",
    EmergencyState.AMBULANCE_DISPATCHED: "ambulance.dispatched",
    EmergencyState.EN_ROUTE: "ambulance.location",
    EmergencyState.ARRIVED: "emergency.arrived",
    EmergencyState.HANDOVER_DONE: "emergency.handover_done",
    EmergencyState.CANCELLED: "emergency.cancelled",
    EmergencyState.ESCALATED: "hospital.escalated",
}


def actor_name(actor: Optional[Actor]) -> str:
    return actor.user_id if actor is not None else "system"


def transition(session: Session, emergency: Emergency, to_state: EmergencyState, actor: Optional[Actor] = None, *,
               payload: Optional[Dict[str, Any]] = None, audience: str = "all", announce: bool = True) -> Emergency:
    """Move `emergency` to `to_state`, or raise `InvalidTransition` (the API answers 409 with from and to).

    Staying in the same state is NOT a move and is refused too: callers that want "sending it twice is harmless"
    check the state first (see services/emergencies.py).
    """
    to_state = EmergencyState(to_state)
    from_state = EmergencyState(emergency.state)
    check_transition(from_state, to_state)
    now = datetime.now(timezone.utc)
    emergency.state = to_state.value
    if to_state in TERMINAL_STATES:
        emergency.finished_at = now
    session.add(StatusEvent(emergency_id=emergency.id, state=to_state.value, timestamp=now, actor=actor_name(actor)))
    session.flush()
    event_type = STATE_EVENT.get(to_state)
    if announce and event_type:
        events.queue(session, event_type, payload or {}, audience=audience, emergency_id=emergency.id,
                     state=to_state.value)
    return emergency
