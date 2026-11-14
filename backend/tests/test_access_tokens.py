"""Login tokens (feature 33)."""
import base64
import json
from datetime import datetime, timedelta, timezone

import jwt
import pytest

from app.security import access_token as at
from app.security.access_token import AccessTokenError, create_access_token, verify_access_token
from app.security.passport_token import PassportTokenError, create_passport_token, signing_secret, verify_passport_token


def invalid(token):
    with pytest.raises(AccessTokenError) as err:
        verify_access_token(token)
    return err.value.code


def test_a_token_carries_the_user_and_role():
    token, expires = create_access_token("usr_003", "HOSPITAL_STAFF")
    claims = verify_access_token(token)
    assert claims["sub"] == "usr_003" and claims["role"] == "HOSPITAL_STAFF" and claims["purpose"] == "access"
    assert expires > datetime.now(timezone.utc)


def test_the_expiry_comes_from_the_environment(monkeypatch):
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10")
    claims = jwt.decode(create_access_token("u", "ADMIN")[0], options={"verify_signature": False})
    assert claims["exp"] - claims["iat"] == 600


@pytest.mark.parametrize("value, expected", [("banana", 480), ("0", 480), ("-5", 480), ("90", 90)])
def test_a_bad_expiry_setting_falls_back_to_the_default(monkeypatch, value, expected):
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", value)
    assert at.expire_minutes() == expected


def test_an_expired_token_is_refused():
    old = datetime.now(timezone.utc) - timedelta(hours=9)
    assert invalid(create_access_token("u", "ADMIN", minutes=480, now=old)[0]) == "expired"


def test_a_token_that_is_about_to_expire_still_works():
    old = datetime.now(timezone.utc) - timedelta(minutes=479)
    assert verify_access_token(create_access_token("u", "ADMIN", minutes=480, now=old)[0])["sub"] == "u"


def test_a_changed_signature_is_refused():
    token = create_access_token("u", "ADMIN")[0]
    assert invalid(token[:-4] + ("AAAA" if not token.endswith("AAAA") else "BBBB")) == "invalid"


def test_a_forged_role_with_the_old_signature_is_refused():
    header, _body, signature = create_access_token("usr_001", "PATIENT")[0].split(".")
    forged = {"sub": "usr_001", "role": "ADMIN", "purpose": "access", "iat": 1, "exp": 4102444800}
    body = base64.urlsafe_b64encode(json.dumps(forged).encode()).rstrip(b"=").decode()
    assert invalid(f"{header}.{body}.{signature}") == "invalid"


def test_a_token_signed_with_another_key_is_refused():
    claims = {"sub": "u", "role": "ADMIN", "purpose": "access", "iat": datetime.now(timezone.utc),
              "exp": datetime.now(timezone.utc) + timedelta(hours=1)}
    assert invalid(jwt.encode(claims, "some-other-long-secret-key-123456", algorithm="HS256")) == "invalid"


def test_alg_none_is_refused():
    def b64(obj):
        return base64.urlsafe_b64encode(json.dumps(obj).encode()).rstrip(b"=").decode()
    forged = f"{b64({'alg': 'none', 'typ': 'JWT'})}.{b64({'sub': 'u', 'role': 'ADMIN', 'purpose': 'access', 'iat': 1, 'exp': 4102444800})}."
    assert invalid(forged) == "invalid"


@pytest.mark.parametrize("claims", [
    {"sub": "u", "role": "ADMIN"},                                  # no purpose
    {"sub": "u", "role": "ADMIN", "purpose": "login"},              # wrong purpose
    {"role": "ADMIN", "purpose": "access"},                         # no subject
    {"sub": "u", "purpose": "access"},                              # no role
    {"sub": 5, "role": "ADMIN", "purpose": "access"},               # subject is not text
])
def test_a_token_missing_a_required_claim_is_refused(claims):
    full = {**claims, "iat": datetime.now(timezone.utc), "exp": datetime.now(timezone.utc) + timedelta(hours=1)}
    assert invalid(jwt.encode(full, signing_secret(), algorithm="HS256")) == "invalid"


def test_a_token_with_no_expiry_is_refused():
    claims = {"sub": "u", "role": "ADMIN", "purpose": "access", "iat": datetime.now(timezone.utc)}
    assert invalid(jwt.encode(claims, signing_secret(), algorithm="HS256")) == "invalid"


@pytest.mark.parametrize("junk", ["", "abc", "a.b.c", "....", "x" * 600])
def test_garbage_is_refused(junk):
    assert invalid(junk) == "invalid"


# ------------------------------------------------------------ a login token and a passport token are not interchangeable

def test_a_passport_token_cannot_log_anyone_in():
    assert invalid(create_passport_token("PT-2026-0417")) == "invalid"


def test_a_login_token_cannot_open_a_passport():
    token = create_access_token("usr_001", "PATIENT")[0]
    with pytest.raises(PassportTokenError) as err:
        verify_passport_token(token)
    assert err.value.code == "tampered_token"
