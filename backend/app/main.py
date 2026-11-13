"""HealthTwin AI backend entry point.

Routers are added here as each feature is built. Routes that need login stay
closed (they answer 501) until the JWT login exists.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api import audit, consents, demo_vitals, passport
from app.db import init_db
from app.security import crypto, passport_token


@asynccontextmanager
async def lifespan(_app: FastAPI):
    crypto.startup_check()          # no FERNET_KEY outside DEMO_MODE stops the app here
    passport_token.startup_check()  # same for JWT_SECRET_KEY
    init_db()
    yield


app = FastAPI(
    title="HealthTwin AI Backend",
    description="Simulated prototype. Not a medical device. Supports emergency "
    "escalation; it does not diagnose.",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(demo_vitals.router)
app.include_router(consents.router)
app.include_router(passport.router)
app.include_router(audit.router)


@app.get("/health", tags=["system"])
def health() -> dict:
    return {"status": "ok", "simulated": True}
