# Project status (honest version)

**Date: 14 Nov 2026. Branch: `integration`.** Simulated prototype. Test numbers below are from GitHub Actions runs (CI), not from a laptop; where something was not run, it says so.

## One-line summary
The hospital portal and the patient app work together **on Jehal's mock server**. The real backend now has emergency create, SOS, cancel and read (Daksh's latest commit), but still does **not** have acknowledge, dispatch, status, hospitals, ambulance location or the WebSocket, so the full demo cannot run on it yet.

## Per component

| Component | Works today | Does not work or is missing | Latest CI numbers (14 Nov) |
|---|---|---|---|
| **Hospital portal** (`hospital-portal/`, Puneet) | Alert queue, ranking with reasons, acknowledge, dispatch, tracking map, checklists, handover, reports, admin hospitals, English/Hindi/Gujarati, sound alerts, connection-lost banner, sign-off gate for the "Pending medical review" label | Notes, chat, checklist saving and hospital add/edit/verify need backend calls that are not agreed yet (the portal says "saved on this screen only" or "not sent"); not yet run end to end on the demo laptop | 454 unit tests passed, 22 of 22 end-to-end passed, lint and build passed |
| **Patient app and mock** (`patient-app/`, `mock-server/`, Jehal) | Login, profile, vitals, symptoms, SOS with countdown and cancel, live response timeline, consents, contacts, reports, passport QR, reminders, family, volunteer responder and admin screens, offline mode, three languages | Everything runs against the mock; the real backend lacks the emergency flow | 93 unit tests passed (15 files), contract 27 of 27 core + 9 of 9 optional, accessibility audit with no serious or critical problems, integration check passed, browser tests 15 of 15 files (402 checks) on the final run |
| **Backend** (`backend/`, Daksh) | Login with rate limit, patient record, vitals, baseline, contacts, consents and history, passport, audit log, insights, wearable simulator, rules engine, encrypted storage, **emergency create, SOS, cancel, read, reasons, history and summary; demo scenario, reset, state and speed; reports, reminders, preferences, QR passport links; family linking and check-in, volunteer responders, admin users, content with approval, feedback, privacy requests** | Location shares; WebSocket; `POST /demo/fail` | 1977 pytest tests passed (CI run 43586143495, Backend checks, 14 Nov 2026); contract status: 74 endpoints built, 1 not built, "NOT READY TO FREEZE". Earlier note: the first CI run failed once on a flaky test (`test_the_patient_baseline_is_ciphertext`); it is fixed in J3. The first run failed on one test (`test_the_patient_baseline_is_ciphertext`) that checks the encrypted text does not contain "60"; random ciphertext can contain it by chance, so it is flaky. It passed on re-run. Daksh should fix that test. |
| **Shagun's branch** | nothing beyond the initial commit | the family, responder and admin screens were built by Jehal instead | none |
| **`main`** | only the initial commit | nothing is merged to it yet | none |

Contract check (patient app's script against the mock): **27 of 27 core checks passed** and 9 of 9 optional ones (CI, 14 Nov). The same script against Daksh's backend: 13 of 27 per his changelog; we did not re-run it.

## Known gaps (do not hide these)
1. **Backend:** the hospital calls (acknowledge, dispatch, status, hospitals, ambulance location, notes, chat, checklist) and the WebSocket are built and tested in CI (run 43586143495), but the portal and patient app have not been run against them on a laptop. Only `POST /location-shares` is not built. List: `docs/BACKEND_GAPS.md`. The demo runs on Jehal's mock.
2. **Medical content is unreviewed.** The portal's checklists, severity levels and symptom words, the backend's rules (including 12 AI-drafted rules) and the patient app's instruction text have not been approved by a doctor, as far as the files on this branch show. The portal keeps "Sample checklist. Pending medical review." until a real sign-off is entered in `hospital-portal/src/data/reviewStatus.js`. A doctor sheet is ready: `hospital-portal/docs/DOCTOR_REVIEW_SHEET.html`.
3. **Hindi and Gujarati text is unreviewed.** Both translation docs still say "NOT reviewed by a native speaker". Jehal's latest commit message mentions applying a review, but his `TRANSLATION_REVIEW.md` still carries the "not reviewed" status and names no reviewer, so we treat it as unreviewed until a reviewer is named in writing.
4. **Not yet recorded on the demo laptop.** `start-all.ps1` and the run guides were not run on Windows by Claude. The "Laptop run" table in `hospital-portal/docs/DEMO_SCRIPT.md` is empty until a person fills it.
5. **Proposed endpoints are not agreed with Daksh:** `hospital-portal/docs/ENDPOINTS_TO_AGREE.md` (all rows "PROPOSED, not agreed").
6. **One patient-app browser check (A1 in `phase10-apps.test.mjs`) failed once in CI on this branch** and passed on Jehal's own branch runs; Jehal's latest commit adds debug output to it. Treat it as a possible flaky test until it passes consistently. After merging Jehal's latest commit, the next CI run passed all 15 browser test files, so it looks like a flaky check, but one clean run does not prove that.
7. `main` does not contain the project yet; this `integration` branch is the combined version.

## What to say at the start of the demo
"This is a simulated prototype: no real hospital, ambulance or patient is involved, and nothing here is medical advice. What you will see runs on a practice server that stands in for our real backend, because the real backend does not have the emergency flow built yet. The medical wording and the Hindi and Gujarati text are drafts that doctors and native speakers have not reviewed yet, and the screens say so."
