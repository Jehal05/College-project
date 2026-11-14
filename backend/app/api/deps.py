"""Shared FastAPI dependencies: who is calling (feature 33), and which endpoints are open to whom."""
from enum import Enum
from typing import Callable, Optional

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.config import demo_mode
from app.db import get_db
from app.models.accounts import User
from app.security.access_token import AccessTokenError, verify_access_token
from app.security.actor import Actor
from app.sim.history import History, generate_history

_LOG_IN_AGAIN = "Your login has expired or is not valid. Please log in again."


def _unauthorized(message: str = "Log in to continue") -> HTTPException:
    return HTTPException(status_code=401, detail=message, headers={"WWW-Authenticate": "Bearer"})


def _bearer_token(request: Request) -> Optional[str]:
    """The token from `Authorization: Bearer <token>`, None when there is no header at all."""
    header = request.headers.get("authorization")
    if header is None:
        return None
    scheme, _, value = header.partition(" ")
    if scheme.lower() != "bearer" or not value.strip():
        raise _unauthorized(_LOG_IN_AGAIN)
    return value.strip()


def _actor_for(token: str, db: Session) -> Actor:
    """The token only proves who the user is. The user is looked up again on EVERY request, so a disabled
    account, a deleted account or a changed role takes effect at once."""
    try:
        claims = verify_access_token(token)
    except AccessTokenError:
        raise _unauthorized(_LOG_IN_AGAIN) from None
    user = db.get(User, claims["sub"])
    if user is None or not user.is_active or user.role != claims["role"]:
        raise _unauthorized(_LOG_IN_AGAIN)
    return Actor(user_id=user.id, role=user.role, patient_id=user.patient_id, hospital_id=user.hospital_id)


def get_current_actor(request: Request, db: Session = Depends(get_db)) -> Actor:
    """The logged-in user. No login: 401. A bad, expired or revoked login: 401."""
    token = _bearer_token(request)
    if token is None:
        raise _unauthorized()
    return _actor_for(token, db)


def get_optional_actor(request: Request, db: Session = Depends(get_db)) -> Optional[Actor]:
    """The logged-in user, or None when nobody sent a login. A login that is sent but is bad is still a 401
    (so a desk user with an expired login is told to log in again, not treated as a stranger)."""
    token = _bearer_token(request)
    return None if token is None else _actor_for(token, db)


def require_role(*roles) -> Callable[..., Actor]:
    """A dependency that lets only the given roles in. Anyone else: 403."""
    allowed = {r.value if isinstance(r, Enum) else str(r) for r in roles}

    def dependency(actor: Actor = Depends(get_current_actor)) -> Actor:
        if actor.role not in allowed:
            raise HTTPException(status_code=403, detail="Not allowed")
        return actor

    return dependency


def demo_mode_only() -> None:
    """Outside DEMO_MODE the /demo endpoints do not exist: 404 for everybody, logged in or not."""
    if not demo_mode():
        raise HTTPException(status_code=404, detail="Not found")


def require_demo_access(_demo: None = Depends(demo_mode_only), actor: Actor = Depends(get_current_actor)) -> Actor:
    """DEMO_MODE only, and any logged-in user.

    The patient app's demo panel and the contract script call /demo/* with a patient login, so this is open to
    every role. It is safe only because demo mode is never switched on for a real deployment. To tighten it,
    use require_role("ADMIN") here. (Decision for Daksh: see CONTRACT.md.)
    """
    return actor


def get_family_link_checker() -> Callable[[Session, Actor, str], bool]:
    """Returns a function that says whether a FAMILY user is linked to a patient (feature 61).

    A relative links with an invite code the patient made (POST /family/link). Tests override this dependency
    to check the consent rules without making links.
    """
    from app.services.family import link_checker
    return link_checker


def get_history_provider() -> Callable[[str], History]:
    """Returns a function that makes the (synthetic) wearable history for a patient.

    Tests override this to try empty, calm or stressed data.
    """
    return lambda patient_id: generate_history(patient_id)
