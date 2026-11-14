"""No acknowledgement in time: the alert moves to the next-ranked hospital (CONTRACT.md section 2, feature 60).

An emergency in SOS_SENT that nobody acknowledged for ESCALATION_TIMEOUT_SECONDS (default 30) goes
SOS_SENT -> ESCALATED -> SOS_SENT, and the next hospital in the ranking (the one the SOS stored) is alerted.
Both moves go through `emergency_state.transition()`. The old alert is marked ESCALATED_AWAY.
If there is no next hospital the alert simply stays where it is (and is not retried every second).

Nothing here talks to a socket: events are queued and sent after the commit, like everywhere else.
"""
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.emergencies import Emergency, HospitalAlert
from app.models.enums import EmergencyState
from app.models.hospitals import Hospital
from app.services import emergencies as emergency_svc
from app.services import emergency_state, events

log = logging.getLogger("healthtwin.escalation")
S = EmergencyState
DEFAULT_TIMEOUT = 30.0


def timeout_seconds() -> float:
    try:
        value = float(os.environ.get("ESCALATION_TIMEOUT_SECONDS", DEFAULT_TIMEOUT))
    except ValueError:
        return DEFAULT_TIMEOUT
    return value if value > 0 else DEFAULT_TIMEOUT


def _utc(moment: datetime) -> datetime:
    return moment if moment.tzinfo else moment.replace(tzinfo=timezone.utc)


def _latest_alert(session: Session, emergency: Emergency) -> Optional[HospitalAlert]:
    return (session.query(HospitalAlert).filter(HospitalAlert.emergency_id == emergency.id)
            .order_by(HospitalAlert.rank.desc(), HospitalAlert.id.desc()).first())


def escalate(session: Session, emergency: Emergency) -> bool:
    """Alert the next hospital. False when there is none (nothing changes). The caller commits and flushes."""
    current = _latest_alert(session, emergency)
    ranking = list(((emergency.engine_result or {}).get("sos") or {}).get("ranking") or [])
    already = {a.hospital_id for a in session.query(HospitalAlert).filter(HospitalAlert.emergency_id == emergency.id)}
    hospital = None
    for candidate_id in ranking:                    # the next one that was not alerted yet and is still verified
        candidate = session.get(Hospital, candidate_id) if candidate_id not in already else None
        if candidate is not None and candidate.verified:
            hospital = candidate
            break
    if current is None or hospital is None:
        return False
    from_id, rank = current.hospital_id, current.rank + 1
    current.status = "ESCALATED_AWAY"
    session.add(HospitalAlert(emergency_id=emergency.id, hospital_id=hospital.id, rank=rank, status="ALERTED"))
    emergency.hospital_id = hospital.id
    session.flush()
    emergency_state.transition(session, emergency, S.ESCALATED, None,
                               payload={"from_hospital_id": from_id, "to_hospital_id": hospital.id}, audience="all")
    emergency_state.transition(session, emergency, S.SOS_SENT, None, announce=False)
    ref = emergency_svc._hospital_ref(session, emergency)
    events.queue(session, "emergency.created", emergency_svc.alert_payload(session, emergency, ref, rank),
                 audience="hospitals", emergency_id=emergency.id, state=S.SOS_SENT.value)
    for audience in ("hospitals", "patient:" + emergency.patient_id):
        events.queue(session, "hospital.alerted", {"hospital_id": hospital.id, "rank": rank, "hospital": ref},
                     audience=audience, emergency_id=emergency.id, state=S.SOS_SENT.value)
    return True


def due(session: Session, now: Optional[datetime] = None) -> List[Emergency]:
    """Emergencies in SOS_SENT whose latest alert is older than the timeout."""
    limit = _utc(now or datetime.now(timezone.utc)) - timedelta(seconds=timeout_seconds())
    found = []
    for emergency in session.query(Emergency).filter(Emergency.state == S.SOS_SENT.value).all():
        alert = _latest_alert(session, emergency)
        if alert is not None and _utc(alert.alerted_at) <= limit:
            found.append(emergency)
    return found


def run_once(session: Session, now: Optional[datetime] = None) -> List[str]:
    """One sweep. Returns the ids that were moved to the next hospital."""
    moved = []
    for emergency in due(session, now):
        try:
            if escalate(session, emergency):
                session.commit()
                events.flush(session)
                moved.append(emergency.id)
            else:                                   # nobody left to alert: stop looking at it every second
                _stop(session, emergency)
        except Exception:                           # noqa: BLE001  one bad row must not stop the sweep
            session.rollback()
            events.discard(session)
            log.exception("escalation failed for one emergency")
    return moved


def _stop(session: Session, emergency: Emergency) -> None:
    alert = _latest_alert(session, emergency)
    if alert is not None:
        alert.alerted_at = datetime.now(timezone.utc)      # the clock restarts; the alert stays with the last hospital
        session.commit()
