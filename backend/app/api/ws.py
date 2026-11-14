"""The WebSocket (feature 8): ws://host:8000/ws?token=<login token>.

A socket with a bad token is accepted and closed at once with code 1008 (policy violation), so a browser can read
the code. A socket with no token in the address may send {"type": "auth", "token": "..."} within 5 seconds
instead (the portal's message login); it then gets an `auth.ok` event. Until then it hears nothing.
What each user hears is decided in app/services/ws_hub.py.
"""
import asyncio
import json
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


def _login(token: Optional[str], db: Session) -> Optional[Actor]:
    if not token:
        return None
    try:
        return _actor_for(token, db)
    except HTTPException:
        return None


async def _wait_for_login(websocket: WebSocket, db: Session) -> Optional[Actor]:
    try:
        raw = await asyncio.wait_for(websocket.receive_text(), timeout=AUTH_WAIT_SECONDS)
        message = json.loads(raw)
    except (asyncio.TimeoutError, ValueError, WebSocketDisconnect):
        return None
    if not isinstance(message, dict) or message.get("type") != "auth":
        return None
    return _login(message.get("token"), db)


async def _pump(websocket: WebSocket, conn: ws_hub.Connection, actor: Actor, db: Session) -> None:
    while True:
        event = await conn.queue.get()
        db.expire_all()                            # see what the requests just saved
        if ws_hub.visible(db, actor, event):
            await websocket.send_json(ws_hub.public(event))


async def _listen(websocket: WebSocket) -> None:
    """Clients may send pings or {"replay_since": ...}; replay is not built yet, so they are read and ignored."""
    while True:
        await websocket.receive_text()


@router.websocket("/ws")
async def live(websocket: WebSocket, db: Session = Depends(get_db)) -> None:
    await websocket.accept()
    token = websocket.query_params.get("token")
    by_message = not token
    actor = _login(token, db) if token else await _wait_for_login(websocket, db)
    if actor is None:
        await websocket.close(code=POLICY_VIOLATION)
        return
    conn = ws_hub.hub.register(asyncio.get_running_loop(), actor.patient_id if actor.role == "PATIENT" else None)
    tasks = []
    try:
        if by_message:
            await websocket.send_json(ws_hub.public(events.build("auth.ok", {})))
        tasks = [asyncio.create_task(_pump(websocket, conn, actor, db)), asyncio.create_task(_listen(websocket))]
        done, _pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
        for task in done:
            task.exception()                       # read it so a closed socket does not log "never retrieved"
    except WebSocketDisconnect:
        pass
    finally:
        for task in tasks:
            task.cancel()
        ws_hub.hub.unregister(conn)
