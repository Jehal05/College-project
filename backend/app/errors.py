"""One error shape for the whole API: {"error": "...", "detail": "..."} with the same plain text in both.

The patient app reads `error`, the original contract reads `detail`, so both are always there.
Rules
- An error never echoes what the caller sent (a password in a bad request must never come back).
- A validation error is a 400 (not FastAPI's default 422) and lists only the NAMES of the bad fields.
- An unexpected crash is a 500 with a generic sentence: no stack trace, no file name, no secret.
"""
from http import HTTPStatus
from typing import Any, Dict, List

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


def error_body(message: str, **extra: Any) -> Dict[str, Any]:
    return {"error": message, "detail": message, **extra}


async def http_exception_handler(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
    detail = exc.detail
    if isinstance(detail, dict):                 # a route may add fields such as from and to (409 invalid transition)
        message = str(detail.get("error") or detail.get("detail") or HTTPStatus(exc.status_code).phrase)
        body = error_body(message, **{k: v for k, v in detail.items() if k not in ("error", "detail")})
    else:
        body = error_body(str(detail) if detail else HTTPStatus(exc.status_code).phrase)
    return JSONResponse(body, status_code=exc.status_code, headers=getattr(exc, "headers", None))


def _field_names(errors: List[dict]) -> List[str]:
    names = []
    for err in errors:
        parts = [str(p) for p in err.get("loc", ()) if p not in ("body", "query", "path", "header", "cookie")]
        name = ".".join(p for p in parts if not p.isdigit()) or "request"
        if name not in names:
            names.append(name)
    return names


async def validation_exception_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
    errors = exc.errors()
    if any(err.get("type") == "json_invalid" for err in errors):
        return JSONResponse(error_body("Invalid request: the body is not valid JSON", fields=["request"]), status_code=400)
    names = _field_names(errors)
    missing = [n for n, e in zip(names, errors) if e.get("type") == "missing"]
    if missing and len(missing) == len(names):
        message = "Invalid request: " + ", ".join(missing) + (" is required" if len(missing) == 1 else " are required")
    else:
        message = "Invalid request: " + ", ".join(names) + (" is not valid" if len(names) == 1 else " are not valid")
    return JSONResponse(error_body(message, fields=names), status_code=400)


async def unhandled_exception_handler(_request: Request, _exc: Exception) -> JSONResponse:
    return JSONResponse(error_body("Something went wrong on the server"), status_code=500)


def install_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
