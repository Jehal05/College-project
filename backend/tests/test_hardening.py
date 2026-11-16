"""Security headers on every reply, and a request-size limit that answers 413."""
from fastapi.testclient import TestClient

from app.hardening import DEFAULT_MAX_BODY_BYTES, max_body_bytes
from app.main import create_app

EXPECTED = {
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "cache-control": "no-store",
    "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
}


def client(origins="http://localhost:5173"):
    return TestClient(create_app({"CORS_ALLOW_ORIGINS": origins}))


def test_health_reply_carries_the_security_headers():
    r = client().get("/health")
    assert r.status_code == 200
    for name, value in EXPECTED.items():
        assert r.headers[name] == value


def test_an_error_reply_carries_them_too():
    r = client().get("/no-such-route")
    assert r.status_code == 404
    assert r.headers["x-content-type-options"] == "nosniff"


def test_the_reply_body_is_unchanged():
    assert client().get("/health").json() == {"status": "ok", "simulated": True}


def test_oversized_request_is_refused_with_413_in_the_normal_error_shape(monkeypatch):
    monkeypatch.setenv("MAX_BODY_BYTES", "100")
    r = client().post("/auth/login", content=b"x" * 500, headers={"Content-Type": "application/json"})
    assert r.status_code == 413
    body = r.json()
    assert body["error"] == body["detail"] == "Request body is too large."
    assert r.headers["x-content-type-options"] == "nosniff"


def test_a_413_still_carries_cors_headers_for_an_allowed_origin(monkeypatch):
    monkeypatch.setenv("MAX_BODY_BYTES", "100")
    r = client().post("/auth/login", content=b"x" * 500,
                      headers={"Content-Type": "application/json", "Origin": "http://localhost:5173"})
    assert r.status_code == 413
    assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_a_small_request_is_not_refused(monkeypatch):
    monkeypatch.setenv("MAX_BODY_BYTES", "100000")
    r = client().post("/no-such-route", json={"hello": "world"})
    assert r.status_code == 404


def test_limit_setting_falls_back_to_the_default_when_bad(monkeypatch):
    for bad in ("abc", "0", "-5", ""):
        monkeypatch.setenv("MAX_BODY_BYTES", bad)
        assert max_body_bytes() == DEFAULT_MAX_BODY_BYTES


# ---- chunked bodies (no Content-Length): counted as they are read
def _chunks(*sizes):
    def gen():
        for n in sizes:
            yield b"x" * n
    return gen()


def test_a_chunked_body_over_the_limit_is_refused_with_413(monkeypatch):
    monkeypatch.setenv("MAX_BODY_BYTES", "100")
    r = client().post("/auth/login", content=_chunks(60, 60, 60),
                      headers={"Content-Type": "application/json", "Origin": "http://localhost:5173"})
    assert r.status_code == 413
    assert r.json()["detail"] == "Request body is too large."
    assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert r.headers["x-content-type-options"] == "nosniff"


def test_a_chunked_body_under_the_limit_is_not_refused(monkeypatch):
    monkeypatch.setenv("MAX_BODY_BYTES", "100000")
    r = client().post("/no-such-route", content=_chunks(20, 20, 20))
    assert r.status_code == 404


def test_a_chunked_body_exactly_at_the_limit_is_not_refused(monkeypatch):
    monkeypatch.setenv("MAX_BODY_BYTES", "100")
    r = client().post("/no-such-route", content=_chunks(50, 50))
    assert r.status_code == 404


# ---- CSP everywhere; HSTS only over HTTPS
def test_hsts_is_absent_on_plain_http():
    assert "strict-transport-security" not in client().get("/health").headers


def test_hsts_is_present_when_the_proxy_says_https():
    r = client().get("/health", headers={"X-Forwarded-Proto": "https"})
    assert r.headers["strict-transport-security"] == "max-age=31536000"


def test_hsts_is_present_when_the_request_itself_is_https():
    r = TestClient(create_app({"CORS_ALLOW_ORIGINS": "http://localhost:5173"}), base_url="https://testserver").get("/health")
    assert r.headers["strict-transport-security"] == "max-age=31536000"


def test_a_413_carries_csp_and_hsts_over_https(monkeypatch):
    monkeypatch.setenv("MAX_BODY_BYTES", "100")
    r = client().post("/auth/login", content=b"x" * 500,
                      headers={"Content-Type": "application/json", "X-Forwarded-Proto": "https"})
    assert r.status_code == 413
    assert r.headers["content-security-policy"] == "default-src 'none'; frame-ancestors 'none'"
    assert "strict-transport-security" in r.headers


def test_x_forwarded_proto_http_does_not_add_hsts():
    assert "strict-transport-security" not in client().get("/health", headers={"X-Forwarded-Proto": "http"}).headers


def test_the_interactive_docs_page_is_not_given_the_csp_so_it_still_works():
    r = client().get("/docs")
    assert r.status_code == 200
    assert "content-security-policy" not in r.headers
    assert r.headers["x-content-type-options"] == "nosniff"      # the other headers stay
