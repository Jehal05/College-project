# Likely jury questions and plain answers

Written from the code and docs on branch `integration` (14 Nov 2026). **Read this together as a team and check each answer against your own part.** Each person should be able to answer for their own part without this page. Where something is not built or not reviewed, the honest answer is written here: use it.

## Hospital portal (Puneet)

1. **How does the portal choose which hospital gets an alert?**
   It first rules out hospitals that are not verified or that lack the unit the emergency needs (for example a cath lab for a heart attack). Then it scores the rest: 50% capability, 30% travel time, 20% availability (`src/data/ranking-config.json`). Distance never brings back a hospital that was ruled out. The reason is shown on screen.
2. **What happens if nobody answers an alert?**
   After 30 seconds the alert escalates to the next ranked hospital and the card shows it. The 30-second timer is meant to run in the backend; today it runs in Jehal's mock (and in the portal's own mock mode).
3. **What if the backend lacks an endpoint?**
   The portal does not crash. A missing call (404, 405 or 501) limits that one feature and says so: for example notes and checklist ticks are "saved on this screen only", and chat shows "not sent". The list is in `hospital-portal/docs/ENDPOINTS_TO_AGREE.md`.
4. **How do you know it works?**
   Unit tests for the logic (ranking, state machine, translations), end-to-end tests in a real browser, lint and build, all run by CI on every push. The numbers are in `docs/PROJECT_STATUS.md`. We have not yet recorded a full run on the demo laptop.
5. **Who reviewed the medical content?**
   Nobody yet. The checklists, severity levels and symptom words are sample content. The portal keeps showing "Sample checklist. Pending medical review." until a real doctor signs the review sheet and the name and date are entered in `src/data/reviewStatus.js`.
6. **How do the Hindi and Gujarati versions work, and are they correct?**
   All screens read their text from three files with the same keys, checked by a test, and another test fails if English text is hard-coded in a page. The translations are drafts: a review CSV exists for native speakers, and none has reviewed it yet.
7. **What does the ambulance on the map do?**
   Everything about the ambulance is simulated. Only one side moves it: with Jehal's mock the mock moves it, otherwise the portal does. The map says which.
8. **What did you not build?**
   Real hospital systems, real dispatch, real notifications. Notes, chat, checklist saving and hospital add/edit/verify are not in the backend contract yet.

## Patient app and mock server (Jehal)

1. **What does the patient do in an emergency?**
   Choose symptoms, press the emergency button, and a 10-second countdown with an alarm lets them cancel a false alarm. Then the SOS is sent with their location, and the app shows the simulated hospital and ambulance response live over a WebSocket.
2. **Why a mock server?**
   The real backend was not ready, so the mock lets the apps be built and tested together. It keeps data in memory and is clearly labelled simulated. `npm run contract` checks that any server (mock or real) keeps to the agreed API.
3. **How does the app protect privacy?**
   The patient chooses what is shared (location, history, vitals, reports) on a consent screen; other roles see only what was shared; the health passport can be time-limited and revoked.
4. **Does it work offline and in three languages?**
   It saves a read-only copy for offline use, shows a banner, and supports English, Hindi and Gujarati. The Hindi and Gujarati text has not been reviewed by native speakers.
5. **Does it diagnose?**
   No. Every screen says "Simulated event. Not a medical diagnosis." Voice input only suggests symptoms.
6. **How is it tested?**
   Unit tests, an API contract test against the mock, an accessibility audit in three languages, and browser tests, all in CI. A joint rehearsal script drives the real portal and the patient app together (18 of 18 checks on the mock, last run 13 Nov per `docs/JOINT_REHEARSAL.md`).
7. **Who built the family, responder and admin screens?**
   Jehal (Phase 10), because Shagun's branch holds only the initial commit. The backend side of those does not exist yet.
8. **What is not finished?**
   The patient app is built for the real backend's contract, but the real backend does not have the emergency flow yet, so the full flow only works on the mock.

## Backend (Daksh)

1. **What is real in the backend today?**
   Login with hashed passwords and a limit on wrong tries, the patient record, vitals, baseline, contacts, consents with a change history, the health passport, the audit log, wellbeing insights, the wearable simulator, the rules engine, and emergency create, SOS, cancel and read. His `FREEZE.md` counts 17 of 42 built (older snapshot); CI's contract status after his latest commit says 24 built, 22 not built.
2. **What is not built?**
   Acknowledge, dispatch and status, hospitals and availability, ambulance location, demo reset, reports, the WebSocket, and the family, responder and admin endpoints. (Emergency create, SOS, cancel and read were added in his latest commit.)
3. **How is patient data protected?**
   Sensitive fields are encrypted in the database, passwords use bcrypt, the status timeline is append-only, every passport view is audited, and tokens are checked on each request.
4. **How are the medical rules made, and are they approved?**
   The rule table maps symptoms and vitals to a severity and an action. Every decision carries "pending doctor review". Twelve rules were drafted by an AI assistant from public first-aid guidance and accepted for the prototype; a doctor has not reviewed any of it.
5. **How do you know it works?**
   The backend suite has 1893 passing tests (run locally on 14 Nov 2026) and the repo has a CI workflow that runs pytest; see `docs/PROJECT_STATUS.md` for what CI showed.
6. **Why does the demo not use your backend?**
   Because acknowledge, dispatch, status, hospitals, ambulance location and the WebSocket are not built yet. The honest answer is: the mock stands in for them, and the apps have not yet been run against the new emergency routes.
7. **What is the plan to finish?**
   The five most needed calls are listed in `docs/BACKEND_GAPS.md`. No date has been agreed.
8. **Is there anything demo-only?**
   Yes: `/demo/*` exists only in demo mode, and the seed data is fictional.

## Questions we cannot answer yet (say so, do not guess)
- Has any doctor reviewed the checklists, severity levels, rules or symptom words? **No.**
- Has a native speaker reviewed the Hindi and Gujarati text? **No.**
- Does the full flow run end to end on the real backend? **No.** The first half (create, SOS, cancel) exists there now; acknowledge, dispatch, hospitals and the WebSocket do not. The demo runs on the mock.
- When will the backend's emergency flow be finished? **Not agreed.**
- Has the whole demo been recorded on the demo laptop? **Not yet.** The table in `hospital-portal/docs/DEMO_SCRIPT.md` ("Laptop run") is empty until it is.
- Is `main` the final version? **No.** `main` holds only the initial commit; `integration` is the combined version.

## Who built what (from the branch history)

| Part | Branch | Commits | Notes |
|---|---|---|---|
| Hospital portal | `Puneet` | 99 | 94 of the commits are authored by Claude sessions |
| Patient app, mock server, family, responder and admin screens | `Jehal` | 25 | 23 authored by Claude sessions |
| Backend | `Daksh` | 20 | authored by Daksh |
| Family, responder, admin | `Shagun` | 0 beyond the initial commit | built by Jehal instead |

Many commits are written with an AI assistant. Be ready to explain your own part in your own words.
