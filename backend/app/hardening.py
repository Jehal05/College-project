"""Small, additive protections for every HTTP response. They never change what an endpoint returns.

- Security headers on every reply (no sniffing, no framing, no referrer leak, no caching of API replies).
- A request whose Content-Length is above MAX_BODY_BYTES (default 8 MB) is refused with 413 before the
  body is read. The report upload keeps its own, tighter 2 MB limit. A body sent without a
  Content-Length (chunked) is not checked here; that is a known limit.
Written as plain ASGI so WebSocket connections pass straight through untouched.
"""
import json
import os
from typing import Any, Awaitable, Callable, Dict, List, Tuple

DEFAULT_MAX_BODY_BYTES = 8 * 1024 * 1024

SECURITY_HEADERS: List[Tuple[bytes, bytes]] = [
    (b"x-content-type-options", b"nosniff"),
    (b"x-frame-options", b"DENY"),
    (b"referrer-policy", b"no-referrer"),
    (b"cache-control", b"no-store"),
]


def max_body_bytes() -> int:
    try:
        value = int(os.environ.get("MAX_BODY_BYTES", DEFAULT_MAX_BODY_BYTES))
    except ValueError:
        return DEFAULT_MAX_BODY_BYTES
    return value if value > 0 else DEFAULT_MAX_BODY_BYTES


class SecurityMiddleware:
    def __init__(self, app: Callable[..., Awaitable[None]]) -> None:
        self.app = app

    async def __call__(self, scope: Dict[str, Any], receive: Callable, send: Callable) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        for name, value in scope.get("headers", []):
            if name == b"content-length":
                try:
                    too_big = int(value) > max_body_bytes()
                except ValueError:
                    too_big = False
                if too_big:
                    await self._refuse(send)
                    return
                break

        async def send_with_headers(message: Dict[str, Any]) -> None:
            if message["type"] == "http.response.start":
                present = {name.lower() for name, _ in message.get("headers", [])}
                headers = list(message.get("headers", []))
                headers.extend((n, v) for n, v in SECURITY_HEADERS if n not in present)
                message = {**message, "headers": headers}
            await send(message)

        await self.app(scope, receive, send_with_headers)

    @staticmethod
    async def _refuse(send: Callable) -> None:
        text = "Request body is too large."
        body = json.dumps({"error": text, "detail": text}).encode()
        headers = [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode())]
        headers.extend(SECURITY_HEADERS)
        await send({"type": "http.response.start", "status": 413, "headers": headers})
        await send({"type": "http.response.body", "body": body})
