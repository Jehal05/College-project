"""Signed, expiring passport tokens (the link inside the QR code).

HS256 JWT signed with JWT_SECRET_KEY from the environment. Claims: sub (the
patient id), purpose ("passport"), iat and exp. An expired token and a
tampered token are both rejected. A token only opens ONE patient's passport.
"""
import os
import secrets
import sys
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt

from app.config import demo_mode

ALGORITHM = "HS256"
PURPOSE = "passport"
DEFAULT_EXPIRE_MINUTES = 30
_PLACEHOLDER_PREFIX = "replace-with"
_MIN_SECRET_LENGTH = 16

_demo_secret: Optional[str] = None


class TokenConfigError(RuntimeError):
    """JWT_SECRET_KEY is missing or unsafe. The app must not start."""


class PassportTokenError(Exception):
    """The token cannot be used. `code` is a fixed audit reason code."""

    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def _secret() -> str:
    global _demo_secret
    value = (os.environ.get("JWT_SECRET_KEY") or "").strip()
    if value:
        if value.startswith(_PLACEHOLDER_PREFIX) or len(value) < _MIN_SECRET_LENGTH:
            raise TokenConfigError(
                "JWT_SECRET_KEY is a placeholder or too short. Set a long random value in .env "
                "(for example: python -c \"import secrets; print(secrets.token_urlsafe(48))\")."
            )
        return value
    if not demo_mode():
        raise TokenConfigError("JWT_SECRET_KEY is not set. Refusing to start without a signing key.")
    if _demo_secret is None:
        print("WARNING: DEMO_MODE is on and JWT_SECRET_KEY is not set. Passport tokens use a temporary "
              "key and stop working after a restart.", file=sys.stderr)
        _demo_secret = secrets.token_urlsafe(48)
    return _demo_secret


def signing_secret() -> str:
    """The signing key (JWT_SECRET_KEY). Login tokens and passport tokens share it but carry different `purpose` claims."""
    return _secret()


def reset_demo_secret() -> None:
    global _demo_secret
    _demo_secret = None


def startup_check() -> None:
    _secret()


def expire_minutes() -> int:
    try:
        return int(os.environ.get("PASSPORT_TOKEN_EXPIRE_MINUTES", DEFAULT_EXPIRE_MINUTES))
    except ValueError:
        return DEFAULT_EXPIRE_MINUTES


def create_passport_token(patient_id: str, *, minutes: Optional[int] = None, now: Optional[datetime] = None) -> str:
    issued = now or datetime.now(timezone.utc)
    lifetime = expire_minutes() if minutes is None else minutes
    claims = {"sub": patient_id, "purpose": PURPOSE, "iat": issued, "exp": issued + timedelta(minutes=lifetime),
              "jti": secrets.token_urlsafe(8)}   # two links in one second must differ
    return jwt.encode(claims, _secret(), algorithm=ALGORITHM)


def verify_passport_token(token: str) -> str:
    """Return the patient id, or raise PassportTokenError('expired_token' | 'tampered_token')."""
    try:
        claims = jwt.decode(token, _secret(), algorithms=[ALGORITHM],
                            options={"require": ["exp", "iat", "sub"]})
    except jwt.ExpiredSignatureError:
        raise PassportTokenError("expired_token") from None
    except jwt.PyJWTError:
        raise PassportTokenError("tampered_token") from None
    if claims.get("purpose") != PURPOSE or not isinstance(claims.get("sub"), str):
        raise PassportTokenError("tampered_token")
    return claims["sub"]
