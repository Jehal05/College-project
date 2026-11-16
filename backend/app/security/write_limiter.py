"""A small, shared rate limit for write endpoints (so far: creating an emergency).

- Counted per signed-in user in a sliding window; every accepted call counts.
- Settings: EMERGENCY_MAX_PER_WINDOW (default 30) and WRITE_WINDOW_SECONDS (default 60).
  A value of 0 or below is ignored and the default is used.
- It lives in memory (resets on restart), like the login limiter. Memory stays bounded.
- The limit is high on purpose: a real person pressing SOS now and then never meets it. It stops a
  script or a stuck button from filling the hospital portal with alerts.
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


class WriteLimiter:
    def __init__(self, limit: Optional[int] = None, window_seconds: Optional[int] = None,
                 clock: Callable[[], float] = time.monotonic):
        self.limit = limit or _env_int("EMERGENCY_MAX_PER_WINDOW", 30)
        self.window = window_seconds or _env_int("WRITE_WINDOW_SECONDS", 60)
        self._clock = clock
        self._hits: Dict[str, Deque[float]] = {}
        self._lock = threading.Lock()

    def take(self, key: str) -> Optional[int]:
        """Count one call. Returns None when allowed, or the seconds to wait when the limit is reached."""
        now = self._clock()
        with self._lock:
            hits = self._hits.setdefault(key, deque())
            while hits and hits[0] <= now - self.window:
                hits.popleft()
            if len(hits) >= self.limit:
                return max(math.ceil(hits[0] + self.window - now), 1)
            hits.append(now)
            if len(self._hits) > MAX_KEYS:
                self._shrink(now)
            return None

    def _shrink(self, now: float) -> None:
        for k in list(self._hits):
            q = self._hits[k]
            while q and q[0] <= now - self.window:
                q.popleft()
            if not q:
                del self._hits[k]
        while len(self._hits) > MAX_KEYS:
            self._hits.pop(next(iter(self._hits)))

    def size(self) -> int:
        return len(self._hits)


_emergency_limiter: Optional[WriteLimiter] = None
_creation_lock = threading.Lock()


def emergency_limiter() -> WriteLimiter:
    """The one shared limiter. Created under a lock (checked again inside it), so two threads that arrive
    together at startup cannot each build their own and double the limit."""
    global _emergency_limiter
    if _emergency_limiter is None:
        with _creation_lock:
            if _emergency_limiter is None:
                _emergency_limiter = WriteLimiter()
    return _emergency_limiter


def reset_write_limiters() -> None:
    """Forget the shared limiter (tests and changed settings)."""
    global _emergency_limiter
    with _creation_lock:
        _emergency_limiter = None
