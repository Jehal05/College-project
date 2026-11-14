"""The login rate limit (feature 33)."""
import pytest

from app.security import login_limiter as ll
from app.security.login_limiter import LoginLimiter


class Clock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now

    def advance(self, seconds):
        self.now += seconds


@pytest.fixture
def clock():
    return Clock()


def limiter(clock, **kw):
    return LoginLimiter(max_per_login=kw.get("login", 3), max_per_ip=kw.get("ip", 10), window_seconds=kw.get("window", 60), clock=clock)


def fail(lim, login="a@x", ip="1.1.1.1", times=1):
    for _ in range(times):
        lim.record_failure(login, ip)


def test_nothing_is_blocked_at_first(clock):
    assert limiter(clock).retry_after("a@x", "1.1.1.1") is None


def test_a_login_is_blocked_after_too_many_failures(clock):
    lim = limiter(clock)
    fail(lim, times=2)
    assert lim.retry_after("a@x", "1.1.1.1") is None
    fail(lim)
    assert lim.retry_after("a@x", "1.1.1.1") == 60


def test_the_wait_shrinks_as_time_passes(clock):
    lim = limiter(clock)
    fail(lim, times=3)
    clock.advance(45)
    assert lim.retry_after("a@x", "1.1.1.1") == 15


def test_the_block_ends_when_the_window_ends(clock):
    lim = limiter(clock)
    fail(lim, times=3)
    clock.advance(60)
    assert lim.retry_after("a@x", "1.1.1.1") is None


def test_old_failures_stop_counting(clock):
    lim = limiter(clock)
    fail(lim, times=2)
    clock.advance(61)
    fail(lim, times=2)
    assert lim.retry_after("a@x", "1.1.1.1") is None      # only 2 recent ones


def test_a_success_clears_that_login(clock):
    lim = limiter(clock)
    fail(lim, times=2)
    lim.record_success("a@x")
    fail(lim, times=2)
    assert lim.retry_after("a@x", "1.1.1.1") is None


def test_one_login_being_blocked_does_not_block_another(clock):
    lim = limiter(clock)
    fail(lim, "a@x", times=3)
    assert lim.retry_after("a@x", "1.1.1.1") is not None
    assert lim.retry_after("b@x", "9.9.9.9") is None


def test_the_login_name_is_matched_without_regard_to_case_or_spaces(clock):
    lim = limiter(clock)
    fail(lim, " A@X ", times=3)
    assert lim.retry_after("a@x", "5.5.5.5") is not None


def test_one_address_trying_many_logins_is_blocked(clock):
    lim = limiter(clock, ip=4)
    for n in range(4):
        fail(lim, f"user{n}@x", "7.7.7.7")
    assert lim.retry_after("brand-new@x", "7.7.7.7") is not None
    assert lim.retry_after("brand-new@x", "8.8.8.8") is None


def test_a_success_does_not_clear_the_address_counter(clock):
    lim = limiter(clock, ip=4)
    for n in range(4):
        fail(lim, f"user{n}@x", "7.7.7.7")
    lim.record_success("user0@x")
    assert lim.retry_after("user0@x", "7.7.7.7") is not None


def test_reset_forgets_everything(clock):
    lim = limiter(clock)
    fail(lim, times=3)
    lim.reset()
    assert lim.retry_after("a@x", "1.1.1.1") is None and lim.size() == 0


def test_the_table_never_grows_without_limit(clock, monkeypatch):
    monkeypatch.setattr(ll, "MAX_KEYS", 50)
    lim = limiter(clock)
    for n in range(500):
        lim.record_failure(f"user{n}@x", f"10.0.0.{n % 250}")
    assert len(lim._logins) <= 50 and len(lim._ips) <= 50


def test_expired_entries_are_dropped_when_the_table_is_full(clock, monkeypatch):
    monkeypatch.setattr(ll, "MAX_KEYS", 20)
    lim = limiter(clock)
    for n in range(20):
        lim.record_failure(f"old{n}@x", "2.2.2.2")
    clock.advance(120)
    lim.record_failure("fresh@x", "2.2.2.2")
    for n in range(5):
        lim.record_failure(f"more{n}@x", "2.2.2.2")
    assert len(lim._logins) <= 20 and "fresh@x" in lim._logins


def test_the_settings_come_from_the_environment(monkeypatch):
    monkeypatch.setenv("LOGIN_MAX_FAILURES", "2")
    monkeypatch.setenv("LOGIN_IP_MAX_FAILURES", "7")
    monkeypatch.setenv("LOGIN_WINDOW_SECONDS", "15")
    lim = LoginLimiter()
    assert (lim.max_per_login, lim.max_per_ip, lim.window) == (2, 7, 15)


@pytest.mark.parametrize("bad", ["banana", "0", "-3"])
def test_bad_settings_fall_back_to_the_defaults(monkeypatch, bad):
    monkeypatch.setenv("LOGIN_MAX_FAILURES", bad)
    assert LoginLimiter().max_per_login == 5


def test_the_shared_limiter_can_be_reset():
    first = ll.get_limiter()
    assert ll.get_limiter() is first
    ll.reset_limiter()
    assert ll.get_limiter() is not first
