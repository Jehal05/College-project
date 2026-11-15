# Training the two risk models (heart, diabetes)

Simulated prototype, not a medical device. The models give an educational estimate, never a diagnosis, and an
emergency alert never waits for a score. **The model files shipped today are trained on SYNTHETIC practice data**
(`"synthetic": true` in the file, and the endpoint says so). Replace them by training on real files (below).

## What is where
| Path | What |
|---|---|
| `ml/features.py` | The inputs of each model: name, unit, accepted range, and the CSV columns required |
| `ml/train.py` | Trains one model and writes `app/ml/models/<condition>.json` and `<condition>_card.md` |
| `ml/verify.py` | Trains again in memory and compares with the stored file (prints MATCH) |
| `ml/make_synthetic.py` | Makes the SYNTHETIC practice CSVs in `tests/fixtures/` (tests and CI only) |
| `app/ml/predict.py` | The server's scoring: standard library only, plain arithmetic on the stored file |
| `app/api/predictions.py` | `POST /predictions/{heart or diabetes}` (PROPOSED in `docs/API_CONTRACT.md`) |

## CSV format
One row per person, a header row, and these columns (a first line starting with `#` is ignored):
- heart: `age, sex, resting_bp, cholesterol, fasting_blood_sugar, max_heart_rate, exercise_angina, st_depression, target`
- diabetes: `pregnancies, glucose, blood_pressure, skin_thickness, insulin, bmi, diabetes_pedigree, age, target`

`target` is 1 when the condition is present, otherwise 0. If your file uses other headers, map them with
`--rename old=new,old2=new2`. Units are in `ml/features.py`. A zero in `cholesterol`, `resting_bp` (heart) or in
`glucose, blood_pressure, skin_thickness, insulin, bmi` (diabetes) is read as "not measured", as in the common public files.
Keep the real files OUTSIDE the repository; never commit them.

## Train and verify (Windows PowerShell, in the repo folder)
```powershell
.\laptop-ml-train.cmd -HeartCsv C:\data\heart.csv -DiabetesCsv C:\data\diabetes.csv `
    -HeartName "..." -HeartSource "https://..." -HeartLicence "..." `
    -DiabetesName "..." -DiabetesSource "https://..." -DiabetesLicence "..."
```
It installs `requirements-ml.txt` into `backend\.venv`, trains both models, runs verify on both and writes
`laptop-ml-log.txt`. Add `-Synthetic` for a dry run on the practice data. By hand, from `backend\`:
```powershell
.\.venv\Scripts\python -m ml.train heart --data C:\data\heart.csv --dataset-name "..." --source "..." --licence "..."
.\.venv\Scripts\python -m ml.verify heart --data C:\data\heart.csv
```
`verify` exits 0 and prints `MATCH` only if every stored number (coefficients to 1e-6, metrics to 1e-4) is reproduced
and the data file has the same SHA-256 as the one used for training.

## The method, in the order the code does it
1. Read the CSV, print a data report, treat "zero means missing" as blank, drop exact duplicates.
2. Split 80/20, stratified, seed 42, **before** any result is seen.
3. Median filling, standardising and logistic regression (L2, C=1.0) are fitted on the **train** part only.
4. The threshold is chosen from 5-fold cross-validated predictions on the **train** part only: the highest precision
   that still keeps recall at 0.85 or more. A missed sick person is the costly mistake. If 0.85 is not reachable, the
   best F1 is used and the card says so.
5. The test part is used once: accuracy, precision, recall, F1, ROC-AUC, confusion matrix, Brier score, 5-bin calibration.
6. A built-in self-check proves the server's plain arithmetic gives the same risk as scikit-learn (difference below 1e-9).

## Limits
Small public datasets, not checked on Indian patients, not clinically validated. Library versions are stored in the model
file; a different scikit-learn version can move numbers slightly, which is why `verify` has tolerances.
Tests that need scikit-learn (`tests/test_ml_reproduce.py`) are skipped on CI, which installs only `requirements.txt`.
