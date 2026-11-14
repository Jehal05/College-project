"""Sleep, activity and stress insights (feature 54).

Works on a History (synthetic wearable data) and returns bands plus fixed
sentences. It is an early-warning style wellbeing aid, never a diagnosis.

IMPORTANT: this module must stay completely separate from the rules engine.
It creates no severity, sends no alert and starts no notification. A test
checks that this file never mentions them.

All thresholds below are DRAFT values, pending doctor review.
"""
from typing import Dict, List, Optional

import numpy as np

from app.services import wording
from app.sim.history import INTERVAL_MINUTES, SAMPLES_PER_DAY, History

PER_HOUR = 60 // INTERVAL_MINUTES        # 12 samples an hour

MIN_NIGHTS = 3                           # nights needed for a sleep estimate
MIN_DAYS = 3                             # days needed for activity and the stress baseline
COVERAGE_MIN = 0.9                       # share of a window that must have data

NIGHT_START_HOUR, NIGHT_END_HOUR = 21, 10          # a night is 21:00 to 10:00 the next morning
SLEEP_STEPS_MAX = 2                                # steps per 5 minutes that still count as still
SLEEP_HR_MARGIN = 8.0                              # bpm above the person's own resting heart rate
GAP_TOLERANCE = 3                                  # samples (15 min) of gap allowed inside a sleep run
SLEEP_SHORT_BELOW, SLEEP_LONG_ABOVE = 6.0, 9.0     # hours

ACTIVE_STEPS = 400                                 # steps in 5 minutes that count as active
STEPS_LOW_BELOW, STEPS_HIGH_FROM = 4000, 10000     # steps a day

DAY_START_HOUR, DAY_END_HOUR = 9, 20               # daytime window for variability
RECENT_DAYS = 2                                    # the last days compared with the baseline
STRESS_LOW_BELOW, STRESS_HIGH_ABOVE = 35, 65       # index bands


# ---------------------------------------------------------------- bands

def sleep_band(hours: float) -> str:
    return "shorter" if hours < SLEEP_SHORT_BELOW else "longer" if hours > SLEEP_LONG_ABOVE else "typical"


def activity_band(steps_per_day: float) -> str:
    return "lower" if steps_per_day < STEPS_LOW_BELOW else "higher" if steps_per_day >= STEPS_HIGH_FROM else "typical"


def stress_band(index: float) -> str:
    return "lower" if index < STRESS_LOW_BELOW else "higher" if index > STRESS_HIGH_ABOVE else "typical"


def stress_index(baseline_hrv: float, recent_hrv: float) -> int:
    """50 means 'same as your own usual'. Lower variability than usual pushes it up."""
    value = 50 + 100 * (baseline_hrv - recent_hrv) / baseline_hrv
    return int(round(min(max(value, 0.0), 100.0)))


# ---------------------------------------------------------------- helpers

def _coverage(*arrays: np.ndarray) -> float:
    if arrays[0].size == 0:
        return 0.0
    ok = np.ones(arrays[0].shape, dtype=bool)
    for arr in arrays:
        ok &= ~np.isnan(arr)
    return float(ok.mean())


def _longest_run_samples(mask: np.ndarray) -> int:
    """Length (in samples) of the longest True stretch, joining stretches closer than GAP_TOLERANCE."""
    where = np.flatnonzero(mask)
    if where.size == 0:
        return 0
    best, run_start, prev = 0, int(where[0]), int(where[0])
    for i in where[1:]:
        i = int(i)
        if i - prev - 1 > GAP_TOLERANCE:
            best = max(best, prev - run_start + 1)
            run_start = i
        prev = i
    return max(best, prev - run_start + 1)


def _not_enough(message_table: Dict) -> dict:
    return {"status": "not_enough_data", "band": None, "message": message_table[None]}


# ---------------------------------------------------------------- the three insights

def estimate_sleep(history: History) -> dict:
    result = _not_enough(wording.SLEEP_MESSAGES) | {"avg_hours": None, "nights_used": 0}
    if history.days < 2 or np.isnan(history.heart_rate).all():
        return result
    resting_hr = float(np.nanpercentile(history.heart_rate, 10))
    threshold = resting_hr + SLEEP_HR_MARGIN

    hours: List[float] = []
    for night in range(1, history.days):          # night k runs from day k-1 21:00 to day k 10:00
        first = (night - 1) * SAMPLES_PER_DAY + NIGHT_START_HOUR * PER_HOUR
        last = night * SAMPLES_PER_DAY + NIGHT_END_HOUR * PER_HOUR
        hr, steps = history.heart_rate[first:last], history.steps[first:last]
        if _coverage(hr, steps) < COVERAGE_MIN:
            continue
        still = (~np.isnan(hr)) & (~np.isnan(steps)) & (steps <= SLEEP_STEPS_MAX) & (hr <= threshold)
        hours.append(_longest_run_samples(still) * INTERVAL_MINUTES / 60)

    result["nights_used"] = len(hours)
    if len(hours) < MIN_NIGHTS:
        return result
    average = float(np.mean(hours))
    band = sleep_band(average)
    return {"status": "ok", "avg_hours": round(average, 1), "nights_used": len(hours),
            "band": band, "message": wording.SLEEP_MESSAGES[band]}


def estimate_activity(history: History) -> dict:
    result = _not_enough(wording.ACTIVITY_MESSAGES) | {"avg_steps_per_day": None, "avg_active_minutes_per_day": None, "days_used": 0}
    totals, active = [], []
    for day in range(history.days):
        steps = history.steps[day * SAMPLES_PER_DAY:(day + 1) * SAMPLES_PER_DAY]
        if _coverage(steps) < COVERAGE_MIN:
            continue
        totals.append(float(np.nansum(steps)))
        active.append(int(np.sum(steps[~np.isnan(steps)] >= ACTIVE_STEPS)) * INTERVAL_MINUTES)
    result["days_used"] = len(totals)
    if len(totals) < MIN_DAYS:
        return result
    avg_steps = float(np.mean(totals))
    band = activity_band(avg_steps)
    return {"status": "ok", "avg_steps_per_day": int(round(avg_steps)),
            "avg_active_minutes_per_day": int(round(float(np.mean(active)))), "days_used": len(totals),
            "band": band, "message": wording.ACTIVITY_MESSAGES[band]}


def estimate_stress(history: History) -> dict:
    result = _not_enough(wording.STRESS_MESSAGES) | {"index": None}
    day_means: Dict[int, float] = {}
    for day in range(history.days):
        first = day * SAMPLES_PER_DAY + DAY_START_HOUR * PER_HOUR
        last = day * SAMPLES_PER_DAY + DAY_END_HOUR * PER_HOUR
        window = history.hrv[first:last]
        if _coverage(window) >= COVERAGE_MIN:
            day_means[day] = float(np.nanmean(window))
    baseline = [v for d, v in day_means.items() if d < history.days - RECENT_DAYS]
    recent = [v for d, v in day_means.items() if d >= history.days - RECENT_DAYS]
    if len(baseline) < MIN_DAYS or not recent:
        return result
    index = stress_index(float(np.mean(baseline)), float(np.mean(recent)))
    band = stress_band(index)
    return {"status": "ok", "index": index, "band": band, "message": wording.STRESS_MESSAGES[band]}


def compute_insights(history: History) -> dict:
    """The body of GET /patients/{id}/insights, without the patient id and notes."""
    sleep, activity, stress = estimate_sleep(history), estimate_activity(history), estimate_stress(history)
    return {
        "period_days": history.days,
        "sleep": sleep,
        "activity": activity,
        "stress": stress,
        "summary": wording.render_summary(history.days, sleep["band"], activity["band"], stress["band"]),
    }


def insights_response(patient_id: str, history: History) -> dict:
    return {
        "patient_id": patient_id,
        **compute_insights(history),
        "wording_review": wording.WORDING_REVIEW,
        "data_note": wording.DATA_NOTE,
        "simulated": True,
    }
