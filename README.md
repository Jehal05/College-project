# HealthTwin AI - Patient App (Phase 2)

Simulated emergency-response prototype for a college project. **Not a medical device. It never diagnoses.**
Every screen shows: "Simulated event. Not a medical diagnosis."

Phase 1 is the foundation (login, profile, live vitals). Phase 2 adds the core emergency flow: symptom checklist,
emergency screen with a 10-second countdown (alarm, vibration, cancel), SOS with location, and a simulated
hospital/ambulance response arriving live over the WebSocket.

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
  src/screens/      Login, Home, Profile, NotFound, Symptoms, Emergency, Cancelled, DemoTools
  src/components/   SimulatedBanner, StatusBar, Timeline, Countdown, ConsentToggles (shell), CallButton, EmergencyHeader,
                    InstructionsCard, SymptomGroup, ResponseCard, DemoLocationToggle,
                    VitalsCard, BottomNav, FormField, ContactsEditor, ErrorMessage
  src/services/     api.js (HTTP), socket.js (WebSocket), auth.js (token in memory + sessionStorage)
  src/hooks/        useAuth.js, useVitals.js, useEmergency.js, useCountdown.js
  src/config/       symptoms.js, instructions.json (doctor-reviewed text only), demo.js
  src/i18n/         en.json now; hi.json and gu.json are empty until Phase 4
  src/utils/        validate.js, alarm.js (beep + vibrate), activeEmergency.js (sessionStorage)
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

## What Phase 3 plugs into

| Phase 3 feature | Files it will touch |
| --- | --- |
| Consent screen UI | `components/ConsentToggles.jsx`, new screen, `routes.jsx`; Emergency.jsx already reads `consents.location` |
| Contacts manager | `components/ContactsEditor.jsx`, `screens/Profile.jsx`, `services/api.js` |
| Report upload | new screen and `services/api.js`, mock `routes.js` |
| Digital twin bar | `screens/Home.jsx`, `hooks/useVitals.js` |
| Golden-hour clock | `screens/Emergency.jsx` (new component beside `StatusBar`), `hooks/useEmergency.js` |
