"""Every error has the same shape: {"error", "detail"} with the same plain text, and never echoes the caller."""
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def client():
    application = create_app()

    @application.get("/_t/boom")
    def boom():
        raise RuntimeError("secret internal detail: password=hunter2 /home/dev/app.py")

    @application.get("/_t/conflict")
    def conflict():
        raise HTTPException(status_code=409, detail={"error": "Invalid transition", "from": "SOS_SENT", "to": "ARRIVED"})

    @application.get("/_t/limited")
    def limited():
        raise HTTPException(status_code=429, detail="Slow down", headers={"Retry-After": "7"})

    @application.get("/_t/number")
    def number(n: int):
        return {"n": n}

    return TestClient(application, raise_server_exceptions=False)


def assert_shape(response, status):
    body = response.json()
    assert response.status_code == status
    assert isinstance(body["error"], str) and body["error"] == body["detail"] and body["error"]
    return body


def test_an_unknown_route(client):
    assert_shape(client.get("/nope"), 404)


def test_a_wrong_method(client):
    assert_shape(client.put("/health"), 405)


def test_a_missing_login(client):
    response = client.get("/audit")
    assert assert_shape(response, 401)["error"] == "Log in to continue"
    assert response.headers["www-authenticate"] == "Bearer"


def test_extra_fields_and_headers_from_a_route_are_kept(client):
    response = client.get("/_t/conflict")
    body = assert_shape(response, 409)
    assert (body["error"], body["from"], body["to"]) == ("Invalid transition", "SOS_SENT", "ARRIVED")
    limited = client.get("/_t/limited")
    assert_shape(limited, 429)
    assert limited.headers["retry-after"] == "7"


def test_a_bad_request_is_a_400_never_a_422(client):
    body = assert_shape(client.get("/_t/number?n=abc"), 400)
    assert body["fields"] == ["n"] and body["error"] == "Invalid request: n is not valid"


def test_a_missing_field_is_named(client):
    body = assert_shape(client.post("/auth/login", json={"username": "x"}), 400)
    assert body["error"] == "Invalid request: password is required" and body["fields"] == ["password"]


def test_several_bad_fields_are_all_named(client):
    body = assert_shape(client.post("/auth/login", json={"username": 123, "password": 456}), 400)
    assert set(body["fields"]) == {"username", "password"}


def test_a_secret_in_a_bad_request_is_never_sent_back(client):
    response = client.post("/auth/login", json={"username": ["TopSecret!"], "password": "TopSecret!"})
    assert response.status_code == 400 and "TopSecret" not in response.text


def test_a_body_that_is_not_json(client):
    body = assert_shape(client.post("/auth/login", content=b"{not json", headers={"Content-Type": "application/json"}), 400)
    assert "not valid JSON" in body["error"]


def test_a_crash_is_a_generic_500_with_no_internals(client):
    response = client.get("/_t/boom")
    body = assert_shape(response, 500)
    for leak in ("hunter2", "password", "/home/dev", "app.py", "Traceback", "RuntimeError"):
        assert leak not in response.text, leak
    assert body["error"] == "Something went wrong on the server"


def test_a_422_never_appears(client):
    for url in ("/_t/number?n=x", "/audit?page=0", "/audit?page_size=999"):
        assert client.get(url).status_code != 422
