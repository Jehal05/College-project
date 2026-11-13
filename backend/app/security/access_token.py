"""Login (session) tokens (feature 33).

A signed JWT with sub (the user id), role, purpose "access", iat and exp. Signed with JWT_SECRET_KEY, like the
passport tokens, but the `purpose` claim keeps the two apart: a login token cannot open a passport and a passport
token cannot log anyone in (both directions are tested).

The token only PROVES who the user is. On every request the server looks the user up again, so a disabled
account or a changed role takes effect immediately.
"""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

import jwt

from app.security.passport_token import signing_secret

ALGORITHM = "HS256"
PURPOSE = "access"
DEFAULT_EXPIRE_MINUTES = 480       # 8 hours: long enough for a rehearsal, short enough to matter


class AccessTokenError(Exception):
    """The login token cannot be used. `code` is 'expired' or 'invalid'."""

    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def expire_minutes() -> int:
    try:
        value = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", DEFAULT_EXPIRE_MINUTES))
    except ValueError:
        return DEFAULT_EXPIRE_MINUTES
    return value if value > 0 else DEFAULT_EXPIRE_MINUTES


def create_access_token(user_id: str, role: str, *, minutes: Optional[int] = None,
                        now: Optional[datetime] = None) -> Tuple[str, datetime]:
    issued = now or datetime.now(timezone.utc)
    expires = issued + timedelta(minutes=expire_minutes() if minutes is None else minutes)
    claims = {"sub": user_id, "role": role, "purpose": PURPOSE, "iat": issued, "exp": expires}
    return jwt.encode(claims, signing_secret(), algorithm=ALGORITHM), expires


def verify_access_token(token: str) -> dict:
    """Return the claims, or raise AccessTokenError('expired' | 'invalid')."""
    try:
        claims = jwt.decode(token, signing_secret(), algorithms=[ALGORITHM],
                            options={"require": ["exp", "iat", "sub"]})
    except jwt.ExpiredSignatureError:
        raise AccessTokenError("expired") from None
    except jwt.PyJWTError:
        raise AccessTokenError("invalid") from None
    if claims.get("purpose") != PURPOSE or not isinstance(claims.get("sub"), str) or not isinstance(claims.get("role"), str):
        raise AccessTokenError("invalid")
    return claims
