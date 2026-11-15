# Demo recording plan (3 minutes). PLAN ONLY: Puneet records it

Based on `hospital-portal/docs/DEMO_SCRIPT.md`. The recording shows the mock server path, because that is the proven one. Say at the start that this is a simulated prototype, not a medical device, and that the medical wording and Hindi/Gujarati text are unreviewed drafts.

## Before you press record
- [ ] `start-all.ps1` is running (mock 4000, portal 5174, patient app 5173). Run it once off camera first.
- [ ] Portal logged in as `staff@demo.test`. Language English. Sound allowed (click the test-sound button once).
- [ ] Screen recorder on (Windows: Win+G, or OBS). Browser zoom 100%. Close other tabs and notifications.
- [ ] Reset the demo (`POST /demo/reset`) so the queue is clean.
- [ ] Have `docs/DEMO.md` screenshots open as the backup if something fails.

## Shot list
| Time | Shot | What you say (short) |
|---|---|---|
| 0:00 | Title card or the portal login | "HealthTwin AI is a simulated prototype. No real hospital, ambulance or patient is involved." |
| 0:10 | Patient app: press SOS (countdown, then send) | "A patient presses SOS. It has a countdown so a false alarm can be cancelled." |
| 0:25 | Portal: card appears with NEW badge, sound | "The hospital desk sees type, severity, vitals and location at once. The wording is pending doctor review." |
| 0:45 | Wait about 6 s, orange banner "Escalated" | "If nobody answers in 30 seconds it goes to the next hospital. The demo runs 5 times faster." |
| 1:05 | Click the card, Acknowledge | "The system allows only the next valid step." |
| 1:20 | Dispatch dialog: nearest unit, confirm | "The desk sends the nearest ambulance." |
| 1:40 | Tracking map: ETA counting down | "Position and ETA update live. All simulated." |
| 2:15 | Arrived, then Handed over, then the report | "The case closes and a report is created." |
| 2:35 | Activity page, then switch to Hindi on the Dashboard | "Every action is logged. Hindi and Gujarati are drafts waiting for native-speaker review." |
| 2:55 | Closing card | "Runs on a practice server today. Real backend run is the next step." |

## After recording
- [ ] Watch it once. Check there are no passwords, personal emails or real names on screen.
- [ ] Save it to `hospital-portal/docs/demo/` (the demo script refers to it as the fallback).
- [ ] Do not tick the DEMO_SCRIPT boxes unless you saw each step yourself in this run.
