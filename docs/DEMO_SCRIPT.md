# Demo script (about 5 minutes)

Everything is simulated. Say so at the start: the yellow banner on every screen says "Simulated event. Not a medical diagnosis."

## Before the jury arrives

1. `npm install` (once), then `DEMO_SPEED=5 npm run mock` in one terminal and `npm run dev` in a second one. (`DEMO_SPEED=5` plays the hospital response in about 10 seconds.)
2. Open http://localhost:5173 on a phone-sized window (360 px wide, or a real phone on the same network).
3. Open `/demo` and press **Reset demo** ("Demo reset" appears). Sign out.
4. Check the line at the bottom of `/demo`: "App version ... · API http://localhost:4000".

## Walkthrough

| Time | Do | Say / expect |
|---|---|---|
| 0:00 | Sign in: `patient@demo.test` / `demo1234` | Home shows "Hello, Rahul", live heart rate and SpO2 changing, the twin bar "Within your usual range" |
| 0:30 | Open the language selector (Profile or Login), choose हिन्दी, then ગુજરાતી, then English | Whole app changes at once and is remembered |
| 1:00 | Press **Emergency help**. Tap **Stroke signs**. Tick "Face drooping" (or use the mic button, say the symptom, press "Tick them") | Voice only suggests: "We heard: ..." and "We may have heard wrong. Please check." Nothing is ticked until confirmed |
| 1:45 | Press **Get help now** | Red screen, "Call 112 / 108" first, countdown from 10 with a beep |
| 2:00 | Let it run or press **Send now** | "Alert sent", location line, then the timeline fills: hospital acknowledged, ambulance dispatched, ETA counting down, arrived, handover done. "Time since alert" runs and freezes |
| 2:45 | Point at "Your contacts were notified (simulated)" | Names only, no phone numbers |
| 3:00 | Press **Back to Home**, open Profile > Consent settings, switch Location off | "Saved". Next emergency says "Location sharing is off in your consent settings". Switch back on |
| 3:30 | **Offline moment:** in browser dev tools set Network to Offline | Banner "You are offline... Call 112 / 108 works without internet." Profile shows "Saved copy" and edits are off |
| 3:50 | While offline, start an emergency | Red **Not sent yet** screen, "No alert has reached any hospital. Call 112 / 108 now." Never says sent |
| 4:15 | Set Network back to Online | App sends by itself and opens the emergency screen |
| 4:45 | Close: what is real and what is not | See below |

## If something goes wrong

- **Mock server not reachable** (message "Could not reach the mock server"): restart `npm run mock`; the app recovers by itself.
- **Mic does not work** (browser blocks it or no Hindi voice): the note says so; tick symptoms by hand. Voice is a convenience only.
- **Response too slow:** restart the mock with `DEMO_SPEED=10`.
- **Stuck state:** `/demo` > **Reset demo**.
- **Total failure:** the offline "Not sent yet" screen and the crash screen both keep the `tel:112` button, so safety never depends on the app.

## What to say is NOT real

Simulated hospital and ambulance; mock server with fake data in memory; no QR health passport yet; no real SMS or push to contacts; no doctor-reviewed condition guidance (only 3 general lines); Hindi and Gujarati not yet checked by native speakers.
