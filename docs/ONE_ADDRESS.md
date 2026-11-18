# Whole project at one address

One command starts everything on **one port**. No second terminal, no different ports.

```
npm install          # once (the first run also installs the hospital portal)
npm run one          # builds what is missing, then starts the server
```

Open **http://localhost:4000/start**.

| Address | What it is |
|---|---|
| `/start` | Start page: links, demo logins, server status |
| `/` | Patient app (all its screens, for example `/twin`, `/hospitals`) |
| `/portal/` | Hospital portal (for example `/portal/map`) |
| `/demo` | Demo panel of the patient app (reset, vitals profiles, scenarios) |
| `/api/...` | The simulated API (for example `/api/health`); live events on `/ws` |

Put the patient app and the portal in two browser windows. Both use the same server, so an SOS in one appears in the other.

Logins: patient `patient@demo.test` / `demo1234`; portal staff `staff@demo` / `demo123`; Pune desk `staff.pune@demo.test` / `demo1234`; admin `admin@demo` / `demo123`.

## Options

- `npm run one:rebuild` forces a fresh build of both apps. The server also rebuilds by itself when source files are newer than the last build.
- `PORT=8080 npm run one` changes the port. `DEMO_SPEED` (default 5) speeds up the simulated hospital and ambulance; `HOSPITAL_MODE` (default `manual`: the portal's buttons drive the emergency).
- On Windows PowerShell: `$env:PORT=8080; npm run one`.
- `node scripts/one-smoke.mjs` checks that every address answers.

## How it works

`mock-server/server.js` has a `SERVE_APPS` mode (set by `scripts/one.mjs`). It serves the built patient app at `/`, the built portal at `/portal/` and moves the API to `/api`, because the apps have pages such as `/hospitals` that would clash with API routes of the same name. The apps are built with a relative API address (`/api`), the portal with base `/portal/`. Without `SERVE_APPS` nothing changes: `npm run mock` plus `npm run dev` still work on ports 4000 and 5173 for development.

- The one-address builds go into `patient-app/dist-one` and `hospital-portal/dist-one`, separate from the normal `dist`, so a normal build (without the demo panel and with the wrong paths) is never served by mistake.

## Limits

- **Demo build only.** `npm run one` builds the patient app with the demo panel switched on (`VITE_DEMO_TOOLS=true`) and the portal against the simulated server. Never deploy these builds (`dist-one`); a normal release is built with `npm run build`.
- **Which branch you are on decides what you see.** The portal at `/portal/` is built from the files in the folder you run it in. After merging, `Puneet` carries both today's city feature and the newer portal pages (dashboard strip, command view, analytics, map notices); `main` carries only what has been merged into it.
- This is the simulated mock server, not the real backend (`backend/`, FastAPI). The real backend and Daksh's operations dashboard (`dashboard/`) still run separately (see `docs/DEMO_RUN_REAL_BACKEND.md`).
- The patient app's offline cache (service worker) keeps its own screens only; the portal and API are never answered from it.
- Tested in Chrome: start page, both logins, portal deep links, and an SOS from the patient app that appears on the portal and is acknowledged back. Not tested on Firefox or Safari.
