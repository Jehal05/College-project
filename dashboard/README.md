# HealthTwin AI operations dashboard

> Simulated prototype. Not a medical device. It supports escalation and never diagnoses.
> Everything shown is fake demo data. Nothing real is contacted.

A dependency-free web page (plain HTML, CSS and JavaScript modules, no build step) that runs against the real
backend in `../backend`. It changes no backend code.

## Run it (Windows PowerShell, two windows)

Window 1, the backend (allow this page's address with CORS):

```powershell
cd backend
$env:DEMO_MODE = "true"
$env:CORS_ALLOW_ORIGINS = "http://localhost:5500"
.\.venv\Scripts\python -m uvicorn app.main:app --port 8000
```

Window 2, the dashboard:

```powershell
cd dashboard
python -m http.server 5500
```

Open <http://localhost:5500>. Log in as `staff@demo.test`, `admin@demo.test` or `patient@demo.test` (password
`demo1234`). The backend URL is a field on the login screen. In the code it lives in one place: `DEFAULT_BASE` in `app.js`.

Tests for the data handling: `node test.mjs` (Node 18 or newer, no packages).

## Layout (one question per screen)

A left sidebar (a bottom tab bar on phones) with up to seven views. Press the number shown next to each name.

| # | View | The one question it answers |
|---|---|---|
| 1 | Overview | Is anything happening that needs a person right now? |
| 2 | Live Emergencies | Where does each emergency stand? (list on the left, detail with Summary, Timeline, Reasons and Desk notes tabs on the right) |
| 3 | Map and Dispatch | Where is everyone and what happens next? (staff and admin only; acknowledge and dispatch live here, plus route replay) |
| 4 | Hospitals | Which hospital fits best, and why? |
| 5 | Patient Vitals | How do the readings compare with the patient's usual range? |
| 6 | Privacy and Audit | What was shared, and who looked? (searchable audit, CSV export) |
| 7 | Demo Control | Start a demo emergency or reset (only when the backend is in DEMO_MODE) |

Extras: `Ctrl+K` search for a view or an emergency id, `?` shortcuts sheet, `J` / `K` next and previous emergency,
toast and flash on a new alert (visual only, no sound), the browser tab title and icon follow the worst active
severity, the last view, theme and menu state are remembered per browser.

## What each role sees

| View content | Hospital staff | Admin | Patient |
|---|---|---|---|
| Emergency board, timeline, reasons | alerted emergencies | all sent ones | own emergencies |
| Acknowledge, dispatch, hand over, drive ambulance (demo) | yes (own hospital) | read only | no |
| Map with ambulances | yes | yes | hospitals and patient only |
| Vitals | reading at the moment of the alert | same | live every 3 s, against own usual range |
| Consent | what the alert shares | same | own choices and who looked |
| Audit log + CSV | not allowed by the backend | yes | own access log |
| Demo control (only when the backend is in DEMO_MODE) | yes | yes | yes |

Phone numbers are never requested or shown.

## Real, mock, waiting

- **Real (read from the backend):** login, health, emergencies and their timeline and reasons, hospitals and
  ranking, ambulances, audit, consents, vitals, baseline, WebSocket events, demo scenario, speed, profile and reset.
- **Simulated by the backend itself:** the vitals, locations and every hospital and ambulance (all fictional).
- **Computed in the page from returned fields only:** progress bar, response times, "usual range" words, the
  "why this position" notes, the map projection.
- **Mock inside the page:** nothing. If the backend gives no value, the page says so.
- **"Drive ambulance (demo)":** posts 8 real location updates and then ARRIVED through the normal endpoints.
- **Not available:** live vitals for staff and admins (the backend only gives them to the patient), the audit
  log for staff (admin only), ambulance positions for patients.

## Known limits

- The map is a simple projection with no street tiles (no internet map is used).
- Route replay shows only the positions this page saw since it opened. The backend keeps no location history.
- The patient list endpoint is a summary, so the patient view reads each of the newest 5 emergencies in full.
- Hospital reasons use the same needs as the backend ranking (cath lab for heart, stroke unit for stroke, and so on). If the backend rules change, update `NEEDS` in `lib.js`.
- Heart rate etc. colours only compare a reading with the patient's own usual range. They are display aids.
