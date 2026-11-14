"""Wearable simulator (feature 13).

Produces fake but believable vitals for a virtual patient: heart rate, SpO2,
blood pressure, glucose and breathing rate. Nothing here is real data.

How it works
- One call to tick() is one reading. The vitals service calls it once per
  second, so "within 2 seconds" means "within 2 ticks".
- Each vital drifts toward the target of the current profile:
      new = current + alpha * (target - current) + noise
  With alpha = 0.5 a switch is about 50% done after 1 tick and 75% after 2.
- Noise is small and capped, so a profile stays inside a known band.
- An override pins one vital to an exact value and beats the profile.

Safety: this module only makes numbers. It never decides severity. The rules
engine decides, and nothing here can lower what the rules engine returns.
"""
from __future__ import annotations

import math
import random
import re
import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Callable, Dict, Mapping, Optional

VITAL_NAMES = ("heart_rate", "spo2", "bp_sys", "bp_dia", "glucose", "resp_rate")

# Plausible limits. Values and overrides are always kept inside them.
BOUNDS = {
    "heart_rate": (20.0, 250.0),
    "spo2": (50.0, 100.0),
    "bp_sys": (50.0, 260.0),
    "bp_dia": (30.0, 160.0),
    "glucose": (20.0, 600.0),
    "resp_rate": (4.0, 60.0),
}
DECIMALS = {"heart_rate": 0, "spo2": 1, "bp_sys": 0, "bp_dia": 0, "glucose": 0, "resp_rate": 0}

DEFAULT_ALPHA = 0.5       # share of the remaining gap closed on each tick
NOISE_LIMIT_SIGMAS = 2.5  # noise is cut off at this many standard deviations


class WearableError(ValueError):
    """Base class for simulator input errors."""


class UnknownProfileError(WearableError):
    pass


class InvalidOverrideError(WearableError):
    pass


@dataclass(frozen=True)
class Profile:
    name: str
    label: str
    targets: Mapping[str, float]
    noise: Mapping[str, float]  # standard deviation per vital


# DRAFT demo values, not clinical advice. Each abnormal profile is chosen so
# the rules engine flags it (at least URGENT) even at the edge of its noise
# band. The normal profile is chosen so the rules engine never flags it.
PROFILES: Dict[str, Profile] = {
    "normal": Profile(
        "normal", "Normal",
        targets={"heart_rate": 72, "spo2": 98, "bp_sys": 120, "bp_dia": 80, "glucose": 100, "resp_rate": 16},
        noise={"heart_rate": 1.5, "spo2": 0.3, "bp_sys": 2.0, "bp_dia": 1.5, "glucose": 2.0, "resp_rate": 0.5},
    ),
    "heart_attack": Profile(
        "heart_attack", "Heart attack",
        targets={"heart_rate": 140, "spo2": 93, "bp_sys": 150, "bp_dia": 95, "glucose": 105, "resp_rate": 22},
        noise={"heart_rate": 3.0, "spo2": 0.5, "bp_sys": 3.0, "bp_dia": 2.0, "glucose": 2.0, "resp_rate": 1.0},
    ),
    "stroke": Profile(
        "stroke", "Stroke",
        targets={"heart_rate": 90, "spo2": 96, "bp_sys": 200, "bp_dia": 115, "glucose": 110, "resp_rate": 18},
        noise={"heart_rate": 2.0, "spo2": 0.4, "bp_sys": 3.0, "bp_dia": 2.0, "glucose": 2.0, "resp_rate": 0.7},
    ),
    "low_glucose": Profile(
        "low_glucose", "Low glucose",
        targets={"heart_rate": 105, "spo2": 97, "bp_sys": 115, "bp_dia": 75, "glucose": 50, "resp_rate": 18},
        noise={"heart_rate": 2.0, "spo2": 0.3, "bp_sys": 2.0, "bp_dia": 1.5, "glucose": 2.0, "resp_rate": 0.6},
    ),
    "asthma": Profile(
        "asthma", "Asthma",
        targets={"heart_rate": 115, "spo2": 88, "bp_sys": 130, "bp_dia": 85, "glucose": 100, "resp_rate": 28},
        noise={"heart_rate": 3.0, "spo2": 0.5, "bp_sys": 2.0, "bp_dia": 1.5, "glucose": 2.0, "resp_rate": 1.0},
    ),
}

# The demo panel and the contract use emergency type names. Map them to profiles.
SCENARIO_TO_PROFILE = {
    "HEART": "heart_attack",
    "STROKE": "stroke",
    "DIABETIC": "low_glucose",
    "ASTHMA": "asthma",
}
_ALIASES = {"heart": "heart_attack", "diabetic": "low_glucose"}


def resolve_profile_name(name: Any) -> str:
    """'HEART', 'heart attack' and 'Heart-Attack' all give 'heart_attack'."""
    if not isinstance(name, str) or not name.strip():
        raise UnknownProfileError("Profile name must be a non-empty string")
    key = re.sub(r"[\s\-]+", "_", name.strip().lower())
    key = _ALIASES.get(key, key)
    if key not in PROFILES:
        raise UnknownProfileError(f"Unknown profile '{name}'. Allowed: {', '.join(PROFILES)}")
    return key


def _validate_override(name: Any, value: Any) -> Optional[float]:
    """Return a clean float, or None meaning 'clear this override'."""
    if name not in VITAL_NAMES:
        raise InvalidOverrideError(f"Unknown vital '{name}'. Allowed: {', '.join(VITAL_NAMES)}")
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise InvalidOverrideError(f"Override for '{name}' must be a number")
    number = float(value)
    if math.isnan(number) or math.isinf(number):
        raise InvalidOverrideError(f"Override for '{name}' must be a finite number")
    low, high = BOUNDS[name]
    if not low <= number <= high:
        raise InvalidOverrideError(f"Override for '{name}' must be between {low:g} and {high:g}")
    return number


def _format(name: str, value: float):
    low, high = BOUNDS[name]
    value = min(max(value, low), high)
    if DECIMALS[name] == 0:
        return int(round(value))
    return round(value, DECIMALS[name])


def _iso(moment: datetime) -> str:
    return moment.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


@dataclass(frozen=True)
class Reading:
    patient_id: str
    profile: str
    timestamp: str
    values: Dict[str, float]

    def to_dict(self) -> dict:
        return {"patient_id": self.patient_id, "profile": self.profile,
                "timestamp": self.timestamp, **self.values}

    def to_event(self, state: str = "MONITORING") -> dict:
        """The vitals.update event from CONTRACT.md. emergency_id is null."""
        return {
            "event": "vitals.update",
            "emergency_id": None,
            "state": state,
            "timestamp": self.timestamp,
            "payload": {"patient_id": self.patient_id, **self.values},
        }


class WearableSimulator:
    def __init__(
        self,
        patient_id: str = "pat_001",
        profile: str = "normal",
        *,
        seed: Optional[int] = None,
        alpha: float = DEFAULT_ALPHA,
        clock: Optional[Callable[[], datetime]] = None,
    ) -> None:
        if not 0 < alpha <= 1:
            raise ValueError("alpha must be greater than 0 and at most 1")
        self.patient_id = patient_id
        self._alpha = alpha
        self._clock = clock or (lambda: datetime.now(timezone.utc))
        self._rng = random.Random(seed)
        self._lock = threading.RLock()
        self._profile = resolve_profile_name(profile)
        self._overrides: Dict[str, float] = {}
        self._current: Dict[str, float] = {k: float(v) for k, v in PROFILES[self._profile].targets.items()}
        self.last_reading: Reading = self._snapshot()

    # ------------------------------------------------------------ state

    @property
    def profile(self) -> str:
        return self._profile

    @property
    def overrides(self) -> Dict[str, float]:
        with self._lock:
            return dict(self._overrides)

    def _snapshot(self) -> Reading:
        values = {name: _format(name, self._current[name]) for name in VITAL_NAMES}
        return Reading(self.patient_id, self._profile, _iso(self._clock()), values)

    # ------------------------------------------------------------ changes

    def apply(self, profile: Optional[str] = None, overrides: Optional[Mapping[str, Any]] = None) -> None:
        """Switch profile and/or change overrides. All input is checked first,
        so a bad request changes nothing.
        A None value inside overrides clears that override. An empty dict
        clears all of them."""
        new_profile = resolve_profile_name(profile) if profile is not None else None
        changes: Optional[Dict[str, Optional[float]]] = None
        if overrides is not None:
            if not isinstance(overrides, Mapping):
                raise InvalidOverrideError("Overrides must be an object of vital: value")
            changes = {name: _validate_override(name, value) for name, value in overrides.items()}
        with self._lock:
            if new_profile is not None:
                self._profile = new_profile
            if changes is not None:
                if not changes:
                    self._overrides.clear()
                for name, value in changes.items():
                    if value is None:
                        self._overrides.pop(name, None)
                    else:
                        self._overrides[name] = value

    def set_profile(self, profile: str) -> None:
        self.apply(profile=profile)

    def set_overrides(self, overrides: Mapping[str, Any]) -> None:
        self.apply(overrides=overrides)

    def clear_overrides(self) -> None:
        self.apply(overrides={})

    def reset(self) -> None:
        """Back to the normal profile, no overrides, values snap to normal."""
        with self._lock:
            self._profile = "normal"
            self._overrides.clear()
            self._current = {k: float(v) for k, v in PROFILES["normal"].targets.items()}
            self.last_reading = self._snapshot()

    # ------------------------------------------------------------ the stream

    def tick(self) -> Reading:
        """Make the next reading. Call once per second."""
        with self._lock:
            profile = PROFILES[self._profile]
            for name in VITAL_NAMES:
                if name in self._overrides:
                    self._current[name] = self._overrides[name]
                    continue
                sigma = profile.noise[name]
                limit = NOISE_LIMIT_SIGMAS * sigma
                noise = max(-limit, min(limit, self._rng.gauss(0.0, sigma)))
                gap = profile.targets[name] - self._current[name]
                value = self._current[name] + self._alpha * gap + noise
                low, high = BOUNDS[name]
                self._current[name] = min(max(value, low), high)
            self.last_reading = self._snapshot()
            return self.last_reading


class SimulatorRegistry:
    """One simulator per patient. The vitals service and the demo panel share it."""

    def __init__(self, factory: Optional[Callable[[str], WearableSimulator]] = None) -> None:
        self._factory = factory or (lambda patient_id: WearableSimulator(patient_id))
        self._sims: Dict[str, WearableSimulator] = {}
        self._lock = threading.Lock()

    def get(self, patient_id: str) -> WearableSimulator:
        with self._lock:
            if patient_id not in self._sims:
                self._sims[patient_id] = self._factory(patient_id)
            return self._sims[patient_id]

    def patients(self) -> list:
        with self._lock:
            return list(self._sims)

    def reset_all(self) -> None:
        """Used by /demo/reset. Resets in place so running tickers keep working."""
        with self._lock:
            sims = list(self._sims.values())
        for sim in sims:
            sim.reset()


registry = SimulatorRegistry()
