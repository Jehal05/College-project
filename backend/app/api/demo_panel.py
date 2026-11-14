"""POST /demo/reset and POST /demo/scenario. DEMO_MODE only, any logged-in user (see require_demo_access).

Outside DEMO_MODE neither route exists: 404 for everybody, logged in or not.
"""
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import require_demo_access
from app.db import get_db
from app.security.actor import Actor
from app.services import demo as demo_service
from app.seed.demo_data import DEMO_PATIENT_ID
from app.services import events

router = APIRouter(prefix="/demo", tags=["demo"])


@router.post("/reset")
def reset_demo(actor: Actor = Depends(require_demo_access), db: Session = Depends(get_db)) -> dict:
    """Back to the start: seed data, no emergencies, emergency numbers from 0001, simulators normal."""
    seeded = demo_service.reset_everything(db)
    events.discard(db)
    return {"status": "reset", "ok": True, "seeded": seeded, "simulated": True}


@router.post("/scenario", status_code=201)
def run_scenario(body: Dict[str, Any], actor: Actor = Depends(require_demo_access),
                 db: Session = Depends(get_db)) -> dict:
    """Start a ready-made emergency for the demo patient and send its SOS. Body `{ type }` (or `{ scenario }`)."""
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="The body must be a JSON object")
    name: Optional[Any] = body.get("type", body.get("scenario"))
    try:
        emergency = demo_service.run_scenario(db, actor, name)
    except demo_service.UnknownScenario as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from None
    except LookupError as exc:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(exc)) from None
    db.commit()
    events.flush(db)
    return {"id": emergency.id, "state": emergency.state, "type": emergency.type, "severity": emergency.severity,
            "simulated": True}


@router.get("/state")
def demo_state(actor: Actor = Depends(require_demo_access)) -> dict:
    """The demo panel's view: the speed and the wearable profile (for the caller's patient, else the demo patient)."""
    return demo_service.state(actor.patient_id or DEMO_PATIENT_ID)


@router.post("/speed")
def demo_speed(body: Dict[str, Any], actor: Actor = Depends(require_demo_access)) -> dict:
    """Speed up timed demo steps. Body `{ multiplier }`: 1, 2, 5, 10 or 20. Reset sets it back to 1."""
    try:
        return {"speed": demo_service.set_speed(body.get("multiplier") if isinstance(body, dict) else None)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None
