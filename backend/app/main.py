"""HealthTwin AI backend entry point.

Routers are added here as each feature is built. Login is real: a route without a valid
login answers 401.
"""
import asyncio
import logging
import os
from contextlib import asynccontextmanager
from typing import Mapping, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    access_log, admin_users, audit, auth, consents, contacts, content, demo_panel, demo_vitals, emergencies, family, feedback,
    hospital_desk, hospitals, insights, location_shares, passport, passport_links, patients, reminders, reports,
    responders, ws,
)
from app.config import demo_mode, parse_cors_origins
from app.db import get_session_factory, init_db
from app.errors import install_error_handlers
from app.models.accounts import User
from app.security import crypto, passport_token
from app.services import escalation

log = logging.getLogger("healthtwin.main")


def _sweep_once() -> None:
    with get_session_factory()() as session:
        escalation.run_once(session)


async def _sweep_forever() -> None:
    """Once a second: an alert nobody acknowledged in time goes to the next hospital."""
    try:
        every = float(os.environ.get("ESCALATION_SWEEP_SECONDS", "1"))
    except ValueError:
        every = 1.0
    while True:
        await asyncio.sleep(max(every, 0.2))
        try:
            await asyncio.to_thread(_sweep_once)
        except Exception:                       # noqa: BLE001  the sweep must never stop the app
            log.exception("escalation sweep failed")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    crypto.startup_check()          # no FERNET_KEY outside DEMO_MODE stops the app here
    passport_token.startup_check()  # same for JWT_SECRET_KEY
    init_db()
    if demo_mode():                 # demo data loads ONLY in demo mode, and only into an empty database
        from app.seed.demo_data import seed_demo
        with get_session_factory()() as session:
            if session.query(User).first() is None:
                seed_demo(session)
    sweeper = asyncio.create_task(_sweep_forever())
    try:
        yield
    finally:
        sweeper.cancel()


def create_app(environ: Optional[Mapping[str, str]] = None) -> FastAPI:
    """Build the app. CORS comes from CORS_ALLOW_ORIGINS; a bad value stops the app from starting."""
    env = os.environ if environ is None else environ
    origins = parse_cors_origins(env.get("CORS_ALLOW_ORIGINS", ""))

    application = FastAPI(
        title="HealthTwin AI Backend",
        description="Simulated prototype. Not a medical device. Supports emergency "
        "escalation; it does not diagnose.",
        version="0.1.0",
        lifespan=lifespan,
    )
    install_error_handlers(application)
    if origins:
        application.add_middleware(
            CORSMiddleware,
            allow_origins=origins,               # an allow-list, never "*"
            allow_credentials=False,             # we use Authorization headers, not cookies
            allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            allow_headers=["Authorization", "Content-Type"],
            max_age=600,
        )

    application.include_router(auth.router)
    application.include_router(demo_vitals.router)
    application.include_router(demo_panel.router)
    application.include_router(patients.router)
    application.include_router(contacts.router)
    application.include_router(consents.router)
    application.include_router(passport.router)
    application.include_router(audit.router)
    application.include_router(insights.router)
    application.include_router(emergencies.router)
    application.include_router(hospital_desk.router)
    application.include_router(hospitals.router)
    application.include_router(ws.router)
    application.include_router(reports.router)
    application.include_router(reminders.router)
    application.include_router(passport_links.router)
    application.include_router(family.router)
    application.include_router(responders.router)
    application.include_router(admin_users.router)
    application.include_router(content.router)
    application.include_router(feedback.router)
    application.include_router(location_shares.router)
    application.include_router(access_log.router)

    @application.get("/health", tags=["system"])
    def health() -> dict:
        return {"status": "ok", "simulated": True}

    return application


app = create_app()
