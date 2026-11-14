# Laptop run, 14 Nov 2026 (Windows laptop "puneet", Node v26.13.1, mock backend)

Run by Claude through helper scripts on Puneet's laptop, reading the log files afterwards. Claude looked at the portal screens only in the "Real backend with the portal on screen" part below (not the patient app), so the "Laptop run" table in `hospital-portal/docs/DEMO_SCRIPT.md` stays empty and no rehearsal box is ticked.

## What was seen (from the log files)
| What | Result |
|---|---|
| `git pull` of `integration` | worked |
| Mock server (`npm run mock`, port 4000) | answers `/health` |
| Portal (5174) and patient app (5173) | both answer after `scripts/start-all.ps1` |
| `scripts/phase1-check.ps1 -Backend mock` | **14 PASS, 0 FAIL, 0 SKIP** (login, hospitals, ambulances, SOS, active list, acknowledge, dispatch, EN_ROUTE, ARRIVED, HANDOVER_DONE, finished list) |

## Two problems found and fixed (commit e18c646)
1. `start-all.ps1` failed twice with "The mock did not answer", although `npm run mock` worked by hand. Starting the parts with `ProcessStartInfo` did not work on this laptop; starting them with `Start-Process` does. The mock now answers in about 2 seconds.
2. `phase1-check.ps1` reported a FAIL for `status EN_ROUTE`: the mock moves the ambulance to EN_ROUTE by itself after dispatch, so asking again gives 409. The check now accepts that when the emergency is already EN_ROUTE or ARRIVED.

## Real backend, same laptop (20:39)
Python 3.12.10 was installed, the backend's virtual environment and packages installed without errors, `.env` was made with throw-away keys, and `uvicorn` started on port 8000. `scripts/phase1-check.ps1 -Backend real` gave **14 PASS, 0 FAIL, 0 SKIP**: login, hospitals, ambulances, SOS, active list, acknowledge, dispatch, EN_ROUTE, ARRIVED, HANDOVER_DONE and the finished list all worked through the real login. This is the API only: the portal and patient app screens were not run against it.

## Real backend with the portal on screen (Claude in Chrome, evening of 14 Nov)
Seen by Claude in the portal (port 5174, real backend on 8000, staff@demo.test):
- Login, the alert queue, take-over of another hospital's alert and acknowledge, dispatch of AMB-AMD-01 all worked.
- **Escalation bug found on a heart-attack alert:** it escalated to hospitals with no cath lab. Fixed in the backend (6dbc911): escalation now goes only to hospitals that can treat the emergency type. Backend CI passed after the fix. The timeline of the old alert (EM-20261114-0002) still shows those escalations because it was created before the fix.
- **Card label bug found:** after a take-over and acknowledge, the card and the ambulance tracking still said the old hospital. Fixed in the portal (9ce9d5f, 2 unit tests). On the screen after a reload the label showed Navrangpura, but a reload reads the saved state, so this does **not** prove the fix: the laptop copy has to be updated with `git pull` and the take-over repeated with a fresh alert.
- **En route, Arrived, Handed over** buttons worked on the real backend; each showed in the response timeline. The case then appeared in History as "Handed over".
- **Handover note, desk chat message and one checklist tick** (1 of 6) worked and showed at once.
- **Ambulance does not move by itself** on the real backend: with `VITE_PORTAL_SIMULATES_AMBULANCE=false` the tracking panel said "simulated by the backend", the ETA stayed empty and the ambulance stayed "about to leave" until the buttons were pressed. **With `true` it works:** after Dispatch the portal moved the ambulance, the ETA counted down (5 min 54 s to 3 min 12 s in about 25 s at 9x speed) and the panel said "simulated by the portal". Whether the backend should move it instead is Daksh's decision.
- **Label fix checked live (second run, 23:2x):** laptop updated with `git pull` (it fast-forwarded to aed4280). A fresh SOS (EM-20261114-0003) was held by Vastrapur Neuro & Trauma Centre; after take-over (reason "Demo or training") and Acknowledge the old "now at" label went away, and after Dispatch the tracking said "Alpha 1 (AMB-AMD-01) → Navrangpura Heart & Stroke Institute".
- **Escalation fix is not running on the laptop yet:** that fresh heart-attack SOS was still escalated to Vastrapur, which has no cath lab. The running backend process was started before the pull and has the old code; it must be restarted to pick up 6dbc911. Not re-checked after a restart.
- **Ranking differs:** the portal lists Maninagar General first (93.0) and Navrangpura second (84.3); the backend's own ranking for the SOS put HSP-AMD-002 (Navrangpura) first. Not resolved; it is a team decision.
- Not looked at: WebSocket live push from another client, the patient app on the real backend, sound, the map beyond the label, Hindi/Gujarati.

## Not done
- The patient app against the real backend.
- Screens (portal, patient app, sound, map, Hindi/Gujarati) were not looked at.
- Not tested: running `start-all.ps1` from a normal interactive PowerShell window (it was started hidden by a helper).
