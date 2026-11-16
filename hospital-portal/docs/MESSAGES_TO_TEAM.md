# Messages to send (Simulated prototype)

Copy each message into the group chat.

## To Daksh

Daksh, open items for the hospital portal. Full wording is in `hospital-portal/docs/PROPOSED_ENDPOINTS_FOR_DAKSH.md`.

1. **Notes and chat (items 5 and 6).** `POST /emergencies/{id}/notes` and `POST /emergencies/{id}/chat`, plus the events `emergency.note` and `chat.message`. The portal side is built and falls back to "saved on this screen only" until you add them.
2. **Availability names.** The portal uses `beds_free`, `icu_free`, `cath_lab_ready`, `stroke_unit_ready` (and reads yours too). Jehal's mock accepts both. Which set wins?
3. **Who moves the ambulance?** With Jehal's mock the backend moves it and the portal runs with `VITE_PORTAL_SIMULATES_AMBULANCE=false` (checked on 14 Nov). Please confirm your real backend will do the same.
4. **WebSocket login.** Can the socket accept `{"type":"auth","token":"..."}` as the first message? Jehal's mock already does. The portal supports it with `VITE_WS_AUTH=message`.
5. **Severity NONE.** A real SOS must not be sent as NONE: the portal puts NONE at the bottom of the queue with no sound. Please send at least URGENT and keep the engine result in a separate `engine_severity` field, marked as pending doctor review.
6. **Hospital mode.** Please make it switchable, and default to manual when the portal is used. If both the backend and the portal drive the states we get 409 errors.
7. **Login answer.** Please include `role` and `hospital_id`.
8. **Sex display.** Showing it is a team and clinical decision. The portal shows "Not shared" when the value is missing.
9. **Errors and expired tokens.** Please answer 401 for a missing or expired token and 403 for "logged in but not allowed". On 401 the portal logs the desk out with "Your session expired". For other errors it shows your short `message`, `error` or `detail` text when the body has one.
10. **Take over.** A desk that acts on an alert held by another hospital now first sends a `desk` note to `POST /emergencies/{id}/notes` with `fields: { taken_over_by, taken_over_from }` and the reason as text. Please just store `fields` as sent.
11. **Health check (optional).** The portal sends a tokenless `GET /health` every 15 seconds in real mode. Any answer counts as "up", even 404. Only a network failure shows the red banner "Backend unreachable, using mock data". A plain `200` would be nice.

## To Daksh (short: please answer the endpoint table)

**Draft only. Not sent.** Puneet sends it.

Daksh, I wrote down the six calls the portal needs that are not in `backend/CONTRACT.md` yet, in one table: `hospital-portal/docs/ENDPOINTS_TO_AGREE.md` (branch `Puneet`).
1. `PATCH /emergencies/{id}/checklist`
2. `POST /emergencies/{id}/notes` (six note kinds)
3. `POST /emergencies/{id}/chat`
4. `POST /hospitals`, `PUT /hospitals/{id}`, `PATCH /hospitals/{id}/verify` (admin: add, edit, verify)
plus the events `emergency.note` and `chat.message`.

Every row says "PROPOSED, not agreed". For each row please write **OK** or **change to: ...** in the last column (or reply in the chat and I will copy your words in). I will only mark a row agreed when you have said so in writing. If you say no to a row, the table already says what the portal does without it.

## To Jehal

Jehal, thanks for Phase 9. I ran the portal against your mock (commit f0bce14) and these work: staff login returns `HSP-AMD-002`, and an unacknowledged alert escalates and shows "Escalated to the next hospital". Two notes:

1. My earlier PDF suggested Daksh's availability key names. The portal uses its own (`beds_free`, `icu_free`, `cath_lab_ready`, `stroke_unit_ready`). Your mock accepting both is perfect until Daksh decides.
2. The portal now reacts live to `hospital.availability_updated` (commit 43f57db on `Puneet`). I checked it with two open browser tabs: both changed with no refresh. I also checked that your mock moves the ambulance by itself after dispatch (about 28 updates, ETA 54 s to 0 s at DEMO_SPEED 5).

Two small things:

a. After `POST /demo/reset` the next alert gets the same id (`EM-20261113-0001`). The portal now replaces the old card when the alert time is different, so this no longer hides the new alert. Still, counting ids across a reset would be cleaner.

b. The mock sends no "arrived" event, so the desk clicks Arrived and Handed over. Is that on purpose? Also an unanswered alert keeps escalating until the hospital list runs out. That is fine for the demo, I just want to be sure it is intended.

Also `npm ci` in your repo reports 14 vulnerabilities (1 high, 2 critical). Please look at `npm audit`, but do not run `npm audit fix --force`.

## To Daksh (refreshed 14 Nov: what I built on your branch, what I need you to confirm)

**Draft only. Not sent.** Puneet sends it. Nothing below is agreed until Daksh answers in writing.

Daksh, I added the hospital-side backend blocks on branch `Daksh` (commit a2681d6, now merged into `integration` together with `main`; CI numbers for the merged branch are in `docs/PR_INTEGRATION_TO_MAIN.md`). Please `git pull origin Daksh` and read it. I did not run the portal or the patient app against it on a laptop, and I did not run the contract script or Docker, so "works end to end" is not proven yet.

Please confirm or change, one line each:
1. Hospital calls I added to `CONTRACT.md` as PROPOSED: add, edit and verify hospitals; notes, chat and checklist; `GET /emergencies?status=active|finished`.
2. One WebSocket path: I built `/ws?token=` (or an `auth` message within 5 s). Your contract said `/ws/hospitals/{hospital_id}`. Which one stays?
3. Escalation after 30 s without acknowledge (`ESCALATION_TIMEOUT_SECONDS`): OK for the demo?
4. `POST /location-shares` and `DELETE /location-shares/{id}` are now built on `main` (contract 0.7.5, your commit), so every endpoint in `CONTRACT.md` exists. Nothing to answer here; just confirm the contract text matches what you built.
5. FYI: the baseline ciphertext test was already fixed in your J3 commit. I made one more short-needle test (`ECG` in `test_encrypted_columns.py`) deterministic, since 3 letters can appear in random ciphertext by chance. Please check my one-line change.

## To Jehal (add to the message above)

**Draft only. Not sent.**

Jehal, two questions: (1) Your `TRANSLATION_REVIEW.md` still says "not reviewed by a native speaker". Who reviewed the Hindi and Gujarati text, and can you write their name in the file? Until then we say it is unreviewed. (2) The backend now has the hospital calls and a WebSocket, so we can try the apps against it. Do you want to try that with me on one laptop? Neither of us has run it yet.

## Phase 1 review request (15 Nov 2026, not sent)

### To Daksh

Daksh, I added a PROPOSED section to `docs/API_CONTRACT.md` ("Proposed: predictions, organs, report extraction"). Nothing is built. Three routes (`POST /predictions/{model}`, `GET /patients/{id}/organs/{organ}`, `POST /reports/extract`) and one new route for saving confirmed lab values. The new code would live in your backend, so please say yes or no and answer the open questions at the end of that section. In particular: where the model files should live. Separately, I will send the WebSocket review findings (the token is checked only when the socket opens).

### To Jehal

Jehal, the same section describes the answers for the model card, the organ panel and the report review screen. Could your mock return one fixed example of each so you can build the screens first? Please tell me if a field you need is missing. The shapes are a proposal, not agreed.

## Phase 3 build notes (15 Nov 2026, drafts, not sent)

Everything below is on branch `Puneet` only (not merged, not pushed until Puneet says so). Nothing is agreed until each person answers in writing.

### To Daksh

Daksh, the routes I proposed are now built on `Puneet` in your `backend/app`, so you can read them as code instead of as a plan:

- `POST /predictions/{model}` (heart, diabetes; now with an optional `scenario` for a what-if)
- `GET /patients/{id}/organs/{organ}`, `POST /reports/extract`, `POST` and `GET /patients/{id}/lab-values`, `DELETE /patients/{id}/lab-values/{lab_id}`
- one new table, `lab_values` (the value and the printed range are encrypted; created by `create_all`, no migration)
- `backend/CONTRACT.md` has PROPOSED rows for all of them, because `test_contract_conformance.py` fails for any served route that is not listed there. (`/predictions/{model}` was missing since Phase 2; I only noticed now.)

Please answer: (1) the six routes and the table: accept, change or drop; (2) `pypdf` for `/reports/extract`: I did **not** add it to `requirements.txt` or the lock. Without it the route answers 503 and nothing else is affected. Add it (pure Python, BSD) or keep extraction off? (3) the model files: kept in the repo under `app/ml/models/`. They are practice models trained on invented data, so every answer says so. Real data is still missing. (4) FYI the WebSocket token is only checked when the socket opens (details in my Phase 1 message). I did not run any of the new endpoint tests on a machine with FastAPI; they run in CI.

### To Jehal

Jehal, the answers for your Twin, Report and Simulator screens exist now, with examples in `docs/examples/phase3/*.json` (the extract and what-if ones are real function output; the others are written from the code, not captured from a server). The shapes to read: `docs/API_CONTRACT.md`, "Phase 3 build notes" under sections 2, 3 and 4 and the what-if note under section 1.

Things that differ from what you may expect: (1) the organ list is your six (heart, lungs, kidneys, liver, pancreas, brain) but brain always answers `has_data: false`; (2) vitals have **no trend** (the simulator keeps no history), only stored labs have one; (3) lab `test` values are your keys (`hba1c`, `fasting_glucose`, ...), units are your app units, and `/reports/extract` already converts mmol/L etc; (4) `unreadable` is a list of objects; (5) the what-if only changes the model's own inputs. Exercise, smoking, sleep and diet cannot be changed (no coefficients exist for them), and your four slider names do not map one to one onto the model inputs (reasons in the contract note). Please show the model inputs themselves on the Simulator. Your screens need to call `POST /patients/{id}/lab-values` after the person has checked the extracted values; the extract call saves nothing.

To try it on one laptop, Puneet has `.\laptop-phase3-check.cmd` (no packages needed; it starts the backend by itself and writes `laptop-phase3-log.txt`). The done-when for you: your Twin, Report and Simulator screens show real answers from the real backend.

## Phase 4 build notes (15 Nov 2026, drafts, not sent)

Branch `Puneet` only. Nothing is agreed until each person answers in writing. The full evidence is in `docs/DECISIONS_PHASE4.md`.

### To Daksh

Daksh, three things for you, none of them changed by me in your code:

1. **Ranking.** Your `rank_hospitals` picks the nearest suitable hospital; the portal's ranking scores capability, travel time and beds. On six test cases the first hospital differs in 4 (HEART at the demo location: portal Maninagar, backend Navrangpura). You can reproduce it with `python3 -I backend/scripts/compare_rankings.py`. My recommendation (option 2 in the note): the backend ranks like the portal, using the shared `ranking-config.json`, after a doctor has looked at the weights. Do you agree, or do you want the portal to follow the backend?
2. **Ambulance.** The backend has no mover; only the portal (with `VITE_PORTAL_SIMULATES_AMBULANCE=true`) or Jehal's mock moves it. For the recording I suggest the portal does it. Long term: a small backend simulation. Your call.
3. **Two gaps I only read, not tested.** (a) `GET /emergencies/{id}` sends `status_events` with `state` and `timestamp` only, so after a reload the command view cannot say who acknowledged ("Name not recorded"). Could the event carry a display name (not a user id)? (b) The WebSocket checks the token only when the socket opens (`api/ws.py`), so an expired token or a disabled account keeps hearing alerts. Suggested: close at expiry. I would write the test first.

Also new: `backend/scripts/perf_check.py` (standard library only, single-user local check, not a load test) and `scripts/run-all-tests.ps1`. The full backend test run on a machine with FastAPI has still not happened for the Phase 1 to 3 tests: CI or my laptop is the first place.

### To Jehal

Jehal, for the demo on the real backend: `docs/DEMO_ISSUES_PHASE4.md` lists what I expect to go wrong, and `docs/DEMO_RECORDING_CHECKLIST.md` is the checklist. Your items: (1) the SOS from **Emergency help** in the new design has never been pressed against the real backend (marked "not seen yet" in the run sheet); (2) the six planned screens must not be clicked while recording; (3) the browser test A1 (`phase10-apps.test.mjs`) failed once in CI and is treated as flaky; if you see it fail again the message already lists the pending requests. Ambulance: do you want your mock to keep moving it only in mock mode? That is what happens today. Please run `.\laptop-demo-check.cmd` once the backend is up, or tell me and I will.


## Phase 6A build notes (15 Nov 2026, draft, not sent)

### To Jehal

Jehal, I polished the hospital portal (grouped menu, stats strip, clearer alert cards, analytics with median and P90). I did **not** touch `patient-app/` or the mock. Two small questions: (1) does your mock's `hospital.alerted` event carry `hospital.distance_km`? The alert card shows a distance only when it does. (2) `docs/FRONTEND_HANDOFF_PATIENT_APP.md` lists ideas from a frontend review for your app (design consistency, Overview layout, mobile navigation). They are suggestions only; one item I checked in your code: mobile Home goes to `/` and desktop Overview to `/overview`, which looks intentional. Take what helps.

### To Daksh

Daksh, no code of yours was touched. `docs/API_CONTRACT.md` has four PROPOSED rows (section "Phase 6A"): please confirm `hospital.distance_km` is sent on every read of an emergency, and say whether ambulances will ever get `registration` and `speed_kmh`. The portal works without all of them.

## PR #15 review requests (16 Nov 2026, drafts, not sent; updated for the new split)

New split: Puneet owns the backend, Jehal owns the whole frontend, Daksh is off the project. Full table: `docs/PR15_OWNERSHIP.md`. This replaces the "I did not touch patient-app/" line in the Phase 6A draft above: that line was true for Phase 6A only, not for the whole branch.

### To Jehal

Jehal, PR #15 has the hospital portal work (Phase 4 command view, Phase 6A shared UI parts, stats strip, alert cards, grouped navigation, analytics median/p90/n, map tile notice, 12 new e2e tests) and 3 files in `patient-app/`; nothing in `mock-server/`. As you now own the frontend, please review: (1) the portal changes (`hospital-portal/`, commits listed in the ownership table); (2) `patient-app/tests/browser/phase10-apps.test.mjs` (`b2f30ff`, `15a91bc`): A1 reloads up to 3 times when `GET /admin/users` stays pending; (3) `phase15-simulator.test.mjs` (`15a91bc`): S5 and S6 wait for the table; (4) `patient-app/eslint.config.js` (`c5239e9`), new and not run in CI. A1 passed on both CI events at `fdf955f` but failed on the pull_request run twice before; the root cause is unknown. The portal's Hindi and Gujarati strings are unreviewed drafts.

### Backend and Daksh

No message to Daksh while he is off the project. The backend part of PR #15 (about 5,600 lines: hardening, rate limit, PROPOSED lab values, organ answers, report text and what-if routes, practice ML models on invented data) is now Puneet's. It still needs a second reviewer; decide who. Backend CI passed at `fdf955f`.

## Phase 7B: WebSocket token fix (16 Nov 2026, draft, not sent)

### To Jehal

Jehal, I (Puneet, backend) plan to change `backend/app/api/ws.py` so the server re-checks the login while a socket is open (on a timer and before each event) and closes it with code 1008 if the token has expired or the account was disabled. Today it checks only when the socket opens (`docs/DEMO_ISSUES_PHASE4.md` item 5). I will not touch the frontend, the `/ws` URL or the message shapes. Two questions: (1) Does your AI/security work touch `ws.py` or the token checks? If yes, tell me and I will wait. (2) A frontend point I found by reading only: `hospital-portal/src/services/socket.js` reconnects after any close and resets its wait to 2 s as soon as the socket opens, and the server opens (accepts) a socket before it closes it with 1008. So a desk with a dead token would retry about every 2 s forever and never show "log in again". This already happens today for a bad token at connect. The fix would be on your side (for example, after a 1008 close, stop retrying and ask for a new login). I am not changing it.

## Phase 8: design improvement (16 Nov 2026, draft, not sent)

### To Jehal

Jehal, I (Puneet) would like to help improve the look of the whole app, building on your hospital-website work that is now in main (`.ht-page` and the login header in the portal, `.ht-themed` and the light default in the patient app). What I would propose, nothing built yet: (1) no plain white or plain black as a page or card background anywhere, using a tinted medical palette in light and dark (deep navy-teal instead of black); (2) a medical-themed background on every screen group, made only from CSS and inline SVG (faint ECG line, clinical grid, medical cross, soft anatomical outline, pulse rings on emergency screens), drawn on solid tinted cards so text never sits on the pattern; (3) one shared token set and shared Button, Card, StatusPill and empty/error/loading states in both apps; (4) a contrast script that measures WCAG AA for every text and background pair, and keeps `axe` at PASS. In the portal only the login page uses your new `.ht-page` background so far; the other portal screens do not. Questions: which files or screens are you working on right now, so we do not collide? Do you want me to work on a separate branch from the latest `main` (I would suggest `puneet-design`), or would you rather take it yourself and I only send the audit? Please say if any of the ideas above should be dropped.
