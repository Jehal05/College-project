# HealthTwin AI – Hospital Portal (Phase 1)

Puneet's section: hospital dashboard, map and ambulance.
**Simulated prototype. No real hospital, ambulance or emergency service is contacted.**

## Run it

```bash
cd hospital-portal
npm install
npm run dev        # opens on http://localhost:5174
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

Placeholders for later phases: `Fleet`, `Analytics`, `Admin` pages; `Checklist`, `RankingTable`,
`Timeline` components; `sim/ambulance-route.js`; `data/aed.json`; `data/routes.json`.

## Test checklist

- [ ] Opening `/dashboard` while logged out sends you to `/login`
- [ ] `staff@demo` can open Dashboard, Map, Fleet, Analytics; `/admin` shows "Access denied"
- [ ] `admin@demo` can open `/admin`
- [ ] Map shows 5 hospital markers and the red patient marker
- [ ] Clicking a marker shows name, distance, simulated ETA, capabilities, availability
- [ ] Choosing "Stroke" turns the nearest hospital (Sabarmati, no stroke unit) grey
- [ ] Distances look sensible (about 1 km to 10 km) and ETA carries the "Simulated ETA" label
- [ ] Dashboard shows 3 mock alerts; clicking one fills the detail panel
- [ ] "+ Simulate new alert" adds a card at the top without a refresh
- [ ] Top bar shows "Simulated event. Not a medical diagnosis."
- [ ] No errors in the browser console

## Suggested Git branches and commits

| Branch | Commit message |
|---|---|
| `feat-00-portal-setup` | `feat-00: scaffold hospital-portal with Vite, Tailwind, router and protected routes` |
| `feat-00-seed-data` | `feat-00: add 5 sample hospitals and ranking config` |
| `feat-07-hospital-map` | `feat-07: nearby hospital map with distance, simulated ETA and capability badges` |
| `feat-09-dashboard-shell` | `feat-09: dashboard shell with alert queue, AlertCard and detail panel (mock data)` |

## Notes

- Hospital names, addresses and phone numbers are invented samples around Ahmedabad.
  Change `DEMO_LOCATION` in `src/services/geo.js` and `src/data/hospitals.json` for another city.
- Travel time is straight-line distance ÷ 40 km/h. It is a simulation, not a route.
- The WebSocket message shape assumed is `{ event, emergency_id, state, timestamp, payload }`.
  Confirm the `event` field name with Daksh.
- The map tiles load from OpenStreetMap, so the map needs internet.
