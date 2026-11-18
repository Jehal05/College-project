"""Reads lab values out of the TEXT of a health report. Pure standard library, no database, no web framework.

What it does: finds lines such as "HbA1c   5.6 %   4.0 - 5.6", turns the value into the app's unit, reads the
reference range PRINTED on the report, and flags the value against that printed range.

What it never does
- It never invents a normal range. With no range printed, the flag is "unknown".
- It never saves anything. The caller shows the result to the person, who confirms it.
- It never guesses a unit. A value with a missing or unknown unit goes to `unreadable`.
- It never echoes a whole report. Output holds only the matched line (cut at 120 characters).

Supported tests (the keys are the same as patient-app/src/config/labs.js):
hba1c, fasting_glucose, creatinine, egfr, alt, ast, bilirubin (TOTAL only), cholesterol (total), ldl.
Any other result-looking line is listed in `unreadable`.

Layout rules (one result per line; a value on the line AFTER its label is not read)
- the label comes first on the line (a bullet or number before it is fine), then the value, unit, range
- a decimal comma is read as a decimal point; a comma followed by exactly 3 digits is ambiguous -> unreadable
- ranges: "4.0 - 5.6", "4.0-5.6", "4.0 to 5.6", "(4.0 - 5.6)", "< 5.7", "<= 5.7", "> 60", ">= 60", "up to 5.7"
- H / L / High / Low / * markers printed beside the value are skipped (the flag comes from the range, not the marker)
- the first result for a test wins; later repeats (page headers, summaries) are ignored

Confidence (0..1), a simple documented rule, not a probability:
    0.6  the label, a number and a recognised unit were all on the line
  + 0.3  a reference range was printed and read
  + 0.1  nothing unexpected was left over on the line
"""
import re
from typing import Dict, List, Optional, Tuple

MAX_CHARS = 200_000          # text beyond this is not read
MAX_LINES = 5_000
MAX_LINE = 300               # a longer line is not a result row
MAX_ITEMS = 50               # values and unreadable lines each stop here
RAW_CUT = 120

NOTICE = ("Read from the text of your report by a simple program, so it can be wrong. "
          "Check every value against the report. Nothing has been saved.")

# --------------------------------------------------------------------------------------------------- unit tables
# unit text -> (app unit, conversion). Keys are written the way _unit_key() writes them.
# Conversions (each is also applied to the printed range):
#   HbA1c   mmol/mol -> %      NGSP % = 0.09148 x IFCC mmol/mol + 2.152   (the IFCC-NGSP master equation)
#   glucose mmol/L   -> mg/dL  x 18.016
#   creatinine umol/L -> mg/dL / 88.4
#   total cholesterol and LDL mmol/L -> mg/dL  x 38.67
#   bilirubin umol/L -> mg/dL  / 17.1
def _same(x: float) -> float:
    return x


def _hba1c_from_ifcc(x: float) -> float:
    return 0.09148 * x + 2.152


_UNITS: Dict[str, Dict[str, Tuple[str, object]]] = {
    "hba1c": {"%": ("%", _same), "percent": ("%", _same), "%ofhb": ("%", _same), "%hb": ("%", _same),
              "mmol/mol": ("%", _hba1c_from_ifcc), "mmol/molhb": ("%", _hba1c_from_ifcc)},
    "fasting_glucose": {"mg/dl": ("mg/dL", _same), "mg%": ("mg/dL", _same),
                        "mmol/l": ("mg/dL", lambda x: x * 18.016), "mmol/litre": ("mg/dL", lambda x: x * 18.016)},
    "creatinine": {"mg/dl": ("mg/dL", _same), "mg%": ("mg/dL", _same),
                   "umol/l": ("mg/dL", lambda x: x / 88.4), "micromol/l": ("mg/dL", lambda x: x / 88.4),
                   "umol/litre": ("mg/dL", lambda x: x / 88.4)},
    "egfr": {k: ("mL/min/1.73 m2", _same) for k in
             ("ml/min/1.73m2", "ml/min/1.73m", "ml/min/1.73sqm", "ml/min/1.73m^2", "ml/min/1.73", "ml/min")},
    "alt": {k: ("U/L", _same) for k in ("u/l", "iu/l", "u/litre", "iu/litre")},
    "ast": {k: ("U/L", _same) for k in ("u/l", "iu/l", "u/litre", "iu/litre")},
    "bilirubin": {"mg/dl": ("mg/dL", _same), "mg%": ("mg/dL", _same),
                  "umol/l": ("mg/dL", lambda x: x / 17.1), "micromol/l": ("mg/dL", lambda x: x / 17.1)},
    "cholesterol": {"mg/dl": ("mg/dL", _same), "mg%": ("mg/dL", _same),
                    "mmol/l": ("mg/dL", lambda x: x * 38.67), "mmol/litre": ("mg/dL", lambda x: x * 38.67)},
    "ldl": {"mg/dl": ("mg/dL", _same), "mg%": ("mg/dL", _same),
            "mmol/l": ("mg/dL", lambda x: x * 38.67), "mmol/litre": ("mg/dL", lambda x: x * 38.67)},
}
TESTS = tuple(_UNITS)
APP_UNIT = {t: next(iter(u.values()))[0] for t, u in _UNITS.items()}


def _unit_key(text: str) -> str:
    """Lower case, no spaces, micro sign and 'u' alike, superscript two as 2."""
    return (text or "").lower().replace("µ", "u").replace("μ", "u").replace("²", "2").replace("^", "") \
        .replace(" ", "").replace(" ", "").rstrip(".,;:")


def normalise_unit(test: str, value: float, unit_text: str) -> Optional[Tuple[float, str]]:
    """(value in the app's unit, that unit), or None when this unit is not known for this test."""
    entry = _UNITS.get(test, {}).get(_unit_key(unit_text))
    if entry is None:
        return None
    app_unit, convert = entry
    return round(convert(value), 2), app_unit


# --------------------------------------------------------------------------------------------------- label patterns
_L = r"[\s\-_]*"
_ALIASES: List[Tuple[str, str]] = [
    ("hba1c", r"(?:hb\s?a1c|hba1c|glyc(?:o|a)?sylated\s+h(?:a)?emoglobin|glycated\s+h(?:a)?emoglobin|a1c)"),
    ("fasting_glucose", r"(?:fasting\s+(?:blood\s+|plasma\s+)?(?:glucose|sugar)|(?:blood\s+|plasma\s+)?glucose[\s,\-]*fasting|"
                        r"glucose\s*\(?\s*fasting\s*\)?|fbs|fpg)"),
    ("creatinine", r"(?:serum\s+)?creatinine"),
    ("egfr", r"(?:e\s?gfr|estimated\s+gfr|glomerular\s+filtration\s+rate)"),
    ("alt", r"(?:alt\b(?:\s*\(\s*sgpt\s*\))?|sgpt|alanine\s+(?:amino)?transaminase|alanine\s+aminotransferase)"),
    ("ast", r"(?:ast\b(?:\s*\(\s*sgot\s*\))?|sgot|aspartate\s+(?:amino)?transaminase|aspartate\s+aminotransferase)"),
    ("bilirubin", r"(?:(?:serum\s+)?total\s+bilirubin|bilirubin[\s,\-]*\(?\s*total\s*\)?)"),
    ("cholesterol", r"(?:(?:serum\s+)?total\s+cholesterol|cholesterol[\s,\-]*\(?\s*total\s*\)?|(?:serum\s+)?cholesterol)"),
    ("ldl", r"(?:ldl[\s\-]*(?:c\b|cholesterol)?(?:\s*\(?\s*(?:direct|calculated|calc)\s*\)?)?|"
            r"cholesterol[\s,\-]*ldl|low[\s\-]+density\s+lipoprotein(?:\s+cholesterol)?)"),
]
_ALIAS_RES = [(test, re.compile(r"^[\s\d\.\)\-\*•·]*" + rx + r"(?![A-Za-z])", re.IGNORECASE)) for test, rx in _ALIASES]
# words that make a line a note or a different test, not a result row for the test the label looks like
_NOT_A_RESULT = re.compile(
    r"\b(should|below|above|less|greater|more|than|target|goal|aim|normal|ideal|desirable|optimal|limit|interpretation|"
    r"note|ref|reference|range|risk|diagnos\w*|ratio|non[\s\-]*hdl|hdl|vldl|direct|indirect|conjugated|unconjugated|"
    r"random|post\w*|pp|ldl)\b", re.IGNORECASE)
_NUM = r"\d{1,6}(?:[.,]\d{1,4})?"
_NUM_RE = re.compile(r"(?<![\w.,])(" + _NUM + r")(?![\d]|[.,]\d)")
_MARKER = re.compile(r"^(?:\(?\s*(?:h{1,2}|l{1,2}|high|low|abnormal|critical|\*+)\s*\)?\*?)(?=\s|$)", re.IGNORECASE)
_RANGE_BETWEEN = re.compile(r"\(?\s*(" + _NUM + r")\s*(?:-|–|—|to)\s*(" + _NUM + r")\s*\)?", re.IGNORECASE)
_RANGE_UP = re.compile(r"\(?\s*(?:(<=|<|≤|up\s+to|upto|below|less\s+than)|(>=|>|≥|above|greater\s+than|more\s+than))\s*"
                       r"(" + _NUM + r")\s*\)?", re.IGNORECASE)
# a result-looking line for ANY test: a label, a number, then a unit that starts with a letter or % (and has a / or %)
_GENERIC = re.compile(r"^[\s\d\.\)\-\*•·]*[A-Za-z][A-Za-z0-9 ,\(\)\-/]{1,60}?[\s:]+" + _NUM + r"\s*[HLhl*]?\s*"
                      r"(?:%|[A-Za-zµμ]+\s?/\s?[A-Za-zµμ0-9\.²\^ ]+)")


class _Range:
    __slots__ = ("low", "high", "low_strict", "high_strict", "start", "end")

    def __init__(self, low=None, high=None, low_strict=False, high_strict=False, start=0, end=0):
        self.low, self.high, self.low_strict, self.high_strict = low, high, low_strict, high_strict
        self.start, self.end = start, end


def _to_float(text: str) -> Optional[float]:
    """A decimal comma is a decimal point. A comma followed by exactly 3 digits is ambiguous (None)."""
    if "," in text:
        left, right = text.split(",", 1)
        if len(right) == 3:
            return None
        text = left + "." + right
    try:
        return float(text)
    except ValueError:
        return None


def _read_range(text: str) -> Optional[_Range]:
    m = _RANGE_BETWEEN.search(text)
    if m:
        low, high = _to_float(m.group(1)), _to_float(m.group(2))
        if low is not None and high is not None and low <= high:
            return _Range(low, high, start=m.start(), end=m.end())
        return None
    m = _RANGE_UP.search(text)
    if m:
        number = _to_float(m.group(3))
        if number is None:
            return None
        if m.group(1):
            return _Range(high=number, high_strict=m.group(1).strip() in ("<", "below") or m.group(1).lower().startswith("less"),
                          start=m.start(), end=m.end())
        return _Range(low=number, low_strict=m.group(2).strip() in (">", "above") or m.group(2).lower().startswith(("greater", "more")),
                          start=m.start(), end=m.end())
    return None


def read_range(text: str) -> Optional[Dict[str, Optional[float]]]:
    """The range printed in `text` as {"low": x, "high": y} (one side may be None), or None when there is none."""
    r = _read_range(text or "")
    return None if r is None else {"low": r.low, "high": r.high}


def flag(value: float, reference_range: Optional[Dict[str, Optional[float]]], *, low_strict: bool = False,
         high_strict: bool = False) -> str:
    """low | normal | high | unknown. Only ever against a range printed on the report; no range -> unknown."""
    if not reference_range:
        return "unknown"
    low, high = reference_range.get("low"), reference_range.get("high")
    if low is None and high is None:
        return "unknown"
    if low is not None and (value <= low if low_strict else value < low):
        return "low"
    if high is not None and (value >= high if high_strict else value > high):
        return "high"
    return "normal"


def _skip_markers(rest: str) -> str:
    rest = rest.lstrip(" \t:|")
    while True:
        m = _MARKER.match(rest)
        if not m:
            return rest
        rest = rest[m.end():].lstrip(" \t:|")


def _find_unit(test: str, rest: str) -> Tuple[Optional[str], str]:
    """The longest leading run of 1..4 words that is a known unit for this test. Returns (unit text, what is left)."""
    words = rest.split()
    for count in range(min(4, len(words)), 0, -1):
        candidate = " ".join(words[:count])
        if _unit_key(candidate) in _UNITS[test]:
            left = rest.lstrip()[len(candidate):]
            return candidate, left
    return None, rest


def _cut(line: str) -> str:
    return " ".join(line.split())[:RAW_CUT]


_PAREN = re.compile(r"\([^)]*\)")
_PAREN_RANGE = re.compile(r"^\(\s*" + _NUM + r"\s*(?:-|–|—|to)\s*" + _NUM + r"\s*\)$", re.IGNORECASE)


def _blank_method(match) -> str:
    """A bracket that holds a digit and is not a plain range, e.g. (CKD-EPI 2021): blank it, so its digits are not the value."""
    text = match.group(0)
    if re.search(r"\d", text) and not _PAREN_RANGE.match(text):
        return " " * len(text)
    return text


def _read_line(line: str):
    """For one line returns None (not a result), ("ok", item) or ("bad", test, reason)."""
    for test, rx in _ALIAS_RES:
        m = rx.match(line)
        if not m:
            continue
        # blank out a parenthesised method such as (CKD-EPI 2021), so its digits are not taken for the value
        after = _PAREN.sub(_blank_method, line[m.end():])
        num = _NUM_RE.search(after)
        if num is None:
            continue
        # what stands between the label and the number: at most 3 plain words, and none of them a "note" word
        filler = re.sub(r"\([^)]*\)", " ", after[:num.start()])
        if _NOT_A_RESULT.search(filler) or len(re.findall(r"[A-Za-z]+", filler)) > 3:
            continue
        value = _to_float(num.group(1))
        if value is None:
            return ("bad", test, "ambiguous_number")
        if value <= 0:
            return ("bad", test, "value_not_positive")
        rest = _skip_markers(after[num.end():])
        unit_text, rest = _find_unit(test, rest)
        converted = None if unit_text is None else normalise_unit(test, value, unit_text)
        if converted is None:
            return ("bad", test, "unit_missing_or_unknown")
        new_value, app_unit = converted
        rest = _skip_markers(rest)
        printed, leftover = _read_range(rest), rest
        rng_out, strict = None, (False, False)
        if printed is not None:
            low = None if printed.low is None else normalise_unit(test, printed.low, unit_text)[0]
            high = None if printed.high is None else normalise_unit(test, printed.high, unit_text)[0]
            rng_out, strict = {"low": low, "high": high}, (printed.low_strict, printed.high_strict)
            leftover = rest[:printed.start] + " " + rest[printed.end:]
        confidence = 0.6 + (0.3 if printed is not None else 0.0)
        if not re.search(r"[A-Za-z0-9]", leftover):
            confidence += 0.1
        return ("ok", {
            "test": test, "value": new_value, "unit": app_unit, "reference_range": rng_out,
            "flag": flag(new_value, rng_out, low_strict=strict[0], high_strict=strict[1]),
            "confidence": round(min(confidence, 1.0), 2), "raw_text": _cut(line),
            "original_value": value, "original_unit": " ".join(unit_text.split()),
        })
    return None


def parse_report_text(text: str) -> Dict[str, List[dict]]:
    """{"values": [...], "unreadable": [...]}. Never raises on odd text; never reads past the size limits."""
    values: List[dict] = []
    unreadable: List[dict] = []
    seen = set()
    for number, raw in enumerate((text or "")[:MAX_CHARS].splitlines()):
        if number >= MAX_LINES:
            break
        line = raw.strip()
        if not line or len(line) > MAX_LINE:
            continue
        got = _read_line(line)
        if got is None:
            if _GENERIC.match(line) and not any(rx.match(line) for _t, rx in _ALIAS_RES) and len(unreadable) < MAX_ITEMS:
                unreadable.append({"test": None, "raw_text": _cut(line), "reason": "test_not_supported"})
            continue
        if got[0] == "bad":
            if len(unreadable) < MAX_ITEMS and got[1] not in seen:
                unreadable.append({"test": got[1], "raw_text": _cut(line), "reason": got[2]})
            continue
        item = got[1]
        if item["test"] in seen:
            continue
        seen.add(item["test"])
        if len(values) < MAX_ITEMS:
            values.append(item)
    return {"values": values, "unreadable": unreadable}
