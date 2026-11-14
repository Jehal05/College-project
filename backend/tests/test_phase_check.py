"""The phase report must stay honest and complete."""
from scripts import phase_check as pc


def test_every_test_file_belongs_to_exactly_one_phase():
    assigned = [f for phase in pc.PHASES for f in phase.tests]
    assert len(assigned) == len(set(assigned)), "a test file is listed in two phases"
    assert sorted(assigned) == pc.all_test_files(), "a test file is missing from, or invented in, the phase list"


def test_all_twenty_of_dakshs_features_are_listed_once():
    assert sorted(pc.FEATURES) == sorted([2, 4, 8, 11, 12, 13, 14, 17, 20, 29, 33, 50, 51, 52, 53, 54, 55, 56, 57, 60])
    listed = [n for phase in pc.PHASES for n in phase.features]
    assert sorted(listed) == sorted(pc.FEATURES), "every feature belongs to exactly one phase"


def test_every_feature_status_is_valid():
    for number, (_name, tier, check) in pc.FEATURES.items():
        state, _note = check()
        assert state in {pc.BUILT, pc.PARTIAL, pc.NOT_BUILT}, number
        assert tier in {"T1", "T2", "T3"}


def test_features_known_to_exist_are_reported_as_built():
    for number in (4, 8, 13, 20, 33, 50, 51, 54):
        assert pc.FEATURES[number][2]()[0] == pc.BUILT, number


def test_features_known_to_be_missing_are_not_reported_as_built():
    for number in (2, 12, 14, 17, 29, 52, 53, 55, 56, 60):
        assert pc.FEATURES[number][2]()[0] != pc.BUILT, number
