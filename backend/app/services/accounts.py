"""User accounts: new ids, and the admin list and changes (J4)."""
import re
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.accounts import User
from app.models.apps import ResponderProfile
from app.models.enums import Role

ROLES = tuple(r.value for r in Role)
_USER_ID = re.compile(r"usr_(\d+)")


class AccountError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status


def next_user_id(session: Session) -> str:
    """usr_001, usr_002 ... one more than the highest number now in use."""
    highest = 0
    for (value,) in session.query(User.id).all():
        match = _USER_ID.fullmatch(value)
        if match:
            highest = max(highest, int(match.group(1)))
    return f"usr_{highest + 1:03d}"


def user_row(session: Session, user: User) -> dict:
    """Never a password, hash or token. `email` is the login the person types."""
    row: Dict[str, Any] = {"id": user.id, "email": user.login, "role": user.role, "disabled": not user.is_active}
    if user.role == "RESPONDER":
        profile = session.get(ResponderProfile, user.id)
        row["verified"] = bool(profile and profile.verified)
    if user.hospital_id:
        row["hospital_id"] = user.hospital_id
    if user.patient_id:
        row["patient_id"] = user.patient_id
    return row


def list_users(session: Session, role: Optional[str]) -> List[dict]:
    if role is not None and role not in ROLES:
        raise AccountError(400, "role must be one of " + ", ".join(ROLES))
    query = session.query(User)
    if role:
        query = query.filter(User.role == role)
    return [user_row(session, u) for u in query.order_by(User.id).all()]


def clean_patch(body) -> Dict[str, Any]:
    if not isinstance(body, dict):
        raise AccountError(400, "Send a JSON object")
    if not isinstance(body.get("id"), str) or not body["id"].strip():
        raise AccountError(400, "id is required")
    changes = {k: body[k] for k in ("disabled", "role", "verified") if k in body}
    if not changes:
        raise AccountError(400, "Send disabled, role or verified")
    for key in ("disabled", "verified"):
        if key in changes and not isinstance(changes[key], bool):
            raise AccountError(400, f"{key} must be true or false")
    if "role" in changes and changes["role"] not in ROLES:
        raise AccountError(400, "role must be one of " + ", ".join(ROLES))
    return {"id": body["id"].strip(), **changes}


def update_user(session: Session, admin_id: str, data: Dict[str, Any]):
    """Returns (row, changed field names). 404 unknown user, 409 for the admin's own account or a role that cannot fit."""
    user = session.get(User, data["id"])
    if user is None:
        raise AccountError(404, "User not found")
    if user.id == admin_id and (data.get("disabled") is True or ("role" in data and data["role"] != "ADMIN")):
        raise AccountError(409, "You cannot disable or demote your own account")
    new_role = data.get("role", user.role)
    if "role" in data:
        if new_role == "PATIENT" and not user.patient_id:
            raise AccountError(409, "A patient account needs a linked patient")
        if new_role == "HOSPITAL_STAFF" and not user.hospital_id:
            raise AccountError(409, "A hospital desk account needs a linked hospital")
    if "verified" in data and new_role != "RESPONDER":
        raise AccountError(409, "Only a volunteer responder account can be verified")
    if "disabled" in data:
        user.is_active = not data["disabled"]
    if "role" in data:
        user.role = new_role
    if "verified" in data:
        profile = session.get(ResponderProfile, user.id)
        if profile is None:
            session.add(ResponderProfile(user_id=user.id, verified=data["verified"]))
        else:
            profile.verified = data["verified"]
    session.flush()
    return user_row(session, user), sorted(k for k in ("disabled", "role", "verified") if k in data)
