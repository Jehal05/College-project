# Run the portal against Jehal's mock (Simulated)

These are the steps for your laptop (PowerShell). They were not run by Claude: the sandbox has no network, so Jehal's mock could not be installed there.

## 1. Start Jehal's mock (terminal 1)

```powershell
git fetch origin
git worktree add ..\jehal-mock origin/Jehal   # or: git checkout Jehal in another clone
cd ..\jehal-mock
npm ci
$env:HOSPITAL_MODE="manual"; $env:DEMO_SPEED="5"
$env:CORS_ORIGINS="http://localhost:5173,http://localhost:5174"
npm run mock
```

## 2. Point the portal at it (terminal 2)

Edit `hospital-portal/.env`:

```
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000/ws
VITE_PORTAL_SIMULATES_AMBULANCE=false
```

Then `npm run dev` and log in as `staff@demo` (password in Jehal's mock README, `docs/`).

## 3. What to check

| Check | How | Expect |
|---|---|---|
| My hospital | After login, open the Dashboard | Queue shows alerts for `HSP-AMD-002`. If it looks empty, click "All hospitals" |
| Escalation | Create an alert, do not acknowledge. To speed it up: `POST /demo/no-ack {"enabled":true,"escalate_after_seconds":5}` on the mock | After about 30 s (6 s at DEMO_SPEED=5) the card shows "Escalated to the next hospital" and the alert sounds once for the hospital it moved to |
| Ambulance moves | Acknowledge, then Dispatch | Marker moves from the mock, not from the portal (`VITE_PORTAL_SIMULATES_AMBULANCE=false`) |
| Live availability | Save beds on one browser, keep another open | The other map and ranking update without reload |

Record what you saw in `docs/DEMO.md` only after you have actually run it.

## What was checked on 14 Nov 2026

Verified on the laptop: staff login returns `HSP-AMD-002`; escalation shows on the card; Hindi and Gujarati render without boxes; acknowledge and dispatch work.

Also verified later on 14 Nov: the mock moves the ambulance itself after dispatch (28 position updates and `vitals.update` events; ETA 54 s to 0 s in about 15 s at DEMO_SPEED 5), and then stays En route until the desk clicks Arrived. A `hospital.availability_updated` event changed beds free in an already-open tab with no refresh.

Still unconfirmed: live availability in a separate second tab, and the Hindi and Gujarati card and detail panel by eye. See `docs/DEMO_SCRIPT.md` for the fallback if the ambulance does not move.
