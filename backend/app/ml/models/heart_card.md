# Model card: Heart disease risk (heart-logreg v0.1.0)

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
- File SHA-256: `5d9276971837155c7012ffb650eaf2dc9b41d22e87bd4e881ee3352f7de85344`
- Rows read 401, duplicates dropped 1, rows used 400
  (190 with the condition, 210 without; share 0.475)
- Zeros treated as "not measured": {'cholesterol': 4, 'resting_bp': 4}
- Blank values per column (filled with the train median): {'sex': 2, 'resting_bp': 6, 'cholesterol': 6, 'fasting_blood_sugar': 2, 'max_heart_rate': 2, 'exercise_angina': 1, 'st_depression': 1}

## Method
Logistic regression (L2, C=1.0) after median filling and standardising, fitted on the train part only.
Split: 320 train / 80 test, stratified, seed 42, made before any result was seen.

## Threshold
0.3222. Rule: highest precision with recall >= 0.85, chosen from 5-fold cross-validated
predictions on the TRAIN part only (never on the test part). Reason: a missed sick person is the costly mistake, so recall
is protected first. A lower threshold means more false alarms.
Bands: low below 0.1611, high from 0.3222, medium between.

## Results on the held-out test part (used once)
| Measure | Value |
|---|---|
| Accuracy | 0.688 |
| Precision | 0.610 |
| Recall | 0.947 |
| F1 | 0.742 |
| ROC-AUC | 0.844 |
| Brier score (lower is better) | 0.168 |

Confusion matrix (rows = truth): true negatives 19, false positives 23, false negatives 2, true positives 36.

Calibration (does a predicted 0.3 happen about 30 percent of the time?):
| Predicted range | n | Mean predicted | Observed rate |
|---|---|---|---|
| 0.0 to 0.2 | 10 | 0.143 | 0.000 |
| 0.2 to 0.4 | 24 | 0.309 | 0.292 |
| 0.4 to 0.6 | 21 | 0.503 | 0.429 |
| 0.6 to 0.8 | 18 | 0.686 | 0.833 |
| 0.8 to 1.0 | 7 | 0.903 | 1.000 |

## Limits
- Small public data, collected elsewhere for other purposes. Not validated on Indian patients and not clinically validated.
- Only the inputs listed in the model file are used. Missing inputs are refused, never guessed.
- A low score does not mean a person is well. A high score does not mean they are ill.
- Trained 2026-11-15 with scikit-learn 1.9.1.
