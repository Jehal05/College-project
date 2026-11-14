"""Synthetic wearable history (feature 54). ALL DATA IS FAKE.

Makes 7 days of heart rate, heart rate variability (RMSSD, in ms) and steps at
5-minute resolution for a virtual patient, with a day and night rhythm.

- Same patient id + same date + same profile = exactly the same numbers
  (the seed comes from a hash of the patient id, not from Python's random hash).
- The 7 days are the last 7 COMPLETE days before the reference date, in UTC
  clock time (the simulation treats UTC hours as "local" hours).
- profile "typical", "calm" or "stressed" changes only the last 2 days: a calm
  profile raises variability clearly, a stressed one lowers it and raises daytime heart
  rate. Tests use these to prove the insights react.
- Missing data is NaN. Nothing here ever decides a severity.
"""
import hashlib
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from typing import Optional

import numpy as np

SAMPLES_PER_DAY = 288          # 24 h at 5 minutes
INTERVAL_MINUTES = 5
PROFILES = ("typical", "calm", "stressed")
DEFAULT_DAYS = 7


def seed_for(patient_id: str) -> int:
    """A stable number for a patient id (the same on every machine and every run)."""
    return int.from_bytes(hashlib.sha256(patient_id.encode("utf-8")).digest()[:8], "big")


@dataclass(frozen=True, eq=False)
class History:
    patient_id: str
    start: datetime                 # midnight (UTC) at the start of the first day
    days: int
    heart_rate: np.ndarray          # beats per minute, NaN = missing
    hrv: np.ndarray                 # RMSSD in ms, NaN = missing
    steps: np.ndarray               # steps in each 5-minute slot, NaN = missing
    profile: str = "typical"
    # For tests only: the true sleep length (minutes) of the night that ENDS on
    # morning k, for k = 0..days-1 (k = 0 is only partly inside the data).
    true_sleep_minutes: np.ndarray = field(default_factory=lambda: np.array([]))

    @property
    def n_samples(self) -> int:
        return self.days * SAMPLES_PER_DAY

    def timestamps(self) -> list:
        return [self.start + timedelta(minutes=INTERVAL_MINUTES * i) for i in range(self.n_samples)]

    def validate(self) -> None:
        for name in ("heart_rate", "hrv", "steps"):
            if len(getattr(self, name)) != self.n_samples:
                raise ValueError(f"{name} must have {self.n_samples} samples")

    def with_missing(self, first: int, last: int) -> "History":
        """A copy where samples first..last-1 are missing (for tests)."""
        hr, hrv, steps = self.heart_rate.copy(), self.hrv.copy(), self.steps.copy()
        hr[first:last] = hrv[first:last] = steps[first:last] = np.nan
        return History(self.patient_id, self.start, self.days, hr, hrv, steps, self.profile, self.true_sleep_minutes)

    def first_days(self, days: int) -> "History":
        """Only the first `days` days (for tests of the 'not enough data' case)."""
        n = days * SAMPLES_PER_DAY
        return History(self.patient_id, self.start, days, self.heart_rate[:n].copy(), self.hrv[:n].copy(),
                       self.steps[:n].copy(), self.profile, self.true_sleep_minutes[: days + 1])

    @staticmethod
    def empty(patient_id: str) -> "History":
        nothing = np.array([], dtype=float)
        return History(patient_id, datetime(1970, 1, 1, tzinfo=timezone.utc), 0, nothing, nothing.copy(), nothing.copy())


def generate_history(
    patient_id: str,
    *,
    days: int = DEFAULT_DAYS,
    profile: str = "typical",
    reference_date: Optional[date] = None,
) -> History:
    if profile not in PROFILES:
        raise ValueError(f"profile must be one of {PROFILES}")
    if days < 0:
        raise ValueError("days cannot be negative")
    if days == 0:
        return History.empty(patient_id)

    ref = reference_date or datetime.now(timezone.utc).date()
    start = datetime(ref.year, ref.month, ref.day, tzinfo=timezone.utc) - timedelta(days=days)
    rng = np.random.default_rng(seed_for(patient_id))

    # Traits of this patient. Drawn first, so they do not depend on days or profile.
    sleep_hr = rng.uniform(50, 58)
    awake_hr = rng.uniform(70, 80)
    hrv_base = rng.uniform(35, 60)
    habit = rng.uniform(0.7, 1.3)
    sleep_hours = rng.uniform(6.3, 8.2)

    n = days * SAMPLES_PER_DAY
    idx = np.arange(n)
    day_of = idx // SAMPLES_PER_DAY
    slot = idx % SAMPLES_PER_DAY

    # One night per entry j = 0..days: the night that STARTS on day j-1 and ends on day j.
    bedtime = np.clip(rng.normal(23 * 60, 25, days + 1), 21 * 60 + 30, 24 * 60 + 30)
    duration = np.clip(rng.normal(sleep_hours * 60, 25, days + 1), 300, 570)
    day_hr_offset = rng.normal(0, 1.0, days)
    day_hrv_factor = rng.normal(1.0, 0.04, days)

    asleep = np.zeros(n, dtype=bool)
    for j in range(days + 1):
        first = (j - 1) * SAMPLES_PER_DAY + int(round(bedtime[j] / INTERVAL_MINUTES))
        last = first + int(round(duration[j] / INTERVAL_MINUTES))
        lo, hi = max(first, 0), min(last, n)
        if lo < hi:
            asleep[lo:hi] = True
    awake = ~asleep

    # Steps: a few incidental steps while awake, none asleep, plus 1 to 3 walks a day.
    steps = np.zeros(n)
    steps[awake] = rng.poisson(12 * habit, int(awake.sum()))
    for day in range(days):
        for _ in range(int(rng.integers(1, 4))):
            begin = day * SAMPLES_PER_DAY + int(rng.integers(90, 240))      # between 07:30 and 20:00
            length = int(rng.integers(4, 10))
            walk = np.clip(rng.normal(450 + 80 * (habit - 1), 70, length), 0, None)
            end = min(begin + length, n)
            seg = slice(begin, end)
            steps[seg] = np.where(awake[seg], walk[: end - begin], steps[seg])
    steps = np.rint(steps)

    # Heart rate: low and steady asleep, higher and steps-driven awake.
    circadian = 2.0 * np.sin(2 * np.pi * (slot / SAMPLES_PER_DAY - 0.25))
    hr = np.empty(n)
    hr[asleep] = sleep_hr + rng.normal(0, 1.8, int(asleep.sum()))
    hr[awake] = awake_hr + 0.04 * steps[awake] + circadian[awake] + rng.normal(0, 2.0, int(awake.sum()))
    hr += day_hr_offset[day_of]

    # Heart rate variability: higher asleep, a bit lower when moving.
    hrv = np.where(asleep, hrv_base * 1.25, hrv_base * 0.8 * (1 - 0.0008 * steps))
    hrv = hrv * day_hrv_factor[day_of] + rng.normal(0, 3.0, n)

    # The profile only touches the last 2 days.
    recent = day_of >= days - 2
    if profile == "stressed":
        hrv = np.where(recent, hrv * 0.55, hrv)
        hr = np.where(recent & awake, hr + 6, hr)
    elif profile == "calm":
        hrv = np.where(recent, hrv * 1.35, hrv)

    hr = np.clip(hr, 35, 200)
    hrv = np.clip(hrv, 5, 200)
    steps = np.clip(steps, 0, None)
    history = History(patient_id, start, days, hr, hrv, steps, profile, duration.copy())
    history.validate()
    return history
