"""Random ids for rows that have no meaningful name. Ids are opaque: no code reads meaning out of them.

16 hex characters = 64 random bits. (8 characters, 32 bits, was too short: measured collisions in 0.035% of runs of
2000 ids, and a million rows would almost surely collide on a primary key.)
"""
import secrets


def new_id(prefix: str) -> str:
    """For example C-3F9A12BC77D1E0A4."""
    return f"{prefix}-{secrets.token_hex(8).upper()}"
