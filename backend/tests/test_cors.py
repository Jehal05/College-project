"""CORS: an allow-list from the environment, never a wildcard."""
import pytest
from fastapi.testclient import TestClient

from app.config import CorsConfigError, parse_cors_origins
from app.main import create_app

PATIENT_APP = "http://localhost:5173"
PORTAL = "http://localhost:5174"
STRANGER = "http://evil.example"


def client(value):
    return TestClient(create_app({"CORS_ALLOW_ORIGINS": value}))


# ------------------------------------------------------------ parsing

def test_empty_means_no_origins():
    assert parse_cors_origins("") == [] and parse_cors_origins(None) == [] and parse_cors_origins(" , ,") == []


def test_one_and_many_origins_with_tidying():
    assert parse_cors_origins(PATIENT_APP) == [PATIENT_APP]
    assert parse_cors_origins(f" {PATIENT_APP} , {PORTAL}/ ,{PATIENT_APP}") == [PATIENT_APP, PORTAL]


@pytest.mark.parametrize("good", ["https://app.example.com", "http://127.0.0.1:3000", "http://my-host.local:8080"])
def test_normal_origins_are_accepted(good):
    assert parse_cors_origins(good) == [good]


@pytest.mark.parametrize("bad", [
    "*", "http://*", "https://*.example.com", "localhost:5173", "ftp://example.com", "http://example.com/app",
    "http://exa mple.com", "http://", "example.com", "http://localhost:5173, *",
])
def test_wildcards_paths_and_malformed_values_are_refused(bad):
    with pytest.raises(CorsConfigError):
        parse_cors_origins(bad)


def test_a_bad_value_stops_the_app_from_being_built():
    with pytest.raises(CorsConfigError):
        create_app({"CORS_ALLOW_ORIGINS": "*"})


# ------------------------------------------------------------ behaviour of the real app

def test_an_allowed_origin_gets_the_header():
    response = client(f"{PATIENT_APP},{PORTAL}").get("/health", headers={"Origin": PORTAL})
    assert response.headers["access-control-allow-origin"] == PORTAL


def test_another_website_gets_no_cors_header():
    response = client(f"{PATIENT_APP},{PORTAL}").get("/health", headers={"Origin": STRANGER})
    assert "access-control-allow-origin" not in response.headers
    assert response.status_code == 200          # the request itself is answered, the browser just will not show it


def test_with_no_setting_nobody_gets_the_header():
    response = client("").get("/health", headers={"Origin": PATIENT_APP})
    assert "access-control-allow-origin" not in response.headers


def test_the_header_is_never_a_wildcard():
    response = client(PATIENT_APP).get("/health", headers={"Origin": PATIENT_APP})
    assert response.headers["access-control-allow-origin"] != "*"


def test_a_preflight_from_an_allowed_origin_works_and_allows_the_authorization_header():
    response = client(PATIENT_APP).options("/health", headers={
        "Origin": PATIENT_APP, "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization,content-type"})
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == PATIENT_APP
    allowed = response.headers["access-control-allow-headers"].lower()
    assert "authorization" in allowed and "content-type" in allowed


@pytest.mark.parametrize("method", ["PUT", "PATCH", "DELETE", "POST"])
def test_the_methods_the_apps_need_are_allowed(method):
    response = client(PATIENT_APP).options("/health", headers={
        "Origin": PATIENT_APP, "Access-Control-Request-Method": method})
    assert response.status_code == 200 and method in response.headers["access-control-allow-methods"]


def test_a_preflight_from_another_website_is_refused():
    response = client(PATIENT_APP).options("/health", headers={
        "Origin": STRANGER, "Access-Control-Request-Method": "GET"})
    assert response.status_code == 400 and "access-control-allow-origin" not in response.headers


def test_an_unexpected_header_is_not_allowed_in_a_preflight():
    response = client(PATIENT_APP).options("/health", headers={
        "Origin": PATIENT_APP, "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "x-secret-thing"})
    assert response.status_code == 400


def test_cookies_are_not_allowed_across_sites():
    response = client(PATIENT_APP).get("/health", headers={"Origin": PATIENT_APP})
    assert response.headers.get("access-control-allow-credentials") != "true"
