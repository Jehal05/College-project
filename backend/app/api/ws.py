"""The WebSocket (feature 8): ws://host:8000/ws?token=<login token>.

A socket with a bad token is accepted and closed at once with code 1008 (policy violation), so a browser can read
the code. A socket with no token in the address may send {"type": "auth", "token": "..."} within 5 seconds
instead (the portal's message login); it then gets an `auth.ok` event. Until then it hears nothing.
What each user hears is decided in app/services/ws_hub.py.

The login is checked again while the socket stays open (WS_RECHECK_SECONDS, default 30) and before every event
is sent. If the token has expired, or the account was disabled, deleted or given another role, the socket is
closed with 1008 and nothing more is sent. The token is never logged.
"""
import asyncio
import json
import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.api.deps import _actor_for
from app.db import get_db
from app.security.actor import Actor
from app.services import events, ws_hub

router = APIRouter(tags=["websocket"])
AUTH_WAIT_SECONDS = 5.0
POLICY_VIOLATION = 1008
DEFAULT_RECHECK_SECONDS = 30.0


def recheck_seconds() -> float:
    """How often an open socket proves its login again. WS_RECHECK_SECONDS, a number above 0 (read each time, so a test can change it)."""
    try:
        value = float(os.environ.get("WS_RECHECK_SECONDS", DEFAULT_RECHECK_SECONDS))
    except ValueError:
        return DEFAULT_RECHECK_SECONDS
    return value if value > 0 else DEFAULT_RECHECK_SECONDS


class _Login:
    """The login a socket is using: the token (kept only in memory) and the user it proved the last time."""

    def __init__(self, token: str, actor: Actor) -> None:
        self.token = token
        self.actor = actor


def _login(token: Optional[str], db: Session) -> Optional[Actor]:
    if not token:
        return None
    try:
        return _actor_for(token, db)
    except HTTPException:
        return None


async def _wait_for_login(websocket: WebSocket, db: Session) -> Optional[_Login]:
    try:
        raw = await asyncio.wait_for(websocket.receive_text(), timeout=AUTH_WAIT_SECONDS)
        message = json.loads(raw)
    except (asyncio.TimeoutError, ValueError, WebSocketDisconnect):
        return None
    if not isinstance(message, dict) or message.get("type") != "auth":
        return None
    token = message.get("token")
    actor = _login(token, db)
    return _Login(token, actor) if actor is not None else None


def _still_valid(login: _Login, db: Session) -> bool:
    """Prove the login again, the same way a REST call does: signature, expiry, the user exists, is active and has the same role.
    On success the user is refreshed (a changed hospital takes effect). The read transaction is ended at once."""
    db.expire_all()                                # see what other requests saved (a disabled account)
    try:
        actor = _login(login.token, db)
    finally:
        db.rollback()                              # a long-lived socket must not hold a pooled connection
    if actor is None:
        return False
    login.actor = actor
    return True


async def _close_dead(websocket: WebSocket) -> None:
    try:
        await websocket.close(code=POLICY_VIOLATION)
    except RuntimeError:                           # already closed by the client
        pass


async def _pump(websocket: WebSocket, conn: ws_hub.Connection, login: _Login, db: Session) -> None:
    while True:
        event = await conn.queue.get()
        if not _still_valid(login, db):            # a dead login hears nothing more, not even this event
            await _close_dead(websocket)
            return
        db.expire_all()                            # see what the requests just saved
        try:
            allowed = ws_hub.visible(db, login.actor, event)
        finally:
            db.rollback()                          # end the read transaction: a long-lived socket must not hold a pooled connection
        if allowed:
            await websocket.send_json(ws_hub.public(event))


async def _watch(websocket: WebSocket, login: _Login, db: Session) -> None:
    """On a timer, prove the login again even when no event arrives (a quiet desk must not stay open on a dead login)."""
    while True:
        await asyncio.sleep(recheck_seconds())
        if not _still_valid(login, db):
            await _close_dead(websocket)
            return


async def _listen(websocket: WebSocket) -> None:
    """Clients may send pings or {"replay_since": ...}; replay is not built yet, so they are read and ignored."""
    while True:
        await websocket.receive_text()


@router.websocket("/ws")
async def live(websocket: WebSocket, db: Session = Depends(get_db)) -> None:
    await websocket.accept()
    token = websocket.query_params.get("token")
    by_message = not token
    if token:
        actor = _login(token, db)
        login = _Login(token, actor) if actor is not None else None
    else:
        login = await _wait_for_login(websocket, db)
    if login is None:
        await websocket.close(code=POLICY_VIOLATION)
        return
    actor = login.actor
    db.rollback()                                  # the login lookup is done; give the connection back
    conn = ws_hub.hub.register(asyncio.get_running_loop(), actor.patient_id if actor.role == "PATIENT" else None)
    tasks = []
    try:
        if by_message:
            await websocket.send_json(ws_hub.public(events.build("auth.ok", {})))
        tasks = [asyncio.create_task(_pump(websocket, conn, login, db)), asyncio.create_task(_watch(websocket, login, db)),
                 asyncio.create_task(_listen(websocket))]
        done, _pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
        for task in done:
            task.exception()                       # read it so a closed socket does not log "never retrieved"
    except WebSocketDisconnect:
        pass
    finally:
        for task in tasks:
            task.cancel()
        ws_hub.hub.unregister(conn)
