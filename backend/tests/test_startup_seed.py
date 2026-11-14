"""When the real app starts: demo data loads only in demo mode, and only into an empty database."""
import sqlite3

from fastapi.testclient import TestClient

from app.main import create_app


def counts(path):
    with sqlite3.connect(path) as conn:
        return tuple(conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] for t in ("users", "hospitals", "ambulances", "patients"))


def test_a_normal_start_loads_no_demo_data_and_no_demo_passwords(file_db):
    with TestClient(create_app()) as client:
        assert client.get("/health").status_code == 200
    assert counts(file_db) == (0, 0, 0, 0)


def test_a_demo_start_loads_the_demo_data(file_db, monkeypatch):
    monkeypatch.setenv("DEMO_MODE", "true")
    with TestClient(create_app()):
        pass
    assert counts(file_db) == (12, 5, 5, 1)


def test_a_second_demo_start_does_not_load_it_again(file_db, monkeypatch):
    monkeypatch.setenv("DEMO_MODE", "true")
    for _ in range(2):
        with TestClient(create_app()):
            pass
    assert counts(file_db) == (12, 5, 5, 1)


def test_a_demo_start_does_not_touch_a_database_that_already_has_users(file_db, monkeypatch):
    monkeypatch.setenv("DEMO_MODE", "true")
    with TestClient(create_app()):
        pass
    with sqlite3.connect(file_db) as conn:
        conn.execute("DELETE FROM users WHERE login != 'admin1'")
        conn.commit()
    with TestClient(create_app()):
        pass
    assert counts(file_db)[0] == 1              # the lone remaining user was respected, nothing was added back


def test_all_demo_logins_are_hashed_in_the_started_app(file_db, monkeypatch):
    monkeypatch.setenv("DEMO_MODE", "true")
    with TestClient(create_app()):
        pass
    with sqlite3.connect(file_db) as conn:
        hashes = [r[0] for r in conn.execute("SELECT password_hash FROM users")]
    assert len(hashes) == 12 and all(h.startswith("$2b$04$") for h in hashes)      # tests use the cheap cost
