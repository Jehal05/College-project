"""Checks that the stored model file can be reproduced from the data.

    python -m ml.verify heart --data C:\\path\\heart.csv

It trains again in memory with the stored seed and settings and compares every stored number with the fresh one.
Prints MATCH and exits 0, or lists the differences and exits 1 (exit 2 if the data file is not the one that was used).
Tolerances: coefficients 1e-6, every other number 1e-4.
"""
import argparse
import json
import os
import sys
from typing import Any, Dict, List, Optional

from ml import train

COEF_TOLERANCE = 1e-6
OTHER_TOLERANCE = 1e-4


def _numbers(model: Dict[str, Any]) -> Dict[str, Any]:
    """Every stored number that must be reproduced, flattened to one dictionary."""
    flat: Dict[str, Any] = {"intercept": model["intercept"], "threshold": model["threshold"],
                            "train_rows": model["train_rows"], "test_rows": model["test_rows"],
                            "data_sha256": model["data_sha256"], "rows_used": model["data_report"]["rows_used"]}
    for key, value in model["metrics"].items():
        flat["metrics." + key] = value
    for key, value in model["confusion_matrix"].items():
        flat["confusion." + key] = value
    for f in model["features"]:
        for field in ("coef", "mean", "std", "train_median"):
            flat[f"features.{f['name']}.{field}"] = f[field]
    for i, row in enumerate(model["calibration"]):
        for field in ("n", "mean_predicted", "observed_rate"):
            flat[f"calibration.{i}.{field}"] = row[field]
    return flat


def compare(stored: Dict[str, Any], fresh: Dict[str, Any]) -> List[str]:
    """A list of differences (empty means MATCH)."""
    a, b = _numbers(stored), _numbers(fresh)
    problems = []
    for key in sorted(set(a) | set(b)):
        if key not in a or key not in b:
            problems.append(f"{key}: only in {'stored' if key in a else 'fresh'} model")
            continue
        x, y = a[key], b[key]
        if x is None or y is None or isinstance(x, str) or isinstance(y, str):
            if x != y:
                problems.append(f"{key}: stored {x} fresh {y}")
            continue
        tolerance = COEF_TOLERANCE if key.endswith(".coef") or key == "intercept" else OTHER_TOLERANCE
        if abs(float(x) - float(y)) > tolerance:
            problems.append(f"{key}: stored {x} fresh {y} (tolerance {tolerance})")
    return problems


def verify(condition: str, data_path: str, models_dir: str, rename: Optional[Dict[str, str]] = None) -> List[str]:
    path = os.path.join(models_dir, condition + ".json")
    with open(path, encoding="utf-8") as fh:
        stored = json.load(fh)
    if train.sha256_of(data_path) != stored["data_sha256"]:
        return ["data_sha256: this is not the data file the model was trained on (the file has changed or is a different one)"]
    fresh = train.run(condition, data_path, rename=rename, dataset_name=stored["dataset"],
                      dataset_source=stored["dataset_source"], licence=stored["licence"],
                      synthetic=stored["synthetic"], version=stored["version"])
    return compare(stored, fresh)


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Re-run training and compare with the stored model file.")
    parser.add_argument("condition", choices=sorted(train.SPECS))
    parser.add_argument("--data", required=True)
    parser.add_argument("--rename")
    parser.add_argument("--models-dir", default=train.MODELS_DIR)
    args = parser.parse_args(argv)
    try:
        problems = verify(args.condition, args.data, args.models_dir, train.parse_rename(args.rename))
    except (train.DataError, OSError, KeyError, ValueError) as exc:
        print("CANNOT VERIFY:", exc)
        return 2
    if problems:
        print("DIFFERENT:")
        for line in problems:
            print("  ", line)
        return 1
    print(f"MATCH: {args.condition} reproduces the stored metrics, coefficients and threshold.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
