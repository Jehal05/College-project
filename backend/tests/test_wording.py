"""Fixed wording: no diagnosis or urgency words anywhere (feature 54)."""
import pytest

from app.services import wording
from app.services.wording import find_banned


def test_every_template_passes_the_banned_word_scan():
    templates = list(wording.all_templates())
    assert len(templates) > 20
    for text in templates:
        assert find_banned(text) == [], text


def test_every_possible_summary_passes_the_scan():
    summaries = list(wording.all_summaries())
    assert len(summaries) == 64          # 4 sleep x 4 activity x 4 stress possibilities
    for text in summaries:
        assert find_banned(text) == [], text
        assert text.endswith(wording.CLOSING)


def test_the_required_notes_are_exact():
    assert wording.WORDING_REVIEW == "pending doctor review"
    assert wording.DATA_NOTE == "based on simulated wearable data, not a diagnosis"


def test_the_disclaimer_is_allowed_but_a_diagnosis_is_not():
    assert find_banned("This is not a diagnosis.") == []
    assert find_banned("NOT A DIAGNOSIS") == []
    assert find_banned("This is a diagnosis.") == ["diagnosis"]
    assert find_banned("not a diagnosis, but it is a diagnosis") == ["diagnosis"]


@pytest.mark.parametrize("text, expected", [
    ("You may have hypertension", ["hypertension"]),
    ("signs of a heart attack", ["heart attack"]),
    ("Possible STROKE", ["stroke"]),
    ("asthma and diabetes", ["asthma", "diabetes"]),
    ("signs of depression or an anxiety disorder", ["anxiety", "depression", "disorder"]),
    ("irregular heartbeat, arrhythmia", ["arrhythmia"]),
    ("this is urgent, act immediately", ["immediately", "urgent"]),
    ("emergency!", ["emergency"]),
    ("a severe change", ["severe"]),
])
def test_the_scanner_catches_banned_words(text, expected):
    assert find_banned(text) == expected


@pytest.mark.parametrize("text", ["keystroke", "a stroker", "alerted nobody", "emergencies are not mentioned here"])
def test_the_scanner_matches_whole_words_only(text):
    assert find_banned(text) == []


def test_each_message_table_has_every_band_and_a_not_enough_data_entry():
    assert set(wording.SLEEP_MESSAGES) == {"shorter", "typical", "longer", None}
    assert set(wording.ACTIVITY_MESSAGES) == {"lower", "typical", "higher", None}
    assert set(wording.STRESS_MESSAGES) == {"lower", "typical", "higher", None}
    assert all("Not enough data" in table[None] for table in (wording.SLEEP_MESSAGES, wording.ACTIVITY_MESSAGES, wording.STRESS_MESSAGES))


def test_no_data_summary():
    text = wording.render_summary(0, None, None, None)
    assert text.startswith(wording.NO_DATA_SUMMARY) and text.endswith(wording.CLOSING)


def test_summary_states_the_number_of_days():
    assert wording.render_summary(5, "typical", "typical", "typical").startswith("Over the last 5 days: ")
