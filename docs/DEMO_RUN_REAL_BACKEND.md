# Demo run on the real backend (about 4 minutes)

Simulated prototype. Not a medical device. No real hospital, ambulance or patient. Say that in your first sentence.

This page is for a live run with the **real backend** (Daksh), the patient app (Jehal's new design) and the hospital portal (Puneet). The older `hospital-portal/docs/DEMO_SCRIPT.md` is for Jehal's mock. Legend: ✅ seen working on the laptop on 14 to 15 Nov 2026, ⚠️ not seen yet (check it in your rehearsal).

## 1. Start (2 minutes before)

In PowerShell, in `C:\Users\punee\College-project`, one after the other:

```powershell
.\laptop-restart-backend.cmd
.\laptop-update.cmd
.\laptop-patient-real.cmd
```

Wait about a minute. Then open two browser windows side by side:

- Patient app: http://localhost:5173 ✅ (login `patient@demo.test` / `demo1234`)
- Hospital portal: http://localhost:5174 ✅ (login `staff@demo.test` / `demo1234`; the username box is prefilled with `staff1`, so select that text and replace it)

Portal `.env` needs `VITE_PORTAL_SIMULATES_AMBULANCE=true`, or the ambulance will not move (the real backend does not move it).

Browser zoom 80% on the portal (Ctrl and minus), so the Dispatch button fits on screen.

## 2. Screens to avoid in the patient app

Six sidebar items say "Planned screen. This page is not built yet": **Emergency Center, Disease Intelligence, Live Monitoring, Health Simulator, Care Circle, Hospitals** ✅. Do not click them. The screens that work: **Overview, My Digital Twin, Health Reports, Medications, Settings** ✅.

## 3. Run of show

| # | Do | Say | Expect |
|---|---|---|---|
| 1 | Patient app, **Overview** | "This is the patient's digital twin. All readings are simulated." | Heart rate, SpO2, blood pressure and glucose, with trend charts ✅ |
| 2 | **My Digital Twin**, click an organ (Heart) | "Each organ links to its readings and records." | Readings and "Within your usual range" ✅ |
| 3 | Back to **Overview**, press **Emergency help** at the bottom | "In an emergency the patient presses SOS. There are 10 seconds to cancel a false alarm." | Symptom screen with the 10 s countdown ⚠️ |
| 4 | Let the countdown finish (do not cancel) | | SOS sent ⚠️ |
| 5 | Portal, **Dashboard**, **All hospitals** | "The hospital desk sees it at once: type, severity, vitals, location." | Red EMERGENCY card, NEW badge ✅ |
| 6 | Do nothing for about 30 seconds (optional) | "If a hospital does not respond in 30 seconds the alert moves to the next suitable hospital." | Orange "Escalated" banner and a "now at …" line ✅ |
| 7 | Click the card. If it says "now at another hospital", click **Take over this alert** first. Then **Acknowledge**, then **Dispatch**, then **Yes, dispatch** | "The system only allows the next valid step." | Buttons unlock one at a time ✅ |
| 8 | Stay on the card | "Position and arrival time update live. No real vehicle is tracked." | ETA counts down; the panel says "simulated by the portal" ✅ |
| 9 | Click **Arrived**, then **Handed over** | | States change ✅ |
| 10 | Portal **Activity** page | "Every desk action is logged with who and when." | Steps in order ✅ |
| 11 | Switch the portal language to **Hindi** on the Dashboard, then back | "Hindi and Gujarati are drafts, not yet reviewed by a native speaker." | Hindi labels, no empty boxes ✅ |
| 12 | Patient app **Settings** | "The patient sees past alerts here." | "Past alerts" list shows the SOS ✅ |

If you want it shorter, do steps 1, 3 to 9 only.

## 4. Say these honestly

- Everything is simulated; there is no doctor review of the medical wording yet.
- Hindi and Gujarati are unreviewed drafts.
- The real backend does not move the ambulance; the portal simulates the movement.
- The portal's hospital ranking and the backend's ranking can differ (the portal can list Maninagar first where the backend lists Navrangpura). Do not explain it unless asked.
- Six patient-app screens are planned and not built.

## 5. If something goes wrong

| Problem | What to do |
|---|---|
| Patient app says "Cannot reach the server" | Run `.\laptop-restart-backend.cmd`, wait 10 seconds, refresh. |
| Portal login fails (401) | Select and replace the prefilled `staff1`, then try again. |
| Queue is empty | Click **All hospitals**. Check the badge says **Live**. |
| Ambulance does not move | Check `VITE_PORTAL_SIMULATES_AMBULANCE=true` in the portal `.env`, restart the portal. |
| Old cards from earlier tests | Refresh the portal (Ctrl+R). Do not reset the demo in the middle. |
| Everything fails | Show the recorded video or screenshots in `hospital-portal/docs/demo/`. |

## 6. Stop everything afterwards

```powershell
foreach ($p in 8000,5173,5174,4000) { Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force } }
```

## 7. Rehearsal boxes (tick only what you saw yourself)

- [ ] Both apps start with the three commands
- [ ] Patient SOS from **Emergency help** reaches the portal
- [ ] Alert sound heard (nobody has heard it yet)
- [ ] Acknowledge, dispatch, ambulance moves, arrived, handed over
- [ ] Hindi switch looks right
- [ ] Patient app Settings shows the new alert under "Past alerts"
