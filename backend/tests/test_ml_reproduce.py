"""Training and verification (backend/ml). Needs scikit-learn and pandas (backend/requirements-ml.txt); skipped without them.

Runs the whole pipeline on the SYNTHETIC practice CSVs. Nothing here says anything about real patients.
"""
import copy
import json
import os
import shutil

import pytest

pytest.importorskip("sklearn")
pytest.importorskip("pandas")

from ml import features, make_synthetic, train, verify  # noqa: E402

FIXTURES = os.path.join(os.path.dirname(__file__), "fixtures")


def csv_for(condition):
    return os.path.join(FIXTURES, f"ml_synthetic_{condition}.csv")


@pytest.fixture(params=["heart", "diabetes"])
def condition(request):
    return request.param


@pytest.fixture
def trained(condition, tmp_path):
    model = train.run(condition, csv_for(condition), synthetic=True)
    train.save(model, str(tmp_path))
    return model, str(tmp_path)


def test_the_synthetic_files_are_labelled():
    for condition in ("heart", "diabetes"):
        with open(csv_for(condition), encoding="utf-8") as fh:
            assert fh.readline().startswith("# SYNTHETIC")


def test_retraining_reproduces_the_stored_numbers(condition, trained):
    _model, folder = trained
    assert verify.verify(condition, csv_for(condition), folder) == []


def test_the_command_line_prints_match_and_exits_zero(condition, trained, capsys):
    _model, folder = trained
    assert verify.main([condition, "--data", csv_for(condition), "--models-dir", folder]) == 0
    assert "MATCH" in capsys.readouterr().out


def test_a_changed_stored_metric_is_reported(condition, trained, capsys):
    model, folder = trained
    path = os.path.join(folder, condition + ".json")
    altered = copy.deepcopy(model)
    altered["metrics"]["recall"] += 0.01
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(altered, fh)
    problems = verify.verify(condition, csv_for(condition), folder)
    assert any(line.startswith("metrics.recall") for line in problems)
    assert verify.main([condition, "--data", csv_for(condition), "--models-dir", folder]) == 1
    assert "DIFFERENT" in capsys.readouterr().out


def test_a_changed_coefficient_is_reported(condition, trained):
    model, folder = trained
    altered = copy.deepcopy(model)
    altered["features"][0]["coef"] += 1e-3
    with open(os.path.join(folder, condition + ".json"), "w", encoding="utf-8") as fh:
        json.dump(altered, fh)
    assert any(".coef" in line for line in verify.verify(condition, csv_for(condition), folder))


def test_a_different_data_file_is_refused(condition, trained, tmp_path):
    _model, folder = trained
    other = tmp_path / "other.csv"
    shutil.copy(csv_for(condition), other)
    with open(other, "a", encoding="utf-8") as fh:
        fh.write("\n")
    problems = verify.verify(condition, str(other), folder)
    assert len(problems) == 1 and problems[0].startswith("data_sha256")


def test_the_split_is_made_before_the_threshold_and_the_test_part_is_unseen(trained):
    model, _folder = trained
    assert model["train_rows"] + model["test_rows"] == model["data_report"]["rows_used"]
    assert model["test_rows"] == pytest.approx(0.2 * model["data_report"]["rows_used"], abs=1)
    assert model["threshold_info"]["rule"].startswith(("highest precision", "recall"))


def test_duplicates_and_zero_as_missing_are_counted(condition, trained):
    model, _folder = trained
    report = model["data_report"]
    assert report["duplicates_dropped"] == 1
    for col in features.SPECS[condition].zero_is_missing:
        assert report["zeros_treated_as_missing"].get(col, 0) > 0


def test_the_metrics_are_all_there_and_sane(trained):
    model, _folder = trained
    for key in ("accuracy", "precision", "recall", "f1", "roc_auc", "brier"):
        assert 0.0 <= model["metrics"][key] <= 1.0
    cm = model["confusion_matrix"]
    assert cm["tn"] + cm["fp"] + cm["fn"] + cm["tp"] == model["test_rows"]
    assert sum(row["n"] for row in model["calibration"]) == model["test_rows"]


def test_the_model_card_is_written_and_says_synthetic(trained):
    model, folder = trained
    card = open(os.path.join(folder, model["condition"] + "_card.md"), encoding="utf-8").read()
    for needle in ("SYNTHETIC", "Intended use", "Limits", "112", "Confusion matrix", "Calibration", "Threshold"):
        assert needle in card


def test_a_csv_with_missing_columns_says_which(tmp_path):
    bad = tmp_path / "bad.csv"
    bad.write_text("age,target\n50,1\n", encoding="utf-8")
    with pytest.raises(train.DataError) as info:
        train.load_data(str(bad), features.HEART)
    assert "resting_bp" in str(info.value) and "--rename" in str(info.value)


def test_rename_maps_headers(tmp_path):
    src = open(csv_for("heart"), encoding="utf-8").read().replace("resting_bp", "trestbps")
    path = tmp_path / "renamed.csv"
    path.write_text(src, encoding="utf-8")
    frame = train.load_data(str(path), features.HEART, train.parse_rename("trestbps=resting_bp"))
    assert "resting_bp" in frame.columns


def test_a_target_that_is_not_zero_or_one_is_refused(tmp_path):
    lines = open(csv_for("heart"), encoding="utf-8").read().splitlines()
    lines[3] = lines[3].rsplit(",", 1)[0] + ",2"
    path = tmp_path / "t.csv"
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    with pytest.raises(train.DataError):
        train.load_data(str(path), features.HEART)


def test_too_little_data_is_refused(tmp_path):
    lines = open(csv_for("heart"), encoding="utf-8").read().splitlines()[:30]
    path = tmp_path / "small.csv"
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    with pytest.raises(train.DataError):
        frame = train.load_data(str(path), features.HEART)
        train.clean(frame, features.HEART)


def test_the_synthetic_maker_is_repeatable(tmp_path):
    first, second = tmp_path / "a.csv", tmp_path / "b.csv"
    make_synthetic.write_csv(features.HEART, str(first))
    make_synthetic.write_csv(features.HEART, str(second))
    assert first.read_bytes() == second.read_bytes() == open(csv_for("heart"), "rb").read()
