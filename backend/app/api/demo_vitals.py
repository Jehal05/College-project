"""POST /demo/vitals (feature 13). DEMO_MODE only, any logged-in user (see require_demo_access)."""
from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import require_demo_access
from pydantic import BaseModel, ConfigDict

from app.sim.wearable import WearableError, registry

router = APIRouter(prefix="/demo", tags=["demo"])


class DemoVitalsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    patient_id: str = "pat_001"
    profile: Optional[str] = None
    # {"heart_rate": 150} pins a value, {"heart_rate": null} clears it, {} clears all.
    overrides: Optional[Dict[str, Optional[float]]] = None


@router.post("/vitals", dependencies=[Depends(require_demo_access)])
def set_demo_vitals(body: DemoVitalsRequest) -> dict:
    if body.profile is None and body.overrides is None:
        raise HTTPException(status_code=400, detail="Send a profile, overrides, or both")
    sim = registry.get(body.patient_id)
    try:
        sim.apply(profile=body.profile, overrides=body.overrides)
    except WearableError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {
        "patient_id": body.patient_id,
        "profile": sim.profile,
        "overrides": sim.overrides,
        "reading": sim.last_reading.to_dict(),
        "simulated": True,
    }
