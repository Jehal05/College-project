"""Shared FastAPI dependencies."""
from typing import Callable, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.security.actor import Actor
from app.sim.history import History, generate_history


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


def get_family_link_checker() -> Callable[[Session, Actor, str], bool]:
    """Returns a function that says whether a FAMILY user is linked to a patient.

    TODO(feature 61): the family link table does not exist yet. Until it does,
    nobody is linked, so family members are refused. Replace this with a real
    lookup. Tests override this dependency to check the consent rules.
    """
    return lambda session, actor, patient_id: False


def get_history_provider() -> Callable[[str], History]:
    """Returns a function that makes the (synthetic) wearable history for a patient.

    Tests override this to try empty, calm or stressed data.
    """
    return lambda patient_id: generate_history(patient_id)
