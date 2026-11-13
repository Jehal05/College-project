"""POST /demo/vitals (feature 13). ADMIN only, for the demo control panel."""
from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict

from app.sim.wearable import WearableError, registry

router = APIRouter(prefix="/demo", tags=["demo"])


def require_admin() -> None:
    """Placeholder that FAILS CLOSED until login exists (Phase 1, Task 3).

    When require_role("ADMIN") is built, replace this function body or use
    app.dependency_overrides. Until then the endpoint answers 501, so it can
    never be used without authentication.
    """
    raise HTTPException(
        status_code=501,
        detail="Admin authentication is not wired yet. Replace require_admin with require_role('ADMIN').",
    )


class DemoVitalsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    patient_id: str = "pat_001"
    profile: Optional[str] = None
    # {"heart_rate": 150} pins a value, {"heart_rate": null} clears it, {} clears all.
    overrides: Optional[Dict[str, Optional[float]]] = None


@router.post("/vitals", dependencies=[Depends(require_admin)])
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
