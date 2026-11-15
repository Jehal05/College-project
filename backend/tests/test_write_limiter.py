"""The emergency-creation rate limit: unit behaviour of the limiter, and the 429 on the real route."""
from app.security.write_limiter import WriteLimiter

CHEST = {"type": "HEART", "symptoms": ["CHEST_PAIN", "SHORT_BREATH"]}


class Clock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now


def test_calls_up_to_the_limit_pass_then_the_next_waits():
    clock = Clock()
    lim = WriteLimiter(limit=3, window_seconds=60, clock=clock)
    assert [lim.take("u") for _ in range(3)] == [None, None, None]
    wait = lim.take("u")
    assert wait is not None and 1 <= wait <= 60


def test_the_window_slides_and_keys_are_separate():
    clock = Clock()
    lim = WriteLimiter(limit=1, window_seconds=60, clock=clock)
    assert lim.take("a") is None and lim.take("b") is None
    assert lim.take("a") is not None
    clock.now += 61
    assert lim.take("a") is None


def test_memory_is_bounded(monkeypatch):
    import app.security.write_limiter as wl
    monkeypatch.setattr(wl, "MAX_KEYS", 5)
    lim = WriteLimiter(limit=1, window_seconds=60, clock=Clock())
    for i in range(20):
        lim.take(f"user{i}")
    assert lim.size() <= 6


def test_bad_settings_fall_back_to_the_defaults(monkeypatch):
    for bad in ("abc", "0", "-3"):
        monkeypatch.setenv("EMERGENCY_MAX_PER_WINDOW", bad)
        assert WriteLimiter().limit == 30


def test_the_route_answers_429_with_retry_after_after_the_limit(demo, monkeypatch):
    monkeypatch.setenv("EMERGENCY_MAX_PER_WINDOW", "2")
    from app.security.write_limiter import reset_write_limiters
    reset_write_limiters()
    headers = demo.headers()
    assert demo.post("/emergencies", json=CHEST, headers=headers).status_code == 201
    assert demo.post("/emergencies", json=CHEST, headers=headers).status_code == 201
    r = demo.post("/emergencies", json=CHEST, headers=headers)
    assert r.status_code == 429
    assert int(r.headers["retry-after"]) >= 1
    assert r.json()["error"] == r.json()["detail"]


def test_a_refused_request_is_not_counted_against_the_limit(demo, monkeypatch):
    monkeypatch.setenv("EMERGENCY_MAX_PER_WINDOW", "1")
    from app.security.write_limiter import reset_write_limiters
    reset_write_limiters()
    headers = demo.headers()
    assert demo.post("/emergencies", json={"type": "NOT_A_TYPE"}, headers=headers).status_code == 400
    assert demo.post("/emergencies", json=CHEST, headers=headers).status_code == 201
