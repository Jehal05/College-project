"""The vitals a patient app reads (feature 2).

Until the one-reading-per-second stream exists (WebSocket task), a request makes the simulator take one new
step when its latest reading is from an earlier second, and otherwise reuses the latest reading. So two calls in
the same second give the same numbers, and the numbers drift smoothly over time. ALL DATA IS SIMULATED.
"""
from datetime import datetime, timezone
from typing import Optional

from app.sim.wearable import registry as default_registry

_FORMAT = "%Y-%m-%dT%H:%M:%SZ"


def current_vitals(patient_id: str, *, registry=None, now: Optional[datetime] = None) -> dict:
    sim = (registry or default_registry).get(patient_id)
    moment = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    reading = sim.last_reading
    if reading.timestamp != moment.strftime(_FORMAT):
        reading = sim.tick()
    v = reading.values
    return {
        "patient_id": patient_id,
        "heart_rate": v["heart_rate"],
        "spo2": v["spo2"],
        "bp": f"{v['bp_sys']}/{v['bp_dia']}",       # the apps read the combined text
        "bp_sys": v["bp_sys"],
        "bp_dia": v["bp_dia"],
        "glucose": v["glucose"],
        "resp_rate": v["resp_rate"],
        "timestamp": reading.timestamp,
        "simulated": True,
    }
