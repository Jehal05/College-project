"""Password hashing (feature 33)."""
import pytest

from app.security import passwords
from app.security.passwords import hash_password, verify_or_burn, verify_password


def test_a_password_verifies_and_a_wrong_one_does_not():
    h = hash_password("demo1234")
    assert verify_password("demo1234", h)
    assert not verify_password("demo12345", h) and not verify_password("", h) and not verify_password("DEMO1234", h)


def test_the_hash_is_bcrypt_and_does_not_contain_the_password():
    h = hash_password("correct horse battery")
    assert h.startswith("$2b$") and "correct" not in h and len(h) == 60


def test_the_same_password_gives_different_hashes():
    assert hash_password("same") != hash_password("same")


def test_the_cost_comes_from_the_environment(monkeypatch):
    monkeypatch.setenv("BCRYPT_ROUNDS", "5")
    assert hash_password("x" * 8).startswith("$2b$05$")
    monkeypatch.setenv("BCRYPT_ROUNDS", "1")        # too low: raised to the minimum
    assert hash_password("x" * 8).startswith("$2b$04$")
    monkeypatch.setenv("BCRYPT_ROUNDS", "banana")   # not a number: the default
    assert passwords._rounds() == 12
    monkeypatch.setenv("BCRYPT_ROUNDS", "99")
    assert passwords._rounds() == 15


@pytest.mark.parametrize("bad", ["", "x" * 73, "é" * 40])
def test_unusable_passwords_are_refused_when_hashing(bad):
    with pytest.raises(ValueError):
        hash_password(bad)


def test_a_72_byte_password_is_fine():
    h = hash_password("a" * 72)
    assert verify_password("a" * 72, h)


def test_a_too_long_attempt_fails_quietly_and_never_raises():
    h = hash_password("demo1234")
    assert verify_password("x" * 500, h) is False


def test_unicode_passwords_work():
    h = hash_password("पासवर्ड123")
    assert verify_password("पासवर्ड123", h) and not verify_password("पासवर्ड124", h)


@pytest.mark.parametrize("bad_hash", ["", "not a hash", "$2b$04$short", None, 5])
def test_a_damaged_stored_hash_fails_closed(bad_hash):
    assert verify_password("demo1234", bad_hash) is False


@pytest.mark.parametrize("bad", [None, 5, b"bytes"])
def test_odd_password_types_fail_closed(bad):
    assert verify_password(bad, hash_password("demo1234")) is False


def test_an_unknown_user_gets_false_after_real_work():
    assert verify_or_burn("anything", None) is False
    h = hash_password("demo1234")
    assert verify_or_burn("demo1234", h) is True
    assert verify_or_burn("wrong", h) is False


def test_unknown_user_and_wrong_password_do_the_same_bcrypt_work(monkeypatch):
    """Deterministic (no stopwatch): both paths run exactly one bcrypt comparison at the current cost."""
    monkeypatch.setenv("BCRYPT_ROUNDS", "6")
    passwords._dummy_hash = None
    real_hash = hash_password("demo1234")
    calls = []
    real_check = passwords.bcrypt.checkpw
    monkeypatch.setattr(passwords.bcrypt, "checkpw", lambda plain, hashed: calls.append(hashed) or real_check(plain, hashed))

    assert verify_or_burn("wrong-password", real_hash) is False      # a wrong password for a real user
    assert verify_or_burn("wrong-password", None) is False           # an unknown user
    assert len(calls) == 2                                           # one comparison each, never a shortcut
    assert calls[0] == real_hash.encode() and calls[1].startswith(b"$2b$06$")    # the stand-in has the same cost


def test_the_stand_in_hash_is_made_once_and_reused(monkeypatch):
    monkeypatch.setenv("BCRYPT_ROUNDS", "5")
    passwords._dummy_hash = None
    verify_or_burn("x", None)
    first = passwords._dummy_hash
    verify_or_burn("y", None)
    assert passwords._dummy_hash is first and first.startswith("$2b$05$")
