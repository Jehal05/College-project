"""Password hashing with bcrypt (feature 33).

- Cost comes from BCRYPT_ROUNDS (default 12). Tests use 4 to stay fast. Never lower it for a real deployment.
- bcrypt only looks at the first 72 bytes, and refuses longer input. We refuse longer passwords up front,
  and a longer attempt at login simply fails (it never raises).
- verify_or_burn() does the same amount of work for an unknown user as for a wrong password,
  so login time does not reveal which usernames exist.
- A password is never printed, logged or stored. Only the hash is stored.
"""
import os
from typing import Optional

import bcrypt

MAX_BYTES = 72
DEFAULT_ROUNDS = 12
_dummy_hash: Optional[str] = None


def _rounds() -> int:
    try:
        value = int(os.environ.get("BCRYPT_ROUNDS", DEFAULT_ROUNDS))
    except ValueError:
        value = DEFAULT_ROUNDS
    return min(max(value, 4), 15)


def hash_password(plain: str) -> str:
    data = plain.encode("utf-8") if isinstance(plain, str) else b""
    if not data or len(data) > MAX_BYTES:
        raise ValueError(f"A password must be 1 to {MAX_BYTES} bytes long")
    return bcrypt.hashpw(data, bcrypt.gensalt(rounds=_rounds())).decode("ascii")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        data = plain.encode("utf-8")
        if not data or len(data) > MAX_BYTES:
            return False
        return bcrypt.checkpw(data, hashed.encode("ascii"))
    except (ValueError, TypeError, AttributeError, UnicodeError):
        return False


def verify_or_burn(plain: str, hashed: Optional[str]) -> bool:
    """False for an unknown user, but only after doing the same work as a real check."""
    global _dummy_hash
    if hashed is None:
        if _dummy_hash is None:
            _dummy_hash = bcrypt.hashpw(b"not-a-real-password", bcrypt.gensalt(rounds=_rounds())).decode("ascii")
        verify_password(plain, _dummy_hash)
        return False
    return verify_password(plain, hashed)
