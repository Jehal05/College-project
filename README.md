# HealthTwin AI

**Simulated emergency-response prototype for a college project.** No real hospital, ambulance, SMS or emergency number is ever contacted. Nothing here is a medical device or medical advice. All medical wording, symptom words and Hindi/Gujarati text are drafts that have **not** been reviewed by a doctor or a native speaker.

Three people built three parts. This branch (`integration`) puts them in one folder so the project can run from one place. `main` still holds only the initial commit.

| Folder | What it is | Built by (from the branch history) |
|---|---|---|
| `hospital-portal/` | The hospital desk screen: alert queue, map, ambulance dispatch, checklists, admin, reports, English / Hindi / Gujarati | Puneet (branch `Puneet`) |
| `patient-app/` | The patient app, with the family, volunteer-responder and admin screens | Jehal (branch `Jehal`) |
| `mock-server/` | Fake backend (in memory) that stands in for the real one | Jehal |
| `backend/` | The real backend: FastAPI, SQLite, encrypted data, rules engine. **Only partly built** | Daksh (branch `Daksh`) |
| `scripts/` | Contract test, joint rehearsal, and `start-all.ps1` | Jehal, and `start-all.ps1` added on this branch |
| `docs/` | Project docs from Jehal's branch plus `PROJECT_STATUS.md`, `BACKEND_GAPS.md`, `VIVA_QA.md` | shared |

Shagun's branch has only the initial commit. The family, responder and admin screens and their mock endpoints were built by Jehal (see `docs/SHAGUN_WORK_SPLIT.md`).

## What is real, what is mocked, what is not built

Measured from the code on 14 Nov 2026, after merging Daksh's emergency-core commit. `docs/PROJECT_STATUS.md` has the details and `docs/BACKEND_GAPS.md` lists every call.

| Feature | Real backend (`backend/`) | Jehal's mock | Notes |
|---|---|---|---|
| Login, roles | **Real** | Mocked | Both accept the same logins |
| Patient profile, vitals, baseline | **Real** | Mocked | |
| Emergency contacts, consents | **Real** | Mocked | |
| Health passport view, audit log | **Real** | Mocked | |
| Wearable simulator (`POST /demo/vitals`), wellbeing insights | **Real** | Mocked | |
| Symptom rules engine | **Real** (module, draft rules, not reviewed by a doctor) | Mocked copy | |
| Emergency create, SOS, cancel, read, reasons, history | **Real** (new in Daksh's latest commit; not yet tried with the apps) | Mocked | The core demo flow, first half |
| Acknowledge, dispatch, status | **Not built** | **Mocked** | The core demo flow, second half |
| Hospitals and availability, ambulances and location | **Not built** | **Mocked** | |
| Live WebSocket events | **Not built** | **Mocked** | |
| Demo scenarios and reset | **Not built** | **Mocked** | |
| Reports upload, reminders, preferences, summaries | **Not built** | **Mocked** | |
| Family, responder, admin, content, feedback, privacy | **Not built** | **Mocked** | |
| Notes, chat, checklist saving, hospital add/edit/verify | **Not in the contract** | Not in the mock either | Proposed in `hospital-portal/docs/ENDPOINTS_TO_AGREE.md`; the portal shows "saved on this screen only" or "not sent" |

In short: **the live demo runs on Jehal's mock server, not on the real backend.** Daksh's `backend/FREEZE.md` counts 17 of 42 contract endpoints built; his latest commit adds 7 emergency routes after that count. Acknowledge, dispatch, status, hospitals, ambulance location and the WebSocket are still not built.

## Run the whole demo (Windows PowerShell)

```powershell
git checkout integration
.\scripts\start-all.ps1
```

It checks Node 22 or newer, checks that ports 4000, 5173 and 5174 are free, installs packages if needed, starts the mock (`HOSPITAL_MODE=manual`, `DEMO_SPEED=5`), the portal and the patient app, and prints the addresses. Press Ctrl+C to stop all three. If it says a port is busy, it names the process; stop that and run it again. This script has **not** been run on Windows by Claude: if something fails, copy the message. Manual steps are in `hospital-portal/docs/RUN_BOTH_APPS.md`.

| Where | Address | Login | Password |
|---|---|---|---|
| Hospital portal | http://localhost:5174 | `staff@demo.test` (or `admin@demo.test`) | `demo1234` |
| Patient app | http://localhost:5173 | `patient@demo.test` | `demo1234` |
| Mock server | http://localhost:4000 | (used by the apps) | |

## Each part has its own docs
- Portal: `hospital-portal/README.md`, `hospital-portal/docs/DEMO_SCRIPT.md` (3-minute walk-through), `RUN_BOTH_APPS.md`.
- Patient app and mock: `patient-app/README.md`, `mock-server/README.md`, `docs/`.
- Backend: `backend/README.md`, `backend/CONTRACT.md`, `backend/FREEZE.md`.

## Checks (CI runs all three on every push)
Portal: unit tests, lint, build, end-to-end. Patient app and mock: unit tests, contract test, accessibility audit, browser tests. Backend: pytest. See `docs/PROJECT_STATUS.md` for the latest numbers.

## What to say at the start of a demo
See `docs/PROJECT_STATUS.md`, section "What to say at the start of the demo".
