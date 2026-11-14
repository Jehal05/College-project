"""Tests for the wearable simulator (feature 13)."""
from datetime import datetime, timedelta, timezone

import pytest

from app.models.enums import SEVERITY_RANK, Severity
from app.rules.engine import evaluate
from app.sim.wearable import (
    BOUNDS,
    PROFILES,
    SCENARIO_TO_PROFILE,
    VITAL_NAMES,
    InvalidOverrideError,
    SimulatorRegistry,
    UnknownProfileError,
    WearableSimulator,
    resolve_profile_name,
)

ABNORMAL = ["heart_attack", "stroke", "low_glucose", "asthma"]
SEEDS = list(range(20))


def fake_clock():
    """A clock that moves forward exactly one second per call."""
    state = {"t": datetime(2026, 11, 16, 10, 0, 0, tzinfo=timezone.utc)}

    def now():
        state["t"] += timedelta(seconds=1)
        return state["t"]

    return now


def run(sim, ticks):
    return [sim.tick() for _ in range(ticks)]


def rank(values):
    return SEVERITY_RANK[evaluate(None, values).severity]


# ------------------------------------------------------------ profiles

def test_five_profiles_exist_and_are_complete():
    assert set(PROFILES) == {"normal", "heart_attack", "stroke", "low_glucose", "asthma"}
    for profile in PROFILES.values():
        assert set(profile.targets) == set(VITAL_NAMES)
        assert set(profile.noise) == set(VITAL_NAMES)


def test_profile_targets_are_inside_bounds():
    for profile in PROFILES.values():
        for name, target in profile.targets.items():
            low, high = BOUNDS[name]
            assert low <= target <= high


@pytest.mark.parametrize("name", ["HEART", "heart attack", "Heart-Attack", " heart_attack "])
def test_profile_name_aliases(name):
    assert resolve_profile_name(name) == "heart_attack"


def test_scenario_names_map_to_profiles():
    assert {k: resolve_profile_name(v) for k, v in SCENARIO_TO_PROFILE.items()} == SCENARIO_TO_PROFILE
    assert resolve_profile_name("DIABETIC") == "low_glucose"


@pytest.mark.parametrize("bad", ["", "  ", None, 5, "pirate"])
def test_unknown_profile_is_rejected(bad):
    with pytest.raises(UnknownProfileError):
        resolve_profile_name(bad)


# ------------------------------------------------------------ reaching the target range

@pytest.mark.parametrize("name", list(PROFILES))
@pytest.mark.parametrize("seed", [1, 2, 3])
def test_each_profile_reaches_its_target_range(name, seed):
    sim = WearableSimulator(seed=seed)
    sim.set_profile(name)
    readings = run(sim, 40)[10:]  # after the transition
    profile = PROFILES[name]
    for reading in readings:
        for vital in VITAL_NAMES:
            tolerance = 5 * profile.noise[vital] + 0.5
            assert abs(reading.values[vital] - profile.targets[vital]) <= tolerance, (name, vital)


def test_values_drift_smoothly_instead_of_jumping():
    sim = WearableSimulator(seed=7)
    start = sim.last_reading.values["heart_rate"]
    sim.set_profile("heart_attack")
    heart_rates = [start] + [r.values["heart_rate"] for r in run(sim, 12)]
    assert heart_rates[1] < PROFILES["heart_attack"].targets["heart_rate"] - 3  # not there yet
    assert max(abs(b - a) for a, b in zip(heart_rates, heart_rates[1:])) < 45   # no jump to target


def test_same_seed_gives_same_readings():
    a, b = WearableSimulator(seed=42), WearableSimulator(seed=42)
    a.set_profile("asthma"); b.set_profile("asthma")
    assert [r.values for r in run(a, 15)] == [r.values for r in run(b, 15)]


def test_values_never_leave_physical_bounds():
    sim = WearableSimulator(seed=3)
    sim.set_profile("asthma")
    sim.set_overrides({"spo2": 100, "heart_rate": 20})
    for reading in run(sim, 50):
        for vital, value in reading.values.items():
            low, high = BOUNDS[vital]
            assert low <= value <= high


# ------------------------------------------------------------ switching within 2 seconds

@pytest.mark.parametrize("name, vital", [
    ("heart_attack", "heart_rate"), ("asthma", "spo2"),
    ("low_glucose", "glucose"), ("stroke", "bp_sys"),
])
@pytest.mark.parametrize("seed", SEEDS)
def test_profile_switch_shows_within_two_seconds(name, vital, seed):
    sim = WearableSimulator(seed=seed, clock=fake_clock())
    start = sim.last_reading.values[vital]
    target = PROFILES[name].targets[vital]
    sim.set_profile(name)

    first, second = sim.tick(), sim.tick()  # one tick per second = 2 seconds

    assert first.profile == name                      # label changes on the first reading
    progress = (second.values[vital] - start) / (target - start)
    assert progress >= 0.6                            # about 75% of the way after 2 ticks
    assert second.timestamp != first.timestamp


# ------------------------------------------------------------ overrides

def test_override_beats_profile_exactly():
    sim = WearableSimulator(seed=1)
    sim.set_profile("heart_attack")
    sim.set_overrides({"heart_rate": 60})
    assert all(r.values["heart_rate"] == 60 for r in run(sim, 20))


def test_other_vitals_still_follow_the_profile_while_one_is_overridden():
    sim = WearableSimulator(seed=1)
    sim.apply(profile="asthma", overrides={"heart_rate": 60})
    last = run(sim, 20)[-1]
    assert abs(last.values["spo2"] - PROFILES["asthma"].targets["spo2"]) < 3


def test_clearing_an_override_lets_the_value_drift_back():
    sim = WearableSimulator(seed=1)
    sim.set_overrides({"heart_rate": 200})
    run(sim, 3)
    sim.set_overrides({"heart_rate": None})
    readings = run(sim, 15)
    assert readings[0].values["heart_rate"] < 200
    assert abs(readings[-1].values["heart_rate"] - PROFILES["normal"].targets["heart_rate"]) < 10


def test_empty_overrides_clear_everything():
    sim = WearableSimulator(seed=1)
    sim.set_overrides({"heart_rate": 200, "spo2": 80})
    sim.set_overrides({})
    assert sim.overrides == {}


@pytest.mark.parametrize("bad", [
    {"temperature": 37}, {"heart_rate": "fast"}, {"heart_rate": True},
    {"heart_rate": float("nan")}, {"heart_rate": float("inf")},
    {"heart_rate": 5}, {"spo2": 101}, {"glucose": -1},
])
def test_bad_overrides_are_rejected(bad):
    sim = WearableSimulator(seed=1)
    with pytest.raises(InvalidOverrideError):
        sim.set_overrides(bad)
    assert sim.overrides == {}


def test_bad_request_changes_nothing():
    sim = WearableSimulator(seed=1)
    with pytest.raises(InvalidOverrideError):
        sim.apply(profile="asthma", overrides={"heart_rate": "fast"})
    assert sim.profile == "normal"
    with pytest.raises(UnknownProfileError):
        sim.apply(profile="pirate", overrides={"heart_rate": 90})
    assert sim.overrides == {}


# ------------------------------------------------------------ reset

def test_reset_returns_to_normal():
    sim = WearableSimulator(seed=1)
    sim.apply(profile="heart_attack", overrides={"spo2": 85})
    run(sim, 10)
    sim.reset()
    assert sim.profile == "normal" and sim.overrides == {}
    assert sim.last_reading.values == PROFILES["normal"].targets


# ------------------------------------------------------------ the rules engine agrees

@pytest.mark.parametrize("name", ABNORMAL)
@pytest.mark.parametrize("seed", [1, 2, 3])
def test_rules_engine_flags_abnormal_profiles(name, seed):
    sim = WearableSimulator(seed=seed)
    sim.set_profile(name)
    for reading in run(sim, 300)[10:]:
        assert rank(reading.values) >= SEVERITY_RANK[Severity.URGENT], (name, reading.values)


@pytest.mark.parametrize("seed", SEEDS)
def test_rules_engine_never_flags_the_normal_profile(seed):
    sim = WearableSimulator(seed=seed)
    for reading in run(sim, 500):
        assert evaluate(None, reading.values).severity == Severity.NONE, reading.values


def test_heart_attack_and_asthma_are_typed_correctly():
    for name, expected in (("heart_attack", "HEART"), ("asthma", "ASTHMA")):
        sim = WearableSimulator(seed=1)
        sim.set_profile(name)
        reading = run(sim, 20)[-1]
        assert evaluate(None, reading.values).type.value == expected


# ------------------------------------------------------------ event shape and registry

def test_vitals_update_event_matches_the_contract():
    event = WearableSimulator("pat_007", seed=1, clock=fake_clock()).tick().to_event()
    assert set(event) == {"event", "emergency_id", "state", "timestamp", "payload"}
    assert event["event"] == "vitals.update" and event["emergency_id"] is None
    assert set(event["payload"]) == {"patient_id", *VITAL_NAMES}
    assert event["payload"]["patient_id"] == "pat_007"
    assert event["timestamp"].endswith("Z")


def test_registry_returns_the_same_simulator_per_patient():
    reg = SimulatorRegistry()
    assert reg.get("pat_001") is reg.get("pat_001")
    assert reg.get("pat_001") is not reg.get("pat_002")
    assert set(reg.patients()) == {"pat_001", "pat_002"}


def test_registry_reset_all_resets_in_place():
    reg = SimulatorRegistry()
    sim = reg.get("pat_001")
    sim.apply(profile="asthma", overrides={"spo2": 85})
    reg.reset_all()
    assert reg.get("pat_001") is sim
    assert sim.profile == "normal" and sim.overrides == {}


def test_invalid_alpha_is_rejected():
    for bad in (0, -1, 1.5):
        with pytest.raises(ValueError):
            WearableSimulator(alpha=bad)
