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
| 3:15 | Open Profile > **Health passport (QR)**, keep 24 hours, press **Create passport** | A QR appears with "Valid for 24 hours". Scan it with a phone (or press "Preview the responder page"): name, blood group, allergies, medicines and contacts, with "Prepared by the patient. Not verified by a doctor." |
| 3:30 | Turn **Medical history** off in Consent settings, reload the responder page | The allergies, medicines and contacts are gone ("The patient has not shared this section."). Turn it back on. Back on the passport screen it says "Opened 2 times" and the bell on Home lists "Passport opened" |
| 3:45 | **Offline moment:** in browser dev tools set Network to Offline | Banner "You are offline... Call 112 / 108 works without internet." Profile shows "Saved copy" and edits are off |
| 4:00 | While offline, start an emergency | Red **Not sent yet** screen, "No alert has reached any hospital. Call 112 / 108 now." Never says sent |
| 4:20 | Set Network back to Online | App sends by itself and opens the emergency screen |
| 4:45 | Press **Revoke now** on the passport screen, then reload the responder page: "This passport is no longer available." Close: what is real and what is not | See below |

## If something goes wrong

- **Mock server not reachable** (message "Could not reach the mock server"): restart `npm run mock`; the app recovers by itself.
- **Mic does not work** (browser blocks it or no Hindi voice): the note says so; tick symptoms by hand. Voice is a convenience only.
- **Response too slow:** restart the mock with `DEMO_SPEED=10`.
- **Stuck state:** `/demo` > **Reset demo**.
- **Total failure:** the offline "Not sent yet" screen and the crash screen both keep the `tel:112` button, so safety never depends on the app.

## What to say is NOT real

Simulated hospital and ambulance; the passport page shows data the patient typed (not doctor-verified); mock server with fake data in memory; no real SMS or push to contacts; no doctor-reviewed condition guidance (only 3 general lines); Hindi and Gujarati not yet checked by native speakers.

## Phase 6: 6-minute rehearsal with the demo panel

Build with `VITE_DEMO_TOOLS=true` (always on in `npm run dev`); a normal build has no `/demo` screen at all. Start the mock with `DEMO_SPEED=5` or pick a speed on the panel. The panel's own **Rehearsal script** checklist lists these steps with tick boxes (kept in memory only).

| Time | Do | Expect |
|---|---|---|
| 0:00 | `/demo` > **Reset demo**, sign in | Status line "Speed N× · Vitals: Resting" |
| 0:20 | Home: point at the four sparklines | Light band = your usual range, "Within your usual range", "Simulated wearable data" |
| 0:45 | `/demo` > vitals profile **Heart emergency** > back to Home | Within about 3 seconds the line moves and the label says "Changed from your usual" |
| 1:15 | Run the **Stroke** scenario | Countdown, alert sent, timeline fills (speed picker: use 10× or 20× first) |
| 2:00 | Open **Why this alert** | Symptoms you told us, readings, "This combination is on our alert checklist.", draft note. No rule sentence, no score |
| 2:30 | After handover, open the **alert record** | Timeline, durations in plain words, shared items, contacts notified (simulated), Copy / Download / Print |
| 3:15 | `/demo` > **Simulated fall** | Full-screen "Are you OK?" with a 30 second countdown, Call 112 / 108. Press **I'm OK** once, then run it again and let it time out: an alert starts, source "Safety check-in (simulated fall)", Cancel works |
| 4:30 | `/demo` > switch **No data connection (simulated)** on, start an emergency | "Not sent yet", Call 112 / 108 first, "No internet. Tell your contacts by SMS" with the exact text. Say: the phone opens its messages app and you must press send; the app cannot know if it was sent |
| 5:15 | Switch it off | The alert sends by itself |
| 5:30 | **Reminders** | Two fake reminders, "only work while this app is open", "Ask your doctor or pharmacist what to do." |
| 5:50 | Close | What is real and what is not (README "Known limits") |

If something goes wrong: **Reset demo** (also clears the in-memory trend, notifications and pending items), and switch **Server errors (simulated)** off.

## Phase 7: joint demo with the hospital portal (5 minutes)

Two windows: the patient phone view and the hospital desk (Puneet's portal). Start the mock with `HOSPITAL_MODE=manual DEMO_SPEED=5`. The minute-by-minute table, what to say, and what to do if something fails are in `docs/JOINT_REHEARSAL.md`. Say clearly: no real hospital or ambulance is contacted; the patient app says "notification sent" until the desk dispatches.
