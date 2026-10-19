"""In-process sliding-window rate limiter.

Good enough for a single instance. A multi-instance deployment needs a shared
store (e.g. Redis) — documented in docs/SECURITY_CHECKLIST.md.
"""

import threading
import time
from collections import deque

from app.core.errors import RateLimited


class RateLimiter:
    def __init__(self, max_keys: int = 10_000) -> None:
        self._hits: dict[str, deque[float]] = {}
        self._expiry: dict[str, float] = {}
        self._max_keys = max_keys
        self._lock = threading.Lock()

    def check(self, key: str, limit: int, window_seconds: float) -> None:
        now = time.monotonic()
        with self._lock:
            if key not in self._hits:
                # Bound attacker-controlled email/IP keys without resetting active limits.
                if len(self._hits) >= self._max_keys:
                    expired = [k for k, end in self._expiry.items() if end <= now]
                    for stale in expired:
                        del self._hits[stale]
                        del self._expiry[stale]
                if len(self._hits) >= self._max_keys:
                    raise RateLimited("Too many requests. Please wait and try again.")
                self._hits[key] = deque()
            hits = self._hits[key]
            while hits and now - hits[0] > window_seconds:
                hits.popleft()
            if len(hits) >= limit:
                raise RateLimited("Too many requests. Please wait and try again.")
            hits.append(now)
            self._expiry[key] = now + window_seconds

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()
            self._expiry.clear()


limiter = RateLimiter()
