"""Emergency states, roles and the transition table must match CONTRACT.md exactly."""
import itertools

import pytest

from app.models.enums import (
    ALLOWED_TRANSITIONS, TERMINAL_STATES, EmergencySource, EmergencyState, InvalidTransition, Role,
    can_move, check_transition,
)
from tests import contract_tools as contract

S = EmergencyState
CHAIN = [S(name) for name in contract.contract_state_chain()]


def test_the_states_match_the_contract():
    assert [s.value for s in S] == contract.contract_state_chain() + sorted(contract.contract_extra_states(), key=lambda n: ["CANCELLED", "ESCALATED"].index(n))


def test_the_transition_table_matches_the_contract_exactly():
    in_code = {state.value: {n.value for n in nxt} for state, nxt in ALLOWED_TRANSITIONS.items()}
    assert in_code == contract.contract_transitions()


def test_every_state_has_a_row():
    assert set(ALLOWED_TRANSITIONS) == set(S)


def test_the_roles_match_the_contract():
    assert {r.value for r in Role} == contract.contract_roles()


def test_the_final_states():
    assert TERMINAL_STATES == {S.HANDOVER_DONE, S.CANCELLED}
    for state in TERMINAL_STATES:
        assert ALLOWED_TRANSITIONS[state] == frozenset()


def test_the_main_chain_only_moves_one_step_forward():
    for current, following in zip(CHAIN, CHAIN[1:]):
        assert ALLOWED_TRANSITIONS[current] - {S.CANCELLED, S.ESCALATED} == {following}


def test_nothing_can_be_skipped():
    for i, current in enumerate(CHAIN):
        for later in CHAIN[i + 2:]:
            assert not can_move(current, later), (current, later)


def test_nothing_moves_backwards_except_the_escalation_loop():
    for i, current in enumerate(CHAIN):
        for earlier in CHAIN[: i + 1]:
            assert not can_move(current, earlier), (current, earlier)
    assert can_move(S.ESCALATED, S.SOS_SENT)          # the one allowed loop: the next hospital is alerted


def test_cancel_is_possible_only_before_the_ambulance_is_dispatched():
    can_cancel = {s for s in S if can_move(s, S.CANCELLED)}
    assert can_cancel == {S.EMERGENCY_DETECTED, S.SOS_SENT, S.ESCALATED, S.HOSPITAL_ACKNOWLEDGED}
    for late in (S.AMBULANCE_DISPATCHED, S.EN_ROUTE, S.ARRIVED, S.HANDOVER_DONE, S.CANCELLED):
        assert not can_move(late, S.CANCELLED), late


def test_escalation_starts_only_from_sos_sent():
    assert {s for s in S if can_move(s, S.ESCALATED)} == {S.SOS_SENT}


def test_a_state_cannot_move_to_itself():
    for state in S:
        assert not can_move(state, state), state


def test_every_invalid_move_raises_with_from_and_to():
    count = 0
    for a, b in itertools.product(S, S):
        if can_move(a, b):
            check_transition(a, b)                     # allowed moves do not raise
            continue
        with pytest.raises(InvalidTransition) as err:
            check_transition(a, b)
        assert (err.value.from_state, err.value.to_state) == (a, b)
        count += 1
    assert count == 121 - sum(len(n) for n in ALLOWED_TRANSITIONS.values())


def test_the_error_message_names_both_states():
    with pytest.raises(InvalidTransition, match="EMERGENCY_DETECTED to ARRIVED"):
        check_transition(S.EMERGENCY_DETECTED, S.ARRIVED)


def test_dispatch_needs_an_acknowledgement_first():
    assert not can_move(S.SOS_SENT, S.AMBULANCE_DISPATCHED)
    assert can_move(S.HOSPITAL_ACKNOWLEDGED, S.AMBULANCE_DISPATCHED)


def test_arrival_needs_the_ambulance_to_be_en_route():
    assert not can_move(S.AMBULANCE_DISPATCHED, S.ARRIVED)
    assert can_move(S.EN_ROUTE, S.ARRIVED)


def test_sources():
    assert {s.value for s in EmergencySource} == {"MANUAL", "FALL_CHECK", "INACTIVITY_CHECK"}
