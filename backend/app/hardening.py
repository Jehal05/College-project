"""Small, additive protections for every HTTP response. They never change what an endpoint returns.

- Security headers on every reply (no sniffing, no framing, no referrer leak, no caching of API replies, and a
  Content-Security-Policy that lets a reply load nothing: this is a JSON API). Strict-Transport-Security is added
  only when the request came over HTTPS (the scheme, or X-Forwarded-Proto from a proxy), so plain-HTTP local
  development is not told to remember "HTTPS only".
- A request whose Content-Length is above MAX_BODY_BYTES (default 8 MB) is refused with 413 before the
  body is read. The report upload keeps its own, tighter 2 MB limit.
- A body sent without a Content-Length (chunked) is counted as it is read; once it passes the same limit the
  request is refused with 413 (if the answer has not started yet).
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
    (b"content-security-policy", b"default-src 'none'; frame-ancestors 'none'"),
]
HSTS = (b"strict-transport-security", b"max-age=31536000")
CSP_NAME = b"content-security-policy"
# The Swagger and ReDoc pages must load scripts, and a browser shows a stored PDF or image itself: no CSP for those.
NO_CSP_PATHS = ("/docs", "/redoc")
NO_CSP_TYPES = (b"application/pdf", b"image/")


def _is_https(scope: Dict[str, Any]) -> bool:
    if scope.get("scheme") == "https":
        return True
    for name, value in scope.get("headers", []):
        if name == b"x-forwarded-proto":
            return value.split(b",")[0].strip().lower() == b"https"
    return False


def skip_csp(scope: Dict[str, Any], headers: List[Tuple[bytes, bytes]]) -> bool:
    if str(scope.get("path", "")).startswith(NO_CSP_PATHS):
        return True
    kind = next((v.lower() for n, v in headers if n.lower() == b"content-type"), b"")
    return kind.startswith(NO_CSP_TYPES)


def max_body_bytes() -> int:
    try:
        value = int(os.environ.get("MAX_BODY_BYTES", DEFAULT_MAX_BODY_BYTES))
    except ValueError:
        return DEFAULT_MAX_BODY_BYTES
    return value if value > 0 else DEFAULT_MAX_BODY_BYTES


class _BodyTooLarge(BaseException):
    """Raised from the receive wrapper. It is a BaseException on purpose: FastAPI turns any Exception raised while it reads
    the body into a 400, which would hide the real answer (413)."""


class SecurityMiddleware:
    def __init__(self, app: Callable[..., Awaitable[None]]) -> None:
        self.app = app

    async def __call__(self, scope: Dict[str, Any], receive: Callable, send: Callable) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        https = _is_https(scope)
        for name, value in scope.get("headers", []):
            if name == b"content-length":
                try:
                    too_big = int(value) > max_body_bytes()
                except ValueError:
                    too_big = False
                if too_big:
                    await self._refuse(send, https)
                    return
                break

        started = False
        over = False   # the body went past the limit: whatever the app answers after that is dropped and 413 is sent instead

        async def send_with_headers(message: Dict[str, Any]) -> None:
            nonlocal started
            if over and not started:
                return
            if message["type"] == "http.response.start":
                started = True
                present = {name.lower() for name, _ in message.get("headers", [])}
                headers = list(message.get("headers", []))
                extra = SECURITY_HEADERS + [HSTS] if https else SECURITY_HEADERS
                if skip_csp(scope, message.get("headers", [])):
                    extra = [h for h in extra if h[0] != CSP_NAME]
                headers.extend((n, v) for n, v in extra if n not in present)
                message = {**message, "headers": headers}
            await send(message)

        seen = 0
        limit = max_body_bytes()

        async def counting_receive() -> Dict[str, Any]:
            nonlocal seen, over
            message = await receive()
            if message["type"] == "http.request":
                seen += len(message.get("body", b""))
                if seen > limit:
                    over = True
                    raise _BodyTooLarge()
            return message

        try:
            await self.app(scope, counting_receive, send_with_headers)
        except _BodyTooLarge:
            if started:
                raise  # the answer is already on its way; nothing honest can be added
            await self._refuse(send, https)
            return
        if over and not started:   # the app swallowed the error and answered something else; that answer was dropped
            await self._refuse(send, https)

    @staticmethod
    async def _refuse(send: Callable, https: bool = False) -> None:
        text = "Request body is too large."
        body = json.dumps({"error": text, "detail": text}).encode()
        headers = [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode())]
        headers.extend(SECURITY_HEADERS + [HSTS] if https else SECURITY_HEADERS)
        await send({"type": "http.response.start", "status": 413, "headers": headers})
        await send({"type": "http.response.body", "body": body})
