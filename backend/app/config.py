"""Tiny helpers for reading settings from environment variables."""
import os
import re
from typing import List, Mapping, Optional

_TRUE = {"1", "true", "yes", "on"}


def truthy(value: object) -> bool:
    return str(value).strip().lower() in _TRUE


def demo_mode(environ: Optional[Mapping[str, str]] = None) -> bool:
    """DEMO_MODE=true relaxes startup checks and allows /demo/reset to clear ledgers."""
    env = os.environ if environ is None else environ
    return truthy(env.get("DEMO_MODE", ""))


class CorsConfigError(RuntimeError):
    """CORS_ALLOW_ORIGINS is not a clean list of origins. The app must not start."""


_ORIGIN = re.compile(r"https?://[A-Za-z0-9._\-]+(:[0-9]{1,5})?")


def parse_cors_origins(value: Optional[str]) -> List[str]:
    """'http://localhost:5173, http://localhost:5174/' -> two origins. No wildcard, no paths.

    An empty value means no other website may call the API from a browser (the safe default).
    """
    origins: List[str] = []
    for raw in (value or "").split(","):
        item = raw.strip().rstrip("/")
        if not item:
            continue
        if item == "*" or "*" in item or not _ORIGIN.fullmatch(item):
            raise CorsConfigError(
                "CORS_ALLOW_ORIGINS must be a comma-separated list of origins such as http://localhost:5173 "
                "(no wildcard, no paths)."
            )
        if item not in origins:
            origins.append(item)
    return origins
