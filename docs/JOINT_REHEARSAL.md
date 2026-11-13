# Joint rehearsal: patient app + the real hospital portal

Last run: 2026-11-13, portal commit `37964c8` (`origin/Puneet`), **17 of 17 checks passed**. The portal code is not edited and not even checked out in this repo: the script exports it with `git archive` into a temp folder.

## Run it with one command

```bash
git fetch origin
node scripts/joint-rehearsal.mjs        # needs Chrome (CHROME_PATH) and npm access the first time (npm ci of the portal)
PORTAL_DIR=/tmp/portal SHOTS_DIR=/tmp/shots node scripts/joint-rehearsal.mjs   # reuse an export, save screenshots
```

It builds the portal with `VITE_USE_MOCK=false`, builds the patient app with `VITE_DEMO_TOOLS=true`, starts the mock on port 4300 with `HOSPITAL_MODE=manual DEMO_SPEED=5`, serves the portal on 5174 and the app on 5374, and drives both in one Chrome with two windows. It is **not** part of `npm test` or CI because it needs Puneet's code and the network.

## Run it by hand (two terminals, three if you want the portal in dev mode)

1. `HOSPITAL_MODE=manual DEMO_SPEED=5 CORS_ORIGINS=http://localhost:5173,http://localhost:5174 npm run mock` (port 4000)
2. Patient app: `npm run dev` (port 5173).
3. Portal: in a copy of `hospital-portal/` set `.env` to `VITE_USE_MOCK=false`, `VITE_API_BASE_URL=http://localhost:4000`, `VITE_WS_URL=ws://localhost:4000/ws`, then `npm run dev` (port 5174). Sign in `staff@demo` / `demo123`.

## The 5-minute joint demo

| Time | Patient phone | Hospital desk |
|---|---|---|
| 0:00 | Sign in, point at Home | Sign in `staff@demo`; the dashboard says Navrangpura Heart & Stroke Institute, "Live" |
| 0:40 | Emergency help > Heart > Chest pain > Get help now; let the countdown run (or **Send now**) | Nothing yet (it is still the patient's cancel window) |
| 1:00 | "Alert sent" | A red card appears: patient `PT-2026-0417`, symptoms, HR / SpO2 / BP, location |
| 1:30 | Timeline: "Alert sent" only | Press **Acknowledge** |
| 1:45 | Timeline: "Hospital acknowledged" | Press **Dispatch**, pick the nearest ambulance, confirm |
| 2:15 | "Ambulance dispatched", ETA counts down | Map: the ambulance moves toward the patient |
| 3:30 | "Arrived" | Press **Arrived**, then **Handed over** |
| 4:00 | "The simulated emergency has ended." Open the alert record | Card is finished; History lists it |
| 4:30 | Start another emergency and press **False alarm? Cancel** | Card turns **CANCELLED**, buttons greyed |
| 5:00 | Say what is simulated (below) | |

**Say clearly:** no real hospital, ambulance, SMS or call is involved; the patient app says "notification sent", never "help is on the way", until the desk dispatches; nothing is a diagnosis.

## If something fails

- No card on the desk: check the mock log for the SOS; confirm the portal was built with `VITE_USE_MOCK=false` and the right `VITE_API_BASE_URL`; the badge in the header should say Live.
- Login fails: the portal's real mode sends `username`; `staff@demo` / `demo123` and `staff1` / `demo-password` both work.
- Buttons do nothing: the token must be a staff token (a patient token gets 403 on ack, dispatch and status).
- Ambulance does not move: it moves from the portal's own simulator after Dispatch (or the mock's ticks if the portal posts nothing). Press **En route** by hand.
- Out of sync: `/demo` > Reset demo (patient app) and reload the portal.

## Results by scenario

| Scenario | Result | How it was checked (selectors) |
|---|---|---|
| a) SOS from the symptoms path | PASS (4 checks) | Card `[data-testid=alert-card][data-id=EM-...]`: "Heart attack", EMERGENCY, `PT-2026-0417`, "Chest pain, Shortness of breath", HR / SpO2 / BP present, coordinates shown |
| b) Acknowledge, dispatch, arrive, handover | PASS (6 checks) | Desk `button[data-action=HOSPITAL_ACKNOWLEDGED]`, `AMBULANCE_DISPATCHED` + `[data-testid=confirm-dispatch]`, `EN_ROUTE`, `ARRIVED`, `HANDOVER_DONE`. Patient `ol[aria-label=Timeline] li`; before dispatch the timeline has no "Ambulance dispatched" |
| c) Cancel inside the 10 s countdown | PASS | `[data-testid=alert-card][data-id=<id>]` count stays 0 for 4 s |
| d) Cancel after SOS | PASS (2 checks) | `data-state=CANCELLED`; every `button[data-action]` is disabled |
| e) Consent off | PASS (2 checks) | Vitals off: "HR – / SpO2 –% / BP –". Location off: "Location not shared", no coordinates |
| f) Safety check-in, no answer | PASS | A card appears. **How the portal shows type UNKNOWN:** the title reads "Safety check-in (no symptoms)", severity EMERGENCY, text "No symptoms reported. Started by the safety check-in (fall check). Simulated." and a "Safety check-in alert. Simulated." note. The portal already has a label for it (we expected none) |
| g) Console errors | PASS | No errors in either app (deliberate 401/404/409 excepted) |

## Mismatches found (send to Puneet) and open decisions

1. **Accuracy shows "(±0 m)"** on the detail panel when the patient app reports accuracy 0 (the headless browser's fake GPS). Suggest hiding accuracy when it is 0 or missing. Real phones will report a real value.
2. **IDs.** The portal worked unchanged with `HSP-AMD-002` and `AMB-AMD-02` (it treats IDs as opaque). Its own seed uses `H1`-`H5`; the mock keeps those in `portal_id`.
3. **Availability key names.** Portal: `beds_free, icu_free, cath_lab_ready, stroke_unit_ready`; Daksh v0.6.1: `icu_beds, cath_lab_open, stroke_unit_open`. The portal reads both. One set must be chosen.
4. **Ambulance movement.** The portal's browser simulator posts positions (`POST /ambulances/:id/location`); the mock relays them. If the desk is closed after Dispatch nobody moves the ambulance except the mock's fallback ticks. Real backend: who owns movement?
5. **Cancel after dispatch.** Daksh's table forbids it; the mock enforces it only in manual mode. The patient app shows the cancel button until handover. Not rehearsed yet.
6. **Not in the mock** (the portal keeps these local): notes, chat, checklist ticks, hospital onboarding and edits, availability updates, responders, AED.
7. **Open with Daksh:** who moves `EMERGENCY_DETECTED` to `SOS_SENT` (the app calls `/sos` today; this mock matches the effect he proposes); readable symptom labels live in `mock-server/adapters.js` and need a home in the backend; `409` body shape.
