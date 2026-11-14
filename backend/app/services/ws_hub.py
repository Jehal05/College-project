"""Who hears which event on the WebSocket (feature 8). One path, /ws, for every app.

`events.py` announces what happened. This module hands each event to every connected socket, and each socket
decides in its own task whether its user may see it. Nothing is sent that the REST answer would refuse:
- HOSPITAL_STAFF hear events for emergencies their hospital was alerted for (after the SOS), and hospital-wide
  events (availability). ADMIN hears every sent emergency.
- A PATIENT hears the events of their own emergencies, and what is addressed to them.
- FAMILY and RESPONDER hear nothing yet: the family link and the responder alerts are not built.
The envelope sent is the event without its `audience` (that is only for this filter).
"""
import asyncio
import logging
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.emergencies import Emergency, HospitalAlert
from app.security.actor import Actor
from app.services import events
from app.services.vitals import current_vitals

log = logging.getLogger("healthtwin.ws")
QUEUE_SIZE = 200
TICK_SECONDS = 1.0


class Connection:
    def __init__(self, loop: asyncio.AbstractEventLoop, patient_id: Optional[str] = None) -> None:
        self.loop = loop
        self.patient_id = patient_id               # set for a PATIENT socket: the stream sends their vitals
        self.queue: "asyncio.Queue[Dict[str, Any]]" = asyncio.Queue(maxsize=QUEUE_SIZE)

    def push(self, event: Dict[str, Any]) -> None:
        try:
            self.queue.put_nowait(event)
        except asyncio.QueueFull:                  # a client that cannot keep up loses events, the API never waits
            log.warning("a websocket queue is full; one event was dropped")


class Hub:
    def __init__(self) -> None:
        self._connections: List[Connection] = []
        self._ticker: Optional["asyncio.Task"] = None

    def ensure_subscribed(self) -> None:
        events.subscribe(self.on_event)

    def register(self, loop: asyncio.AbstractEventLoop, patient_id: Optional[str] = None) -> Connection:
        self.ensure_subscribed()
        conn = Connection(loop, patient_id)
        self._connections.append(conn)
        if self._ticker is None or self._ticker.done():
            self._ticker = loop.create_task(self._tick_forever())
        return conn

    def unregister(self, conn: Connection) -> None:
        if conn in self._connections:
            self._connections.remove(conn)

    def on_event(self, event: Dict[str, Any]) -> None:
        """Called from whatever thread served the request, after the commit."""
        for conn in list(self._connections):
            try:
                conn.loop.call_soon_threadsafe(conn.push, event)
            except RuntimeError:                   # that socket's loop is gone
                self.unregister(conn)

    def count(self) -> int:
        return len(self._connections)

    def watched_patients(self) -> List[str]:
        return sorted({c.patient_id for c in self._connections if c.patient_id})

    def tick(self) -> int:
        """One second of the stream: each patient with a socket open gets their own simulated vitals.
        Only the patient hears it (audience `patient:<id>`): hospitals read vitals from the consented alert."""
        sent = 0
        for patient_id in self.watched_patients():
            try:
                reading = current_vitals(patient_id)
            except Exception:                      # noqa: BLE001  one bad simulator must not stop the stream
                log.exception("vitals stream failed for one patient")
                continue
            payload = {k: reading[k] for k in ("patient_id", "heart_rate", "spo2", "bp", "bp_sys", "bp_dia", "glucose",
                                              "resp_rate")}
            events.publish("vitals.update", payload, audience="patient:" + patient_id, emergency_id=None,
                           state="MONITORING")
            sent += 1
        return sent

    async def _tick_forever(self) -> None:
        """Runs while any socket is open, then ends by itself."""
        while self._connections:
            await asyncio.sleep(TICK_SECONDS)       # wait first: a socket's first message is not a vitals tick
            if self._connections:
                self.tick()


hub = Hub()


def _alerted(session: Session, emergency: Emergency, hospital_id: Optional[str]) -> bool:
    if not hospital_id:
        return False
    if emergency.hospital_id == hospital_id:
        return True
    return session.query(HospitalAlert).filter(HospitalAlert.emergency_id == emergency.id,
                                               HospitalAlert.hospital_id == hospital_id).first() is not None


def visible(session: Session, actor: Actor, event: Dict[str, Any]) -> bool:
    audience, eid = event.get("audience", "all"), event.get("emergency_id")
    if actor.role in ("HOSPITAL_STAFF", "ADMIN"):
        if audience not in ("hospitals", "all"):
            return False
        if eid is None:
            return True                            # hospital-wide news, such as an availability change
        emergency = session.get(Emergency, eid)
        if emergency is None or emergency.sos_at is None:
            return False
        return actor.role == "ADMIN" or _alerted(session, emergency, actor.hospital_id)
    if actor.role == "PATIENT" and actor.patient_id:
        if audience == "patient:" + actor.patient_id:
            return True
        if audience != "all" or eid is None:
            return False
        emergency = session.get(Emergency, eid)
        return emergency is not None and emergency.patient_id == actor.patient_id
    return False


def public(event: Dict[str, Any]) -> Dict[str, Any]:
    return {k: v for k, v in event.items() if k != "audience"}
