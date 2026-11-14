"""Tests for Fernet field encryption and key handling (feature 51)."""
import re

import pytest
from cryptography.fernet import Fernet

from app.config import demo_mode
from app.security import crypto
from app.security.crypto import CryptoConfigError, DecryptionError

SECRET = "hypertension and a very private note"


def new_key() -> str:
    return Fernet.generate_key().decode()


def test_round_trip():
    assert crypto.decrypt_text(crypto.encrypt_text(SECRET)) == SECRET


def test_unicode_and_empty_round_trip():
    for value in ("", "हिन्दी ગુજરાતી", "x" * 5000):
        assert crypto.decrypt_text(crypto.encrypt_text(value)) == value


def test_ciphertext_hides_plaintext_and_is_random():
    a, b = crypto.encrypt_text(SECRET), crypto.encrypt_text(SECRET)
    assert SECRET not in a and a.startswith("gAAAA")
    assert a != b  # fresh random value each time


def test_wrong_key_fails_without_leaking(monkeypatch):
    token = crypto.encrypt_text(SECRET)
    monkeypatch.setenv("FERNET_KEY", new_key())
    crypto.reset_cipher()
    with pytest.raises(DecryptionError) as err:
        crypto.decrypt_text(token)
    assert SECRET not in str(err.value) and token not in str(err.value)


def test_damaged_token_fails():
    token = crypto.encrypt_text(SECRET)
    with pytest.raises(DecryptionError):
        crypto.decrypt_text(token[:-4] + "AAAA")


def test_key_rotation_old_data_still_readable(monkeypatch):
    old_key = new_key()
    monkeypatch.setenv("FERNET_KEY", old_key)
    crypto.reset_cipher()
    old_token = crypto.encrypt_text(SECRET)

    monkeypatch.setenv("FERNET_KEY", new_key())
    monkeypatch.setenv("FERNET_OLD_KEYS", old_key)
    crypto.reset_cipher()
    assert crypto.decrypt_text(old_token) == SECRET          # old data still opens
    rotated = crypto.rotate_token(old_token)                  # re-encrypted with the new key

    monkeypatch.delenv("FERNET_OLD_KEYS")
    crypto.reset_cipher()
    assert crypto.decrypt_text(rotated) == SECRET             # new key alone is enough now
    with pytest.raises(DecryptionError):
        crypto.decrypt_text(old_token)                        # old token needs the old key


def test_invalid_key_is_rejected_without_printing_it(monkeypatch):
    bad = "not-a-real-fernet-key"
    monkeypatch.setenv("FERNET_KEY", bad)
    crypto.reset_cipher()
    with pytest.raises(CryptoConfigError) as err:
        crypto.startup_check()
    assert bad not in str(err.value)


def test_invalid_old_key_is_rejected(monkeypatch):
    monkeypatch.setenv("FERNET_OLD_KEYS", "garbage")
    crypto.reset_cipher()
    with pytest.raises(CryptoConfigError):
        crypto.startup_check()


def test_missing_key_outside_demo_mode_refuses_to_start(monkeypatch):
    monkeypatch.delenv("FERNET_KEY")
    crypto.reset_cipher()
    with pytest.raises(CryptoConfigError, match="FERNET_KEY"):
        crypto.startup_check()


def test_blank_key_counts_as_missing(monkeypatch):
    monkeypatch.setenv("FERNET_KEY", "   ")
    crypto.reset_cipher()
    with pytest.raises(CryptoConfigError):
        crypto.startup_check()


def test_missing_key_in_demo_mode_warns_and_still_works(monkeypatch, capsys):
    monkeypatch.delenv("FERNET_KEY")
    monkeypatch.setenv("DEMO_MODE", "true")
    crypto.reset_cipher()
    crypto.startup_check()
    err = capsys.readouterr().err
    assert "NOT safe" in err and "DEMO_MODE" in err
    assert crypto.decrypt_text(crypto.encrypt_text(SECRET)) == SECRET


def test_warning_never_contains_a_key(monkeypatch, capsys):
    monkeypatch.delenv("FERNET_KEY")
    monkeypatch.setenv("DEMO_MODE", "1")
    crypto.reset_cipher()
    crypto.startup_check()
    out = capsys.readouterr()
    # A Fernet key is 44 characters of url-safe base64 ending in "=". None may be printed.
    assert not re.search(r"[A-Za-z0-9_\-]{43}=", out.err + out.out)
    assert "gAAAA" not in out.err + out.out


@pytest.mark.parametrize("value, expected", [
    ("true", True), ("TRUE", True), ("1", True), ("yes", True), ("on", True),
    ("false", False), ("0", False), ("", False), ("maybe", False),
])
def test_demo_mode_parsing(value, expected):
    assert demo_mode({"DEMO_MODE": value}) is expected
