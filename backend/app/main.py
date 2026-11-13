"""HealthTwin AI backend entry point.

Routers are added here as each feature is built. Routes that need login stay
closed (they answer 501) until require_role() exists.
"""
from fastapi import FastAPI

from app.api import demo_vitals

app = FastAPI(
    title="HealthTwin AI Backend",
    description="Simulated prototype. Not a medical device. Supports emergency "
    "escalation; it does not diagnose.",
    version="0.1.0",
)

app.include_router(demo_vitals.router)


@app.get("/health", tags=["system"])
def health() -> dict:
    return {"status": "ok", "simulated": True}
