# Demo issues (Phase 4): the real-backend run

Simulated prototype. Read with `docs/DEMO_RUN_REAL_BACKEND.md`.

**What this list is based on, honestly.** Nobody (including Claude) has run the full demo on the real backend in this phase: the sandbox has no FastAPI, so the run is **NOT RUN**. The items come from (a) the laptop runs of 14 and 15 Nov (`docs/LAPTOP_RUN_2026-11-14.md`), (b) reading the code for the command view, and (c) known items from `docs/PROJECT_STATUS.md`. "What happened" says which. `scripts/demo-check.ps1` (run by `laptop-demo-check.cmd`) is built to turn the "not seen yet" items into PASS or FAIL on the laptop. Add its result below when you have it.

Owner key: **P** = Puneet (portal, map, ambulance, backend blocks P1 to P4), **D** = Daksh (backend), **J** = Jehal (patient app, mock server), **T** = team decision.

| # | Step | What happened | Likely cause | Owner | Status |
|---|---|---|---|---|---|
| 1 | Step 5: queue ranking and "which hospital first" | Portal lists Maninagar first (93.0 or 94 in the HEART demo case), the backend picks Navrangpura. Measured: the two orders differ in 4 of 6 test cases (`python3 -I backend/scripts/compare_rankings.py`) | The portal weighs beds and capability above 1.6 km of distance; the backend takes the nearest suitable hospital | T | Open. Evidence and a recommendation are in `docs/DECISIONS_PHASE4.md` part A. Not implemented |
| 2 | Step 8: ambulance does not move | With `VITE_PORTAL_SIMULATES_AMBULANCE=false` the ETA stays empty. Seen on the laptop, 14 Nov | The real backend has no ambulance mover; only the portal (in `true` mode) or the mock moves it | T (D or P) | Open. Workaround is in the run sheet: set `true` in the portal `.env`. See `docs/DECISIONS_PHASE4.md` part B |
| 3 | Command view: "Acknowledged by ..." | **Predicted from code, not seen.** `GET /emergencies/{id}` returns `status_events` with only `state` and `timestamp` (backend `services/emergencies.py` line 331); the actor is stored (as a user id) but not sent. After a page reload the command view says "Acknowledged at 10:02 (after 9 s). Name not recorded." Live, the name can come from the WebSocket event | The desk-side payload drops `actor` | D (add a display name, not an id, to the event) | Open. Portal shows "Name not recorded" instead of inventing one (tested). `demo-check.ps1` has a line for it |
| 4 | Command view: what the patient shared | The alert carries `consents` {location, history, vitals, reports}. Not seen on screen yet | n/a | P | To check with `demo-check.ps1` ("alert carries the four consents") and by eye |
| 5 | WebSocket token is checked only when the socket opens | A desk whose login token expires, or whose account is disabled, keeps hearing alerts until that socket closes. Not reproduced here (needs the real backend). Read from `backend/app/api/ws.py`: `_login` runs once, then `_pump` sends events for the life of the socket | No re-check after connect | D | Open. Suggested fix: close the socket with code 1008 at the token's expiry and re-check the account every minute. A test is needed first (socket opened with a short-lived token, still open after expiry) |
| 6 | Step 3 and 4: patient app SOS from the screen | Marked ⚠️ in the run sheet: nobody has pressed Emergency help in the new design on the real backend. The 14 Nov run did an SOS from the older flow | unknown | J | Open. Run it once before recording |
| 7 | Patient app browser test **A1** (`phase10-apps.test.mjs`, "admin lands on /admin ...") | Failed once in CI, passed on later runs (`docs/PROJECT_STATUS.md` item 6). Not seen on the laptop. Not run in this phase | The first admin load sometimes leaves `GET /admin/users` pending; the test already reloads once and prints the pending requests when it fails | J | Open: treat as flaky until it passes repeatedly. If it fails again, the failure message already lists pending requests and the URL **15 Nov, commit 48a81b7 (CI):** the push run failed A1 again plus **S5 and S6** in `phase15-simulator.test.mjs` (20 of 22 files passed); the pull-request run of the same commit passed 22 of 22 files, 505 checks. S5 reads the table row straight after `fill()` with no wait, which is a likely race (not proven). Nothing in patient-app or mock-server was changed by Puneet's commits except a new `eslint.config.js`. |
| 8 | Alert sound | Nobody has heard it (`DEMO_RUN_REAL_BACKEND.md` rehearsal box) | not known | P | Open: listen once. Click **Test sound** first; browsers block sound until a click |
| 9 | Six planned patient-app screens | Say "Planned screen. This page is not built yet" | They are placeholders | J | Known. Do not click them while recording |
| 10 | Hindi and Gujarati | About 129 words stayed English (14 Nov); the command view's new text is a machine-assisted draft and "Simulated" stays English on purpose | Unreviewed translation | T | Open. Say so on the recording |
| 11 | Portal login box prefilled with `staff1` | The real backend wants `staff@demo.test`; the prefilled text makes login fail (401) | Prefill is for the mock | P | Known workaround in the run sheet. A fix would change the login screen; not made in Phase 4 |
| 12 | Order of the laptop commands | Three helper scripts must run in order (`laptop-restart-backend`, `laptop-update`, `laptop-patient-real`) | n/a | P | Known; they are in the run sheet |

## Fixes made in the Puneet area in this phase

| For item | Fix | Test |
|---|---|---|
| 3 and 4 (shown honestly) | `CommandSummary` never invents a name or a "shared" value: an unknown consent reads "Not stated", a missing acknowledger reads "Name not recorded" | `commandView.test.js`: "an acknowledgement with no actor says no name", "a consent the server did not send is null" |

No other Puneet-area fault was found, because the run itself was not possible here. If `demo-check.ps1` or the recording finds one, add a row and a test.

## Laptop results to paste here

- `laptop-demo-check.cmd`: NOT RUN yet. Paste `demo-check-results.txt`.
- `laptop-phase3-check.cmd`: NOT RUN yet (or paste `phase3-results.txt` if you already ran it).
