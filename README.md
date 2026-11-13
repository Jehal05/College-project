# HealthTwin AI - Patient App (Phase 6)

Simulated emergency-response prototype for a college project. **Not a medical device. It never diagnoses.**
Every screen shows: "Simulated event. Not a medical diagnosis."

Phase 1 is the foundation (login, profile, live vitals). Phase 2 adds the core emergency flow: symptom checklist,
emergency screen with a 10-second countdown (alarm, vibration, cancel), SOS with location, and a simulated
hospital/ambulance response arriving live over the WebSocket.
Phase 3 adds personal data and context: a consent screen, an emergency contacts manager, report upload, a digital twin bar on Home,
a "Time since alert" clock and a "contacts notified" card on the emergency screen.
Phase 4 adds Hindi and Gujarati, voice input that only suggests symptoms, offline mode, an accessibility audit and final polish.
Phase 5 adds the QR health passport, an in-app notification bell, the API contract and test scripts for the real backend, and release work (tests, CI, deploy notes).

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
                    Consent, Contacts, Reports, Passport, PassportView (public /p/:token)
  src/components/   SimulatedBanner, StatusBar, Timeline, Countdown, ConsentToggles, Switch, ConfirmDialog, ContactForm,
                    ReportUpload, ReportList, DigitalTwinBar, GoldenHourClock, ContactsNotified, CallButton, EmergencyHeader,
                    InstructionsCard, SymptomGroup, ResponseCard, DemoLocationToggle,
                    VitalsCard, BottomNav, FormField, ContactsEditor, ErrorMessage,
                    LanguageSelect, VoiceSymptoms, OfflineBanner, OfflineNote, PendingEmergency, SkipLink, ErrorBoundary,
                    PassportQr, PassportSection, NotificationBell
  src/services/     api.js (HTTP), socket.js (WebSocket), auth.js (token in memory + sessionStorage), speech.js (Web Speech API)
  src/hooks/        useAuth.js, useVitals.js, useEmergency.js, useCountdown.js,
                    useConsents.js, useContacts.js, useReports.js, useBaseline.js,
                    useOnline.js, usePendingEmergency.js, useLanguageSync.js, useRouteFocus.js,
                    usePassport.js, useNotifications.js
  src/config/       symptoms.js, instructions.json (doctor-reviewed text only), demo.js
  src/i18n/         en.json, hi.json, gu.json (hi and gu NOT yet reviewed by native speakers)
  src/utils/        validate.js, alarm.js (beep + vibrate), activeEmergency.js (sessionStorage),
                    time.js (clock format, language-aware dates), twin.js (usual-range rule),
                    offlineCache.js (read-only saved copies), symptomMatcher.js (voice words to symptom IDs),
                    passportTime.js, notifications.js, browserAlerts.js
  tests/            unit/ (vitest) and browser/ (Playwright) tests, run-browser.mjs
  scripts/          a11y-audit.mjs (axe-core on every screen in 3 languages)
docs/               DEMO_SCRIPT, ACCESSIBILITY, TRANSLATION_REVIEW, API_CONTRACT, CLINICAL_REVIEW, DEPLOY, RELEASE_CHECKLIST
mock-server/        Express + ws, fake data in memory (see mock-server/README.md)
scripts/            contract.mjs (API contract test), integration.mjs (event check)
.github/workflows/  ci.yml
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
   Switch off `location` consent via `PATCH /patients/pat_001` and the screen says location sharing is off.
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
Phase 6 adds a "Why this alert" card, vitals trends, a safety check-in, a demo panel, an SMS fallback, medicine reminders and a shareable alert record.

## Phase 6: smarter, safer, demo-ready

- **Why this alert:** collapsed card on the emergency screen. Shows what you told us, the readings (only if vitals sharing is on) and a neutral checklist line. The rules (`mock-server/data/rules.json`, copy of Daksh's v0.1) are all pending doctor review, so no rule sentence is shown. It never says what is wrong and shows no score.
- **Vitals trend:** Home sparklines for heart rate, SpO2, blood pressure and glucose with the usual range as a band and "Within your usual range" / "Changed from your usual". Last 60 readings in memory only.
- **Safety check-in:** Profile switch (off by default) and "Simulated fall" in the demo panel. 30 second "Are you OK?" countdown; no answer starts an alert (source `FALL_CHECK` / `INACTIVITY_CHECK`) through the normal SOS path.
- **Demo panel (`/demo`):** scenarios, reset, speed 1x-20x, vitals profile, pinned values, simulated fall / offline / server error, rehearsal checklist. Only exists in builds made with `VITE_DEMO_TOOLS=true` (and `npm run dev`).
- **SMS fallback:** when an alert cannot be sent for lack of internet, `sms:` links to each contact with a fixed text that holds no health data. You must press send yourself; the app cannot know whether it was sent.
- **Medicine reminders (`/reminders`):** up to 8, stored on the mock server, in-app banner with Taken / Remind me in 10 minutes. Only works while the app is open. No dose advice.
- **Alert record (`/summary/:id`):** timeline, durations, what was shared, contacts notified (simulated), symptoms and vitals at alert; Share, Copy, Download, Print/Save as PDF. Also under Profile > Past alerts.
- **New endpoints:** `GET /emergencies/:id/reasons`, `GET /patients/:id/emergencies[/:eid/summary]`, `GET/PUT /patients/:id/preferences`, reminders (`/patients/:id/reminders...`), `POST /demo/vitals`, `POST /demo/speed`, `GET /demo/state` (see `docs/API_CONTRACT.md`).
- **Honest limits:** no real fall detection (the web app does not use motion sensors and cannot run when closed); reminders only work while the app is open; SMS needs the user to tap send; wearable data is simulated; the rules engine is a mock port, not the real backend; nothing has been reviewed by a doctor or by native Hindi/Gujarati speakers.
- **Tests:** 74 unit tests, 10 browser test files (275 checks), `npm run contract` 20 checks, `npm run integration`, `npm run audit` (19 screens x 3 languages).

### Manual test checklist (Phase 6)

1. `/demo`: pick a vitals profile, go Home: the sparkline moves and the label changes within a few seconds.
2. Run a scenario, open "Why this alert": no medical sentence, no score.
3. Press "Simulated fall": press "I'm OK"; run it again and wait 30 seconds: an alert starts; Cancel works.
4. Switch "No data connection" on and start an emergency: SMS card, tel:112 first, no health data in the text.
5. Reminders: add one for the next minute (keep the app open): banner appears.
6. After an alert ends: open the record, Copy, Download.

## Phase 5: health passport, integration and release

- **Health passport:** Home or Profile > "Health passport (QR)". Choose 1 hour, 24 hours (default) or 7 days and press Create. The QR holds **only a link** `<app>/p/<random token>`, never personal or health data. People scanning it see a public, read-only page (no login, 3 languages, starts with Call 112 / 108) with the name, age and blood group, and, only if the **Medical history** consent is on, allergies, conditions, medicines and emergency contacts. It says "Prepared by the patient. Not verified by a doctor." The patient can download the QR as PNG, print it, revoke it, and sees "Opened N times" (times only, no IP or device data). Expired or revoked links answer 410 and show a plain message.
- **Notification bell** on Home: hospital acknowledged, ambulance dispatched, contacts notified (simulated), passport opened. Kept in memory for the session, no medical detail. Optional **browser alerts** (off by default, opt-in switch in the bell panel) pop up only when the tab is hidden.
- **Real backend:** `docs/API_CONTRACT.md` is the spec. `npm run contract -- <base-url>` runs 16 checks against any server (mock or real) and prints PASS/FAIL per endpoint; `npm run integration` plays one emergency and prints the live events other apps can copy. Set `VITE_API_URL` (and `VITE_APP_URL` for the QR link). A 401 signs the person out with a message (never on the emergency screens), a 5xx shows a retry, non-emergency calls give up after 10 s.
- **Tests:** `npm test` runs 28 unit tests and 7 browser test files. The browser tests build the app and start their own mock server and preview server on ports 4100, 5273 and 5274, so they do not disturb your running servers. Needs Chrome (`CHROME_PATH`, default `/usr/bin/google-chrome`). Run one file with `npm run test:browser -w patient-app -- passport`. `npm run audit` runs axe-core on every screen in three languages.
- **Release:** GitHub Actions workflow (`.github/workflows/ci.yml`), a Content-Security-Policy added to the production build, Netlify files and `docs/DEPLOY.md`, scores and open items in `docs/RELEASE_CHECKLIST.md`, and the doctor sign-off process in `docs/CLINICAL_REVIEW.md`.

### Manual test checklist (Phase 5)

1. **Create:** Home > Health passport (QR) > Create passport. A QR and "Valid for 24 hours" appear. Reload the page: the same QR is still there.
2. **Scan:** scan it with a phone camera (same network, use your computer's address in `VITE_APP_URL`) or press "Preview the responder page". No login is asked. The first thing on the page is the Call 112 / 108 button.
3. **Consent:** turn Medical history off, reload the responder page: only name, age and blood group remain. Turn it on again.
4. **Opened:** the passport screen says "Opened N times" with the times. Home's bell lists "Passport opened".
5. **Revoke and expiry:** Revoke now (confirm). Reload the responder page: "This passport is no longer available." Create a 1 hour passport and run `POST /demo/passport/expire`: same result.
6. **Languages:** switch the responder page to Hindi and Gujarati with the language selector at its top.
7. **Errors:** `POST /demo/fail {"mode":"server"}` then open Profile: friendly message with Try again; `"expired"`: signed out with "Your session ended"; `"off"` restores. The call button stays available.
8. **Bell and alerts:** run a `/demo` scenario: three notifications appear. In the bell panel switch Browser alerts on, switch to another tab, run another scenario: a pop-up appears.
9. **Print:** the Print button prints only the QR code.

## Known limits (what is still simulated or unfinished)

- **No real backend.** The mock server keeps everything in memory. The real backend (Daksh) must implement `docs/API_CONTRACT.md` and pass `npm run contract`; until then login, data, hospitals and the passport are simulated. The mock has no real security (fake tokens, open passport links).
- **Passport:** anyone holding the link can read it until it expires or is revoked (that is how a QR works); the data is what the patient typed and is not verified by a doctor. The link is a secret token, so print it only where you are happy for it to be seen. There is no rate limiting or audit trail beyond the open times.
- **No real notifications:** contacts, hospitals and ambulances are never really messaged. Browser alerts are local pop-ups only (no push when the app is closed).
- **Doctor review:** condition-specific guidance is hidden until a doctor signs it off (`docs/CLINICAL_REVIEW.md`); only 3 general lines are shown. Nobody has reviewed it yet.
- **Translations:** Hindi and Gujarati text and the voice keyword list have not been checked by native speakers (`docs/TRANSLATION_REVIEW.md`).
- **Real-world testing:** not tested with a real screen reader, on real phones, with real GPS or with a real microphone in Hindi or Gujarati (the tests fake the speech engine). Voice depends on the browser (best in Chrome).
- **Offline:** read-only saved copies only; changes made offline are not queued. The QR image can be shown from memory offline but the link needs internet.
- **Not a medical device.** Never use it for a real emergency: call 112 / 108.
