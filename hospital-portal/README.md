# HealthTwin AI – Hospital Portal (Phases 1 and 2)

Puneet's section: hospital dashboard, map and ambulance.
**Simulated prototype. No real hospital, ambulance or emergency service is contacted.**

## Run it

```bash
cd hospital-portal
npm install
npm run dev        # opens on http://localhost:5174
npm test           # unit tests for the state machine and the store (Node 22 or newer)
```

Log in with `staff@demo` or `admin@demo`, password `demo123` (mock mode only).

## Mock mode and the real backend

`.env` controls it (copy `.env.example` if `.env` is missing):

| Setting | Meaning |
|---|---|
| `VITE_USE_MOCK=true` | Uses the fake JSON in `src/data/`. No backend needed. |
| `VITE_USE_MOCK=false` | Calls Daksh's backend at `VITE_API_BASE_URL` and `VITE_WS_URL`. |

Restart `npm run dev` after changing `.env`.

## What is in Phase 1

| Task | Where |
|---|---|
| Routing, login, role-protected routes | `src/App.jsx`, `src/pages/Login.jsx`, `src/components/ProtectedRoute.jsx`, `src/components/AuthProvider.jsx` |
| API client with mock toggle | `src/services/api.js`, `src/services/auth.js` |
| WebSocket stub (connect, subscribe, unsubscribe, emitMock) | `src/services/socket.js` |
| Team contract (states, types, severity, events) | `src/services/contract.js` |
| Seed data: 5 sample hospitals | `src/data/hospitals.json` |
| Ranking config for Daksh | `src/data/ranking-config.json` |
| Feature #7 Nearby hospital map | `src/pages/Map.jsx`, `src/services/geo.js`, `src/components/HospitalDetails.jsx` |
| Feature #9 Dashboard shell | `src/pages/Dashboard.jsx`, `src/components/AlertCard.jsx`, `src/data/mock-alerts.json` |

Placeholders for later phases: `Fleet`, `Analytics`, `Admin` pages; `Checklist`, `RankingTable`
components; `sim/ambulance-route.js`; `data/aed.json`; `data/routes.json`.

## Test checklist

- [ ] Opening `/dashboard` while logged out sends you to `/login`
- [ ] `staff@demo` can open Dashboard, Map, Fleet, Analytics; `/admin` shows "Access denied"
- [ ] `admin@demo` can open `/admin`
- [ ] Map shows 5 hospital markers and the red patient marker
- [ ] Clicking a marker shows name, distance, simulated ETA, capabilities, availability
- [ ] Choosing "Stroke" turns the nearest hospital (Sabarmati, no stroke unit) grey
- [ ] Distances look sensible (about 1 km to 10 km) and ETA carries the "Simulated ETA" label
- [ ] Dashboard shows 3 mock alerts; clicking one fills the detail panel
- [ ] Top bar shows "Simulated event. Not a medical diagnosis."
- [ ] No errors in the browser console

## What is in Phase 2 (core live emergency flow, all Tier 1)

| Task | Where |
|---|---|
| Shared emergency store (`useEmergencies`) | `src/components/EmergencyProvider.jsx`, `src/services/emergencyReducer.js` |
| Mock event engine (pretend backend in the browser) | `src/services/mockBackend.js` |
| Feature #9 Live dashboard: sound, flash, connection badge, patient mini map | `src/pages/Dashboard.jsx`, `src/components/AlertCard.jsx`, `EmergencyDetail.jsx`, `ConnectionBadge.jsx`, `PatientMiniMap.jsx`, `src/services/sound.js` |
| Feature #10 Acknowledge and status buttons | `src/services/stateMachine.js`, `src/components/ActionButtons.jsx` |
| Feature #19 Response timeline (shared with the patient app) | `src/components/Timeline.jsx` |
| Unit tests | `src/services/stateMachine.test.js`, `src/services/emergencyReducer.test.js` |

Changed from Phase 1: `api.js` (emergency calls go through the mock backend in mock mode),
`socket.js` (connection status and reconnect), `auth.js` and new `session.js`, `config.js`
(shared settings), `AuthProvider.jsx` (connects the WebSocket on login), `contract.js`
(state labels, event names per state), `Map.jsx` (patient icon moved to `mapIcons.js`).

### How the state buttons work

`SOS_SENT → HOSPITAL_ACKNOWLEDGED → AMBULANCE_DISPATCHED → EN_ROUTE → ARRIVED → HANDOVER_DONE`

- Only the valid next button is enabled. The others show a tooltip saying why.
- `CANCELLED` and `HANDOVER_DONE` are final. `ESCALATED` can still be acknowledged.
- There is a fifth button, **En route**, because the contract has an `EN_ROUTE` state between
  Dispatch and Arrived. In Phase 4 the ambulance simulator will set it automatically.
- Dispatch asks for confirmation.

### For Jehal: reusing the timeline

Copy `src/components/Timeline.jsx`. It needs only React and Tailwind classes.

```jsx
<Timeline events={emergency.status_events} createdAt={emergency.created_at} />
// events: [{ state, timestamp, actor }]
```

### Phase 2 test checklist

- [ ] "+ Simulate new alert" adds a card at the top in under 1 second, with a sound and a flash
- [ ] At each state only the valid next button is enabled
- [ ] Each click updates the card, the detail panel and the timeline
- [ ] Dispatch asks for confirmation; "Not yet" changes nothing
- [ ] "Mock: patient presses I'm OK" cancels; the card shows CANCELLED and moves down
- [ ] A cancelled emergency cannot be acknowledged or dispatched
- [ ] The cancel button disappears after Dispatch
- [ ] The timeline shows every stage with clock time, seconds since the alert, and who did it
- [ ] The counter stops at Handed over or Cancelled
- [ ] Two alerts at once stay independent
- [ ] With the backend switched off (`VITE_USE_MOCK=false`), a click shows a red error message
- [ ] Full heart attack scenario runs from new alert to Handed over

### Fields to confirm with Daksh

1. **List endpoint.** The contract has `GET /emergencies/{id}` but no list. The dashboard calls
   `GET /emergencies?status=active` and expects an array of emergencies.
2. **Emergency fields.** `emergency_id, patient_id, type, severity, state, symptoms[], vitals{heart_rate, spo2, bp}, location{lat, lng, accuracy_m}, created_at`.
3. **Timeline field.** `GET /emergencies/{id}` returns `status_events: [{ state, timestamp, actor }]`
   (`timeline` is also accepted).
4. **WebSocket message.** `{ event, emergency_id, state, timestamp, payload }`. Is the name field called `event`?
5. **`emergency.created` payload.** The full emergency fields from point 2.
6. **Who clicked.** State-change events carry `payload.actor` (staff name).
7. **Action responses.** `POST .../ack`, `/dispatch`, `/status` return `{ state, timestamp, actor }`.
   `/dispatch` body is `{ ambulance_id }`; `/status` body is `{ state }`.
8. **EN_ROUTE.** No event exists for it, so the portal expects `ambulance.location` with `state: "EN_ROUTE"`.
9. **Invalid steps.** The backend rejects them (for example 409), including Dispatch after Cancel.
10. **Cancel window.** The portal assumes the patient can cancel only before Dispatch.
11. **WebSocket login.** The token is sent as `?token=...` on the WebSocket URL.

## Suggested Git branches and commits

| Branch | Commit message |
|---|---|
| `feat-00-portal-setup` | `feat-00: scaffold hospital-portal with Vite, Tailwind, router and protected routes` |
| `feat-00-seed-data` | `feat-00: add 5 sample hospitals and ranking config` |
| `feat-07-hospital-map` | `feat-07: nearby hospital map with distance, simulated ETA and capability badges` |
| `feat-09-dashboard-shell` | `feat-09: dashboard shell with alert queue, AlertCard and detail panel (mock data)` |
| `feat-09-live-dashboard` | `feat-09: live alert queue with shared store, mock event engine, sound and connection badge` |
| `feat-10-ack-status` | `feat-10: state machine and Acknowledge, Dispatch, En route, Arrived, Handed over buttons` |
| `feat-19-response-timeline` | `feat-19: response timeline with elapsed times and live counter` |

## Notes

- Hospital names, addresses and phone numbers are invented samples around Ahmedabad.
  Change `DEMO_LOCATION` in `src/services/geo.js` and `src/data/hospitals.json` for another city.
- Travel time is straight-line distance ÷ 40 km/h. It is a simulation, not a route.
- The WebSocket message shape assumed is `{ event, emergency_id, state, timestamp, payload }`.
  Confirm the `event` field name with Daksh.
- The map tiles load from OpenStreetMap, so the map needs internet.
- Browsers allow sound only after a click on the page. After a reload, click once before expecting the alert sound.
- Mock data lives in memory, so a page reload resets the mock alerts.
- Symptom text in the mock data is sample content. A doctor must review real wording.
