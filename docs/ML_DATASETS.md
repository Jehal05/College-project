# Datasets for the two trained models (heart, diabetes)

**Status: empty on purpose.** No dataset has been downloaded or added to the repository. The team supplies the files. Fill every cell marked TO FILL before any training starts. Do not commit data files to the repo.

Simulated prototype, not a medical device.

## Table to fill in

| Condition | Dataset name | Source URL | Licence | Rows | Target column | Feature columns | Date obtained | Obtained by |
|---|---|---|---|---|---|---|---|---|
| Heart disease | TO FILL | TO FILL | TO FILL | TO FILL | TO FILL | TO FILL | TO FILL | TO FILL |
| Diabetes | TO FILL | TO FILL | TO FILL | TO FILL | TO FILL | TO FILL | TO FILL | TO FILL |

Where to keep the files: outside the repo (for example a local `data/` folder that is ignored by git). Write the folder path here once chosen: TO FILL.

## Column names the training script expects

See `backend/ml/README.md` (heart: age, sex, resting_bp, cholesterol, fasting_blood_sugar, max_heart_rate, exercise_angina, st_depression, target; diabetes: pregnancies, glucose, blood_pressure, skin_thickness, insulin, bmi, diabetes_pedigree, age, target). Other headers can be mapped with `--rename`.

## Checks to run once the files exist

Record the result of each check in a short "data report" next to the model card.

1. **Missing values.** Count them per column. Decide, and write down, whether each is dropped, filled (how) or kept as "unknown". A filled value must be visible in the report.
2. **Class balance.** How many positive and negative cases? If one class is rare, accuracy hides failures; use recall, precision, ROC-AUC and a confusion matrix, and say which error matters more (a missed sick person is the costly one).
3. **Duplicate rows.** Count and remove exact duplicates before splitting, or the same person can be in both train and test.
4. **Units and ranges.** Check every column against sensible limits (for example glucose in mg/dL or mmol/L, blood pressure in mmHg, age in years). Convert to the units the app uses and write the conversion down.
5. **Target definition.** Read what the target column actually means (for example "any heart disease" versus "severe") and say so in the limits text.
6. **Split.** Make the train and test split before looking at results, and keep the test set untouched until the end.
7. **Calibration.** Check that a predicted risk of 0.3 happens about 30 percent of the time, not only that the ranking is right.

## Limits to state in the product

- Public datasets are small and were collected for other purposes and in other populations. They may **not represent Indian patients**, and the model has not been validated clinically.
- Results are estimates for learning and demonstration, not a diagnosis. Emergency instructions (112) never wait for a score.
- The model card on screen must show the dataset name and source, the metrics, and these limits.
