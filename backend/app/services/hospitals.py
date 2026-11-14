"""Hospitals and ambulances for the desk (P1 and P3). ALL DATA IS SIMULATED.

Rules kept here:
- A hospital is created UNVERIFIED. Only an admin verifies, and only verified hospitals are ever alerted
  (services/hospital_match.py already skips the rest).
- Availability is the four numbers and flags the portal shows. A cath lab or stroke unit can be "ready" only if
  the hospital has one.
- An error text never repeats what the caller sent.
"""
import re
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.enums import EmergencyType
from app.models.hospitals import Ambulance, Hospital
from app.services import hospital_match

CAPABILITIES = ("cath_lab", "stroke_unit", "icu", "emergency")
COUNTS = {"beds_free": "beds_free", "icu_free": "icu_free", "icu_beds": "icu_free"}           # icu_beds: Daksh's old name
FLAGS = {"cath_lab_ready": "cath_lab_ready", "cath_lab_open": "cath_lab_ready",
         "stroke_unit_ready": "stroke_unit_ready", "stroke_unit_open": "stroke_unit_ready"}
READY_NEEDS = {"cath_lab_ready": "cath_lab", "stroke_unit_ready": "stroke_unit"}
_PHONE = re.compile(r"\+?[0-9 \-]+")
_ID = re.compile(r"HSP-AMD-(\d{3,})")


class HospitalInputError(ValueError):
    """The request is not valid. The message never repeats what the caller sent. The API answers 400."""


def _whole(value: Any) -> bool:
    return isinstance(value, int) and not isinstance(value, bool) and value >= 0


def _number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and value == value and abs(value) != float("inf")


# ------------------------------------------------------------------ reading

def parse_coordinates(lat: Optional[str], lng: Optional[str]) -> Optional[Dict[str, float]]:
    """The caller's position from the query string, or None (the demo point is then used for distances)."""
    if lat is None and lng is None:
        return None
    try:
        la, lo = float(lat), float(lng)
    except (TypeError, ValueError):
        raise HospitalInputError("lat and lng must both be numbers") from None
    if not (-90 <= la <= 90 and -180 <= lo <= 180):
        raise HospitalInputError("lat must be between -90 and 90 and lng between -180 and 180")
    return {"lat": la, "lng": lo}


def clean_type(raw: Optional[str]) -> Optional[str]:
    if raw is None or raw == "":
        return None
    if raw not in {t.value for t in EmergencyType}:
        raise HospitalInputError("type must be one of " + ", ".join(t.value for t in EmergencyType))
    return raw


def hospital_view(hospital: Hospital, where: Optional[Dict[str, float]] = None, emergency_type: Optional[str] = None) -> dict:
    point = where or hospital_match.DEMO_LOCATION
    body = {
        "id": hospital.id, "portal_id": hospital.portal_id, "name": hospital.name, "address": hospital.address,
        "phone": hospital.phone, "lat": hospital.lat, "lng": hospital.lng, "verified": bool(hospital.verified),
        "capabilities": hospital.capabilities, "availability": hospital.availability,
        "distance_km": round(hospital_match.distance_km(point["lat"], point["lng"], hospital.lat, hospital.lng), 2),
        "simulated": True}
    if emergency_type:
        body["suitable"] = hospital_match.is_suitable(hospital, emergency_type)
    return body


def list_hospitals(session: Session, *, verified_only: bool, where: Optional[Dict[str, float]],
                   emergency_type: Optional[str]) -> List[dict]:
    """Nearest first. With a type, the hospitals that can handle it and are ready come first."""
    rows = session.query(Hospital).all()
    if verified_only:
        rows = [h for h in rows if h.verified]
    views = [hospital_view(h, where, emergency_type) for h in rows]
    views.sort(key=lambda v: (not v.get("suitable", True), v["distance_km"], v["id"]))
    return views


def ambulance_view(amb: Ambulance) -> dict:
    return {"id": amb.id, "portal_id": amb.portal_id, "call_sign": amb.call_sign,
            "crew": {"driver": amb.crew_driver, "paramedic": amb.crew_paramedic},
            "base_hospital_id": amb.base_hospital_id, "lat": amb.lat, "lng": amb.lng, "status": amb.status,
            "simulated": True}


# ------------------------------------------------------------------ availability

def clean_availability(body: Any) -> Dict[str, Any]:
    """{ "beds_free": 10 } and friends. Both the portal's names and the older names are accepted."""
    if not isinstance(body, dict) or not body:
        raise HospitalInputError("Send an availability object, for example { \"beds_free\": 10 }")
    out: Dict[str, Any] = {}
    for key, value in body.items():
        name = COUNTS.get(key) or FLAGS.get(key)
        if name is None:
            raise HospitalInputError("Unknown availability field. Allowed: " + ", ".join(sorted({*COUNTS, *FLAGS})))
        if key in COUNTS and not _whole(value):
            raise HospitalInputError(f"{key} must be a whole number, 0 or more")
        if key in FLAGS and not isinstance(value, bool):
            raise HospitalInputError(f"{key} must be true or false")
        if name in out and out[name] != value:
            raise HospitalInputError(f"Two names for the same field disagree: {name}")
        out[name] = value
    return out


def apply_availability(hospital: Hospital, update: Dict[str, Any]) -> None:
    caps = hospital.capabilities
    for flag, needs in READY_NEEDS.items():
        if update.get(flag) is True and not caps[needs]:
            raise HospitalInputError(f"{flag} cannot be true: this hospital has no {needs.replace('_', ' ')}")
    for name, value in update.items():
        setattr(hospital, name, value)


# ------------------------------------------------------------------ create and edit

def clean_hospital(body: Any) -> Dict[str, Any]:
    """The object the portal's form sends (hospitalForm.js validateHospital). `verified` is never taken from it."""
    if not isinstance(body, dict):
        raise HospitalInputError("The body must be a JSON object")
    name, address, phone = body.get("name"), body.get("address"), body.get("phone")
    if not isinstance(name, str) or not 3 <= len(name.strip()) <= 80:
        raise HospitalInputError("name must be 3 to 80 characters")
    if not isinstance(address, str) or not address.strip():
        raise HospitalInputError("address is required")
    if not isinstance(phone, str) or not 7 <= len(phone.strip()) <= 20 or not _PHONE.fullmatch(phone.strip()):
        raise HospitalInputError("phone must be 7 to 20 characters: digits, spaces or dashes, may start with +")
    lat, lng = body.get("lat"), body.get("lng")
    if not (_number(lat) and _number(lng)) or not (-90 <= lat <= 90 and -180 <= lng <= 180):
        raise HospitalInputError("lat must be between -90 and 90 and lng between -180 and 180")
    caps = body.get("capabilities")
    if not isinstance(caps, dict) or set(caps) != set(CAPABILITIES) or not all(isinstance(v, bool) for v in caps.values()):
        raise HospitalInputError("capabilities must have cath_lab, stroke_unit, icu and emergency, each true or false")
    if not any(caps.values()):
        raise HospitalInputError("at least one capability must be true")
    avail = body.get("availability")
    wanted = {"beds_free", "icu_free", "cath_lab_ready", "stroke_unit_ready"}
    if not isinstance(avail, dict) or set(avail) != wanted:
        raise HospitalInputError("availability must have beds_free, icu_free, cath_lab_ready and stroke_unit_ready")
    if not (_whole(avail["beds_free"]) and _whole(avail["icu_free"])):
        raise HospitalInputError("beds_free and icu_free must be whole numbers, 0 or more")
    if not (isinstance(avail["cath_lab_ready"], bool) and isinstance(avail["stroke_unit_ready"], bool)):
        raise HospitalInputError("cath_lab_ready and stroke_unit_ready must be true or false")
    for flag, needs in READY_NEEDS.items():
        if avail[flag] and not caps[needs]:
            raise HospitalInputError(f"{flag} cannot be true: this hospital has no {needs.replace('_', ' ')}")
    return {"name": name.strip(), "address": address.strip(), "phone": phone.strip(), "lat": float(lat), "lng": float(lng),
            "capabilities": dict(caps), "availability": dict(avail)}


def _assign(hospital: Hospital, clean: Dict[str, Any]) -> None:
    hospital.name, hospital.address, hospital.phone = clean["name"], clean["address"], clean["phone"]
    hospital.lat, hospital.lng = clean["lat"], clean["lng"]
    caps, avail = clean["capabilities"], clean["availability"]
    hospital.cap_cath_lab, hospital.cap_stroke_unit = caps["cath_lab"], caps["stroke_unit"]
    hospital.cap_icu, hospital.cap_emergency = caps["icu"], caps["emergency"]
    hospital.beds_free, hospital.icu_free = avail["beds_free"], avail["icu_free"]
    hospital.cath_lab_ready, hospital.stroke_unit_ready = avail["cath_lab_ready"], avail["stroke_unit_ready"]


def _next_id(session: Session) -> str:
    numbers = [int(m.group(1)) for (hid,) in session.query(Hospital.id).all() if (m := _ID.fullmatch(hid))]
    return f"HSP-AMD-{max(numbers, default=0) + 1:03d}"


def create_hospital(session: Session, clean: Dict[str, Any]) -> Hospital:
    """New hospitals start UNVERIFIED: they are never alerted until an admin verifies them."""
    hospital = Hospital(id=_next_id(session), verified=False)
    _assign(hospital, clean)
    session.add(hospital)
    session.flush()
    return hospital


def update_hospital(hospital: Hospital, clean: Dict[str, Any]) -> Hospital:
    """Edits everything the form holds EXCEPT `verified` (only the verify call changes that)."""
    _assign(hospital, clean)
    return hospital
