# Model card: Diabetes risk (diabetes-logreg v0.1.0)

**SYNTHETIC PRACTICE MODEL. Trained on invented data. Its numbers say nothing about real patients.**

Simulated prototype, not a medical device. An estimate for learning and demonstration, not a diagnosis.
In an emergency call 112. An emergency alert never waits for this score.

## Intended use
Show a person an educational estimate of risk and which inputs raised or lowered it, and let them explore what-if
changes. Not for diagnosis, treatment decisions or triage.

## Data
- Dataset: SYNTHETIC practice data (ml.make_synthetic)
- Source: generated in this repository, seed 20261115
- Licence: none (invented numbers)
- File SHA-256: `f13c9b5b8206bb63f07d1cf6176f709415611c89db7c6d43edf5994d4e83bfd2`
- Rows read 401, duplicates dropped 1, rows used 400
  (144 with the condition, 256 without; share 0.36)
- Zeros treated as "not measured": {'glucose': 4, 'blood_pressure': 4, 'skin_thickness': 4, 'insulin': 4, 'bmi': 4}
- Blank values per column (filled with the train median): {'glucose': 6, 'blood_pressure': 6, 'skin_thickness': 6, 'insulin': 6, 'bmi': 6, 'diabetes_pedigree': 1, 'age': 1}

## Method
Logistic regression (L2, C=1.0) after median filling and standardising, fitted on the train part only.
Split: 320 train / 80 test, stratified, seed 42, made before any result was seen.

## Threshold
0.2120. Rule: highest precision with recall >= 0.85, chosen from 5-fold cross-validated
predictions on the TRAIN part only (never on the test part). Reason: a missed sick person is the costly mistake, so recall
is protected first. A lower threshold means more false alarms.
Bands: low below 0.1060, high from 0.2120, medium between.

## Results on the held-out test part (used once)
| Measure | Value |
|---|---|
| Accuracy | 0.662 |
| Precision | 0.522 |
| Recall | 0.828 |
| F1 | 0.640 |
| ROC-AUC | 0.796 |
| Brier score (lower is better) | 0.177 |

Confusion matrix (rows = truth): true negatives 29, false positives 22, false negatives 5, true positives 24.

Calibration (does a predicted 0.3 happen about 30 percent of the time?):
| Predicted range | n | Mean predicted | Observed rate |
|---|---|---|---|
| 0.0 to 0.2 | 32 | 0.098 | 0.125 |
| 0.2 to 0.4 | 27 | 0.280 | 0.407 |
| 0.4 to 0.6 | 11 | 0.477 | 0.455 |
| 0.6 to 0.8 | 8 | 0.715 | 0.875 |
| 0.8 to 1.0 | 2 | 0.834 | 1.000 |

## Limits
- Small public data, collected elsewhere for other purposes. Not validated on Indian patients and not clinically validated.
- Only the inputs listed in the model file are used. Missing inputs are refused, never guessed.
- A low score does not mean a person is well. A high score does not mean they are ill.
- Trained 2026-11-15 with scikit-learn 1.9.1.
