"""Login rate limit (feature 33): too many WRONG attempts in a short time are answered with 429.

- Counted per login name and per client address, in a sliding window.
- Only failures count. A successful login clears the counter of that login.
- Memory is bounded: old entries are dropped and the table never grows past MAX_KEYS.
- It lives in memory, so it resets when the server restarts (fine for a prototype; a real deployment
  would share it between servers).
Settings: LOGIN_MAX_FAILURES (default 5 per login), LOGIN_IP_MAX_FAILURES (default 30 per address),
LOGIN_WINDOW_SECONDS (default 60).
"""
import math
import os
import threading
import time
from collections import deque
from typing import Callable, Deque, Dict, Optional

MAX_KEYS = 10_000


def _env_int(name: str, default: int) -> int:
    try:
        value = int(os.environ.get(name, default))
    except ValueError:
        return default
    return value if value > 0 else default


class LoginLimiter:
    def __init__(self, max_per_login: Optional[int] = None, max_per_ip: Optional[int] = None,
                 window_seconds: Optional[int] = None, clock: Callable[[], float] = time.monotonic):
        self.max_per_login = max_per_login or _env_int("LOGIN_MAX_FAILURES", 5)
        self.max_per_ip = max_per_ip or _env_int("LOGIN_IP_MAX_FAILURES", 30)
        self.window = window_seconds or _env_int("LOGIN_WINDOW_SECONDS", 60)
        self._clock = clock
        self._logins: Dict[str, Deque[float]] = {}
        self._ips: Dict[str, Deque[float]] = {}
        self._lock = threading.Lock()

    @staticmethod
    def _key(login: str) -> str:
        return (login or "").strip().lower()[:254]

    def _recent(self, table: Dict[str, Deque[float]], key: str, now: float) -> Deque[float]:
        hits = table.get(key)
        if hits is None:
            return deque()
        while hits and hits[0] <= now - self.window:
            hits.popleft()
        if not hits:
            del table[key]
            return deque()
        return hits

    def retry_after(self, login: str, ip: str) -> Optional[int]:
        """Seconds to wait if this login or address is locked out, else None."""
        now = self._clock()
        with self._lock:
            waits = []
            for table, key, limit in ((self._logins, self._key(login), self.max_per_login), (self._ips, ip, self.max_per_ip)):
                hits = self._recent(table, key, now)
                if len(hits) >= limit:
                    waits.append(math.ceil(hits[0] + self.window - now))
            return max(max(waits), 1) if waits else None

    def record_failure(self, login: str, ip: str) -> None:
        now = self._clock()
        with self._lock:
            for table, key in ((self._logins, self._key(login)), (self._ips, ip)):
                table.setdefault(key, deque()).append(now)
                if len(table) > MAX_KEYS:
                    self._shrink(table, now)

    def record_success(self, login: str) -> None:
        with self._lock:
            self._logins.pop(self._key(login), None)

    def reset(self) -> None:
        with self._lock:
            self._logins.clear()
            self._ips.clear()

    def _shrink(self, table: Dict[str, Deque[float]], now: float) -> None:
        for key in list(table):
            self._recent(table, key, now)
        while len(table) > MAX_KEYS:
            table.pop(next(iter(table)))

    def size(self) -> int:
        return len(self._logins) + len(self._ips)


_limiter: Optional[LoginLimiter] = None


def get_limiter() -> LoginLimiter:
    global _limiter
    if _limiter is None:
        _limiter = LoginLimiter()
    return _limiter


def reset_limiter() -> None:
    """Forget the shared limiter (tests, /demo/reset, and changed settings)."""
    global _limiter
    _limiter = None
