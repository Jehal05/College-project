# Demo script (about 3 minutes) — Simulated prototype

Everything here is **simulated**. No real hospital, ambulance or patient is involved. Say that in the first sentence.

Legend: ✅ checked on the laptop on 2026-11-14 · ⚠️ not checked yet (do it in a rehearsal before the jury).

Checked in a real browser on 2026-11-14 (real mode, Jehal's mock): the Dispatch dialog fits a short window, the take-over box and reason, the sound control states, Presentation mode on and off, and Hindi on the Map, Fleet, History, Activity, Handover and Analytics pages. Checked later the same day with the built-in mock (`VITE_USE_MOCK=true`): after a take-over the Acknowledge and Dispatch buttons unlock, Presentation mode hides the mock helper button on the case and turning it off brings it back, and a new alert asks the browser to play two beeps only when sound is on (0 beeps when off). Checked on 2026-11-14 with Jehal's mock in real mode (`VITE_USE_MOCK=false`, DEMO_SPEED=5): login, the Live badge, the demo SOS arriving, take over (the reason must be chosen in real mode), Acknowledge, Dispatch, the ETA counting down to 0, then Arrived and Handed over. In Hindi and Gujarati the tracking map, readiness card, checklist progress, timeline durations, History dates, and km and minute units on the Map were seen translated; only data stays English (hospital and unit names, symptom words, AED places, checklist items, event text, the ranking "why" sentences). A bug found there ("undefined km left" when the mock sends no distance) was fixed. Not checked: how the sound actually sounds (nobody could listen to it), the PowerShell start script, and every Gujarati page after the last fixes.

## Rehearsal checklist (tick each box during one full run on your laptop)

Nothing below has been done yet. Tick a box only when you saw it work yourself.

- [ ] Start script: `.\scripts\start-demo.ps1` opens the portal (never run on the laptop yet)
- [ ] Login works (`staff1`)
- [ ] Send the SOS (or press **+ Simulate new alert** in built-in mock mode): the card appears with NEW and EMERGENCY
- [ ] **Sound check:** sound on, click "Test sound" and listen for two beeps, then press + Simulate new alert and listen again (nobody has heard it yet). If you see the amber banner "Sound is blocked by the browser", click it first. The tab title also blinks "NEW ALERT" for a few seconds, so a silent laptop still shows the alert.
- [ ] Take over the alert, then Acknowledge
- [ ] Dispatch: **Yes, dispatch** works
- [ ] Tracking: the ambulance moves and the ETA counts down; click Arrived, then Handed over
- [ ] Handover sheet: open **Handover** and check the open cases and notes
- [ ] Language switch: Hindi and Gujarati on the Dashboard, Map and Fleet; no empty boxes in the letters
- [ ] Presentation mode: bigger text, language locked, helper buttons hidden (built-in mock only)
- [ ] Reset: close both windows, start again, and the first alert is fresh

## 0. Before the demo (10 minutes)

**Quickest start (built-in mock, no backend)** ⚠️ not run yet: the script was written without PowerShell available, so run it once on the laptop before the day.

```powershell
cd C:\Users\punee\College-project\hospital-portal
.\scripts\start-demo.ps1
```

It checks Node, runs `npm ci` if needed, creates `.env` from `.env.example` if you have none, starts the portal and opens the browser. Options: `-Port 5175` (if 5174 is busy), `-NoBrowser`, `-SkipInstall`. If PowerShell says scripts are blocked, run `Set-ExecutionPolicy -Scope Process Bypass` in that window first, then the script again. To stop, press Ctrl+C in that window.
The steps below show the longer way, with Jehal's mock server, for the full demo.

**Pre-demo checklist**

- [ ] Full-size screen. Browser zoom **80%** (Ctrl and minus). A short window hides the Dispatch confirm button.
- [ ] Two PowerShell windows only: one for the mock, one for the portal. Do not close them.
- [ ] Internet on, so the map tiles load.
- [ ] Fresh start: close both windows and start them again with the commands below.
- [ ] **Refresh the portal page after any reset. Never reset in the middle of the demo.** (The portal now replaces a reused alert id, but a refresh is still the safe habit.)
- [ ] Log in and click **All hospitals** before you begin.
- [ ] Language is **English** to start. Have Hindi ready for the last step.

**Start the mock (window 1)** ✅

```powershell
cd C:\Users\punee\jehal-mock
$env:HOSPITAL_MODE="manual"
$env:DEMO_SPEED="5"
$env:CORS_ORIGINS="http://localhost:5173,http://localhost:5174"
npm run mock
```

Wait for `Mock server (simulated data) running on http://localhost:4000`. Leave the window alone.

**Start the portal (window 2)** ✅

`hospital-portal\.env` must contain:

```
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000/ws
VITE_PORTAL_SIMULATES_AMBULANCE=false
VITE_WS_AUTH=query
```

```powershell
cd C:\Users\punee\College-project\hospital-portal
npm run dev
```

Open the address printed after `Local:` (usually `http://localhost:5174/`).

**Logins** ✅ — the login page is prefilled with `staff1`. Either of these works against Jehal's mock: `staff1` with the prefilled password, or `staff@demo` / `demo123`. Both return role `staff` and hospital `HSP-AMD-002` (Navrangpura Heart & Stroke Institute).

**Send the SOS (window 3, only at step 1)** ✅

```powershell
$login = Invoke-RestMethod -Method Post http://localhost:4000/auth/login -ContentType "application/json" -Body '{"email":"staff@demo","password":"demo123"}'
$h = @{ Authorization = "Bearer $($login.token)" }
Invoke-RestMethod -Method Post http://localhost:4000/demo/scenario -Headers $h -ContentType "application/json" -Body '{"type":"HEART"}'
```

Do **not** call `/demo/reset` here. Jehal's patient app can send the SOS instead, if it is running.

## 1. The SOS arrives (0:00 – 0:30) ✅

Do: run the SOS command. Watch the queue.

Say: "A patient in Ahmedabad presses SOS. The hospital desk sees it at once: type, severity, symptoms, vitals and location. All of it is simulated sample data, and symptom wording is pending doctor review."

Point at: the red EMERGENCY card, the NEW badge, the sound and the flash, the vitals, the capacity strip at the top (beds, ICU, cath lab, stroke unit).

Note: with **All hospitals** selected you see every alert. **My hospital** shows only alerts held by Navrangpura.

## 2. Nobody answers: escalation (0:30 – 1:00) ✅ (re-checked 2026-11-14)

Do: do **not** click Acknowledge. Wait about 6 seconds (30 s divided by the demo speed of 5). The alert moves from hospital to hospital until the last one on the list.

Say: "If a hospital does not respond in 30 seconds, the alert moves to the next hospital. Nobody can ignore it. In this demo time runs 5 times faster."

Point at: the orange banner "Escalated to the next hospital: …", and the "now at …" line on the card.

Note: with the mock, an alert that nobody acknowledges keeps moving until the list runs out ("Last hospital on the list"). It can still be acknowledged. To make this calmer, acknowledge sooner (next step) instead of waiting for the last hospital.

## 3. Acknowledge and dispatch (1:00 – 1:45)

Do: click the card. If the card says "now at <another hospital>", an amber **Take over this alert** box appears first and the buttons are locked (a new safety step: a desk may not act on another hospital's alert by accident). In the mock the reason "Demo or training" is already chosen, so one click on **Take over this alert** is enough; the reason is saved in the timeline. Then click **Acknowledge**, then **Dispatch**. (Checked in a real browser: the box, the reason check, the box closing, and with the built-in mock the buttons unlocking. With Jehal's mock the alert can escalate again at once; if that happens, click the card and take over again.) The nearest unit is preselected (Bravo 2 in the rehearsal; the name can change, so read it from the screen). Click **Yes, dispatch** ✅.

Say: "The desk acknowledges, then sends the nearest ambulance. The system only allows the next valid step, so nobody can skip a step by mistake."

Point at: the greyed-out buttons with the tooltip "Not yet. … comes first", and the dispatch dialog with unit, crew and distance.

## 4. Tracking and arrival (1:45 – 2:30) ✅

Do: stay on the card. Watch the ETA and the tracking map. When the ambulance arrives, click **Arrived** if the state has not changed by itself, then **Handed over**.

Say: "The ambulance position and the estimated arrival time update live. Everything is simulated: no real vehicle is tracked."

Checked on 2026-11-14 (HOSPITAL_MODE=manual, DEMO_SPEED=5, `VITE_PORTAL_SIMULATES_AMBULANCE=false`): the mock moves the ambulance by itself. About 28 position updates came in, one every 2 seconds of mock time, and the ETA went 54 s, 52 s … 0 s in roughly 15 real seconds. The state stays **En route** at ETA 0: the mock does not send "arrived". **You must click Arrived, then Handed over.** Both worked. Plan for the movement to be short (about 15 s), so click Dispatch at the start of your "tracking" sentence.

If the marker does not move on the day, **switch the demo to the built-in mock**: set `VITE_USE_MOCK=true`, restart the portal, and the portal moves the ambulance itself.

## 5. Activity page and language (2:30 – 3:00)

Do: open **Activity** ✅ (rehearsal 2026-11-14: "33 of 33 entries", the new case shows its steps in order). In Hindi the page title and filters are translated; the row text (what was done) stays English. Then switch the **Language** menu to **Hindi** ✅ (checked in the browser on 2026-11-14: nav, alert card, detail panel, timeline and dispatch dialog are translated and no characters show as boxes) and back.

Say: "Every desk action is logged with who and when. The portal also works in Hindi and Gujarati. These translations are drafts and wait for a native-speaker review."

Do the language switch back on the **Dashboard**, not on Activity. Point at: the Hindi nav bar, alert queue, card (including "अभी यहाँ: <hospital>") and capacity strip. Say honestly that some details are still English: the Activity row text, symptom words, hospital and unit names, HR/SpO₂/BP labels, checklist items, AED places and the ranking "why" sentences. Emergency type names, times, checklist progress, timeline durations, History dates and km/min units were seen translated in Hindi and Gujarati in the browser on 2026-11-14 (Dashboard, Map, History, tracking). Gujarati on the remaining pages was not looked at one by one.

## Extras (optional, if there is time)

- **Presentation mode** (button in the nav bar): bigger text, the language is locked, and the built-in mock's helper buttons are hidden. Toggle and bigger text were seen in the browser; the hiding of the helper button was seen with the built-in mock (`VITE_USE_MOCK=true`).
- **Handover** page: a printable shift handover sheet, with a CSV download for the case list on **History**. Seen in Hindi in the browser; the CSV file was not opened.
- **Analytics** page: counts and average step times from the saved timelines. All values are simulated.

## If something goes wrong

| Problem | What to do |
|---|---|
| Page says "refused to connect" | The portal window was closed. Run `npm run dev` again and open the address it prints. |
| Login says "Failed to fetch" | The mock is not running. Start it again (window 1). |
| Queue is empty | Click **All hospitals**. Check the badge says **Live**. |
| Old card shows after a reset | Refresh the page (Ctrl+R). |
| Ambulance does not move | Switch to the built-in mock: `VITE_USE_MOCK=true` in `.env`, restart `npm run dev`. |
| Everything fails | Show the recorded video in `docs/demo/` and the screenshots in `docs/DEMO.md`. |

## Not covered by this script

Notes and chat need Daksh's backend. In the mock they work on this screen only. Live availability was checked with two real tabs open (beds 11 to 6 in both with no refresh, then back to 11). Escalation was re-checked: an unanswered alert escalated at about 6 s and the "now at" name followed each new hospital. The mock keeps escalating until the list runs out, so acknowledge soon after the first escalation.

## Rehearsal timings (2026-11-14, machine time only, no talking)

| Step | What happened | Time from the SOS |
|---|---|---|
| 1 | Card appears with NEW badge, flash and EMERGENCY badge | 0.5 s |
| 2 | First escalation (state ESCALATED, orange banner) | 6.4 s |
| 3 | Acknowledge, dispatch dialog (nearest unit preselected), confirm | 7.9 s to 10.1 s |
| 4 | Ambulance moves, ETA 40 s then 0 s, Arrived, Handed over | 13 s to 23 s |
| 5 | Activity page, Hindi switch | after 23 s |

The whole machine part takes about 25 seconds, so the 3 minutes is mostly what you say. You can pause on any step. Click Acknowledge soon after the first escalation, or the mock keeps escalating until the hospital list runs out. No console errors appeared (the console was only watched from the rehearsal start). Sound was not heard: the browser tool cannot hear it. Manual test: switch sound on, send the demo SOS, and listen for two beeps.
