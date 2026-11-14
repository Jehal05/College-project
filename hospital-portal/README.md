# HealthTwin AI – Hospital Portal (Phases 1 to 5)

Puneet's section: hospital dashboard, map and ambulance.
**Simulated prototype. No real hospital, ambulance or emergency service is contacted.**

## 5-minute start

1. Install Node 22 or newer (https://nodejs.org).
2. In PowerShell: `cd hospital-portal` then `.\scripts\start-demo.ps1` (it installs packages, starts the portal and opens the browser).
3. Log in with `staff@demo` and `demo123`, then follow the 3-minute walk-through in **[docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md)**.

Everything is a simulated sample. For the longer version with Jehal's mock server, see the same file.

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

| `VITE_PORTAL_SIMULATES_AMBULANCE` | `auto` (default), `true` or `false`. Who moves the (simulated) ambulance on the map. See below. |
| `VITE_WS_AUTH` | `query` (default, token in the WebSocket address) or `message` (safer for a real backend: token sent as the first message, needs Daksh's OK). |
| `VITE_MOCK_SEED` | Optional number (mock mode). Makes "Simulate new alert" repeat the same cases in the same order every run. Empty = random. |

Restart `npm run dev` after changing `.env`.

### Who moves the ambulance?

Everything about the ambulance is **simulated**. Only one side should move it, or the map jumps between two routes.

| Setting | Mock mode | Real mode |
|---|---|---|
| `auto` | the portal moves it | the portal waits 3 s after Dispatch; if the backend sends `ambulance.location`, the backend moves it and the portal stays quiet; if not, the portal moves it. If a backend position arrives later, the portal stops its own trip. |
| `true` | the portal moves it | the portal moves it |
| `false` | nobody (frozen) | only the backend moves it |

The screen always says which: "Ambulance movement: simulated by the portal" or "… by the backend". The portal ignores the echo of its own positions, so it does not mistake them for the backend.

### Pre-arrival readiness card

Each open alert shows a card with the ambulance ETA (simulated), what the patient app already shared (symptoms, vitals, location, or **Not shared**), checklist progress and the assigned team. The **Open passport** button calls `GET /passport/{patient_id}` **once per click** (the backend records every view; the portal never opens it by itself). It shows only what the patient agreed to share, and plain messages for 401, 403 and 404. Mock mode shows a clearly labelled sample.

### Languages (English, Hindi, Gujarati)
Pick the language in the top bar. It is saved in the browser and sets `<html lang>`. Texts live in `src/i18n/` (`en.js` is the source; `hi.js` and `gu.js` must have the same keys, checked by a unit test). Missing text falls back to English. Most screens are translated (symptom words, hospital names and backend text stay English), and the translations are **pending native-speaker review**: see `docs/TRANSLATION_REVIEW.md`. The word "Simulated" and all symptom words stay English.

### Connection lost banner
If the live connection is down for 10 seconds, a red banner (`role="alert"`) says "Connection lost at HH:MM:SS. New alerts may be missing." with a Reload button. When the connection comes back it shows "Reconnected. Reloaded N alerts." for 5 seconds. Short drops (under 10 seconds) show nothing, and mock mode never shows it. The timing is a pure function in `src/services/offlineBanner.js` with unit tests. No new backend call: Reload uses the normal alert list call.

### Handover and desk notes

Staff can add a **handover note** (for the next shift) or a **desk note** (500 characters at most, with a counter). They appear in the detail, the timeline, the post-event report ("Shift handover") and the text report. They use `POST /emergencies/{id}/notes` with kind `handover` or `desk`. If the backend has no such endpoint, the note stays on this screen and is marked "saved on this screen only".

### Known limitations (honest list)

- **The login token is kept in the browser.** It is in `sessionStorage` (gone when the tab is closed), not `localStorage`. A script running on the page could still read it. This is a prototype; a real product would use short-lived tokens in an HttpOnly cookie.
- **The token is sent in the WebSocket address** (`ws://…/ws?token=…`) by default. Addresses can end up in server logs. **For a real backend, `VITE_WS_AUTH=message` is the safer setting**: it sends the token as the first message instead. The backend must support that (question for Daksh in [docs/PROPOSED_ENDPOINTS_FOR_DAKSH.md](docs/PROPOSED_ENDPOINTS_FOR_DAKSH.md)).
- **sessionStorage is per tab.** A new tab starts logged out. The "Open the crew view" link keeps the login because it opens from the portal. Opening `/crew/…` by typing the address asks for a login.
- Everything medical, hospital and ambulance related is a simulated sample. This is not a real emergency system.

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

Placeholders for later phases: `Fleet`, `Analytics`, `Admin` pages; `sim/ambulance-route.js`; `data/aed.json`; `data/routes.json`.

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

## What is in Phase 3 (smart hospital selection, all Tier 2)

| Task | Where |
|---|---|
| Feature #15 Hospital ranking | `src/services/ranking.js`, `src/components/RankingTable.jsx`, `src/components/useRanking.js`, `src/data/ranking-config.json` |
| Feature #42 Bed and ICU availability | `src/components/AvailabilityForm.jsx`, `src/components/HospitalProvider.jsx` (shared hospital store) |
| Feature #43 Auto-escalation | `src/services/escalation.js`, `src/components/EscalationCountdown.jsx`, scheduler in `src/services/mockBackend.js` |
| Feature #59 Priority alert queue | `sortForQueue` and `countUnread` in `src/services/emergencyReducer.js`, `AlertCard.jsx`, `Dashboard.jsx` |
| Feature #26 Pre-arrival checklist | `src/components/Checklist.jsx`, `src/data/checklists.json` |
| Unit tests | `src/services/ranking.test.js` (ranking and escalation), `emergencyReducer.test.js` |

Changed from Phase 2: `mockBackend.js` (hospitals, escalation timer, checklist ticks), `api.js`
(hospital calls go through the mock backend; new `setChecklistItem`, `mockEscalate`),
`emergencyReducer.js` (escalation events, priority order, read marks), `EmergencyProvider.jsx`
(sound only for EMERGENCY, `markRead`, `tick`), `EmergencyDetail.jsx`, `AlertCard.jsx`, `Timeline.jsx`
(optional `note` line), `Map.jsx` (reads the hospital store, shows the ranking, highlights the top
hospital), `auth.js` (demo accounts now belong to hospital H2).

### How the ranking works

1. **Filter.** Unverified hospitals and hospitals without a required capability are ruled out
   and listed with the reason. Distance can never bring them back.
2. **Score** each remaining hospital out of 100. The weights are in `ranking-config.json`.

| Part | Weight | Scores 100 when |
|---|---|---|
| Capability | 0.5 | every required unit is marked ready (cath lab ready, stroke unit ready, ICU bed free) |
| Travel time | 0.3 | the simulated ETA is 0 minutes; scores 0 at 30 minutes or more |
| Availability | 0.2 | 10 or more beds free and 3 or more ICU beds free (half each) |

The points shown on each row add up to the total.

### How escalation works

- An alert in `SOS_SENT` or `ESCALATED` shows "Escalates in N s" (30 seconds, from `ranking-config.json`).
- On `hospital.escalated` the alert becomes `ESCALATED`, an orange banner names the next hospital,
  the timeline gets an entry, and the countdown restarts for that hospital.
- The fallback list is the ranking with a status on each row: Alerted now, Next if no answer,
  After that, Alerted · no answer, Responding, Not needed.
- When the list is used up, the last hospital keeps the alert.
- In mock mode a timer in `mockBackend.js` plays the part of Daksh's scheduler.
  "Mock: escalate now" skips the wait.

### Phase 3 test checklist

- [ ] A stroke alert ranks a stroke-unit hospital first; the nearest hospital is under "Ruled out" with "No stroke unit"
- [ ] The three point values on a row add up to its total
- [ ] "Update beds and ICU": set beds and ICU to 0, untick "Stroke unit ready", save. The stroke ranking changes at once
- [ ] Negative or decimal bed numbers cannot be saved
- [ ] Leave an alert alone for 30 seconds: it escalates, the banner and timeline show it
- [ ] An escalated alert can still be acknowledged, and the countdown then stops
- [ ] "+ Simulate new alert" three times: alerts sort by severity, then oldest first
- [ ] The sound plays for EMERGENCY alerts only (heart, stroke), not for URGENT ones
- [ ] Unopened alerts show a blue dot and the header shows the unread count
- [ ] The checklist changes with the emergency type; ticks stay when you come back; cancelled alerts are read-only
- [ ] On the Map page, choosing a type shows the ranking and a yellow ring on the top hospital

### Running with the real backend (`VITE_USE_MOCK=false`)

1. Set `VITE_USE_MOCK=false`, `VITE_API_BASE_URL` and `VITE_WS_URL` in `.env`, then restart `npm run dev`.
2. Log in with a real staff account. The badge should say **Live**.
3. Dashboard: the queue loads, and the hospital name in the top bar is your hospital.
4. Map: all hospitals appear. If none do, check `GET /hospitals`.
5. Trigger an emergency from the patient app: the card appears in under 1 second.
6. Save availability, then reload the page: the numbers must still be there.
7. Leave an alert unacknowledged for 30 seconds: the backend must send `hospital.escalated`.
8. Tick a checklist item, reload: the tick must still be there.

Still mock-only (nothing to switch): the "Simulate new alert", "patient presses I'm OK" and
"escalate now" buttons (hidden with the real backend), the demo logins, and
`src/data/hospitals.json` (used only as a fallback when `GET /hospitals` fails).
Not from the backend in either mode: `checklists.json` and `ranking-config.json` are files in the portal.

### Fields to confirm with Daksh for Phase 3

1. **Who ranks?** The portal ranks for display. If the backend chooses the hospital to alert, both
   must use the same weights and rules, or the backend should send its ranking. Share `ranking-config.json`.
2. **`GET /hospitals`.** The portal calls it without `type` so it can show ruled-out hospitals. Each item:
   `id, name, lat, lng, address, phone, verified, capabilities{cath_lab, stroke_unit, icu, emergency}, availability{beds_free, icu_free, cath_lab_ready, stroke_unit_ready}`.
3. **`PATCH /hospitals/{id}/availability`.** Body is the four availability fields. Response `{ id, availability }`.
   Staff may only change their own hospital.
4. **Emergency fields added.** `alerted_hospital_id`, `alerted_ids[]` (hospitals that did not answer), `escalation_level`, `checklist`.
5. **`hospital.alerted` payload.** `{ hospital_id }`.
6. **`hospital.escalated` payload.** `{ from_hospital_id, to_hospital_id, to_hospital_name, escalation_level }`, with `state: "ESCALATED"`.
7. **Escalation timing.** 30 seconds from the last alert or escalation; the countdown uses the event timestamps, so server and laptop clocks must agree.
8. **Checklist ticks (new endpoint, not in the contract).** Proposed: `PATCH /emergencies/{id}/checklist`,
   body `{ item_id, done }`, response `{ checklist: { [item_id]: { done, by, at } } }`. `GET /emergencies/{id}` returns the same `checklist`.
9. **Which alerts does a hospital see?** The mock dashboard shows every alert. Should the real list
   contain only alerts sent to the logged-in hospital?

## What is in Phase 4 (ambulance and response operations)

| Feature | Where |
|---|---|
| #25 Live ambulance tracking (Tier 2) | `components/TrackingMap.jsx`, `sim/ambulance-route.js`. Ambulance moves base to patient to hospital, ETA counts down. All simulated and labelled. |
| #44 Fleet dashboard and dispatch dialog | `pages/Fleet.jsx`, dialog in `components/ActionButtons.jsx`. Nearest free unit is preselected. If no unit is free, Dispatch is blocked with a clear message. |
| #45 Traffic-aware ETA and green corridor | `services/traffic.js`, `data/traffic-config.json`. Light, moderate or heavy (auto by hour or chosen). Corridor request is logged on the timeline (simulated). |
| #46 On-call team assignment | `components/TeamAssignment.jsx`, `data/roster.json` (sample names). Options match the emergency type. |
| #49 Desk and crew chat | `components/ChatPanel.jsx`, crew page at `/crew/<emergency id>` (open in a second tab). Simulated. |

Speed of the simulation is set in `data/sim-config.json` (`time_scale` 9, so a 6 minute trip takes about 40 seconds).
In mock mode the simulator sets En route and Arrived itself. With the real backend the manual buttons stay as fallback.

### Phase 4 test checklist
1. Log in, open E-1001 (heart), Acknowledge, Dispatch: the dialog lists 5 units, nearest preselected.
2. Confirm: tracking map appears, ETA counts down, state moves to En route, then Arrived.
3. Change traffic to Heavy: ETA goes up. Click the green corridor button: timeline shows the request.
4. Pause and Resume the trip. Reset puts the unit back at base.
5. Assign a team member: timeline shows it.
6. Open `/crew/E-1001` in a second tab: messages go both ways.
7. Fleet page: unit shows En route, then At hospital, then Available after Handed over.
8. Dispatch three emergencies until all units are busy: the dialog says no ambulance is available.
9. Manual four-type test: Heart goes to a cardiac-capable hospital, Stroke to a stroke unit, Diabetic and Asthma to the best-scoring capable hospital. The ranking table shows why. Cancel an emergency before dispatch: Dispatch stays disabled.

### Phase 4: fields to confirm with Daksh
- `GET /ambulances` (id, call_sign, crew, base_hospital_id, lat, lng, status).
- `POST /ambulances/{id}/location` body: emergency_id, lat, lng, heading, eta_seconds, remaining_km, progress, leg.
- `POST /emergencies/{id}/dispatch` body `{ambulance_id}`.
- Proposed: `POST /emergencies/{id}/notes` (assignment, corridor, pickup), `POST /emergencies/{id}/chat`, events `emergency.note` and `chat.message`.
- EN_ROUTE is carried by `ambulance.location` with `state: "EN_ROUTE"`.

## What is in Phase 5 (analytics, reports, admin, community features, freeze)

| Feature | Where |
|---|---|
| #48 Case history | `pages/History.jsx`, `services/cases.js`, `components/HistoryProvider.jsx`. Search and filter by type, severity, state, date, hospital. Opens the report. |
| #31 Post-event report | `pages/Report.jsx`, `services/report.js`. One page: hospital and why, ambulance, team, timeline, step durations, checklist, notes. **Print** (print stylesheet in `index.css`) and **Download (.txt)**. |
| #30 Analytics | `pages/Analytics.jsx`, `services/analytics.js`, `components/BarChart.jsx`. By type, severity and state, average step times, escalations, ambulance use. All numbers come from the stored timeline events. Shows "Not enough data yet" when empty. |
| #47 Hospital onboarding | `pages/Admin.jsx`, `services/hospitalForm.js`. Admin only. New hospitals start **unverified** and are not ranked until an admin marks them verified. |
| #23 AED finder | Map page toggle, `data/aed.json`, `services/nearby.js`, and "Nearby help" on each emergency. Sample data. |
| #24 Community responders | Map page toggle, `data/responders.json`, "Nearby help". "Notify responder" is simulated: it only writes a timeline note and never says anyone is coming. |
| Reset demo | Button in the top bar (mock mode only). Restores the sample data, keeps you logged in. |
| Integration list | Admin page, "Backend connection" (data in `data/integration.json`). Every endpoint and event, marked agreed or proposed. |

Charts are drawn with plain SVG instead of Recharts. This needs no extra package, works offline and was fully tested here. Large text, a title, a labelled axis, the value on every bar, colour-blind-safe colours.

How past cases are stored:
- Mock mode: 7 sample past cases (`data/sample-history.json`, marked sample) plus every case you finish. Finished cases, added hospitals and availability changes are kept in the browser (localStorage). **Reset demo** clears them.
- Real mode: history comes from the backend (proposed `GET /emergencies?status=finished`, each item with `status_events`).

### Phase 5 test checklist
1. Log in as `staff@demo`. History shows 7 finished sample cases. Try each filter and the search box.
2. Open the report of E-0901: hospital and why, durations, timeline, checklist 6 of 6. Click Print (menu and buttons disappear in the preview) and Download.
3. Open the cancelled case E-0906: outcome says cancelled, no ambulance.
4. Analytics: 10 cases at the start (7 sample plus 3 live). Finish a case and watch the numbers change.
5. Map: tick "AED locations" (6 markers, nearest AED panel) and "Community responders" (5 markers).
6. Open an emergency: "Nearby help" lists the 3 nearest AEDs. Click "Notify responder (simulated)": a timeline note appears.
7. Log out, log in as `admin@demo`. Admin: submit the empty form (errors), add a hospital (starts Unverified). On the Map choose Heart attack: the new hospital is NOT ranked ("Not verified"). Mark it verified: it is ranked.
8. Staff cannot see the Admin link. Opening `/admin` shows "Access denied".
9. Click **Reset demo** then Yes: starting data is back.

### Final list to confirm with Daksh
See the table on the Admin page (or `src/data/integration.json`). The agreed items come from the team plan. These are **proposed** and need his OK before the demo:
`GET /emergencies?status=active`, `GET /emergencies?status=finished` (with `status_events`), `PATCH /emergencies/{id}/checklist`, `GET /ambulances`, `POST /emergencies/{id}/notes`, `POST /emergencies/{id}/chat`, `POST /hospitals` (must save as `verified: false`), `PUT /hospitals/{id}`, `PATCH /hospitals/{id}/verify`, events `emergency.note` and `chat.message`, and the WebSocket token as `?token=`.
For Jehal and Daksh: the contract event `responder.alert` is not used by this portal. "Notify responder" is a timeline note only.

### Switching to the real backend (one switch)
Set `VITE_USE_MOCK=false` in `.env`, set `VITE_API_BASE_URL` and `VITE_WS_URL`, restart `npm run dev`. The Admin page shows which mode is active.

### Label rules checked in Phase 5
Every page shows "Simulated" in the top bar. Sample content (symptoms, checklists, AEDs, responders, history, crews) says sample or pending medical review. "Alert sent" never reads as "ambulance dispatched": that only appears after Dispatch is clicked.

### Jury demo script (about 5 minutes) and backup video
See [DEMO.md](DEMO.md).

## Run together with the patient app and the backend (integration)

The portal now works with Jehal's patient app (his mock server) and is ready for Daksh's backend.
Step by step guide, logins and a 9-step rehearsal checklist: [docs/RUN_BOTH_APPS.md](docs/RUN_BOTH_APPS.md).
Everything we ask Daksh for, with what happens if he says no: [docs/PROPOSED_ENDPOINTS_FOR_DAKSH.md](docs/PROPOSED_ENDPOINTS_FOR_DAKSH.md).

What the portal does, in short:
- **Login** sends `username` in real mode (email in mock mode). `HOSPITAL_STAFF` is shown as staff. No hospital in the login answer? The desk picks one in the top bar.
- **One adapter file**, `src/services/adapters.js`, turns every shape from Jehal and Daksh into the shape the screens use (symptom IDs to words, missing patient, location or vitals to "Not shared", `event` or `type`, capabilities as list or object, `hospital.alerted` in both shapes, heading and progress worked out locally). The screens never read raw backend data.
- **Safety check-in** alerts (no symptoms, type UNKNOWN) show "No symptoms reported … Simulated", can be acknowledged, dispatched and reported. Ranking for them needs only an emergency department.
- **Early alerts** (state `EMERGENCY_DETECTED`) are a quiet grey notice: no sound, no flashing, no Acknowledge until `SOS_SENT`. A cancelled early alert shows as cancelled. Works the same if the backend creates alerts at `SOS_SENT`.
- **Missing endpoints** never break the portal: the one feature is limited and the screen says why.
- Tests: `npm test` includes `integration.test.js`, which runs a real saved output of Jehal's mock through the reducer, ranking and report.

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
| `feat-15-hospital-ranking` | `feat-15: capability-first hospital ranking with score breakdown and ruled-out list` |
| `feat-42-availability` | `feat-42: bed and ICU availability form with shared hospital store` |
| `feat-43-auto-escalation` | `feat-43: escalation countdown, banner, fallback list and mock scheduler` |
| `feat-59-priority-queue` | `feat-59: priority queue by severity then age, emergency-only sound, unread badge` |
| `feat-26-prearrival-checklist` | `feat-26: pre-arrival checklist per emergency type with saved ticks` |

## Notes

- Hospital names, addresses and phone numbers are invented samples around Ahmedabad.
  Change `DEMO_LOCATION` in `src/services/geo.js` and `src/data/hospitals.json` for another city.
- Travel time is straight-line distance ÷ 40 km/h. It is a simulation, not a route.
- The WebSocket message shape assumed is `{ event, emergency_id, state, timestamp, payload }`.
  Confirm the `event` field name with Daksh.
- The map tiles load from OpenStreetMap, so the map needs internet.
- Browsers allow sound only after a click on the page. After a reload, click once before expecting the alert sound.
- Mock data lives in memory, so a page reload resets the mock alerts.
- Symptom text in the mock data and every item in `checklists.json` are sample content. A doctor must review them before the demo.
- The demo accounts belong to hospital H2 (Navrangpura), which has a cath lab and a stroke unit.
