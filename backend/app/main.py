"""HealthTwin AI backend entry point.

Task 1 only: a bare FastAPI app so `docker compose up` works and /docs opens.
Routers (auth, emergencies, hospitals, ...) are added in later tasks.
"""
from fastapi import FastAPI

app = FastAPI(
    title="HealthTwin AI Backend",
    description="Simulated prototype. Not a medical device. Supports emergency "
    "escalation; it does not diagnose.",
    version="0.1.0",
)


@app.get("/health", tags=["system"])
def health() -> dict:
    return {"status": "ok", "simulated": True}
