"""The app must not start without an encryption key (outside demo mode)."""
import sqlite3

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import inspect

from app import db as db_module
from app.main import app
from app.security import crypto
from app.security.crypto import CryptoConfigError
from app.security.passport_token import TokenConfigError


@pytest.fixture
def file_db(tmp_path, monkeypatch):
    path = tmp_path / "startup.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{path}")
    db_module.reset_engine()
    yield path
    db_module.reset_engine()


def test_missing_key_stops_startup_outside_demo_mode(monkeypatch, file_db):
    monkeypatch.delenv("FERNET_KEY")
    crypto.reset_cipher()
    with pytest.raises(CryptoConfigError):
        with TestClient(app):
            pass
    assert not file_db.exists()  # it stopped before touching the database


def test_invalid_key_stops_startup(monkeypatch, file_db):
    monkeypatch.setenv("FERNET_KEY", "definitely-not-valid")
    crypto.reset_cipher()
    with pytest.raises(CryptoConfigError):
        with TestClient(app):
            pass


def test_valid_key_starts_and_creates_tables_with_wal(file_db):
    with TestClient(app) as client:
        assert client.get("/health").json()["status"] == "ok"
        tables = set(inspect(db_module.get_engine()).get_table_names())
    assert {"patients", "contacts", "reports", "consents"} <= tables
    with sqlite3.connect(file_db) as conn:
        assert conn.execute("PRAGMA journal_mode").fetchone()[0].lower() == "wal"
        triggers = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='trigger'")}
    assert {"consents_no_update", "consents_no_delete"} <= triggers


def test_demo_mode_without_key_starts_with_a_warning(monkeypatch, file_db, capsys):
    monkeypatch.delenv("FERNET_KEY")
    monkeypatch.setenv("DEMO_MODE", "true")
    crypto.reset_cipher()
    with TestClient(app) as client:
        assert client.get("/health").status_code == 200
    assert "NOT safe" in capsys.readouterr().err


def test_missing_signing_key_stops_startup_outside_demo_mode(monkeypatch, file_db):
    monkeypatch.delenv("JWT_SECRET_KEY")
    with pytest.raises(TokenConfigError):
        with TestClient(app):
            pass
    assert not file_db.exists()


def test_placeholder_signing_key_stops_startup(monkeypatch, file_db):
    monkeypatch.setenv("JWT_SECRET_KEY", "replace-with-a-long-random-string")
    with pytest.raises(TokenConfigError):
        with TestClient(app):
            pass


def test_audit_table_and_triggers_exist_after_startup(file_db):
    with TestClient(app):
        tables = set(inspect(db_module.get_engine()).get_table_names())
    assert "audit_log" in tables
    with sqlite3.connect(file_db) as conn:
        triggers = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='trigger'")}
    assert {"audit_log_no_update", "audit_log_no_delete"} <= triggers
