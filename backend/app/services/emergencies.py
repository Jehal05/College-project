"""Create, send the SOS for, cancel and read emergencies (features 4, 8, 19, 10). ALL DATA IS SIMULATED.

Rules kept here (CONTRACT.md sections 1.3, 2 and 4):
- Only the rules engine decides type and severity. A person who presses SOS raises the severity sent to the
  hospital to EMERGENCY (`severity_floor_applied`), and the engine's own answer is kept unchanged.
- State changes go through `emergency_state.transition()` only.
- A field the patient did not agree to share is LEFT OUT of every view that is not the patient's own.
- Nothing real is contacted. Contacts are "notified" by name only, and no phone number leaves this module.
"""
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.consent import CONSENT_FIELDS
from app.models.emergencies import Emergency, HospitalAlert, StatusEvent
from app.models.enums import (SEVERITY_RANK, EmergencySource, EmergencyState, EmergencyType, Severity)
from app.models.hospitals import Ambulance, Hospital
from app.models.patient_data import Contact, Patient
from app.rules import engine as rules_engine
from app.rules import symptom_map
from app.services import consent as consent_service
from app.services import emergency_state, events, hospital_match
from app.services import ids as id_service
from app.services import vitals as vitals_service
from app.security.actor import Actor

S = EmergencyState
VITAL_KEYS = ("heart_rate", "spo2", "bp_sys", "bp_dia", "glucose", "resp_rate")
CANCEL_REASONS = ("false_alarm", "pressed_by_mistake", "feeling_better", "other")
LOCATION_SOURCES = re.compile(r"[a-z_]{1,20}")
MAX_SYMPTOMS = 30
LIVE_STATES = frozenset({S.SOS_SENT, S.ESCALATED, S.HOSPITAL_ACKNOWLEDGED, S.AMBULANCE_DISPATCHED, S.EN_ROUTE,
                         S.ARRIVED})


class EmergencyInputError(ValueError):
    """The request body is not valid. The message never repeats what the caller sent. The API answers 400."""


# ------------------------------------------------------------------ cleaning the request

def _is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and value == value and abs(value) != float("inf")


def clean_location(raw: Any) -> Optional[Dict[str, Any]]:
    if raw is None:
        return None
    if not isinstance(raw, dict):
        raise EmergencyInputError("location must be an object with lat and lng")
    lat, lng = raw.get("lat"), raw.get("lng")
    if not (_is_number(lat) and _is_number(lng)) or not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
        raise EmergencyInputError("location needs a lat between -90 and 90 and a lng between -180 and 180")
    clean: Dict[str, Any] = {"lat": float(lat), "lng": float(lng)}
    accuracy = raw.get("accuracy")
    if accuracy is not None:
        if not _is_number(accuracy) or accuracy < 0:
            raise EmergencyInputError("location accuracy must be a number of metres, 0 or more")
        clean["accuracy"] = float(accuracy)
    source = raw.get("source")
    if source is not None:
        if not isinstance(source, str) or not LOCATION_SOURCES.fullmatch(source):
            raise EmergencyInputError("location source must be a short lowercase word")
        clean["source"] = source
    return clean


def clean_consents(raw: Any) -> Dict[str, bool]:
    if raw is None:
        return {}
    if not isinstance(raw, dict):
        raise EmergencyInputError("consent must be an object of true or false values")
    out = {}
    for key, value in raw.items():
        if key not in CONSENT_FIELDS or not isinstance(value, bool):
            raise EmergencyInputError("consent may only hold location, history, vitals and reports as true or false")
        out[key] = value
    return out


def clean_create(body: Any) -> Dict[str, Any]:
    """Validate POST /emergencies. Returns patient_id (or None), type (or None), symptoms, source, consents, location."""
    if not isinstance(body, dict):
        raise EmergencyInputError("The body must be a JSON object")
    patient_id = body.get("patient_id")
    if patient_id is not None and (not isinstance(patient_id, str) or not patient_id.strip()):
        raise EmergencyInputError("patient_id must be text")
    etype = body.get("type")
    if etype is not None and (not isinstance(etype, str) or etype not in {t.value for t in EmergencyType}):
        raise EmergencyInputError("type must be one of " + ", ".join(t.value for t in EmergencyType))
    source = body.get("source", EmergencySource.MANUAL.value)
    if source not in {s.value for s in EmergencySource}:
        raise EmergencyInputError("source must be one of " + ", ".join(s.value for s in EmergencySource))
    symptoms = body.get("symptoms", [])
    if not isinstance(symptoms, list) or len(symptoms) > MAX_SYMPTOMS or not all(
            isinstance(x, str) and 0 < len(x.strip()) <= 40 for x in symptoms):
        raise EmergencyInputError("symptoms must be a list of up to %d symptom ids" % MAX_SYMPTOMS)
    raw_consent = body.get("consents", body.get("consent"))
    return {"patient_id": patient_id.strip() if patient_id else None, "type": etype, "symptoms": [x.strip() for x in symptoms],
            "source": source, "consents": clean_consents(raw_consent), "location": clean_location(body.get("location"))}


# ------------------------------------------------------------------ the rules engine, with reasons

def _matched_rules(rule_ids: List[str]) -> List[dict]:
    by_id = {r.id: r for r in rules_engine.default_rules()}
    out = []
    for rid in rule_ids:
        rule = by_id.get(rid)
        if rule is not None:
            out.append({"id": rule.id, "type": rule.type.value, "severity": rule.severity.value, "reason": rule.reason,
                        "reviewed": rule.review_status == "reviewed"})
        elif rid.startswith("SAFETY_FLOOR_"):
            floor_type, reason = rules_engine.SAFETY_FLOOR[rid[len("SAFETY_FLOOR_"):].lower()]
            out.append({"id": rid, "type": floor_type.value, "severity": Severity.EMERGENCY.value, "reason": reason,
                        "reviewed": False})
    return out


def _vitals_for_engine(vitals: Optional[dict]) -> dict:
    return {k: vitals[k] for k in VITAL_KEYS if vitals and k in vitals}


# ------------------------------------------------------------------ create

def _utc(moment: datetime) -> datetime:
    return moment if moment.tzinfo else moment.replace(tzinfo=timezone.utc)


def _iso(moment: Optional[datetime]) -> Optional[str]:
    return None if moment is None else _utc(moment).strftime("%Y-%m-%dT%H:%M:%SZ")


def create_emergency(session: Session, actor: Actor, patient: Patient, clean: Dict[str, Any]) -> Emergency:
    """A new emergency in EMERGENCY_DETECTED. The hospital hears nothing until the SOS."""
    translation = symptom_map.translate(clean["symptoms"], clean["source"])
    check_in = clean["source"] in symptom_map.CHECKIN_SOURCES
    if not check_in and not translation.symptoms:
        raise EmergencyInputError("None of the symptoms are known. Send at least one symptom id the app offers")

    # What the patient agrees to share, as it is NOW, with the choices sent in the request on top.
    consents = {**consent_service.current_consents(session, patient.id), **clean["consents"]}
    vitals = vitals_service.current_vitals(patient.id) if consents.get("vitals") else None
    vitals_snapshot = {k: vitals[k] for k in VITAL_KEYS} | {"timestamp": vitals["timestamp"]} if vitals else None

    decision = rules_engine.evaluate(translation.symptoms, _vitals_for_engine(vitals))
    etype = clean["type"] or (decision.type.value if decision.type else None)
    if etype is None:
        raise EmergencyInputError("These symptoms do not match any emergency type. Send a type or other symptoms")

    engine_result = decision.to_dict()
    engine_result["matched_rules"] = _matched_rules(decision.rule_ids)
    engine_result["rules_version"] = "pending doctor review"

    emergency = Emergency(
        id=id_service.next_daily_id(session), patient_id=patient.id, type=etype, source=clean["source"],
        state=S.EMERGENCY_DETECTED.value, engine_severity=decision.severity.value, severity=decision.severity.value,
        severity_floor_applied=False, engine_result=engine_result, symptoms=clean["symptoms"],
        unmapped_symptoms=list(translation.unmapped), consents=consents,
        location=clean["location"] if consents.get("location") else None, vitals_at_alert=vitals_snapshot)
    session.add(emergency)
    session.flush()
    now = datetime.now(timezone.utc)
    emergency.created_at = now
    session.add(StatusEvent(emergency_id=emergency.id, state=S.EMERGENCY_DETECTED.value, timestamp=now,
                            actor=emergency_state.actor_name(actor)))
    session.flush()
    # The patient's own screens may hear about it now. Hospitals hear only at the SOS.
    events.queue(session, "emergency.detected", {"type": etype, "source": clean["source"], "simulated": True},
                 audience="patient:" + patient.id, emergency_id=emergency.id, state=S.EMERGENCY_DETECTED.value)
    return emergency


# ------------------------------------------------------------------ SOS

def _ambulance_ref(session: Session, emergency: Emergency) -> Optional[dict]:
    if not emergency.ambulance_id:
        return None
    amb = session.get(Ambulance, emergency.ambulance_id)
    return {"id": amb.id, "call_sign": amb.call_sign} if amb else {"id": emergency.ambulance_id}


def _hospital_ref(session: Session, emergency: Emergency, distances: Optional[dict] = None) -> Optional[dict]:
    if not emergency.hospital_id:
        return None
    hosp = session.get(Hospital, emergency.hospital_id)
    if hosp is None:
        return {"id": emergency.hospital_id}
    ref = {"id": hosp.id, "name": hosp.name}
    if distances and hosp.id in distances:
        ref["distance_km"] = distances[hosp.id]
    return ref


def alert_payload(session: Session, emergency: Emergency, hospital: Optional[dict], rank: Optional[int]) -> dict:
    """The `emergency.created` payload for hospitals: only what the patient agreed to share, left out otherwise."""
    consents = emergency.consents or {}
    patient = session.get(Patient, emergency.patient_id)
    payload: Dict[str, Any] = {
        "type": emergency.type, "severity": emergency.severity, "symptom_ids": list(emergency.symptoms or []),
        "symptoms": list(emergency.symptoms or []),
        "source": emergency.source, "patient_id": emergency.patient_id, "created_at": _iso(emergency.created_at),
        "reasons": list((emergency.engine_result or {}).get("reasons", [])), "consents": dict(consents),
        "passport_available": bool(consents.get("history")), "simulated": True}
    if patient is not None:
        shared = consent_service.apply_consent(
            {"name": patient.name, "age": patient.age, "sex": patient.sex, "blood_group": patient.blood_group,
             "allergies": patient.allergies or [], "conditions": patient.conditions or [],
             "medications": patient.medications or []}, consents)
        shared = {k: v for k, v in shared.items() if v is not None}
        payload["patient"] = {"id": patient.id, **shared}
        payload["patient_summary"] = {"name": patient.name, "age": patient.age, "blood_group": patient.blood_group}
    if consents.get("location") and emergency.location:
        payload["location"] = dict(emergency.location)
    if consents.get("vitals") and emergency.vitals_at_alert:
        readings = {k: v for k, v in emergency.vitals_at_alert.items() if k != "timestamp"}
        payload["vitals"] = readings | {"bp": f"{readings['bp_sys']}/{readings['bp_dia']}"}
    if hospital:
        payload["hospital"] = {**hospital, **({"rank": rank} if rank else {})}
    return payload


def send_sos(session: Session, actor: Actor, emergency: Emergency, location: Optional[dict]) -> Emergency:
    """EMERGENCY_DETECTED to SOS_SENT. Sending it again (or after the hospital answered) changes nothing.
    A cancelled emergency cannot be sent: the 409 carries from and to."""
    state = S(emergency.state)
    if state is not S.EMERGENCY_DETECTED:
        if state is S.CANCELLED:
            emergency_state.check_transition(state, S.SOS_SENT)       # raises InvalidTransition
        return emergency
    consents = emergency.consents or {}
    if location is not None and consents.get("location"):
        emergency.location = location
    where = emergency.location if (consents.get("location") and emergency.location) else None

    if SEVERITY_RANK[Severity(emergency.severity)] < SEVERITY_RANK[Severity.EMERGENCY]:
        emergency.severity, emergency.severity_floor_applied = Severity.EMERGENCY.value, True
    emergency.sos_at = datetime.now(timezone.utc)

    ranked = hospital_match.rank_hospitals(session.query(Hospital).all(), emergency.type, where)
    top = ranked[0] if ranked else None
    distances = {r["hospital"].id: r["distance_km"] for r in ranked}
    if top:
        emergency.hospital_id = top["hospital"].id
        session.add(HospitalAlert(emergency_id=emergency.id, hospital_id=top["hospital"].id, rank=top["rank"],
                                  status="ALERTED"))
    hospital = _hospital_ref(session, emergency, distances)

    contacts = [{"name": c.name, "relation": c.relation} for c in
                session.query(Contact).filter(Contact.patient_id == emergency.patient_id).order_by(Contact.position)]
    result = dict(emergency.engine_result or {})
    result["sos"] = {"contacts_notified": contacts, "ranking": [r["hospital"].id for r in ranked]}
    emergency.engine_result = result                      # reassigned so the encrypted column notices the change

    emergency_state.transition(session, emergency, S.SOS_SENT, actor, announce=False)
    sid, pid = emergency.id, emergency.patient_id
    created = alert_payload(session, emergency, hospital, top and top["rank"])
    events.queue(session, "emergency.created", created, audience="hospitals", emergency_id=sid, state=S.SOS_SENT.value)
    # The patient hears the same event (it holds only what they chose to share, their own data), so the app and the
    # hospital portal read one shape. Hospitals and the patient are separate audiences: nobody hears it twice.
    events.queue(session, "emergency.created", created, audience="patient:" + pid, emergency_id=sid,
                 state=S.SOS_SENT.value)
    events.queue(session, "emergency.sos_sent", {}, audience="all", emergency_id=sid, state=S.SOS_SENT.value)
    if top:
        alerted = {"hospital_id": top["hospital"].id, "rank": top["rank"], "hospital": hospital}
        for audience in ("hospitals", "patient:" + pid):             # the patient sees which hospital was alerted
            events.queue(session, "hospital.alerted", alerted, audience=audience, emergency_id=sid,
                         state=S.SOS_SENT.value)
    if contacts:
        events.queue(session, "contacts.notified", {"contacts": contacts}, audience="patient:" + pid,
                     emergency_id=sid, state=S.SOS_SENT.value)
    return emergency


# ------------------------------------------------------------------ cancel

def clean_cancel_reason(body: Any) -> str:
    if body in (None, {}):
        return "false_alarm"
    if not isinstance(body, dict):
        raise EmergencyInputError("The body must be a JSON object")
    reason = body.get("reason", "false_alarm")
    if reason not in CANCEL_REASONS:
        raise EmergencyInputError("reason must be one of " + ", ".join(CANCEL_REASONS))
    return reason


def cancel(session: Session, actor: Actor, emergency: Emergency, reason: str = "false_alarm") -> Emergency:
    """To CANCELLED, only before the ambulance is dispatched. Cancelling twice is harmless."""
    if S(emergency.state) is S.CANCELLED:
        return emergency
    emergency_state.transition(session, emergency, S.CANCELLED, actor, announce=False)
    for alert in session.query(HospitalAlert).filter(HospitalAlert.emergency_id == emergency.id):
        if alert.status in ("ALERTED", "ACKNOWLEDGED"):
            alert.status = "CANCELLED"
    # Hospitals and family only hear about it if the alert had been sent.
    audience = "all" if emergency.sos_at else "patient:" + emergency.patient_id
    events.queue(session, "emergency.cancelled", {"cancelled_by": "patient", "reason": reason}, audience=audience,
                 emergency_id=emergency.id, state=S.CANCELLED.value)
    return emergency


# ------------------------------------------------------------------ reading

def timeline(session: Session, emergency: Emergency) -> List[dict]:
    rows = session.query(StatusEvent).filter(StatusEvent.emergency_id == emergency.id).order_by(StatusEvent.id).all()
    start = _utc(rows[0].timestamp) if rows else None
    return [{"state": r.state, "timestamp": _iso(r.timestamp), "actor": r.actor,
             "seconds_since_start": max(0, int((_utc(r.timestamp) - start).total_seconds())) if start else 0}
            for r in rows]


def view(session: Session, emergency: Emergency, kind: str) -> dict:
    """The emergency as one kind of reader may see it.

    kind: "owner" (the patient: everything), "staff" (hospital staff and admin: only what the patient shared,
    never a phone number) or "status" (a linked relative: a plain status, nothing about health).
    """
    tl = timeline(session, emergency)
    if kind == "status":
        return {"id": emergency.id, "patient_id": emergency.patient_id, "state": emergency.state,
                "started_at": tl[0]["timestamp"] if tl else None, "simulated": True}
    consents = emergency.consents or {}
    body: Dict[str, Any] = {
        "id": emergency.id, "patient_id": emergency.patient_id, "state": emergency.state, "type": emergency.type,
        "source": emergency.source, "severity": emergency.severity, "symptoms": list(emergency.symptoms or []),
        "hospital": _hospital_ref(session, emergency), "ambulance": _ambulance_ref(session, emergency),
        "eta_seconds": emergency.eta_seconds, "created_at": _iso(emergency.created_at),
        "timeline": tl, "status_events": [{"state": t["state"], "timestamp": t["timestamp"]} for t in tl],
        "consents": dict(consents), "simulated": True}
    if kind == "owner":
        body["location"] = emergency.location
        body["vitals_at_alert"] = emergency.vitals_at_alert
        body["severity_floor_applied"] = bool(emergency.severity_floor_applied)
        body["engine_severity"] = emergency.engine_severity
    else:
        body["passport_available"] = bool(consents.get("history"))
        if consents.get("location") and emergency.location:
            body["location"] = dict(emergency.location)
        if consents.get("vitals") and emergency.vitals_at_alert:
            body["vitals_at_alert"] = {k: v for k, v in emergency.vitals_at_alert.items()}
    return body


def released_fields(body: dict) -> List[str]:
    """The consent names whose data is in a staff view (names only, for the audit log)."""
    names = []
    if "location" in body:
        names.append("location")
    if "vitals_at_alert" in body:
        names.append("vitals")
    return names


def reasons_view(session: Session, emergency: Emergency, kind: str) -> dict:
    """Why the alert fired: what was reported, what the readings showed, which draft rules matched.
    A plain record, never a diagnosis. Every rule is still pending doctor review."""
    result = emergency.engine_result or {}
    matched = list(result.get("matched_rules", []))
    consents = emergency.consents or {}
    vitals = emergency.vitals_at_alert if (kind == "owner" or consents.get("vitals")) else None
    return {
        "severity": result.get("severity", emergency.engine_severity), "type": result.get("type"),
        "reasons": list(result.get("reasons", [])), "matched_rules": matched,
        "reviewed": bool(matched) and all(r["reviewed"] for r in matched),
        "review_status": rules_engine.REVIEW_STATUS,
        "inputs": {"symptoms": list(emergency.symptoms or []),
                   "vitals": {k: vitals[k] for k in VITAL_KEYS if k in vitals} if vitals else {},
                   "vitals_at": vitals.get("timestamp") if vitals else None},
        "simulated": True}


def list_for_patient(session: Session, patient_id: str, limit: int = 20) -> List[dict]:
    rows = (session.query(Emergency).filter(Emergency.patient_id == patient_id)
            .order_by(Emergency.created_at.desc(), Emergency.id.desc()).limit(limit).all())
    return [{"id": e.id, "started_at": _iso(e.created_at), "final_state": e.state, "type": e.type, "source": e.source}
            for e in rows]


def _seconds(start: Optional[str], end: Optional[str]) -> Optional[int]:
    if not start or not end:
        return None
    parse = lambda s: datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ")  # noqa: E731
    return max(0, int((parse(end) - parse(start)).total_seconds()))


def summary(session: Session, emergency: Emergency) -> dict:
    """A plain record of what the app did. It never interprets, gives no cause and says nothing about health."""
    tl = timeline(session, emergency)
    stamp = lambda state: next((t["timestamp"] for t in tl if t["state"] == state), None)  # noqa: E731
    started = tl[0]["timestamp"] if tl else None
    finished = S(emergency.state) in (S.HANDOVER_DONE, S.CANCELLED)
    consents = emergency.consents or {}
    hospital = _hospital_ref(session, emergency)
    sos = (emergency.engine_result or {}).get("sos", {})
    return {
        "id": emergency.id, "started_at": started, "ended_at": tl[-1]["timestamp"] if finished and tl else None,
        "source": emergency.source, "final_state": emergency.state, "simulated": True,
        "timeline": [{"state": t["state"], "timestamp": t["timestamp"]} for t in tl],
        "durations": {"to_acknowledged": _seconds(started, stamp("HOSPITAL_ACKNOWLEDGED")),
                      "to_dispatched": _seconds(started, stamp("AMBULANCE_DISPATCHED")),
                      "to_arrived": _seconds(started, stamp("ARRIVED")),
                      "to_handover": _seconds(started, stamp("HANDOVER_DONE"))},
        "shared": {f: bool(consents.get(f)) for f in CONSENT_FIELDS},
        "symptoms": list(emergency.symptoms or []),
        "vitals_at_alert": emergency.vitals_at_alert or {},
        "contacts_notified": [{"name": c["name"]} for c in sos.get("contacts_notified", [])],
        "hospital": {"name": hospital["name"]} if hospital and "name" in hospital else None,
        "ambulance_id": emergency.ambulance_id}
