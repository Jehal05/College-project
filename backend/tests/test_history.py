"""Synthetic wearable history (feature 54)."""
from datetime import date, datetime, timedelta, timezone

import numpy as np
import pytest

from app.sim.history import PROFILES, SAMPLES_PER_DAY, History, generate_history, seed_for

REF = date(2026, 11, 16)


def make(pid="pat_001", **kw):
    return generate_history(pid, reference_date=REF, **kw)


def test_same_patient_date_and_profile_give_identical_numbers():
    a, b = make(), make()
    assert np.array_equal(a.heart_rate, b.heart_rate) and np.array_equal(a.hrv, b.hrv) and np.array_equal(a.steps, b.steps)


def test_different_patients_get_different_numbers():
    assert not np.array_equal(make("pat_001").heart_rate, make("pat_002").heart_rate)


def test_seed_is_stable_across_runs():
    assert seed_for("pat_001") == seed_for("pat_001") != seed_for("pat_002")
    assert seed_for("pat_001") == 18012544565901546229   # pinned: sha256-based, so identical on every machine and run


def test_shape_and_timing_are_seven_days_at_five_minutes():
    h = make()
    assert h.days == 7 and h.n_samples == 7 * SAMPLES_PER_DAY == 2016
    stamps = h.timestamps()
    assert stamps[0] == datetime(2026, 11, 9, tzinfo=timezone.utc)           # midnight, 7 days before the reference date
    assert stamps[-1] == datetime(2026, 11, 16, tzinfo=timezone.utc) - timedelta(minutes=5)
    assert all((b - a) == timedelta(minutes=5) for a, b in zip(stamps, stamps[1:]))


def test_values_are_in_plausible_ranges_and_never_missing():
    for pid in (f"pat_{i:03d}" for i in range(30)):
        h = make(pid)
        assert not (np.isnan(h.heart_rate).any() or np.isnan(h.hrv).any() or np.isnan(h.steps).any())
        assert 35 <= h.heart_rate.min() and h.heart_rate.max() <= 200
        assert 5 <= h.hrv.min() and h.hrv.max() <= 200
        assert h.steps.min() >= 0 and h.steps.max() < 1200
        assert np.array_equal(h.steps, np.rint(h.steps))


def test_night_is_calmer_than_day():
    h = make()
    slot = np.arange(h.n_samples) % SAMPLES_PER_DAY
    night, day = (slot >= 1 * 12) & (slot < 5 * 12), (slot >= 10 * 12) & (slot < 18 * 12)
    assert h.heart_rate[night].mean() + 10 < h.heart_rate[day].mean()
    assert h.steps[night].sum() == 0
    assert h.hrv[night].mean() > h.hrv[day].mean()


def test_stressed_and_calm_profiles_only_change_the_last_two_days():
    typical, stressed, calm = make(), make(profile="stressed"), make(profile="calm")
    cut = 5 * SAMPLES_PER_DAY
    assert stressed.hrv[cut:].mean() < typical.hrv[cut:].mean() < calm.hrv[cut:].mean()
    assert np.array_equal(typical.hrv[:cut], stressed.hrv[:cut]) and np.array_equal(typical.hrv[:cut], calm.hrv[:cut])


def test_traits_do_not_depend_on_the_profile():
    assert np.array_equal(make().steps, make(profile="stressed").steps)


def test_unknown_profile_and_negative_days_are_rejected():
    with pytest.raises(ValueError):
        make(profile="angry")
    with pytest.raises(ValueError):
        make(days=-1)


def test_zero_days_gives_an_empty_history():
    h = make(days=0)
    assert h.days == 0 and h.n_samples == 0 and len(h.heart_rate) == 0


def test_with_missing_blanks_only_the_chosen_slice():
    h = make().with_missing(100, 200)
    assert np.isnan(h.heart_rate[100:200]).all() and not np.isnan(h.heart_rate[:100]).any()
    assert np.isnan(h.steps[100:200]).all() and np.isnan(h.hrv[100:200]).all()


def test_first_days_cuts_the_history():
    assert make().first_days(2).n_samples == 2 * SAMPLES_PER_DAY


def test_validate_rejects_wrong_lengths():
    h = make()
    broken = History(h.patient_id, h.start, 7, h.heart_rate[:-1], h.hrv, h.steps)
    with pytest.raises(ValueError):
        broken.validate()


def test_all_profiles_are_listed():
    assert set(PROFILES) == {"typical", "calm", "stressed"}
