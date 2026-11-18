# Demo recording checklist (real backend)

Simulated prototype. Companion to `docs/DEMO_RUN_REAL_BACKEND.md` (the run of show) and `docs/DEMO_RECORDING_PLAN.md` (the shot list for the mock). Tick a box only when you saw it yourself.

## The day before
- [ ] `git pull` on the laptop, then `.\laptop-demo-check.cmd`. It should end with `0 FAIL`. Paste any FAIL line into `docs/DEMO_ISSUES_PHASE4.md`.
- [ ] Run the whole demo once off camera (steps 1 to 12 of the run sheet), including the SOS from **Emergency help** (never seen yet).
- [ ] Listen for the alert sound once. Press **Test sound** first.
- [ ] Portal `.env` has `VITE_PORTAL_SIMULATES_AMBULANCE=true`. Restart the portal after changing it.

## Before you press record
- [ ] `.\laptop-restart-backend.cmd`, `.\laptop-update.cmd`, `.\laptop-patient-real.cmd`, in that order. Wait one minute.
- [ ] Both windows side by side: patient app on 5173, portal on 5174 (portal zoom 80%).
- [ ] Portal login: replace the prefilled `staff1` with `staff@demo.test`. Badge says **Live**.
- [ ] Queue is clean: refresh the portal; scope is **All hospitals**. Do not reset the demo mid-recording.
- [ ] Language English. Notifications off. No other tabs. No passwords, personal emails or real names on screen.
- [ ] Screen recorder on (Win+G or OBS), microphone checked.

## While recording
- [ ] First sentence: "This is a simulated prototype, not a medical device. No real hospital, ambulance or patient."
- [ ] After the SOS, point at the command strip: acknowledgement ("waiting ..."), what the patient shared and what was **not** shared, the ambulance marked **Simulated**.
- [ ] Acknowledge, dispatch, watch the ambulance move, Arrived, Handed over. Show the response history filling in order.
- [ ] Say once: the ambulance movement is simulated by the portal, the hospital ranking can differ between portal and backend, Hindi and Gujarati are unreviewed drafts, six patient screens are planned.
- [ ] Do not click: Emergency Center, Disease Intelligence, Live Monitoring, Health Simulator, Care Circle, Hospitals (patient app).

## If it goes wrong
- Patient app "Cannot reach the server": `.\laptop-restart-backend.cmd`, wait 10 seconds, refresh.
- Badge says **Reconnecting**: the backend stopped or the network dropped; it reloads the list by itself when it is back. Wait for **Live** before continuing.
- Everything fails: show the recorded video or the screenshots in `hospital-portal/docs/demo/`.

## After recording
- [ ] Watch it once. Check for passwords, emails and names.
- [ ] Save it in `hospital-portal/docs/demo/`.
- [ ] Stop everything (see section 6 of the run sheet).
- [ ] Tick the rehearsal boxes in the run sheet only for what you saw in this run.
