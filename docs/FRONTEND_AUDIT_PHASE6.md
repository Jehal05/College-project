# Frontend audit for Phase 6A (hospital portal only)

Source: the attached frontend review, used for ideas. Every row below was checked against the
code on branch `Puneet`. Status: **done** / **partly** / **missing**. "Data" says whether the
real data the change needs exists today (backend, mock, or the portal's own simulation).

Method: SANDBOX read-through of `hospital-portal/src` (no browser run in this step).

## A. Design system

| # | Review recommendation | Status | File | Data | Notes |
|---|---|---|---|---|---|
| A1 | One shared UI parts set (Button, Card, Badge, StatusPill, Skeleton, EmptyState, ErrorState, PageHeader) | **missing at audit time; built in d62f792** | `src/components/ui/` | n/a | Pages repeat long Tailwind class strings (buttons, cards, error `<p>`). `SimulatedBadge` and `BarChart` are the only shared visual parts. |
| A2 | Input, Select, Modal, Tooltip, Dropdown | **out of scope** | n/a | n/a | Phase 6A lists only 8 parts; forms and modals are not touched. |
| A3 | "Design tokens `--ht-*` in index.css" | **partly right (correction to my first draft)** | `src/index.css` | n/a | The portal DOES define `--color-ht-*` tokens (bg, sidebar, card, accent, accent2) and uses them in the NavBar. Pages use Tailwind slate/sky classes. The shared parts use the Tailwind classes; no new tokens. |
| A4 | Older vs themed screens (two visual systems) | **not applicable to the portal** | n/a | n/a | One visual language already; the inconsistency is repeated class strings, not two themes. |

## B. Dashboard (`pages/Dashboard.jsx`, 164 lines)

| # | Recommendation | Status | File | Data |
|---|---|---|---|---|
| B1 | Stats strip: active emergencies | **missing** (the queue heading shows an "open" count only) | Dashboard.jsx `openCount` | exists (emergency list) |
| B2 | Ambulances active | **missing** | AmbulanceProvider units + emergencies with `ambulance_id` | exists, but the real backend has no fleet list, so a SAMPLE fleet is shown (`SAMPLE_FLEET_NOTE`). Count only emergencies that really have an ambulance on a call; label as Simulated when the fleet is sample. |
| B3 | Available beds | **partly** (a per-hospital capacity strip exists: `OwnCapacity.jsx`) | OwnCapacity.jsx, `services/capacity.js` | `beds_free` exists in the hospital record, may be `null` ("Not shared"). Show a number only when it is a number; otherwise "Not available". |
| B4 | Critical alerts | **missing** as a number | Dashboard.jsx | exists. The strip will show **unacknowledged or escalated** alerts (the lifecycle has no "critical" state; severity EMERGENCY is already on the card). |
| B5 | Priority queue with patient, type, severity, time, status | **done** | AlertCard.jsx | exists |
| B6 | Queue shows distance | **missing** | AlertCard.jsx | `distance_km` is carried on `hospital.alerted` events (adapters.js line ~293) only. Show it when present; otherwise leave it out. |
| B7 | Patient details panel (info, vitals, timeline, readiness, actions) | **done** | EmergencyDetail.jsx + detail/* | exists. Medical history and allergies are shown only if the patient shared them (consent); not changed. |
| B8 | Command view with no extra clicks | **done** (Phase 4) | CommandSummary.jsx, ResponseLog.jsx | exists. Keep. |
| B9 | Bottom "recent activity" strip on the dashboard | **partly** (a full Activity page exists) | pages/Activity.jsx | exists. Not added to the dashboard: the response log inside the detail already serves this, and it would add noise. Left as a decision for you. |
| B10 | "Fewer clicks" | **done** | scope buttons, auto-select of the top alert, arrow keys | n/a |

## C. Alert card (`components/AlertCard.jsx`, 101 lines)

| # | Recommendation | Status | Notes |
|---|---|---|---|
| C1 | Clear severity indicator (not colour alone) | **partly** | Severity is text + colour via `SEVERITY_STYLES`. Add an icon; keep the text. |
| C2 | Status label | **partly** | State is shown, but small. Make it a `StatusPill`. |
| C3 | Received time | **done** | `formatTime` (exported, used elsewhere: keep the export). |
| C4 | Distance | **missing** | see B6 (only when present). |
| C5 | NEW badge and animation | **done** | `showNewBadge`, `ht-flash`; reduced motion is respected. Keep. |
| C6 | Read/unread | **done** (`data-unread`) but weak visually | Add a visible unread marker that is not colour alone. |
| C7 | Consistent card heights | **missing** | Symptoms/warnings make heights vary. Use line clamps. |
| C8 | Keyboard navigation | **done** | Arrow keys in Dashboard `onListKeyDown`. Do not change. |
| C9 | "VIEW EMERGENCY" button | **not needed** | The whole card is a button (a better target). Keep. |

## D. Map and ambulance (`pages/Map.jsx` 206, `components/TrackingMap.jsx` 168)

| # | Recommendation | Status | Notes / data |
|---|---|---|---|
| D1 | Hospital, patient, route markers | **done** | Map.jsx / TrackingMap.jsx |
| D2 | Zoom controls | **done** | `ZoomControl` with translated titles in both maps. Nothing to add. |
| D3 | Legend | **done** in both maps | Map.jsx legend uses colour glyphs; TrackingMap legend too. Add text shapes only if cheap. |
| D4 | Loading state | **done** on Map.jsx (overlay) | |
| D5 | Tile-failure fallback | **missing** | Add a Leaflet `tileerror` listener and a message. |
| D6 | Avoid map re-initialisation | **partly** | Map.jsx `key` is origin lat/lng (changes only if hospitals load); TrackingMap `key` is emergency+ambulance id and the route is memoised on 3 fields. Verify in Step 5; likely fine. |
| D7 | Ambulance panel: status | **partly** | Status is in Fleet and unit tooltip. |
| D8 | Ambulance panel: **speed** | **cannot be done honestly** | No backend field. The only speed is the portal's assumed `ASSUMED_SPEED_KMH` (40) / `sim-config speed_kmh`. Show it only inside a Simulated label or leave it out. Decision: leave out. |
| D9 | Ambulance panel: **distance remaining** | **can be computed** | From portal positions (`splitPath` / haversine over the remaining path). Label Simulated when the portal moves the unit. |
| D10 | ETA | **done** | `e.ambulance.eta_seconds`, `formatEta`, labelled. |
| D11 | **Plate number** "MH-12-AB-1234" | **cannot be done** | No plate/registration field exists for ambulances (units have `id` and `call_sign`). Left out; PROPOSED field in the API contract. |
| D12 | Assigned emergency | **partly** | Known in the tracking view; not in Fleet panel list. |
| D13 | Smooth marker movement | **not planned** | Position updates come from a ticking simulation; changing marker animation risks Leaflet re-render. Mention only. |
| D14 | "Ambulance location, emergency location, assigned routes" on the main Map page | **missing** (Map.jsx shows hospitals/AED/responders only) | Out of Phase 6A scope except what Step 5 lists. |

## E. Navigation (`components/NavBar.jsx`, 103 lines)

| # | Recommendation | Status | Notes |
|---|---|---|---|
| E1 | Group into Operations / Management / Insights / Administration | **missing** (flat `links` array) | Do it. Keep all routes and `adminOnly`. |
| E2 | Active-page indicator | **partly** | Colour class only. Add `aria-current="page"` (NavLink does this) plus a non-colour marker (underline/bar). |
| E3 | Small-screen menu | **missing** | Keyboard-usable disclosure button with `aria-expanded`. |
| E4 | Review's page names ("Hospital Settings", "Staff Management") | **review got it wrong** | There is one `/admin` page. Keep the current routes and labels. |

## F. Analytics (`pages/Analytics.jsx` 96, `services/analytics.js`)

| # | Recommendation | Status | Notes |
|---|---|---|---|
| F1 | Totals: total / active / completed / cancelled | **done** | Tiles. |
| F2 | Emergency distribution (type, severity, state) | **done** | Review lists "Cardiac, Stroke, Trauma, Respiratory": the portal uses `EMERGENCY_TYPES` from the contract; not changed. |
| F3 | Average step times | **done**, from `status_events` only | `summarise().averages`. |
| F4 | Median and p90 next to the average | **missing** | Pure maths + tests. Needs n; "not enough data" when n is small. |
| F5 | Date filter | **missing** | Filter on `created_at`. |
| F6 | Export | **partly** (History has a CSV; `csv.js` has the safe cell function) | Add an analytics CSV: aggregated numbers only, no patient ids. |
| F7 | Time-based daily/weekly/monthly view | **out of scope** | The date filter covers it. |
| F8 | "Hospital performance: bed availability" | **cannot be done** | There is no bed history. Only the current `beds_free` exists. Left out. |
| F9 | "Acknowledgement/dispatch/**arrival** time" | **partly** | Steps are alert→ack, ack→dispatch, dispatch→arrival, arrival→handover. These are the review's three. |

## G. Engineering items

| # | Recommendation | Status | Notes |
|---|---|---|---|
| G1 | Loading / empty / error / offline / refreshing states | **partly** | Pages have their own `<p>` states; `OfflineBanner`, `BackendHealthBanner` exist. **"Feedback.jsx" is not in the portal, and I did not find it in the patient app components either** (the review is wrong or means another file). Step 2 adds `Skeleton`, `EmptyState`, `ErrorState`. |
| G2 | Error boundaries with friendly message and retry | **done** | `ErrorBoundary.jsx` has Reload and Try again, translated; it logs only the message. It shows a short `detail` (the error message, not a stack). Keep. Error reporting service: not added (no new service). |
| G3 | Lazy loading | **done** | `App.jsx` lazy routes. |
| G4 | Split large screens | **not planned** | Dashboard is 164 lines; no split needed. |
| G5 | State management | **done** | Context providers and a pure reducer; no change. |
| G6 | Keyboard shortcuts, sound customisation, presentation mode, advanced filters | **done / out of scope** | Presentation mode and sound control exist; History has filters. Shortcuts not added. |
| G7 | Accessibility basics (skip links, reduced motion, focus, announcer) | **done** | Must not break. |
| G8 | Test widths 360/768/1366/1920 | **to do** | See "How widths will be checked" below. |

## What is wrong or impossible in the review (summary)

1. `Feedback.jsx` does not exist in either app's components folder. (`--ht-*` tokens exist in both apps.)
2. Speed, plate number and bed history have no data source. They will not be shown.
3. "Distance" on the alert card exists only on some events.
4. Page names like "Hospital Settings / Staff Management" are not the portal's routes.
5. Zoom controls, legend, loading state, error boundary with retry, keyboard navigation and alert animation **already exist**; they are kept, not rebuilt.
6. Patient-app items (Overview, Twin, forms, reports, mobile nav) are Jehal's: handoff note only.

## How widths will be checked (honest plan)

The sandbox has no browser. Widths 360/768/1366/1920 will be checked by the Playwright e2e in CI
(a viewport-width overflow assertion on the changed pages). If I cannot run it, the report will
say "not run in SANDBOX; CI result: ..." and nothing is claimed as seen by eye.

## Open decisions for you

1. Stats strip "critical alerts": I plan **unacknowledged + escalated** (no such thing as "critical" in the lifecycle). OK?
2. Ambulance panel: leave speed and plate out entirely (recommended), or show the simulated 40 km/h inside a Simulated label?
3. Add a recent-activity strip to the dashboard (B9)? I recommend no.


## Outcome of Phase 6A (added at the end of the phase)

| Step | Result | Commit |
|---|---|---|
| 2 shared parts | 8 parts in `components/ui/` on the current Tailwind classes; Dashboard now uses Button, ErrorState, EmptyState, Skeleton; AlertCard uses StatusPill; Analytics uses Button, ErrorState | d62f792, 178b140 |
| 3 stats strip | Active, ambulances on a call, beds, unacknowledged (SOS_SENT), escalated (ESCALATED). Beds: 0 is shown as 0, not shared as "Not available". | df95f59 |
| 4 alert card | Severity icon + word, status pill, "Unread" label + dot, received time, distance only if the event carried it, min height, 2-line symptoms | 5a7efdd |
| 5 map | Tile-failure notice on all three maps, "km to go" on the tracking map (simulated route). Speed and plate left out as agreed. Zoom, legend, loading already existed. | 8d97a77 |
| 6 navigation | Four groups, underline + arrow for the current page, Menu button under 768px with Escape to close | 35d8172 |
| 7 analytics | n, average, median, P90 (median and P90 need 5+ cases), date filter, aggregate-only CSV | f29bf2b |

Not done on purpose: speed, plate number, bed history, a recent-activity strip, smooth marker animation, keyboard shortcuts, Input/Select/Modal parts.
