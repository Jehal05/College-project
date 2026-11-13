# Changelog

All numbers are real runs of `python -m pytest`. Dates are 13 November 2026 (the plan's date).
The contract version lives at the top of `CONTRACT.md`.

## 0.6.2: draft rules for unmapped symptoms (pending doctor review)
- 12 new rules: the 7 patient-app symptoms that had no rule (they gave "no indicators"), sudden confusion as a stroke sign, and a safety check-in with no reply (EMERGENCY, type `UNKNOWN`).
- Written by an AI assistant from public first-aid guidance and accepted for the prototype by Daksh. **A doctor has not reviewed them.** Sheet: `docs/review/DOCTOR_REVIEW_NEW_RULES.md`.
- `app/rules/symptom_map.py`: all 20 patient-app symptoms map to a rule; unknown ids are reported, not dropped.
- New emergency type `UNKNOWN` (pending agreement with Jehal and Puneet).

## 0.6.1: contract housekeeping
- Documented the existing `GET /health`. No behaviour change.
- Pinned all dependencies (`requirements.txt` exact, `requirements.lock.txt` full).
- Added contract conformance tests, simulated-label tests and `scripts/contract_status.py`.
- Docker image now installs from the lock file and no longer auto-reloads. Compose has a health check.
- Tests: 568 passing. `pip-audit` on the lock file: no known vulnerabilities.

## 0.6: wellbeing insights (feature 54)
- `GET /patients/{id}/insights`: sleep, activity and stress notes from synthetic data, fixed wording, pending doctor review.
- Family access built and tested but switched off until feature 61 exists.
- Tests: 542.

## 0.5: audit log and passport (features 50, 11)
- Append-only audit log, `GET /audit` (admin), signed expiring passport tokens, `GET /passport/{id}?token`.
- Tests: 436.

## 0.4: consent ledger and encryption (feature 51)
- Append-only consent ledger (default deny), consent API, Fernet field encryption, fail-closed startup without a key.
- Tests: 327.

## 0.3: wearable simulator (feature 13)
- Five vitals profiles, overrides, `POST /demo/vitals` (admin).
- Tests: 243.

## 0.2: rules engine (features 4, 20)
- Draft rule table (all rules pending doctor review), severity levels, safety floor (chest pain is always EMERGENCY).
- Tests: 70.

## 0.1: skeleton (day 1)
- Contract, repo structure, FastAPI app with `/health`.

---

## Paste-able note for the team: what changed since 0.1
- The contract grew from the first draft to 0.6.1. New since 0.1: consents (GET and PUT, plus history), audit (GET /audit), insights, `POST /demo/vitals`, rules and severity details, consent and audit rules.
- Consent rules for every app: no row means no consent; a revoked consent takes effect on the next request; fields without consent are left out (never null).
- The passport opens only with a valid, unexpired token for that patient (or a logged-in staff user or the patient). Every view is audited.
- Insights wording is fixed text, pending doctor review. Never present it as a diagnosis.
- Still to build on the backend (not yet in the code): login, patient profile and vitals, the emergency endpoints, hospitals, ambulance location, demo reset and scenarios, reports, and the family, responder, admin, content, feedback and privacy endpoints.
