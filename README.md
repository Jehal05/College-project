# HealthTwin AI - Patient App (Phase 4)

Simulated emergency-response prototype for a college project. **Not a medical device. It never diagnoses.**
Every screen shows: "Simulated event. Not a medical diagnosis."

Phase 1 is the foundation (login, profile, live vitals). Phase 2 adds the core emergency flow: symptom checklist,
emergency screen with a 10-second countdown (alarm, vibration, cancel), SOS with location, and a simulated
hospital/ambulance response arriving live over the WebSocket.
Phase 3 adds personal data and context: a consent screen, an emergency contacts manager, report upload, a digital twin bar on Home,
a "Time since alert" clock and a "contacts notified" card on the emergency screen.
Phase 4 adds Hindi and Gujarati, voice input that only suggests symptoms, offline mode, an accessibility audit and final polish.

## Setup

Requires Node.js 18 or newer.

```
npm install        # installs both apps (npm workspaces)
npm run dev:all    # starts the patient app (5173) and the mock server (4000)
```

Or run them separately: `npm run dev` (app) and `npm run mock` (mock server).
Open http://localhost:5173 and sign in with `patient@demo.test` / `demo1234`.

## Folder layout

```
patient-app/        React 18 + Vite + Tailwind + i18next + PWA
  src/screens/      Login, Home, Profile, NotFound, Symptoms, Emergency, Cancelled, DemoTools,
                    Consent, Contacts, Reports
  src/components/   SimulatedBanner, StatusBar, Timeline, Countdown, ConsentToggles, Switch, ConfirmDialog, ContactForm,
                    ReportUpload, ReportList, DigitalTwinBar, GoldenHourClock, ContactsNotified, CallButton, EmergencyHeader,
                    InstructionsCard, SymptomGroup, ResponseCard, DemoLocationToggle,
                    VitalsCard, BottomNav, FormField, ContactsEditor, ErrorMessage,
                    LanguageSelect, VoiceSymptoms, OfflineBanner, OfflineNote, PendingEmergency, SkipLink, ErrorBoundary
  src/services/     api.js (HTTP), socket.js (WebSocket), auth.js (token in memory + sessionStorage), speech.js (Web Speech API)
  src/hooks/        useAuth.js, useVitals.js, useEmergency.js, useCountdown.js,
                    useConsents.js, useContacts.js, useReports.js, useBaseline.js,
                    useOnline.js, usePendingEmergency.js, useLanguageSync.js, useRouteFocus.js
  src/config/       symptoms.js, instructions.json (doctor-reviewed text only), demo.js
  src/i18n/         en.json, hi.json, gu.json (hi and gu NOT yet reviewed by native speakers)
  src/utils/        validate.js, alarm.js (beep + vibrate), activeEmergency.js (sessionStorage),
                    time.js (clock format, language-aware dates), twin.js (usual-range rule),
                    offlineCache.js (read-only saved copies), symptomMatcher.js (voice words to symptom IDs)
  scripts/          a11y-audit.mjs (axe-core on every screen in 3 languages)
docs/               DEMO_SCRIPT.md, ACCESSIBILITY.md, TRANSLATION_REVIEW.md
mock-server/        Express + ws, fake data in memory (see mock-server/README.md)
```

## Switching from the mock API to the real backend

Copy `patient-app/.env.example` to `patient-app/.env` and change one line:

```
VITE_API_URL=http://localhost:8000
```

The WebSocket address is built from it automatically (`http` becomes `ws`, plus `/ws`).
Only if the live events live at a different address, also set `VITE_WS_URL`.
Restart `npm run dev`. The real backend must keep the same URLs and JSON shapes as the mock API.

## How teammates call the mock API

```
curl -X POST http://localhost:4000/auth/login -H "Content-Type: application/json" \
  -d '{"email":"staff@demo.test","password":"demo1234"}'
# copy the token from the answer, then:
curl http://localhost:4000/hospitals -H "Authorization: Bearer <token>"
```

Live events: connect a WebSocket to `ws://localhost:4000/ws`. Event shape:
`{ type, emergency_id, state, timestamp, payload }`.

## Manual test checklist

1. **Login:** sign in as `patient@demo.test` / `demo1234`; you land on Home.
2. **Wrong password:** a clear message appears and you stay on the login screen.
3. **Profile edit:** change the name, save, reload the page, and the new name is still there.
4. **Live vitals:** Home shows heart rate 70-76 and SpO2 97-99 changing every second.
5. **Narrow screen:** in browser dev tools set the width to 360 px; nothing overflows and buttons are easy to tap.
6. **Keyboard:** use only Tab, Shift+Tab, Enter and Space; every control is reachable with a visible focus ring.

## Phase 2: emergency flow

Demo run (fast): `DEMO_SPEED=10 npm run mock` in one terminal and `npm run dev` in another, then open `/demo`
and press a scenario button. Full details of the endpoints, events, timing table and symptom IDs are in
`mock-server/README.md`. New endpoints: `POST /emergencies/:id/sos`, `POST /demo/scenario`, `POST /demo/reset`.
New events: `emergency.created`, `emergency.sos_sent`, `hospital.alerted`, `hospital.acknowledged`,
`ambulance.dispatched`, `ambulance.location`, `emergency.arrived`, `emergency.handover_done`, `emergency.cancelled`.

Safety rules in the code: "Call 112 / 108" is a plain `tel:112` link that never waits for the server; only three general
instruction lines are shown; condition-specific lines stay hidden until a doctor sets `reviewed: true` in
`src/config/instructions.json`; "Hospital acknowledged" and "Ambulance dispatched" appear only when the event arrives.

### Manual test checklist (Phase 2)

1. **Home:** a large red "Emergency help" button is reachable with Tab and tap.
2. **Symptoms:** pick each category; ticks reset when you switch; "Call 112 / 108" is at the top.
3. **Disabled state:** "Get help now" stays disabled until one symptom is ticked.
4. **Creation speed:** pressing it opens the red emergency screen in under a second.
5. **Countdown:** the number counts 10 to 0 with a beep and vibration each second (on a phone; needs a tap first).
6. **Cancel:** "I'm OK, cancel" shows "Alert cancelled" and Home has no active-emergency banner.
7. **Send now / location:** "Send now" skips the wait. Deny location, or turn on "Use demo location": label says "Using demo location".
   Switch off `location` consent via `PATCH /patients/HT-1001` and the screen says location sharing is off.
8. **Live progress:** with `DEMO_SPEED=1` the status moves to Handover done after about 50 seconds; the timeline fills in.
9. **Reload:** refresh mid-emergency; the same state returns, and Home shows "Return to it" until it ends.
10. **/demo:** run Heart, Stroke, Diabetic and Asthma scenarios, then Reset.

## Phase 3: personal data and context

New endpoints (details in `mock-server/README.md`): `GET/PUT /patients/:id/consents`, `GET/POST /patients/:id/contacts`,
`PUT/DELETE /patients/:id/contacts/:contactId`, `GET/POST /patients/:id/reports`, `GET .../reports/:reportId/file`,
`DELETE .../reports/:reportId`, `GET /patients/:id/baseline`. New event: `contacts.notified` (names only, no phone numbers).
The live `vitals.update` payload now also carries `bp` and `glucose`.

Privacy and honesty rules in the code: nothing is shared unless its switch is on, and changes apply to the next emergency;
reports are fake demo files only; the twin bar says "Within your usual range" or "Different from your usual range" and never shows a
score or the words normal/abnormal/risk/danger; the clock only measures time ("Time since alert") and makes no medical claim.

### Manual test checklist (Phase 3)

1. **Consent:** Profile > Consent settings. Turn Reports off: "Saved" appears and the change shows under Recent changes. Reload: it stays off.
2. **Rollback:** stop the mock server, flip a switch: the switch goes back and "Retry" appears. Start the server and press Retry.
3. **Consent changes the flow:** turn Location off, run an emergency and press Send now: the screen says location sharing is off. Turn it back on.
4. **Contacts:** add a contact, edit it, make another primary, delete one (in-page confirm). Add until 5: the Add button is disabled with a message.
5. **Phone validation:** try `12ab` and a blank name: clear error messages. `+91 00000 00003` is accepted.
6. **Reports upload:** choose a `.txt` file and then a file over 2 MB: both are refused with a message before upload. Upload a small PDF.
7. **Share indicator and delete:** the report says "Will be shared"; turn Reports consent off and it says "Not shared". Open it, then delete it (confirm).
8. **Twin bar:** Home shows four vitals with their usual ranges and "Within your usual range". (Change `data/baseline.json` to see "Different from your usual range".)
9. **Clock and contacts card:** run `/demo` Heart. "Time since alert" counts up, fills its milestones, freezes at handover and survives a reload.
   After about 2 seconds "Your contacts were notified (simulated)" lists the contacts. Delete all contacts and run again: it says you have no contacts.
10. **Reset:** `/demo` > Reset demo restores 2 contacts, all consents on, no reports and an empty change log.

## Phase 4: reach, resilience and polish

- **Languages:** English, Hindi, Gujarati. Pick on Login or Profile; it is saved on the patient record (`PATCH language`) and on the device (`ht.lang`), and sets `<html lang>`. Dates and numbers follow the language.
- **Voice input:** the mic button on Symptoms uses the browser's Web Speech API (en-IN, hi-IN, gu-IN). It only **suggests** symptoms from a keyword list; nothing is ticked until the person presses "Tick them". If it is blocked or unsupported the screen says so and the checklist works as before. Speech goes to the browser vendor's service, not to our server.
- **Offline:** a service worker keeps the app shell. When offline a banner appears, "Call 112 / 108" still works, and screens show read-only saved copies (kept in `sessionStorage`, cleared at sign-out) with edits switched off and the reason shown. An emergency started offline is kept as **"Not sent yet"** (`ht.pending`); it is sent automatically when the connection returns if it is under 10 minutes old, otherwise the person is asked. The app never says "sent" until the server confirms.
- **Accessibility:** skip link, focus moves to the page heading on navigation, 44/56 px targets, reduced motion, quiet live regions. Run `CHROME_PATH=/usr/bin/google-chrome npm run audit` (needs `npm run build && npm run preview` and the mock server). Details: `docs/ACCESSIBILITY.md`.
- **Polish:** a crash screen (ErrorBoundary) that keeps the `tel:112` button, an app version line on `/demo`.

### Manual test checklist (Phase 4)

1. **Language:** switch to हिन्दी and ગુજરાતી on Profile; every screen changes; reload keeps it; sign out and in on the same device keeps it.
2. **Voice:** Symptoms > "Speak your symptoms" (Chrome, allow the microphone), say "chest pain and sweating". A suggestion appears; "No thanks" ticks nothing; "Tick them" ticks the matches.
3. **Voice failure:** block the microphone; a plain message appears and the checklist still works.
4. **Offline:** dev tools > Network > Offline. Banner shows, "Call 112 / 108" is present, Profile is read-only with "Saved copy".
5. **Offline emergency:** start one offline: "Not sent yet". Go online: it sends itself and opens the emergency screen.
6. **Keyboard only:** Tab from the page top reaches "Skip to main content"; the whole emergency flow works without a mouse.
7. **200% zoom:** no sideways scrolling.
8. **Crash screen (dev only):** open `/demo?crash=1` with `npm run dev`; the crash screen shows the call button and the simulated banner.
9. **Walkthrough:** follow `docs/DEMO_SCRIPT.md` once from start to end.

## Known limits (what is still simulated or unfinished)

- No real backend: the mock server keeps everything in memory and the hospital, ambulance and contacts are simulated.
- QR health passport is not built.
- No real SMS, push or call notifications to contacts or hospitals.
- Condition-specific guidance is hidden until a doctor reviews it (`reviewed: true`); only 3 general lines are shown.
- Hindi and Gujarati text and the voice keyword list have not been checked by native speakers (`docs/TRANSLATION_REVIEW.md`).
- Not tested with a real screen reader or on real phones; voice depends on the browser (best in Chrome).
- Offline mode keeps read-only copies only; changes made offline are not queued.
