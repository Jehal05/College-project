"""Trains one model (logistic regression) and writes the model file and the model card.

    python -m ml.train heart    --data C:\\path\\heart.csv
    python -m ml.train diabetes --data C:\\path\\diabetes.csv

The order matters, and it is the order of the code below:
 1. read the CSV and print a data report (missing values, duplicates, class balance);
 2. drop exact duplicate rows (BEFORE the split, so one person cannot be in both parts);
 3. split into train (80%) and test (20%), stratified, with a fixed seed, BEFORE looking at any result;
 4. fit imputation + standardisation + logistic regression on the TRAIN part only;
 5. choose the decision threshold from cross-validated predictions on the TRAIN part only;
 6. use the TEST part exactly once, for the final numbers.
Training needs numpy, pandas and scikit-learn (backend/requirements-ml.txt). The server does NOT need them.
"""
import argparse
import hashlib
import json
import os
import sys
from datetime import date
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
import sklearn
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, brier_score_loss, confusion_matrix, f1_score, precision_recall_curve,
                             precision_score, recall_score, roc_auc_score)
from sklearn.model_selection import StratifiedKFold, cross_val_predict, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from ml.features import SPECS, Spec, names

SEED = 42
TEST_SIZE = 0.2
CV_FOLDS = 5
TARGET_RECALL = 0.85          # a missed sick person is the costly mistake, so recall comes first
REGULARISATION_C = 1.0        # scikit-learn default (L2); written down so it is not a hidden choice
VERSION = "0.1.0"
MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app", "ml", "models")


class DataError(Exception):
    """The CSV cannot be used. The message says what to fix."""


# ------------------------------------------------------------------ 1. read and check the data

def sha256_of(path: str) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_rename(text: Optional[str]) -> Dict[str, str]:
    mapping: Dict[str, str] = {}
    for part in (text or "").split(","):
        if part.strip():
            if "=" not in part:
                raise DataError(f"--rename needs old=new pairs, got '{part}'")
            old, new = part.split("=", 1)
            mapping[old.strip()] = new.strip()
    return mapping


def load_data(path: str, spec: Spec, rename: Optional[Dict[str, str]] = None) -> pd.DataFrame:
    if not os.path.isfile(path):
        raise DataError(f"data file not found: {path}")
    frame = pd.read_csv(path, comment="#")
    frame = frame.rename(columns=rename or {})
    wanted = names(spec) + [spec.target]
    missing = [c for c in wanted if c not in frame.columns]
    if missing:
        raise DataError("the CSV is missing these columns: " + ", ".join(missing)
                        + ". Its columns are: " + ", ".join(map(str, frame.columns))
                        + ". Use --rename old=new to map them.")
    frame = frame[wanted].apply(pd.to_numeric, errors="coerce")
    if frame[spec.target].isna().any():
        raise DataError(f"column '{spec.target}' has empty or non-numeric values; every row needs a 0 or 1")
    if not set(frame[spec.target].unique()) <= {0, 1}:
        raise DataError(f"column '{spec.target}' must hold only 0 and 1 (1 = the condition is present)")
    return frame


def clean(frame: pd.DataFrame, spec: Spec) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """Zero-means-missing columns become blanks, then exact duplicates are dropped. Returns the data and a report."""
    frame = frame.copy()
    zeros = {}
    for col in spec.zero_is_missing:
        count = int((frame[col] == 0).sum())
        if count:
            zeros[col] = count
            frame.loc[frame[col] == 0, col] = np.nan
    before = len(frame)
    frame = frame.drop_duplicates().reset_index(drop=True)
    positives = int(frame[spec.target].sum())
    report = {
        "rows_read": before,
        "duplicates_dropped": before - len(frame),
        "rows_used": len(frame),
        "zeros_treated_as_missing": zeros,
        "missing_per_column": {c: int(frame[c].isna().sum()) for c in names(spec) if frame[c].isna().any()},
        "positives": positives,
        "negatives": len(frame) - positives,
        "positive_share": round(positives / len(frame), 4),
    }
    if min(positives, len(frame) - positives) < 20:
        raise DataError("fewer than 20 rows in one class: too little data to train and test honestly")
    return frame, report


# ------------------------------------------------------------------ 2. the model

def pipeline() -> Pipeline:
    return Pipeline([
        ("impute", SimpleImputer(strategy="median")),        # blanks become the TRAIN median (counted in the report)
        ("scale", StandardScaler()),                          # (value - train mean) / train standard deviation
        ("model", LogisticRegression(C=REGULARISATION_C, solver="lbfgs", max_iter=1000, random_state=SEED)),
    ])


def choose_threshold(y_true: np.ndarray, prob: np.ndarray) -> Tuple[float, Dict[str, Any]]:
    """Highest precision among thresholds that still reach TARGET_RECALL. Only ever called with TRAIN data."""
    precision, recall, thresholds = precision_recall_curve(y_true, prob)
    ok = [i for i in range(len(thresholds)) if recall[i] >= TARGET_RECALL]
    if ok:
        best = max(ok, key=lambda i: (precision[i], thresholds[i]))
        return float(thresholds[best]), {"rule": f"highest precision with recall >= {TARGET_RECALL}", "reached": True,
                                         "cv_recall": float(recall[best]), "cv_precision": float(precision[best])}
    f1 = [(2 * precision[i] * recall[i] / (precision[i] + recall[i]) if precision[i] + recall[i] else 0.0)
          for i in range(len(thresholds))]
    best = int(np.argmax(f1))
    return float(thresholds[best]), {"rule": f"recall {TARGET_RECALL} was not reachable; used the best F1 instead",
                                     "reached": False, "cv_recall": float(recall[best]), "cv_precision": float(precision[best])}


def calibration_table(y_true: np.ndarray, prob: np.ndarray, bins: int = 5) -> List[Dict[str, Any]]:
    edges = np.linspace(0.0, 1.0, bins + 1)
    rows = []
    for k in range(bins):
        last = k == bins - 1
        inside = (prob >= edges[k]) & ((prob <= edges[k + 1]) if last else (prob < edges[k + 1]))
        n = int(inside.sum())
        rows.append({"from": float(edges[k]), "to": float(edges[k + 1]), "n": n,
                     "mean_predicted": float(prob[inside].mean()) if n else None,
                     "observed_rate": float(y_true[inside].mean()) if n else None})
    return rows


def run(condition: str, data_path: str, *, rename: Optional[Dict[str, str]] = None, dataset_name: str = "TO FILL",
        dataset_source: str = "TO FILL", licence: str = "TO FILL", synthetic: bool = False,
        version: str = VERSION) -> Dict[str, Any]:
    """The whole pipeline. Returns the model dictionary (what is saved as <condition>.json)."""
    spec = SPECS[condition]
    frame, data_report = clean(load_data(data_path, spec, rename), spec)
    features = names(spec)
    x, y = frame[features].to_numpy(dtype=float), frame[spec.target].to_numpy(dtype=int)

    # step 3: the split, before any result is looked at
    x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=TEST_SIZE, stratify=y, random_state=SEED)

    # step 4 and 5: fit and choose the threshold on TRAIN only
    folds = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=SEED)
    cv_prob = cross_val_predict(pipeline(), x_train, y_train, cv=folds, method="predict_proba")[:, 1]
    threshold, threshold_info = choose_threshold(y_train, cv_prob)
    fitted = pipeline().fit(x_train, y_train)

    # step 6: the test part, used once
    prob = fitted.predict_proba(x_test)[:, 1]
    pred = (prob >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_test, pred, labels=[0, 1]).ravel()
    metrics = {
        "accuracy": float(accuracy_score(y_test, pred)),
        "precision": float(precision_score(y_test, pred, zero_division=0)),
        "recall": float(recall_score(y_test, pred, zero_division=0)),
        "f1": float(f1_score(y_test, pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_test, prob)),
        "brier": float(brier_score_loss(y_test, prob)),
    }
    imputer, scaler, model = fitted.named_steps["impute"], fitted.named_steps["scale"], fitted.named_steps["model"]
    # self-check: the server's plain arithmetic (app/ml/predict.py) must give the same risk as scikit-learn
    z = scaler.transform(imputer.transform(x_test)) @ model.coef_[0] + model.intercept_[0]
    if float(np.max(np.abs(1.0 / (1.0 + np.exp(-z)) - prob))) > 1e-9:
        raise AssertionError("the stored coefficients do not reproduce scikit-learn's risk; do not use this model file")
    ranges = {f.name: (f.low, f.high) for f in spec.features}
    units = {f.name: f.unit for f in spec.features}
    return {
        "name": f"{condition}-logreg",
        "version": version,
        "condition": condition,
        "title": spec.title,
        "synthetic": synthetic,
        "dataset": dataset_name,
        "dataset_source": dataset_source,
        "licence": licence,
        "data_sha256": sha256_of(data_path),
        "data_report": data_report,
        "trained_on": date.today().isoformat(),
        "random_seed": SEED,
        "test_size": TEST_SIZE,
        "cv_folds": CV_FOLDS,
        "regularisation_C": REGULARISATION_C,
        "libraries": {"python": sys.version.split()[0], "numpy": np.__version__, "pandas": pd.__version__,
                      "scikit_learn": sklearn.__version__},
        "features": [{"name": n, "unit": units[n], "min": ranges[n][0], "max": ranges[n][1],
                      "train_median": float(imputer.statistics_[i]), "mean": float(scaler.mean_[i]),
                      "std": float(scaler.scale_[i]), "coef": float(model.coef_[0][i])}
                     for i, n in enumerate(features)],
        "intercept": float(model.intercept_[0]),
        "threshold": threshold,
        "threshold_info": threshold_info,
        "bands": {"low_below": threshold / 2.0, "high_from": threshold,
                  "reason": "high from the chosen threshold (which keeps recall high); low below half of it; medium between"},
        "train_rows": int(len(y_train)),
        "test_rows": int(len(y_test)),
        "metrics": metrics,
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
        "calibration": calibration_table(y_test, prob),
    }


# ------------------------------------------------------------------ 3. write the files

def card_text(m: Dict[str, Any]) -> str:
    c, mt = m["confusion_matrix"], m["metrics"]
    banner = ("**SYNTHETIC PRACTICE MODEL. Trained on invented data. Its numbers say nothing about real patients.**\n\n"
              if m["synthetic"] else "")
    cal = "\n".join(f"| {r['from']:.1f} to {r['to']:.1f} | {r['n']} | "
                    f"{'-' if r['mean_predicted'] is None else format(r['mean_predicted'], '.3f')} | "
                    f"{'-' if r['observed_rate'] is None else format(r['observed_rate'], '.3f')} |"
                    for r in m["calibration"])
    d = m["data_report"]
    return f"""# Model card: {m['title']} ({m['name']} v{m['version']})

{banner}Simulated prototype, not a medical device. An estimate for learning and demonstration, not a diagnosis.
In an emergency call 112. An emergency alert never waits for this score.

## Intended use
Show a person an educational estimate of risk and which inputs raised or lowered it, and let them explore what-if
changes. Not for diagnosis, treatment decisions or triage.

## Data
- Dataset: {m['dataset']}
- Source: {m['dataset_source']}
- Licence: {m['licence']}
- File SHA-256: `{m['data_sha256']}`
- Rows read {d['rows_read']}, duplicates dropped {d['duplicates_dropped']}, rows used {d['rows_used']}
  ({d['positives']} with the condition, {d['negatives']} without; share {d['positive_share']})
- Zeros treated as "not measured": {d['zeros_treated_as_missing'] or 'none'}
- Blank values per column (filled with the train median): {d['missing_per_column'] or 'none'}

## Method
Logistic regression (L2, C={m['regularisation_C']}) after median filling and standardising, fitted on the train part only.
Split: {m['train_rows']} train / {m['test_rows']} test, stratified, seed {m['random_seed']}, made before any result was seen.

## Threshold
{m['threshold']:.4f}. Rule: {m['threshold_info']['rule']}, chosen from {m['cv_folds']}-fold cross-validated
predictions on the TRAIN part only (never on the test part). Reason: a missed sick person is the costly mistake, so recall
is protected first. A lower threshold means more false alarms.
Bands: low below {m['bands']['low_below']:.4f}, high from {m['bands']['high_from']:.4f}, medium between.

## Results on the held-out test part (used once)
| Measure | Value |
|---|---|
| Accuracy | {mt['accuracy']:.3f} |
| Precision | {mt['precision']:.3f} |
| Recall | {mt['recall']:.3f} |
| F1 | {mt['f1']:.3f} |
| ROC-AUC | {mt['roc_auc']:.3f} |
| Brier score (lower is better) | {mt['brier']:.3f} |

Confusion matrix (rows = truth): true negatives {c['tn']}, false positives {c['fp']}, false negatives {c['fn']}, true positives {c['tp']}.

Calibration (does a predicted 0.3 happen about 30 percent of the time?):
| Predicted range | n | Mean predicted | Observed rate |
|---|---|---|---|
{cal}

## Limits
- Small public data, collected elsewhere for other purposes. Not validated on Indian patients and not clinically validated.
- Only the inputs listed in the model file are used. Missing inputs are refused, never guessed.
- A low score does not mean a person is well. A high score does not mean they are ill.
- Trained {m['trained_on']} with scikit-learn {m['libraries']['scikit_learn']}.
"""


def save(model: Dict[str, Any], out_dir: str) -> Tuple[str, str]:
    os.makedirs(out_dir, exist_ok=True)
    json_path = os.path.join(out_dir, model["condition"] + ".json")
    card_path = os.path.join(out_dir, model["condition"] + "_card.md")
    with open(json_path, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(model, fh, indent=2)
        fh.write("\n")
    with open(card_path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(card_text(model))
    return json_path, card_path


def print_metrics(m: Dict[str, Any]) -> None:
    print(f"\n=== {m['name']} v{m['version']}{'  [SYNTHETIC]' if m['synthetic'] else ''} ===")
    print("data:", m["data_report"])
    print(f"threshold {m['threshold']:.4f}  ({m['threshold_info']['rule']})")
    for key, value in m["metrics"].items():
        print(f"  {key:10s} {value:.4f}")
    print("  confusion  ", m["confusion_matrix"])
    print("  calibration", [(round(r['from'], 1), r['n'], r['mean_predicted'], r['observed_rate']) for r in m["calibration"]])


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Train one explainable risk model.")
    parser.add_argument("condition", choices=sorted(SPECS))
    parser.add_argument("--data", required=True, help="path to the CSV (kept outside the repository)")
    parser.add_argument("--rename", help="map CSV headers to ours, for example age_years=age,chol=cholesterol")
    parser.add_argument("--dataset-name", default="TO FILL")
    parser.add_argument("--source", default="TO FILL")
    parser.add_argument("--licence", default="TO FILL")
    parser.add_argument("--synthetic", action="store_true", help="mark the model as trained on synthetic practice data")
    parser.add_argument("--out-dir", default=MODELS_DIR)
    parser.add_argument("--version", default=VERSION)
    args = parser.parse_args(argv)
    try:
        model = run(args.condition, args.data, rename=parse_rename(args.rename), dataset_name=args.dataset_name,
                    dataset_source=args.source, licence=args.licence, synthetic=args.synthetic, version=args.version)
    except DataError as exc:
        print("DATA PROBLEM:", exc)
        return 2
    json_path, card_path = save(model, args.out_dir)
    print_metrics(model)
    print("\nwrote", os.path.normpath(json_path))
    print("wrote", os.path.normpath(card_path))
    return 0


if __name__ == "__main__":
    sys.exit(main())
