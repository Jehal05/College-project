"""Which verified hospital is alerted first (simulated ranking, feature 7).

A pure ranking, shared by the SOS and by anything that lists hospitals. Only VERIFIED hospitals that have an
emergency department are ever candidates. Order: hospitals that can do what this type needs and are ready first,
then the nearest. The score is draft logic for the prototype, not a clinical decision.
"""
import math
from typing import Dict, Iterable, List, Optional, Tuple

from app.models.hospitals import Hospital

# What each emergency type needs: (capability, readiness flag that must also be true, or None)
REQUIRED: Dict[str, Tuple[str, Optional[str]]] = {
    "HEART": ("cath_lab", "cath_lab_ready"),
    "STROKE": ("stroke_unit", "stroke_unit_ready"),
    "ASTHMA": ("icu", None),
    "DIABETIC": ("emergency", None),
}
DEMO_LOCATION = {"lat": 23.0225, "lng": 72.5714}     # Ahmedabad, used when the patient shared no location


def distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance (haversine)."""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    d_lat, d_lng = math.radians(lat2 - lat1), math.radians(lng2 - lng1)
    a = math.sin(d_lat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(d_lng / 2) ** 2
    return 6371 * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def is_suitable(hospital: Hospital, emergency_type: str) -> bool:
    capability, ready = REQUIRED.get(emergency_type, ("emergency", None))
    caps, avail = hospital.capabilities, hospital.availability
    return bool(caps.get("emergency") and caps.get(capability) and (ready is None or avail.get(ready)))


def rank_hospitals(hospitals: Iterable[Hospital], emergency_type: str,
                   location: Optional[Dict[str, float]] = None) -> List[dict]:
    """[{hospital, distance_km, rank, suitable}] best first. Rank 1 is alerted."""
    where = location or DEMO_LOCATION
    scored = []
    for h in hospitals:
        if not h.verified or not h.cap_emergency:
            continue
        scored.append({"hospital": h, "suitable": is_suitable(h, emergency_type),
                       "distance_km": round(distance_km(where["lat"], where["lng"], h.lat, h.lng), 2)})
    scored.sort(key=lambda s: (not s["suitable"], s["distance_km"], s["hospital"].id))
    for index, item in enumerate(scored, start=1):
        item["rank"] = index
    return scored
