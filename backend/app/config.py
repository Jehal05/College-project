"""Tiny helpers for reading settings from environment variables."""
import os
from typing import Mapping, Optional

_TRUE = {"1", "true", "yes", "on"}


def truthy(value: object) -> bool:
    return str(value).strip().lower() in _TRUE


def demo_mode(environ: Optional[Mapping[str, str]] = None) -> bool:
    """DEMO_MODE=true relaxes startup checks and allows /demo/reset to clear ledgers."""
    env = os.environ if environ is None else environ
    return truthy(env.get("DEMO_MODE", ""))
