# Run the hospital portal and the patient app together

Simulated prototype. No real hospital, ambulance or emergency service is contacted.
This page was rewritten on 14 Nov 2026 against the repo (portal `package.json`, `.env.example`, `vite.config.js`, `scripts/start-demo.ps1`, and Jehal's `README.md` and `mock-server/` on branch `Jehal`). It was **not run by Claude** (the sandbox has no network). Lines marked **CHECK ON LAPTOP** could not be confirmed from the repo: test them and tell Claude what you saw.

Related pages: `RUN_WITH_JEHALS_MOCK.md` (the same setup as a checklist with what to expect), `DEMO_SCRIPT.md` (what to say).

## Which way do you want to run?

| Way | You need | Use it for |
|---|---|---|
| **A. Portal alone, built-in sample data** | the portal only | quick look, practice the walk-through |
| **B. Portal + patient app on Jehal's mock** | portal, Jehal's branch, patient app | the real two-screen demo |
| **C. Portal + Daksh's backend** | Daksh's backend running | not ready yet, see the end of this page |

## What you need (all ways)

- Git, PowerShell, a browser (Chrome or Edge).
- Node **22 or newer** for the portal. `start-demo.ps1` accepts Node 20 with a warning. Jehal's README says Node 18 or newer for his apps.
- Check with `node --version`. Open a new PowerShell window after installing Node.

## A. Portal alone (built-in sample data)

```powershell
cd hospital-portal
.\scripts\start-demo.ps1
```

It checks Node, runs `npm ci` if needed, creates `.env` from `.env.example` (that file says `VITE_USE_MOCK=true`), starts the portal on port **5174** (`--strictPort`, so it stops with a message if 5174 is busy) and opens the browser. Press **Ctrl+C** in that window to stop.
Log in as `staff@demo` / `demo123` (or `admin@demo` / `demo123`). Press "Simulate new alert" to get cases.

## B. Portal + patient app on Jehal's mock

You need **three PowerShell windows** and **two copies of the code** on different branches. Do not switch branches inside one folder while a window is running from it.

### Window 1: Jehal's mock server (branch `Jehal`)

```powershell
git fetch origin
git worktree add ..\jehal-mock origin/Jehal      # second folder next to your clone; skip if it exists
cd ..\jehal-mock
npm ci                                            # once; installs the patient app and the mock (npm workspaces)
$env:HOSPITAL_MODE = "manual"                     # the portal's buttons drive the emergency (see below)
$env:DEMO_SPEED = "1"                             # 5 = five times faster, good for practice
$env:CORS_ORIGINS = "http://localhost:5173,http://localhost:5174"
npm run mock
```

Expect two lines: `Mock server (simulated data) running on http://localhost:4000` and `WebSocket on ws://localhost:4000/ws`. Leave the window open.

- `HOSPITAL_MODE=manual` matters. Without it (default `auto`) the mock plays the fake hospital by itself and your Acknowledge and Dispatch clicks collide with it.
- Optional: `$env:ALERT_AT = "detected"` makes the mock send a first thin alert before the SOS. Only then does the portal show an **Early notice** card, and only then can you rehearse the cancel path (step 7 below). Default is `sos`: the hospital hears nothing until the SOS.
- Optional: `$env:ESCALATION_SECONDS` (default 30, divided by `DEMO_SPEED`) is how long an unanswered alert waits before it escalates.
- The mock's own default allowed addresses are `localhost` ports 5173, 5174 and 3000, so `CORS_ORIGINS` is only needed if the portal runs on another port.

### Window 2: the hospital portal (branch `Puneet`)

Edit `hospital-portal\.env` (it is not committed; if it is missing, copy `.env.example`). Set:

```
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000/ws
VITE_PORTAL_SIMULATES_AMBULANCE=false
```

Why the last line: with Jehal's mock in manual mode, the mock moves the ambulance after Dispatch. Only one side should move it. Then:

```powershell
cd hospital-portal
npm ci            # once
npm run dev
```

Open the address it prints. Normally that is **http://localhost:5174**. If it prints another port (for example 5175 because 5174 was busy), add that address to `CORS_ORIGINS` in window 1 and restart the mock, or the browser will say "blocked by CORS".
Restart `npm run dev` after every `.env` change.
Log in as `staff@demo.test` / `demo1234` (the mock's own login), or `staff1` / `demo-password` (the mock translates the username). The login answer from the mock carries hospital `HSP-AMD-002`; the top bar shows **Desk hospital**.

### Window 3: the patient app (Jehal)

```powershell
cd ..\jehal-mock
npm run dev          # patient app, http://localhost:5173
```

No `.env` is needed: the app talks to `http://localhost:4000` by default (`patient-app\.env.example`). Log in as `patient@demo.test` / `demo1234`.
Alternative: `npm run dev:all` in `jehal-mock` starts the patient app and the mock together, but then use that one window instead of windows 1 and 3, and set the `$env:` lines first.

## Logins at a glance

| Where | Login | Password |
|---|---|---|
| Portal, built-in sample data (`VITE_USE_MOCK=true`) | `staff@demo` or `admin@demo` | `demo123` |
| Portal, on Jehal's mock (`VITE_USE_MOCK=false`) | `staff@demo.test` (or `staff1`) | `demo1234` (or `demo-password`) |
| Patient app, on Jehal's mock | `patient@demo.test` | `demo1234` |

The real portal sends a **username** (not an email) to the login call; Jehal's mock accepts both.

## What each window should show

- Window 1: the two "running on" lines, then a log line per request.
- Window 2: the Vite address. In the browser the header badge says **Live**.
- Window 3: the Vite address on port 5173.

## What works with Jehal's mock (checked by running it on 14 Nov, see `RUN_WITH_JEHALS_MOCK.md`)

- Login, hospital list, live alerts, symptoms, vitals, timeline, acknowledge, dispatch, ambulance movement, live bed availability, escalation to the next hospital.
- The mock has no "arrived" event: the desk presses **Arrived** and **Handed over**.
- An unanswered alert keeps escalating until the hospital list runs out. Acknowledge soon after the first escalation.
- Notes and chat are not in the mock (and not in Daksh's contract yet). Notes and checklist ticks stay "saved on this screen only"; sending a chat message shows a "not sent" error. See `ENDPOINTS_TO_AGREE.md`.
- Jehal's current branch has `GET /emergencies?status=` and `GET /ambulances` (his Phase 7 notes). An older checkout may not: the portal then says so on screen and shows a sample fleet. **CHECK ON LAPTOP** that the active list and the fleet load.

## Rehearsal checklist (about 5 minutes; tick as you go)

1. [ ] Portal logs in; the top bar says Live and shows a desk hospital.
2. [ ] Patient app: press SOS (symptoms, then confirm). Portal: a card appears; symptoms read as words ("Chest pain"); the alert sound plays once when the SOS is confirmed (not before). If you hear nothing, use **Test sound** and the amber "Sound is blocked" banner.
3. [ ] Portal: open the card, press **Acknowledge**. Patient app timeline shows "Hospital acknowledged".
4. [ ] Portal: **Dispatch**, choose an ambulance. Patient app timeline shows "Ambulance dispatched", then the moving ambulance and ETA. The map line says the backend moves the ambulance.
5. [ ] Portal: **Arrived**, then **Handed over**. Patient app timeline reaches the end.
6. [ ] Open **Open post-event report**; it lists the real hospital and times.
7. [ ] **Cancel path** (needs `ALERT_AT=detected` in window 1): start another SOS and press "I'm OK" during the countdown. The early card turns grey **CANCELLED** quietly (no sound, no flashing).
8. [ ] **Safety check-in:** trigger a fall check without symptoms. Portal: "No symptoms reported. Started by the safety check-in". Detail opens without errors; after the SOS it can be acknowledged and dispatched; the report opens.
9. [ ] Stop the mock for about 15 seconds (Ctrl+C), then start it again. The badge shows Reconnecting; after 10 seconds without a connection the red "Connection lost" banner appears; when the mock is back it says "Reconnected" and the badge returns to Live. Nothing crashes. The mock keeps its data in memory, so a restart forgets all alerts.

## Stopping and resetting

- Each window: **Ctrl+C**.
- The mock forgets everything on restart. `POST /demo/reset` on the mock also resets it.
- After the demo set `VITE_USE_MOCK` to what you want next (`true` for the built-in samples, `false` for a backend) and restart `npm run dev`.
- The portal keeps the login in the browser tab only; after closing the tab you log in again.

## Who moves the ambulance (decide before the demo)

`VITE_PORTAL_SIMULATES_AMBULANCE` in the portal `.env`:
- `auto` (default): with a backend that sends no `ambulance.location` after Dispatch, the portal waits 3 s and then moves the ambulance. If the backend starts sending positions, the portal stops.
- `true`: always the portal. `false`: never the portal (use with Jehal's mock in manual mode, or with Daksh's backend once it simulates the trip).

## C. Portal + Daksh's backend (not ready yet)

Daksh's `backend/README.md` on branch `Daksh` says the emergency lifecycle, the WebSocket and hospitals/ambulances are **not built yet**, so the live demo cannot run on it. When they are built:
- Install and start it as his README says (Python 3.12, `.venv`, `.env` with real keys, `uvicorn app.main:app --port 8000`). Health check: http://localhost:8000/health. **CHECK ON LAPTOP.**
- Portal `.env`: `VITE_USE_MOCK=false`, `VITE_API_BASE_URL=http://localhost:8000`, `VITE_WS_URL=ws://localhost:8000/ws` (these are the defaults in `.env.example`). His contract names the socket `/ws/hospitals/{hospital_id}`: ask him which one he built.
- Log in as `staff1` / `demo-password` (his seed users).
- Missing endpoints (notes, chat, checklist, hospital add/edit/verify) are listed in `ENDPOINTS_TO_AGREE.md`.

## Re-capture the real events (for the integration test)

`src/services/jehal-fixture.json` is a saved run of Jehal's mock, used by `src/services/integration.test.js`.
To refresh it after Jehal changes his output: run his mock, run `npm run integration` in `jehal-mock`, copy the new events into the fixture (keep the keys `ids`, `events`, `details`, `hospitals`) and run `npm test` in the portal. A failing test tells you which field the portal can no longer read.

## If something looks wrong

| You see | Likely cause and fix |
|---|---|
| "Could not load the alert list" | The backend has no `GET /emergencies?status=active`. New alerts still appear live. |
| Login fails | Real mode wants the account shown in the table above; the label on the login page says username or email. |
| Browser says "blocked by CORS" | The portal is on a port the mock does not allow. Add it to `CORS_ORIGINS` and restart window 1. |
| Port 5174 already in use | `npm run dev` picks the next port (5175); `start-demo.ps1` stops instead. Close the other window or use `-Port 5175`, then fix CORS as above. |
| Acknowledge or Dispatch gives an error 409 | `HOSPITAL_MODE=manual` was not set in window 1. Stop the mock, set it, start again. |
| Nothing arrives on the desk | Check window 1 for the SOS, check the badge says Live, check `.env` has `VITE_USE_MOCK=false` and the portal was restarted. |
