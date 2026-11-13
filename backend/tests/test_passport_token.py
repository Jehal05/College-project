"""Signed, expiring passport tokens (feature 11)."""
import base64
import json
from datetime import datetime, timedelta, timezone

import jwt
import pytest

from app.security import passport_token as pt
from app.security.passport_token import PassportTokenError, TokenConfigError


def expect_code(token, code):
    with pytest.raises(PassportTokenError) as err:
        pt.verify_passport_token(token)
    assert err.value.code == code


def test_round_trip_returns_the_patient_id():
    assert pt.verify_passport_token(pt.create_passport_token("pat_001")) == "pat_001"


def test_expiry_comes_from_the_environment(monkeypatch):
    monkeypatch.setenv("PASSPORT_TOKEN_EXPIRE_MINUTES", "5")
    claims = jwt.decode(pt.create_passport_token("pat_001"), options={"verify_signature": False})
    assert claims["exp"] - claims["iat"] == 300


def test_bad_expiry_setting_falls_back_to_the_default(monkeypatch):
    monkeypatch.setenv("PASSPORT_TOKEN_EXPIRE_MINUTES", "soon")
    assert pt.expire_minutes() == pt.DEFAULT_EXPIRE_MINUTES


def test_expired_token_is_rejected():
    old = datetime.now(timezone.utc) - timedelta(hours=2)
    expect_code(pt.create_passport_token("pat_001", minutes=30, now=old), "expired_token")


def test_token_valid_just_before_expiry():
    almost = datetime.now(timezone.utc) - timedelta(minutes=29)
    assert pt.verify_passport_token(pt.create_passport_token("pat_001", minutes=30, now=almost)) == "pat_001"


def test_flipped_signature_is_rejected():
    token = pt.create_passport_token("pat_001")
    expect_code(token[:-3] + ("AAA" if not token.endswith("AAA") else "BBB"), "tampered_token")


def test_changed_patient_id_with_old_signature_is_rejected():
    header, _payload, signature = pt.create_passport_token("pat_001").split(".")
    forged = {"sub": "pat_002", "purpose": "passport", "iat": 1, "exp": 4102444800}
    body = base64.urlsafe_b64encode(json.dumps(forged).encode()).rstrip(b"=").decode()
    expect_code(f"{header}.{body}.{signature}", "tampered_token")


def test_token_signed_with_another_key_is_rejected():
    claims = {"sub": "pat_001", "purpose": "passport", "iat": datetime.now(timezone.utc),
              "exp": datetime.now(timezone.utc) + timedelta(minutes=5)}
    expect_code(jwt.encode(claims, "some-other-long-secret-key-123456", algorithm="HS256"), "tampered_token")


def test_alg_none_token_is_rejected():
    def b64(obj):
        return base64.urlsafe_b64encode(json.dumps(obj).encode()).rstrip(b"=").decode()
    forged = f"{b64({'alg': 'none', 'typ': 'JWT'})}.{b64({'sub': 'pat_001', 'purpose': 'passport', 'iat': 1, 'exp': 4102444800})}."
    expect_code(forged, "tampered_token")


def test_token_with_the_wrong_purpose_is_rejected():
    claims = {"sub": "pat_001", "purpose": "login", "iat": datetime.now(timezone.utc),
              "exp": datetime.now(timezone.utc) + timedelta(minutes=5)}
    expect_code(jwt.encode(claims, pt._secret(), algorithm="HS256"), "tampered_token")


def test_token_without_an_expiry_is_rejected():
    claims = {"sub": "pat_001", "purpose": "passport", "iat": datetime.now(timezone.utc)}
    expect_code(jwt.encode(claims, pt._secret(), algorithm="HS256"), "tampered_token")


@pytest.mark.parametrize("junk", ["", "abc", "a.b.c", "....", "x" * 500])
def test_garbage_is_rejected(junk):
    expect_code(junk, "tampered_token")


# ------------------------------------------------------------ signing key handling

def test_missing_secret_outside_demo_mode_refuses_to_start(monkeypatch):
    monkeypatch.delenv("JWT_SECRET_KEY")
    with pytest.raises(TokenConfigError, match="JWT_SECRET_KEY"):
        pt.startup_check()


def test_placeholder_secret_is_rejected(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", "replace-with-a-long-random-string")
    with pytest.raises(TokenConfigError):
        pt.startup_check()


def test_short_secret_is_rejected_without_echoing_it(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", "tinykey9")
    with pytest.raises(TokenConfigError) as err:
        pt.startup_check()
    assert "tinykey9" not in str(err.value)


def test_demo_mode_without_secret_warns_and_tokens_die_with_the_run(monkeypatch, capsys):
    monkeypatch.delenv("JWT_SECRET_KEY")
    monkeypatch.setenv("DEMO_MODE", "true")
    token = pt.create_passport_token("pat_001")
    assert pt.verify_passport_token(token) == "pat_001"
    assert "temporary" in capsys.readouterr().err
    pt.reset_demo_secret()                      # simulates a restart
    expect_code(token, "tampered_token")


def test_secret_is_never_printed(monkeypatch, capsys):
    secret = "my-very-secret-signing-key-0123456789"
    monkeypatch.setenv("JWT_SECRET_KEY", secret)
    pt.create_passport_token("pat_001")
    out = capsys.readouterr()
    assert secret not in out.out + out.err
