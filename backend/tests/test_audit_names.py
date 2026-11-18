"""The audit log takes field NAMES made of lowercase letters and underscores only (app/services/audit.py).
Every key an organ answer can release must survive audit_name(), or reading that organ would fail with a 500."""
import re

from app.services import audit, organs
from app.services.lab_values import audit_name
from app.services.report_text import TESTS

AUDIT_NAME = re.compile(r"[a-z][a-z_]{0,30}")   # the same rule as audit._NAME


def every_key():
    keys = set(TESTS)
    for items in organs.ORGANS.values():
        keys.update(key for key, _kind in items)
    return keys


def test_every_released_key_is_a_valid_audit_name():
    for key in every_key():
        assert AUDIT_NAME.fullmatch(audit_name(key)), key


def test_the_rule_here_is_the_rule_in_the_audit_service():
    assert audit._NAME.pattern == AUDIT_NAME.pattern


def test_digits_become_one_underscore_and_a_trailing_one_is_dropped():
    assert audit_name("hba1c") == "hba_c"
    assert audit_name("spo2") == "spo"
    assert audit_name("heart_rate") == "heart_rate"


def test_two_keys_never_share_one_audit_name():
    names = [audit_name(k) for k in sorted(every_key())]
    assert len(names) == len(set(names))
