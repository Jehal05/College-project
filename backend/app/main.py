"""HealthTwin AI backend entry point.

Routers are added here as each feature is built. Login is real: a route without a valid
login answers 401.
"""
import os
from contextlib import asynccontextmanager
from typing import Mapping, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import audit, auth, consents, contacts, demo_vitals, emergencies, insights, passport, patients
from app.config import demo_mode, parse_cors_origins
from app.db import get_session_factory, init_db
from app.errors import install_error_handlers
from app.models.accounts import User
from app.security import crypto, passport_token


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
    yield


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
    application.include_router(patients.router)
    application.include_router(contacts.router)
    application.include_router(consents.router)
    application.include_router(passport.router)
    application.include_router(audit.router)
    application.include_router(insights.router)
    application.include_router(emergencies.router)

    @application.get("/health", tags=["system"])
    def health() -> dict:
        return {"status": "ok", "simulated": True}

    return application


app = create_app()
