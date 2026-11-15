# Deploy (static site on Netlify)

**Why Netlify:** the app is plain static files (`patient-app/dist`). Netlify needs no server, gives HTTPS (required for the service worker, microphone and location) and reads the two files already in `patient-app/public/` (`_redirects` for page addresses such as `/p/<token>`, `_headers` for security headers). Vercel or GitHub Pages also work, but Pages needs extra steps for these addresses.

## Steps

1. Make sure the backend is reachable over HTTPS and allows the app's address in CORS (mock: `CORS_ORIGINS=https://your-site.netlify.app npm run mock`; the mock itself is for demos only).
2. In Netlify: **Add new site > Import from Git**, pick this repository and the `Jehal` branch (or `main` after merge).
3. Build settings: base directory `patient-app`, build command `npm run build`, publish directory `patient-app/dist` (a `netlify.toml` at the repository root already says this).
4. Environment variables (Site settings > Environment variables), set BEFORE the build because they are baked into it:
   - `VITE_API_URL` = `https://<backend address>`
   - `VITE_APP_URL` = `https://<your-site>.netlify.app` (used in the passport QR link)
   - `VITE_WS_URL` only if live events are on another address.
5. Deploy. Open the site, sign in, create a passport, scan it with a phone.

The build adds a Content-Security-Policy that allows only the site itself plus the API and WebSocket addresses from step 4. If you change those variables, rebuild.

## After deploying, check

- `https://<site>/p/anything` opens the app (not a 404) and says the passport is no longer available.
- Browser console: no errors; Application > Service Workers: activated.
- `npm run contract -- https://<backend>` passes.
- The site works over HTTPS only (microphone, location and the service worker need it).

## Limits

The mock server keeps everything in memory and is not for real users. The real backend (Daksh) must implement `docs/API_CONTRACT.md`.


## Demo panel

The `/demo` panel is left out of a normal build. For a rehearsal deployment set `VITE_DEMO_TOOLS=true` at build time; do not set it for anything real people use.

## Backend and portal are not covered here yet
This page and `netlify.toml` only deploy the **patient app** as a static site. Nothing in the repository yet says how to deploy:
- the **backend** (FastAPI + SQLite; `backend/Dockerfile` and `docker-compose.yml` exist but have not been built and run on a real machine, see `backend/README.md`), or
- the **hospital portal** (a separate Vite app in `hospital-portal/`; it has no `netlify.toml` and no deploy steps).

The demo runs on one laptop (`docs/DEMO_RUN_REAL_BACKEND.md`). A hosted deployment of all three parts is not done.
