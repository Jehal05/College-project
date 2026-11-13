# Everything that is a mock or simulated

Rule: nothing real is ever contacted, and every fake is labelled where a person can see it.
"Built" means it exists in the backend code today (13 November 2026). "Verified" means an automated test checks the label.

## Built, with labels in the API

| What is fake | Label in the API | Where it is documented | Verified by |
|---|---|---|---|
| Wearable vitals (five profiles, overrides) | `"simulated": true` on `POST /demo/vitals` | CONTRACT.md, `POST /demo/vitals` | `tests/test_simulated_labels.py` |
| Wearable history behind insights (7 days, seeded) | `data_note`: "based on simulated wearable data, not a diagnosis", plus `"simulated": true` | CONTRACT.md, "Wellbeing insights" | `tests/test_simulated_labels.py`, `tests/test_insights_api.py` |
| Patient data (demo patients) | `"simulated": true` on passport, consents and audit responses | CONTRACT.md, section 8 "Honest labels" | `tests/test_simulated_labels.py` |
| `GET /health` | `"simulated": true` | CONTRACT.md | `tests/test_simulated_labels.py` |
| Demo hospitals, ambulances, patient, contacts and logins (`app/seed/data`) | all fictional; loaded only in demo mode; `README.txt` says FICTIONAL; responses add `"simulated": true` | CONTRACT.md, section 7 | `tests/test_seed.py`, `tests/test_startup_seed.py` |

## Built, but medical content NOT yet approved

| What | Label | Note |
|---|---|---|
| Rule table (symptoms, thresholds) | `review_status`: "pending doctor review" in every decision | No doctor has approved it. Do not say otherwise. |
| 12 draft rules added 2026-11-13 (7 symptoms, sudden confusion, safety check-in) | same label, plus `origin`: "AI-written draft ... NOT reviewed by a doctor" | Accepted for the prototype by Daksh. Not a doctor's approval. Sheet: `docs/review/DOCTOR_REVIEW_NEW_RULES.md`. |
| Insights wording, bands and thresholds | `wording_review`: "pending doctor review" | Same. |

## Not built yet: the label is REQUIRED when it is built

| What will be fake | Required label |
|---|---|
| Mock 112/108 gateway (feature 60) | `gateway.mock: true`; show "Notification sent", never "dispatched" until the mock operator confirms |
| SMS, voice and push channels (17, 29, 52) | every message starts with `SIMULATED:` |
| Ambulance position and traffic (25, 45, Puneet) | "simulated" on the map and in the response |
| Hospitals and location | hospital seed data and demo location marked `simulated: true` |
| Anomaly detection (14) | "trained on synthetic data, early-warning aid only, not a diagnosis" |
| Seven-day trend warning (53) | "based on simulated wearable data, not a diagnosis" |
| FHIR export (55) | "ABHA-ready structure, not certified" |

## What this file does NOT claim
- It does not claim any of the "not built yet" items work.
- It does not claim a doctor approved anything.
- It does not claim compliance with the DPDP Act 2023 or any medical-device rule.
