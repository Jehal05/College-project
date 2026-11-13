"""Field encryption with Fernet (feature 51).

Keys come from the environment only:
  FERNET_KEY       current key (used to encrypt)
  FERNET_OLD_KEYS  optional, comma separated, still accepted for decrypting
                   so a key can be rotated without losing data

Rules
- No key and not DEMO_MODE: refuse to start (fail closed).
- No key in DEMO_MODE: use a throw-away key for this run and print a warning.
  Data written this way cannot be read after a restart.
- A key, token, password or decrypted value is never printed, logged or put
  into an error message.
"""
import sys
from typing import Mapping, Optional

from cryptography.fernet import Fernet, InvalidToken, MultiFernet

from app.config import demo_mode
import os


class CryptoConfigError(RuntimeError):
    """The encryption key is missing or invalid. The app must not start."""


class DecryptionError(RuntimeError):
    """A stored value could not be decrypted (wrong key, missing key or damaged data)."""


_cipher: Optional[MultiFernet] = None


def build_cipher(environ: Optional[Mapping[str, str]] = None) -> MultiFernet:
    env = os.environ if environ is None else environ
    primary = (env.get("FERNET_KEY") or "").strip()
    old = [k.strip() for k in (env.get("FERNET_OLD_KEYS") or "").split(",") if k.strip()]

    if not primary:
        if not demo_mode(env):
            raise CryptoConfigError(
                "FERNET_KEY is not set. Refusing to start without an encryption key. "
                "Generate one with: python -c \"from cryptography.fernet import Fernet; "
                "print(Fernet.generate_key().decode())\" and put it in .env"
            )
        print(
            "WARNING: DEMO_MODE is on and FERNET_KEY is not set. Using a temporary key for this run. "
            "Sensitive data is NOT safe and cannot be read after a restart.",
            file=sys.stderr,
        )
        primary = Fernet.generate_key().decode()

    try:
        fernets = [Fernet(key) for key in [primary, *old]]
    except (ValueError, TypeError):
        # Never include the key itself in the message.
        raise CryptoConfigError(
            "FERNET_KEY or FERNET_OLD_KEYS contains a value that is not a valid Fernet key "
            "(32 url-safe base64-encoded bytes)."
        ) from None
    return MultiFernet(fernets)  # first key encrypts, all keys can decrypt


def get_cipher() -> MultiFernet:
    global _cipher
    if _cipher is None:
        _cipher = build_cipher()
    return _cipher


def reset_cipher() -> None:
    """Forget the cached cipher (tests and key rotation)."""
    global _cipher
    _cipher = None


def startup_check() -> None:
    """Called once when the app starts. Raises CryptoConfigError to stop it."""
    get_cipher()


def encrypt_text(text: str) -> str:
    return get_cipher().encrypt(text.encode("utf-8")).decode("ascii")


def decrypt_text(token: str) -> str:
    try:
        return get_cipher().decrypt(token.encode("ascii")).decode("utf-8")
    except (InvalidToken, UnicodeError):
        raise DecryptionError("Could not decrypt a stored value (wrong key or damaged data).") from None


def rotate_token(token: str) -> str:
    """Re-encrypt an old token with the current key."""
    try:
        return get_cipher().rotate(token.encode("ascii")).decode("ascii")
    except (InvalidToken, UnicodeError):
        raise DecryptionError("Could not decrypt a stored value (wrong key or damaged data).") from None


def encrypt_bytes(data: bytes) -> bytes:
    return get_cipher().encrypt(data)


def decrypt_bytes(token: bytes) -> bytes:
    try:
        return get_cipher().decrypt(bytes(token))
    except (InvalidToken, TypeError):
        raise DecryptionError("Could not decrypt a stored value (wrong key or damaged data).") from None
