"""Reading lab values out of report TEXT (Phase 3). Pure standard library: no database, no web framework.

The expected numbers are worked out here by hand, not by calling the code under test.
"""
import pytest

from app.services import report_text as rt


def one(line):
    got = rt.parse_report_text(line)
    return got["values"][0] if got["values"] else None


# ------------------------------------------------------------------------------------------- layouts
@pytest.mark.parametrize("line,test,value,unit,low,high", [
    ("HbA1c                5.6 %      4.0 - 5.6", "hba1c", 5.6, "%", 4.0, 5.6),
    ("HbA1c: 5.6% (4.0-5.6)", "hba1c", 5.6, "%", 4.0, 5.6),
    ("Glycosylated Haemoglobin (HbA1c)  6.1 %  4.0 to 5.6", "hba1c", 6.1, "%", 4.0, 5.6),
    ("Glucose, Fasting   92 mg/dL   70 - 99", "fasting_glucose", 92.0, "mg/dL", 70.0, 99.0),
    ("Fasting Blood Sugar  92 mg/dl  70-99", "fasting_glucose", 92.0, "mg/dL", 70.0, 99.0),
    ("Creatinine, Serum   0.9 mg/dL   0.6 - 1.3", "creatinine", 0.9, "mg/dL", 0.6, 1.3),
    ("eGFR (CKD-EPI 2021)  85 mL/min/1.73 m2  > 60", "egfr", 85.0, "mL/min/1.73 m2", 60.0, None),
    ("ALT (SGPT)  52 U/L  < 41", "alt", 52.0, "U/L", None, 41.0),
    ("SGOT  30 IU/L  5 - 40", "ast", 30.0, "U/L", 5.0, 40.0),
    ("Total Bilirubin  0.8 mg/dL  0.3 - 1.2", "bilirubin", 0.8, "mg/dL", 0.3, 1.2),
    ("Bilirubin, Total  0.8 mg/dL", "bilirubin", 0.8, "mg/dL", None, None),
    ("Total Cholesterol  185 mg/dL  < 200", "cholesterol", 185.0, "mg/dL", None, 200.0),
    ("LDL Cholesterol  110 mg/dL  up to 100", "ldl", 110.0, "mg/dL", None, 100.0),
    ("Cholesterol, LDL  110 mg/dL", "ldl", 110.0, "mg/dL", None, None),
])
def test_the_supported_layouts(line, test, value, unit, low, high):
    v = one(line)
    assert v is not None, line
    assert (v["test"], v["value"], v["unit"]) == (test, value, unit)
    if low is None and high is None:
        assert v["reference_range"] is None and v["flag"] == "unknown"
    else:
        assert v["reference_range"] == {"low": low, "high": high}


def test_a_decimal_comma_is_a_decimal_point():
    v = one("HbA1c  5,6 %  4,0 - 5,6")
    assert v["value"] == 5.6 and v["reference_range"] == {"low": 4.0, "high": 5.6}


def test_a_comma_with_three_digits_after_it_is_ambiguous_so_it_is_not_read():
    got = rt.parse_report_text("ALT  1,200 U/L")
    assert got["values"] == [] and got["unreadable"][0]["reason"] == "ambiguous_number"


def test_h_and_l_markers_do_not_break_the_line_and_do_not_set_the_flag():
    assert one("HbA1c  5.0 H %  4.0 - 5.6")["flag"] == "normal"          # the flag comes from the range, not the marker
    assert one("ALT  52 H  U/L  < 41")["value"] == 52.0
    assert one("Glucose, Fasting  60 L mg/dL  70 - 99")["flag"] == "low"
    assert one("Creatinine  1.5 * mg/dL  0.6 - 1.3")["flag"] == "high"


@pytest.mark.parametrize("unit", ["mg/dL", "mg/dl", "MG/DL", "mg / dL", "mg%"])
def test_unit_spellings(unit):
    v = one(f"Creatinine  0.9 {unit}  0.6 - 1.3")
    assert v is not None and v["unit"] == "mg/dL" and v["value"] == 0.9


@pytest.mark.parametrize("unit", ["umol/L", "µmol/L", "μmol/L", "UMOL/L", "micromol/L"])
def test_micro_sign_spellings(unit):
    assert one(f"Creatinine  88.4 {unit}")["value"] == 1.0


@pytest.mark.parametrize("unit", ["mL/min/1.73 m2", "mL/min/1.73m2", "mL/min/1.73 m²", "ml/min/1.73m^2"])
def test_egfr_unit_spellings(unit):
    assert one(f"eGFR  85 {unit}")["unit"] == "mL/min/1.73 m2"


# ------------------------------------------------------------------------------------------- unit conversions (worked by hand)
def test_hba1c_mmol_per_mol_to_percent_uses_the_master_equation():
    v = one("HbA1c  53 mmol/mol  20 - 42")
    assert v["value"] == pytest.approx(0.09148 * 53 + 2.152, abs=0.01) and v["value"] == pytest.approx(7.0, abs=0.01)
    assert v["unit"] == "%" and v["original_value"] == 53 and v["original_unit"] == "mmol/mol"
    assert v["reference_range"]["high"] == pytest.approx(0.09148 * 42 + 2.152, abs=0.01)     # the range converts too


def test_glucose_mmol_to_mg_per_dl():
    v = one("Glucose, Fasting  5.0 mmol/L  3.9 - 5.5")
    assert v["value"] == pytest.approx(90.08, abs=0.01)
    assert v["reference_range"] == {"low": pytest.approx(70.26, abs=0.01), "high": pytest.approx(99.09, abs=0.01)}


def test_creatinine_umol_to_mg_per_dl():
    assert one("Creatinine  88.4 umol/L")["value"] == 1.0


def test_cholesterol_and_ldl_mmol_to_mg_per_dl():
    assert one("Total Cholesterol  5.0 mmol/L")["value"] == pytest.approx(193.35, abs=0.01)
    assert one("LDL Cholesterol  3.0 mmol/L")["value"] == pytest.approx(116.01, abs=0.01)


def test_bilirubin_umol_to_mg_per_dl():
    assert one("Total Bilirubin  17.1 umol/L")["value"] == 1.0


def test_normalise_unit_directly():
    assert rt.normalise_unit("fasting_glucose", 1.0, "mmol/L") == (18.02, "mg/dL")
    assert rt.normalise_unit("alt", 10, "iu/l") == (10.0, "U/L")
    assert rt.normalise_unit("hba1c", 5.6, "mg/dL") is None             # a unit that does not belong to the test


# ------------------------------------------------------------------------------------------- ranges and flags
@pytest.mark.parametrize("text,expected", [
    ("4.0 - 5.6", {"low": 4.0, "high": 5.6}), ("4.0-5.6", {"low": 4.0, "high": 5.6}), ("(4.0 – 5.6)", {"low": 4.0, "high": 5.6}),
    ("4,0 to 5,6", {"low": 4.0, "high": 5.6}), ("< 5.7", {"low": None, "high": 5.7}), ("<=5.7", {"low": None, "high": 5.7}),
    ("up to 5.7", {"low": None, "high": 5.7}), ("> 60", {"low": 60.0, "high": None}), (">= 60", {"low": 60.0, "high": None}),
])
def test_read_range(text, expected):
    assert rt.read_range(text) == expected


@pytest.mark.parametrize("text", ["", "no range here", "5.6 - 4.0", "abc"])
def test_read_range_finds_nothing(text):
    assert rt.read_range(text) is None


def test_flag_only_from_a_printed_range():
    rng = {"low": 4.0, "high": 5.6}
    assert rt.flag(3.9, rng) == "low" and rt.flag(4.0, rng) == "normal" and rt.flag(5.6, rng) == "normal"
    assert rt.flag(5.7, rng) == "high"
    assert rt.flag(5.0, None) == "unknown" and rt.flag(5.0, {"low": None, "high": None}) == "unknown"


def test_a_strict_upper_limit_excludes_the_limit_itself():
    assert one("HbA1c  5.7 %  < 5.7")["flag"] == "high"
    assert one("HbA1c  5.7 %  <= 5.7")["flag"] == "normal"
    assert one("eGFR  60 mL/min/1.73 m2  > 60")["flag"] == "low"


def test_no_range_printed_means_unknown_never_an_invented_range():
    for line in ("HbA1c  9.9 %", "Creatinine  9.9 mg/dL", "Total Cholesterol  999 mg/dL"):
        v = one(line)
        assert v["reference_range"] is None and v["flag"] == "unknown"


# ------------------------------------------------------------------------------------------- confidence
def test_confidence_follows_the_documented_rule():
    assert one("HbA1c  5.6 %  4.0 - 5.6")["confidence"] == 1.0         # 0.6 + 0.3 (range) + 0.1 (nothing left over)
    assert one("HbA1c  5.6 %")["confidence"] == 0.7                    # 0.6 + 0.1
    assert one("HbA1c  5.6 %  4.0 - 5.6  see note b")["confidence"] == 0.9    # something unexpected left on the line
    assert all(0 <= v["confidence"] <= 1 for v in rt.parse_report_text("HbA1c 5.6 %\nALT 30 U/L")["values"])


# ------------------------------------------------------------------------------------------- what must NOT be read
@pytest.mark.parametrize("line", [
    "Fasting glucose should be below 100 mg/dL for most adults",
    "HbA1c target: below 7 % for most people",
    "HbA1c reference range 4.0 - 5.6 %",
    "Total Cholesterol / HDL ratio  4.5",
    "Creatinine see note 2",
    "HbA1c",
    "ALT",
    "Page 2 of 3",
    "Collected on 12/03/2024 at 08:15",
    "Patient ID 1234567",
])
def test_lookalike_lines_give_no_value(line):
    assert rt.parse_report_text(line)["values"] == []


def test_a_value_with_no_unit_or_a_wrong_unit_is_unreadable_not_guessed():
    for line in ("HbA1c  5.6", "HbA1c  5.6 mg/dL", "Creatinine  0.9 U/L"):
        got = rt.parse_report_text(line)
        assert got["values"] == [], line
        assert got["unreadable"] and got["unreadable"][0]["reason"] == "unit_missing_or_unknown"


def test_a_zero_value_is_unreadable():
    got = rt.parse_report_text("ALT  0 U/L")
    assert got["values"] == [] and got["unreadable"][0]["reason"] == "value_not_positive"


def test_other_tests_are_unreadable_not_dropped_silently():
    text = "HDL Cholesterol  45 mg/dL\nTotal Bilirubin  0.8 mg/dL\nBilirubin Direct  0.2 mg/dL\nGlucose Random  140 mg/dL\nTSH  2.1 mIU/L"
    got = rt.parse_report_text(text)
    assert [v["test"] for v in got["values"]] == ["bilirubin"]
    raw = " | ".join(u["raw_text"] for u in got["unreadable"])
    for name in ("HDL Cholesterol", "Bilirubin Direct", "Glucose Random", "TSH"):
        assert name in raw
    assert all(u["reason"] == "test_not_supported" for u in got["unreadable"])


def test_the_first_result_for_a_test_wins():
    got = rt.parse_report_text("HbA1c  5.6 %  4.0 - 5.6\nSummary\nHbA1c  9.9 %")
    assert [(v["test"], v["value"]) for v in got["values"]] == [("hba1c", 5.6)]


def test_a_whole_report_in_one_go():
    text = """CITY LAB                       Page 1 of 2
Name: A. Patient        Collected 12/03/2024
HbA1c                     6.4 %        4.0 - 5.6
Glucose, Fasting          5.1 mmol/L   3.9 - 5.5
Creatinine, Serum         88.4 umol/L  (53 - 106)
eGFR (CKD-EPI 2021)       85 mL/min/1.73 m2   > 60
ALT (SGPT)                52 U/L       < 41
AST (SGOT)                30 U/L       < 40
Total Bilirubin           0.8 mg/dL    0.3 - 1.2
Total Cholesterol         210 mg/dL    < 200
LDL Cholesterol           110 mg/dL    < 100
HDL Cholesterol           45 mg/dL     > 40
Triglycerides             150 mg/dL    < 150
"""
    got = rt.parse_report_text(text)
    assert {v["test"]: v["flag"] for v in got["values"]} == {
        "hba1c": "high", "fasting_glucose": "normal", "creatinine": "normal", "egfr": "normal", "alt": "high",
        "ast": "normal", "bilirubin": "normal", "cholesterol": "high", "ldl": "high"}
    assert {u["raw_text"].split()[0] for u in got["unreadable"]} == {"HDL", "Triglycerides"}


# ------------------------------------------------------------------------------------------- odd input
@pytest.mark.parametrize("text", ["", None, "   \n\n  ", "\x00\x01\x02", "%PDF-1.4 garbage"])
def test_empty_or_odd_text_gives_nothing_and_does_not_raise(text):
    assert rt.parse_report_text(text) == {"values": [], "unreadable": []}


def test_huge_text_is_cut_and_stays_fast():
    line = "ALT  50 U/L\n"
    got = rt.parse_report_text("x" * 10_000_000 + "\n" + line * 100)
    assert got["values"] == []                                         # the useful lines were past the size limit
    many = rt.parse_report_text("\n".join(f"Test{i}  5 mg/dL" for i in range(20_000)))
    assert len(many["unreadable"]) <= rt.MAX_ITEMS


def test_a_very_long_line_is_skipped():
    assert rt.parse_report_text("HbA1c " + "x" * 5000 + " 5.6 %")["values"] == []


def test_raw_text_is_one_short_line_and_the_original_unit_is_kept():
    v = one("Glucose,   Fasting      5.1  mmol/L   3.9 - 5.5")
    assert v["raw_text"] == "Glucose, Fasting 5.1 mmol/L 3.9 - 5.5" and len(v["raw_text"]) <= rt.RAW_CUT
    assert (v["original_value"], v["original_unit"]) == (5.1, "mmol/L")


def test_the_supported_tests_match_the_patient_app_keys():
    assert set(rt.TESTS) == {"hba1c", "fasting_glucose", "creatinine", "egfr", "alt", "ast", "bilirubin", "cholesterol", "ldl"}
