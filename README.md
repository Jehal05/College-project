# HealthTwin AI - Patient App (Phase 1)

Simulated emergency-response prototype for a college project. **Not a medical device. It never diagnoses.**
Every screen shows: "Simulated event. Not a medical diagnosis."

Phase 1 contains the patient app foundation (login, profile, live vitals, shared components) and a mock API
that the whole team can build against.

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
  src/screens/      Login, Home, Profile, NotFound
  src/components/   SimulatedBanner, StatusBar, Timeline, Countdown (shell), ConsentToggles (shell),
                    VitalsCard, BottomNav, FormField, ContactsEditor, ErrorMessage
  src/services/     api.js (HTTP), socket.js (WebSocket), auth.js (token in memory + sessionStorage)
  src/hooks/        useAuth.js, useVitals.js
  src/i18n/         en.json now; hi.json and gu.json are empty until Phase 4
  src/utils/        validate.js (profile form rules)
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

## What Phase 2 plugs into

| Phase 2 feature | Files it will touch |
| --- | --- |
| Symptom checklist (3) | new `screens/Symptoms.jsx`, `routes.jsx`, `BottomNav.jsx`, `i18n/en.json`, `services/api.js` (POST /emergencies) |
| Emergency screen (5) | new `screens/Emergency.jsx`, `StatusBar.jsx`, `Timeline.jsx`, `services/socket.js` (event handling) |
| SOS with GPS (6) | new `services/geo.js`, `services/api.js` |
| Cancel flow (16) | `components/Countdown.jsx` (real timer), `services/api.js` (cancel), `Emergency.jsx` |
