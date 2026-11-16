"""A socket must stop hearing alerts when its login dies while it is open (Phase 7B, DEMO_ISSUES_PHASE4 item 5).

Dead means: the token has expired, or the account was disabled. The server closes the socket with 1008 and sends
nothing more. A normal desk keeps hearing what it is allowed to hear.
Timing: WS_RECHECK_SECONDS is set small in the tests that need the timer. The longest wait is the expiry test, about 6 s.
Tokens and passwords are never printed in a failure message.
"""
import time
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.orm import Session
from starlette.websockets import WebSocketDisconnect

from app.models.accounts import User
from app.security.access_token import create_access_token
from app.services import events

STAFF = ("staff@demo.test", "demo1234")
HOSPITALS_NEWS = dict(audience="hospitals")


@pytest.fixture(autouse=True)
def clean_hub():
    events.clear_subscribers()
    yield
    events.clear_subscribers()


def disable(engine, login):
    with Session(engine) as s:
        s.query(User).filter(User.login == login).first().is_active = False
        s.commit()


def token_that_expires_in(engine, login, seconds):
    """A valid login token for that user whose expiry is about `seconds` from now (the repo's token helper counts in minutes)."""
    with Session(engine) as s:
        user = s.query(User).filter(User.login == login).first()
        issued = datetime.now(timezone.utc) - timedelta(minutes=1) + timedelta(seconds=seconds)
        return create_access_token(user.id, user.role, minutes=1, now=issued)[0]


def assert_closed_with_1008(ws):
    with pytest.raises(WebSocketDisconnect) as info:
        ws.receive_json()
    assert info.value.code == 1008


def test_a_normal_desk_keeps_hearing_events_across_several_rechecks(demo, monkeypatch):
    monkeypatch.setenv("WS_RECHECK_SECONDS", "0.2")
    with demo.websocket_connect("/ws?token=" + demo.token(*STAFF)) as ws:
        events.publish("hospital.availability_updated", {"n": 1}, **HOSPITALS_NEWS)
        assert ws.receive_json()["event"] == "hospital.availability_updated"
        time.sleep(0.7)                                  # three or four timer checks pass
        events.publish("hospital.availability_updated", {"n": 2}, **HOSPITALS_NEWS)
        assert ws.receive_json()["payload"]["n"] == 2


def test_a_disabled_account_is_closed_before_its_next_event_is_sent(demo, engine, monkeypatch):
    monkeypatch.setenv("WS_RECHECK_SECONDS", "3600")     # the timer cannot fire: this proves the per-event check
    with demo.websocket_connect("/ws?token=" + demo.token(*STAFF)) as ws:
        events.publish("hospital.availability_updated", {"n": 1}, **HOSPITALS_NEWS)
        assert ws.receive_json()["event"] == "hospital.availability_updated"
        disable(engine, STAFF[0])
        events.publish("hospital.availability_updated", {"n": 2}, **HOSPITALS_NEWS)
        assert_closed_with_1008(ws)                      # the event is not delivered: the socket closes instead


def test_a_disabled_account_is_closed_by_the_timer_with_no_event(demo, engine, monkeypatch):
    monkeypatch.setenv("WS_RECHECK_SECONDS", "0.2")
    with demo.websocket_connect("/ws?token=" + demo.token(*STAFF)) as ws:
        events.publish("hospital.availability_updated", {"n": 1}, **HOSPITALS_NEWS)
        assert ws.receive_json()["event"] == "hospital.availability_updated"
        disable(engine, STAFF[0])
        assert_closed_with_1008(ws)                      # nothing was published: only the timer can close it


def test_an_expired_token_is_closed_by_the_timer(demo, engine, monkeypatch):
    monkeypatch.setenv("WS_RECHECK_SECONDS", "0.2")
    token = token_that_expires_in(engine, STAFF[0], 5)
    with demo.websocket_connect("/ws?token=" + token) as ws:
        events.publish("hospital.availability_updated", {"n": 1}, **HOSPITALS_NEWS)
        assert ws.receive_json()["event"] == "hospital.availability_updated"   # it was valid when the socket opened
        assert_closed_with_1008(ws)                                           # about 5 s later the timer closes it


def test_an_expired_token_is_not_sent_the_next_event(demo, engine, monkeypatch):
    monkeypatch.setenv("WS_RECHECK_SECONDS", "3600")     # per-event check only
    token = token_that_expires_in(engine, STAFF[0], 3)
    with demo.websocket_connect("/ws?token=" + token) as ws:
        events.publish("hospital.availability_updated", {"n": 1}, **HOSPITALS_NEWS)
        assert ws.receive_json()["event"] == "hospital.availability_updated"
        time.sleep(3.5)                                  # now past the expiry; no timer will fire
        events.publish("hospital.availability_updated", {"n": 2}, **HOSPITALS_NEWS)
        assert_closed_with_1008(ws)


def test_a_dead_login_sent_by_message_is_closed_the_same_way(demo, engine, monkeypatch):
    monkeypatch.setenv("WS_RECHECK_SECONDS", "0.2")
    with demo.websocket_connect("/ws") as ws:
        ws.send_json({"type": "auth", "token": demo.token(*STAFF)})
        assert ws.receive_json()["event"] == "auth.ok"
        disable(engine, STAFF[0])
        assert_closed_with_1008(ws)


def test_the_recheck_setting_ignores_nonsense(monkeypatch):
    from app.api.ws import DEFAULT_RECHECK_SECONDS, recheck_seconds
    for bad in ("", "abc", "0", "-5"):
        monkeypatch.setenv("WS_RECHECK_SECONDS", bad)
        assert recheck_seconds() == DEFAULT_RECHECK_SECONDS
    monkeypatch.setenv("WS_RECHECK_SECONDS", "0.5")
    assert recheck_seconds() == 0.5
