"""POST /auth/login (feature 33)."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.accounts import User
from app.security.access_token import create_access_token
from app.security.login_limiter import get_limiter
from app.security.passwords import verify_or_burn

router = APIRouter(tags=["auth"])

WRONG = "Wrong login or password"   # the SAME words for an unknown login, a wrong password and a disabled account


class LoginRequest(BaseModel):
    """The apps send `username` (portal, original contract) or `email` (patient app). `login` is accepted too."""
    model_config = ConfigDict(extra="ignore")

    username: Optional[str] = Field(default=None, max_length=254)
    email: Optional[str] = Field(default=None, max_length=254)
    login: Optional[str] = Field(default=None, max_length=254)
    password: str = Field(max_length=1024)


def _client_address(request: Request) -> str:
    return request.client.host if request.client else "unknown"


@router.post("/auth/login")
def login(body: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)) -> dict:
    identifier = next((v.strip().lower() for v in (body.username, body.email, body.login) if v and v.strip()), "")
    if not identifier or not body.password:
        raise HTTPException(status_code=400, detail="Enter your login and password")

    limiter, address = get_limiter(), _client_address(request)
    wait = limiter.retry_after(identifier, address)
    if wait is not None:
        raise HTTPException(status_code=429, detail="Too many wrong attempts. Please wait and try again.",
                            headers={"Retry-After": str(wait)})

    user = db.query(User).filter(User.login == identifier).one_or_none()
    usable = user is not None and user.is_active
    # Always do the same amount of work, whatever is wrong, so timing does not reveal which logins exist.
    if not verify_or_burn(body.password, user.password_hash if usable else None):
        limiter.record_failure(identifier, address)
        raise HTTPException(status_code=401, detail=WRONG)

    limiter.record_success(identifier)
    response.headers["Cache-Control"] = "no-store"      # a login answer must never be cached
    token, expires = create_access_token(user.id, user.role)
    return {
        "token": token,
        "role": user.role_label or user.role,       # the label is only for the portal's own demo accounts
        "user_id": user.id,
        "patient_id": user.patient_id,
        "hospital_id": user.hospital_id,
        "name": user.display_name,
        "expires_at": expires.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "simulated": True,
    }
