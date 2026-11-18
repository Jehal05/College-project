"""Makes SYNTHETIC practice data so the tests and CI can run the whole pipeline.

The numbers are invented from a fixed random seed. They say NOTHING about real patients and must never be used
for the real model or for any claim about performance.
Usage: python -m ml.make_synthetic            (writes tests/fixtures/ml_synthetic_*.csv)
"""
import os
import sys
from typing import Callable, Dict

import numpy as np

from ml.features import DIABETES, HEART, Spec

SEED = 20261115
ROWS = 400
HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "..", "tests", "fixtures")


def _sigmoid(x):
    return 1.0 / (1.0 + np.exp(-x))


def _heart(rng: np.random.Generator, n: int) -> Dict[str, np.ndarray]:
    age = rng.normal(54, 9, n).clip(30, 80).round()
    sex = rng.binomial(1, 0.65, n)
    bp = rng.normal(131, 17, n).clip(90, 200).round()
    chol = rng.normal(246, 50, n).clip(130, 560).round()
    fbs = rng.binomial(1, 0.15, n)
    hr = rng.normal(150, 22, n).clip(70, 200).round()
    ang = rng.binomial(1, 0.33, n)
    st = rng.gamma(1.0, 0.9, n).clip(0, 6).round(1)
    z = (-1.4 + 0.045 * (age - 54) + 0.7 * sex + 0.015 * (bp - 131) + 0.004 * (chol - 246)
         + 0.3 * fbs - 0.03 * (hr - 150) + 1.0 * ang + 0.6 * st)
    y = rng.binomial(1, _sigmoid(z))
    return {"age": age, "sex": sex, "resting_bp": bp, "cholesterol": chol, "fasting_blood_sugar": fbs,
            "max_heart_rate": hr, "exercise_angina": ang, "st_depression": st, "target": y}


def _diabetes(rng: np.random.Generator, n: int) -> Dict[str, np.ndarray]:
    preg = rng.poisson(3.5, n).clip(0, 15)
    glu = rng.normal(121, 30, n).clip(55, 250).round()
    bp = rng.normal(72, 12, n).clip(45, 120).round()
    skin = rng.normal(29, 10, n).clip(8, 70).round()
    ins = rng.gamma(2.0, 60, n).clip(15, 600).round()
    bmi = rng.normal(32, 6.5, n).clip(18, 60).round(1)
    ped = rng.gamma(2.0, 0.24, n).clip(0.08, 2.4).round(3)
    age = rng.gamma(6.0, 5.5, n).clip(21, 80).round()
    z = (-0.85 + 0.035 * (glu - 121) + 0.06 * (bmi - 32) + 0.8 * (ped - 0.47) + 0.02 * (age - 33)
         + 0.07 * (preg - 3.5) + 0.004 * (ins - 120) / 10)
    y = rng.binomial(1, _sigmoid(z))
    return {"pregnancies": preg, "glucose": glu, "blood_pressure": bp, "skin_thickness": skin, "insulin": ins,
            "bmi": bmi, "diabetes_pedigree": ped, "age": age, "target": y}


MAKERS: Dict[str, Callable] = {"heart": _heart, "diabetes": _diabetes}


def write_csv(spec: Spec, path: str) -> None:
    rng = np.random.default_rng(SEED + (1 if spec.condition == "diabetes" else 0))
    cols = MAKERS[spec.condition](rng, ROWS)
    order = [f.name for f in spec.features] + [spec.target]
    lines = [f"# SYNTHETIC practice data for tests only (seed {SEED}). Invented numbers. Not real patients. Never use for the real model.",
             ",".join(order)]
    rows = [[cols[c][i] for c in order] for i in range(ROWS)]
    # a few blanks and "zero means missing" values, so the data report and the handling are exercised
    for k in range(0, 12):
        r = rows[(k * 29) % ROWS]
        r[1 + (k % (len(order) - 2))] = ""
    for k in spec.zero_is_missing:
        j = order.index(k)
        for i in range(5, 40, 9):
            rows[i][j] = 0
    rows.append(list(rows[3]))                    # one exact duplicate row
    for r in rows:
        lines.append(",".join(str(int(v)) if isinstance(v, (np.integer, int)) else ("" if v == "" else repr(float(v)).rstrip("0").rstrip(".") if isinstance(v, (np.floating, float)) else str(v)) for v in r))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(lines) + "\n")


def main() -> int:
    for spec in (HEART, DIABETES):
        path = os.path.normpath(os.path.join(OUT_DIR, f"ml_synthetic_{spec.condition}.csv"))
        write_csv(spec, path)
        print("wrote", path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
