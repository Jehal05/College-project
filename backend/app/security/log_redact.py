"""Keeps login tokens out of the server logs.

The live-events socket takes its login token in the address (/ws?token=...), and uvicorn writes the address of every
request and every WebSocket connection to its log. This filter replaces the value of token= (and access_token=) in those
log lines with [hidden] before anything is written. Standard library only.
"""
import logging
import re
from typing import Any

_TOKEN = re.compile(r"([?&](?:access_)?token=)[^&\s\"']+", re.IGNORECASE)
LOGGER_NAMES = ("uvicorn.access", "uvicorn.error")


def redact(text: str) -> str:
    return _TOKEN.sub(r"\1[hidden]", text)


def _clean(value: Any) -> Any:
    return redact(value) if isinstance(value, str) else value


class RedactTokens(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = _clean(record.msg)
        if isinstance(record.args, tuple):
            record.args = tuple(_clean(a) for a in record.args)
        elif isinstance(record.args, dict):
            record.args = {k: _clean(v) for k, v in record.args.items()}
        return True


def install() -> None:
    """Add the filter to the uvicorn loggers. Safe to call any number of times."""
    for name in LOGGER_NAMES:
        logger = logging.getLogger(name)
        if not any(isinstance(f, RedactTokens) for f in logger.filters):
            logger.addFilter(RedactTokens())
