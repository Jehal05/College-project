"""Shared test setup: a fresh encryption key and a fresh in-memory database per test."""
import secrets

import pytest
from cryptography.fernet import Fernet
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app import db as db_module
from app.api.deps import get_current_actor, get_optional_actor
from app.main import app
from app.models.patient_data import Contact, Patient, Report
from app.security import crypto, passport_token


@pytest.fixture(autouse=True)
def fresh_key(monkeypatch):
    monkeypatch.setenv("FERNET_KEY", Fernet.generate_key().decode())
    monkeypatch.delenv("FERNET_OLD_KEYS", raising=False)
    monkeypatch.delenv("DEMO_MODE", raising=False)
    monkeypatch.setenv("JWT_SECRET_KEY", "test-signing-key-" + secrets.token_urlsafe(32))
    monkeypatch.delenv("PASSPORT_TOKEN_EXPIRE_MINUTES", raising=False)
    crypto.reset_cipher()
    passport_token.reset_demo_secret()
    yield
    crypto.reset_cipher()
    passport_token.reset_demo_secret()


@pytest.fixture
def engine():
    eng = db_module.make_engine("sqlite://")
    db_module.init_db(eng)
    yield eng
    eng.dispose()


@pytest.fixture
def session(engine):
    with Session(engine, expire_on_commit=False) as s:
        yield s


@pytest.fixture
def patients(session):
    session.add_all([
        Patient(id="pat_001", name="Demo Patient", age=58, blood_group="B+",
                conditions=["hypertension"], allergies=["penicillin"], medications=["amlodipine"]),
        Patient(id="pat_002", name="Other Patient", age=41, blood_group="O+",
                conditions=["asthma"], allergies=[], medications=[]),
    ])
    session.commit()
    return session


class Api:
    """A test client wired to the in-memory database, with switchable logins."""

    def __init__(self, client, state):
        self.client, self._state = client, state

    def login_as(self, actor):
        """For endpoints that always need login (get_current_actor)."""
        self._state["actor"] = actor

    def view_as(self, actor):
        """For endpoints that accept login OR a token (get_optional_actor)."""
        self._state["viewer"] = actor

    def __getattr__(self, name):
        return getattr(self.client, name)


@pytest.fixture
def api(engine, patients):
    state = {"actor": None, "viewer": None}

    def db_override():
        with Session(engine, expire_on_commit=False) as s:
            yield s

    app.dependency_overrides[db_module.get_db] = db_override
    app.dependency_overrides[get_current_actor] = lambda: state["actor"]
    app.dependency_overrides[get_optional_actor] = lambda: state["viewer"]
    yield Api(TestClient(app), state)
    app.dependency_overrides.clear()
