# Changelog

All numbers are real runs of `python -m pytest`. Dates are 13 November 2026 (the plan's date).
The contract version lives at the top of `CONTRACT.md`.

## 0.7 (in progress): foundation for the real backend
- Emergency states, roles and the transition table in code, tested against the table in `CONTRACT.md`.
- All 14 contract tables (new: users, hospitals, ambulances, emergencies, status_events, symptom_reports, hospital_alerts, vitals, emergency_passports) plus a counter table for readable ids. Sensitive fields encrypted. The status timeline is append-only.
- bcrypt password hashing, `EM-YYYYMMDD-nnnn` ids with a safe daily counter, demo seed data (fictional) that loads **only** in demo mode, CORS allow-list from `CORS_ALLOW_ORIGINS` (no wildcard).
- Decisions agreed with Puneet. Still waiting for Jehal on: the token in his contract checker, the passport URL shape, and whether `sex` is always shared. **Waiting for Daksh to confirm Puneet's change to question 4 (severity floor for a real SOS) before the emergency endpoints are built.**
- **Login and roles (feature 33):** `POST /auth/login` with bcrypt checks, 8-hour login tokens that are re-checked against the user on every request, `require_role`, and a login rate limit (429 after 5 wrong attempts). The placeholder 501 answers are gone: a missing login is 401.
- **One error shape** for the whole API (`error` and `detail`, same text), 400 instead of 422, and no echo of what the caller sent.
- `/demo/*` exist only in demo mode, and any logged-in user may use them (the patient app's demo panel and the contract script need that).
- **Patient record, vitals, baseline, contacts (Task 3):** `GET` and `PATCH /patients/{id}` (validation copied from the patient app's own form; a patient sees only themselves; an admin sees only what the patient shared, no phone numbers, audited), `GET .../vitals`, `GET .../baseline`, contacts CRUD (at most 5, exactly one primary), and consent answers with a `changes` list.
- Contacts now need the `history` consent in the passport, and `sex` is always shown (agreed with Jehal and Puneet).
- `POST /demo/vitals` defaults to the caller's own patient (it used to default to a made-up id).
- Random ids are now 64 bits (were 32): a measured 0.035% collision rate per 2000 ids made one test flaky and would have broken primary keys at scale.
- Tests: 1222 passing. Jehal's `npm run contract` passes 13 of 27 core checks against this backend (it was 1 at the start of the day).

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
