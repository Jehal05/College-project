# Jury demo script (about 5 minutes) and backup video checklist

**Before you start:** `npm run dev`, open the address Vite prints (see the top of the README), log in as `staff@demo` / `demo123`, click **Reset demo** and confirm. Zoom the browser so text is readable from the back. Keep a second tab open at `/crew/E-1001`.

## Script

| Time | Do | Say |
|---|---|---|
| 0:00 | Dashboard. Point at the 3 alerts and the badges. | "Everything here is simulated. Alerts arrive sorted by severity, the oldest first." |
| 0:30 | **Heart attack (E-1001).** Open it, click Acknowledge. Scroll to the ranking table. | "Capability is checked first. Only hospitals with a ready cath lab are ranked, then travel time and beds." |
| 1:10 | Dispatch. Pick the nearest unit, confirm. Watch the tracking map. Switch traffic to Heavy, click the green corridor button. | "Notification sent only becomes dispatched when I click. ETA reacts to traffic. All simulated." |
| 1:50 | Assign a team member. Send a chat message, answer it from the crew tab. | "Desk and crew talk in one place." |
| 2:20 | When Arrived shows, click Handed over. Click Open post-event report. | "One page with hospital, reason, times and checklist. It can be printed." |
| 2:50 | **Stroke (E-1002).** Acknowledge. Show the ranking: only stroke-unit hospitals. | "A nearer hospital without a stroke unit is ruled out, with the reason." |
| 3:20 | **Asthma (E-1003).** Press "Mock: patient presses I'm OK". | "A cancelled alert can never be dispatched." |
| 3:40 | **Diabetic.** Click "+ Simulate new alert" until a diabetic alert appears. Acknowledge and open "Nearby help". Click Notify responder. | "Any emergency hospital can take this one. Nearby AEDs and responders are sample data. A notify is only a note." |
| 4:10 | Map: tick AED and responders. | "Nearest AED to the patient, with distance." |
| 4:30 | Analytics, then History. | "Every number is worked out from the stored timeline." |
| 4:50 | Log in as admin: add a hospital, show it is not ranked until verified. | "New hospitals are not trusted until an admin verifies them." |
| 5:00 | Click Reset demo. | "One click restores the starting data." |

If something fails on stage: click **Reset demo**, then continue from the next row.

## Backup video checklist
- [ ] Reset demo, log in, browser zoom set, notifications and other windows closed.
- [ ] Screen recording on, microphone tested, sound on (alert beep for EMERGENCY alerts).
- [ ] Record the full script above in one take (about 5 minutes).
- [ ] Watch it once: text readable, no real names, "Simulated" visible in the top bar.
- [ ] Export as MP4, name it `healthtwin-hospital-portal-backup.mp4`, copy it to a USB stick and a cloud folder.
- [ ] Also keep the screenshots of Dashboard, Tracking, Report, Analytics.

## Demo assets in `docs/demo/` (recorded in a sandbox, mock mode)
Numbered screenshots (`01-login.png` ... ) and `hospital-portal-demo.webm` (about 4 MB) follow the script above: login, three alerts, Heart attack detail, Acknowledge, Dispatch confirm, Handed over, post-event report, History, Activity log, Analytics, Hindi, Gujarati and Reset demo.

**Honest limits of these files**
- They were recorded in a sandbox with no internet, so the map pictures are **not** included, and in the video any frame with a map (tracking, Map page) shows an empty box: the map styles and tiles did not load there. Record the map parts again on the laptop, with internet, before showing the jury. The screenshots of Map and Tracking are left out on purpose.
- The recording runs the script faster than a person would talk, with no voice. It is a visual reference, not the final backup video.
- Everything shown is simulated mock data.
- The `.webm` plays in Chrome and VLC. The checklist below still asks for an MP4 recorded on the laptop.
