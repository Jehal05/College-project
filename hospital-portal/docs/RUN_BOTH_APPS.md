# Run the hospital portal and the patient app together

Simulated prototype. Two laptops or one, same steps.

## What you need
- Node 22 (the portal), Node 20+ (Jehal's mock). Backend by Daksh is optional: use **Jehal's mock first**.

## Terminal 1: Jehal's mock server (branch `Jehal`)
```powershell
git checkout Jehal
cd mock-server
npm install
$env:DEMO_SPEED="1"; node server.js      # DEMO_SPEED=5 makes it five times faster for practice
```
It prints `running on http://localhost:4000` and `WebSocket on ws://localhost:4000/ws`.

## Terminal 2: the hospital portal (branch `Puneet`)
Create `hospital-portal/.env.local` (this file is not committed):
```
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000/ws
```
```powershell
git checkout Puneet
cd hospital-portal
npm install
npm run dev
```
Open the address it prints (usually http://localhost:5174). The mock allows the portal address through CORS; if the browser says "blocked by CORS", start the mock with `$env:CORS_ORIGINS="http://localhost:5174"`.

## Terminal 3: the patient app (Jehal)
Start it as Jehal's README says, pointing at the same mock (`http://localhost:4000`).

## Logins
| Where | Username / email | Password |
|---|---|---|
| Portal, real mode | `staff1` (username, **not** email) | `demo-password` |
| Portal, real mode | `staff@demo.test` also works against Jehal's mock | `demo1234` |
| Portal, mock mode | `staff@demo` | `demo123` |
| Patient app | `patient1` | `demo-password` |

The login answer has no hospital. After login, the top bar shows **Desk hospital**: pick the hospital this desk represents (the first verified one is chosen for you).

## What to expect with Jehal's mock (checked by running it)
- Login, hospital list, live alerts, symptoms, vitals, timeline, ambulance movement: **work**.
- The mock has **no** `GET /emergencies` list, `/ack`, `/dispatch` or `GET /ambulances`. The portal says so on screen, applies your Acknowledge/Dispatch clicks **on the portal screen only**, and shows a sample fleet. The mock moves the case along by itself. Real acknowledge and dispatch need Daksh's backend.
- Alerts start as **Early notice** (state `EMERGENCY_DETECTED`) and turn into normal alerts at `SOS_SENT`.

## Rehearsal checklist (about 5 minutes; tick as you go)
1. [ ] Portal logs in; top bar says Live and shows a desk hospital.
2. [ ] Patient app: press SOS (symptoms, then confirm). Portal: a card appears; symptoms read as words ("Chest pain"); the alert sound plays once when the SOS is confirmed (not before).
3. [ ] Portal: open the card, press **Acknowledge**. Patient app timeline shows "Hospital acknowledged".
4. [ ] Portal: **Dispatch**, choose an ambulance. Patient app timeline shows "Ambulance dispatched", then the moving ambulance and ETA.
5. [ ] Portal map follows the ambulance; **Arrived**, then **Handed over**. Patient app timeline reaches the end.
6. [ ] Open **Open post-event report**; it lists the real hospital and times.
7. [ ] **Cancel path:** start another SOS in the patient app and press "I'm OK" during the countdown. Portal: the early card turns grey **CANCELLED** quietly (no sound, no flashing), banner says "cancelled before the SOS was sent".
8. [ ] **Safety check-in:** trigger a fall check without symptoms. Portal: card says "No symptoms reported. Started by the safety check-in … Simulated." Detail opens without errors; after the SOS it can be acknowledged and dispatched; the report opens.
9. [ ] Stop the mock for 10 seconds: badge shows Reconnecting, then Live; nothing crashes.

## Re-capture the real events (for the integration test)
`src/services/jehal-fixture.json` is a saved run of Jehal's mock, used by `src/services/integration.test.js`.
To refresh it after Jehal changes his output: run his mock, run `npm run integration` on branch `Jehal`, copy the new events into the fixture (keep the same keys: `ids`, `events`, `details`, `hospitals`) and run `npm test`. A failing test tells you which field the portal can no longer read.

## If something looks wrong
- Blank list and "Could not load the alert list": the backend has no `GET /emergencies?status=active`. Expected with Jehal's mock. New alerts still appear live.
- Login fails: real mode wants a **username**; the label on the login page says which.
- Port in use: Vite picks the next port (5175). Use the address it prints.
