"""Shared FastAPI dependencies."""
from typing import Optional

from fastapi import HTTPException

from app.security.actor import Actor


def get_current_actor() -> Actor:
    """FAILS CLOSED until login exists (Phase 1, Task 3).

    Replace the body with: read the JWT, build Actor(user_id, role, patient_id).
    Tests use app.dependency_overrides[get_current_actor].
    """
    raise HTTPException(
        status_code=501,
        detail="Login is not wired yet. Replace get_current_actor with the JWT-based version.",
    )


def get_optional_actor() -> Optional[Actor]:
    """Returns the logged-in user, or None when nobody is logged in.

    Until login exists (Phase 1, Task 3) it always returns None, so endpoints that
    accept either a token or a login only work with a token. Replace it with a
    version that reads an optional Authorization header.
    """
    return None
