"""Fixed wording for wellbeing insights (feature 54). PENDING DOCTOR REVIEW.

Every sentence a patient or relative can read comes from this file. Nothing is
built from free text. A doctor or medical teacher must approve this wording
before any public use.

There are no diagnosis words and no urgency words here, on purpose. A test
scans every template and every possible summary against BANNED_TERMS.
"""
import re
from typing import Dict, Iterator, List, Optional

WORDING_REVIEW = "pending doctor review"
DATA_NOTE = "based on simulated wearable data, not a diagnosis"

# Phrases that are allowed even though they contain a banned word.
ALLOWED_PHRASES = ("not a diagnosis",)

BANNED_TERMS = (
    # diagnosis words
    "diagnosis", "diagnose", "diagnosed", "diagnostic", "disease", "disorder", "syndrome",
    "hypertension", "hypotension", "diabetes", "diabetic", "arrhythmia", "tachycardia",
    "bradycardia", "fibrillation", "depression", "depressed", "anxiety", "heart attack",
    "myocardial", "infarction", "stroke", "asthma", "cancer", "insomnia", "apnea", "apnoea",
    # urgency words
    "emergency", "urgent", "urgently", "immediately", "danger", "dangerous", "severe",
    "critical", "alarm", "alert",
)
_BANNED_RE = re.compile(r"\b(" + "|".join(re.escape(t) for t in BANNED_TERMS) + r")\b", re.IGNORECASE)


def find_banned(text: str) -> List[str]:
    """Banned words found in `text`. The allowed disclaimer phrases are ignored."""
    cleaned = text
    for phrase in ALLOWED_PHRASES:
        cleaned = re.sub(re.escape(phrase), " ", cleaned, flags=re.IGNORECASE)
    return sorted({m.group(1).lower() for m in _BANNED_RE.finditer(cleaned)})


# One sentence per band. The key None means "not enough data".
SLEEP_MESSAGES: Dict[Optional[str], str] = {
    "shorter": "Estimated sleep was on the shorter side.",
    "typical": "Estimated sleep was in a typical range.",
    "longer": "Estimated sleep was on the longer side.",
    None: "Not enough data yet to estimate sleep.",
}
ACTIVITY_MESSAGES: Dict[Optional[str], str] = {
    "lower": "Daily steps were on the lower side.",
    "typical": "Daily steps were in a typical range.",
    "higher": "Daily steps were on the higher side.",
    None: "Not enough data yet to look at daily activity.",
}
STRESS_MESSAGES: Dict[Optional[str], str] = {
    "lower": "Your heart rate variability suggests a calmer period than your own usual.",
    "typical": "Your heart rate variability was close to your own usual.",
    "higher": "Your heart rate variability suggests more strain than your own usual.",
    None: "Not enough data yet to compare your heart rate variability with your own usual.",
}

SUMMARY_PHRASES = {
    "sleep": {
        "shorter": "sleep on the shorter side", "typical": "sleep in a typical range",
        "longer": "sleep on the longer side", None: "not enough sleep data yet",
    },
    "activity": {
        "lower": "steps on the lower side", "typical": "steps in a typical range",
        "higher": "steps on the higher side", None: "not enough activity data yet",
    },
    "stress": {
        "lower": "a calmer period than usual", "typical": "variability close to usual",
        "higher": "more strain than usual", None: "not enough variability data yet",
    },
}
SUMMARY_PREFIX = "Over the last {days} days: "
NO_DATA_SUMMARY = "There is not enough data yet for a wellbeing summary."
CLOSING = "These are general notes from simulated data. If something worries you, talk to a doctor."


def render_summary(days: int, sleep: Optional[str], activity: Optional[str], stress: Optional[str]) -> str:
    """The short plain-language summary, built only from the fixed pieces above."""
    if sleep is None and activity is None and stress is None:
        return f"{NO_DATA_SUMMARY} {CLOSING}"
    parts = "; ".join([
        SUMMARY_PHRASES["sleep"][sleep],
        SUMMARY_PHRASES["activity"][activity],
        SUMMARY_PHRASES["stress"][stress],
    ])
    return f"{SUMMARY_PREFIX.format(days=days)}{parts}. {CLOSING}"


def all_templates() -> Iterator[str]:
    """Every fixed string a user can ever see (used by the banned-word scan)."""
    yield WORDING_REVIEW
    yield DATA_NOTE
    yield from SLEEP_MESSAGES.values()
    yield from ACTIVITY_MESSAGES.values()
    yield from STRESS_MESSAGES.values()
    for table in SUMMARY_PHRASES.values():
        yield from table.values()
    yield SUMMARY_PREFIX.format(days=7)
    yield NO_DATA_SUMMARY
    yield CLOSING


def all_summaries(days: int = 7) -> Iterator[str]:
    """Every summary that can be produced (4 x 4 x 4 combinations)."""
    for sleep in (*SUMMARY_PHRASES["sleep"],):
        for activity in (*SUMMARY_PHRASES["activity"],):
            for stress in (*SUMMARY_PHRASES["stress"],):
                yield render_summary(days, sleep, activity, stress)
