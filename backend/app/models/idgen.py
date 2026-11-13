"""Random ids for rows that have no meaningful name. Ids are opaque: no code reads meaning out of them."""
import secrets


def new_id(prefix: str) -> str:
    """For example C-3F9A12BC. 8 hex characters: unique enough for a prototype, short enough to read."""
    return f"{prefix}-{secrets.token_hex(4).upper()}"
