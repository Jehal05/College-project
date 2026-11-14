# Lint and end-to-end tests: one-time setup on your laptop

The portal has an ESLint setup (`npm run lint`) and a Playwright browser test suite (`npm run e2e`).
**Status (13 Nov 2026): set up.** The packages are in `package.json` with the lock file (commit `quality-deps`), and the `lint` and `e2e` jobs now run on GitHub for every push.

## If you ever need to set it up again on a new laptop

```bash
cd hospital-portal
npm ci
npx playwright install chromium
npm run lint        # 0 errors expected; 9 react-hooks warnings are known and harmless
npm test            # unit tests
npm run e2e         # builds in mock mode, starts the preview server, runs the browser tests
```

When you add or change a package, **commit `package-lock.json` together with `package.json`**, or `npm ci` fails in CI.

## What has been run (real tools, on the laptop, 13 Nov 2026)

- Unit tests: all pass.
- `npm run e2e` with the real `@playwright/test` and a real Vite build: 8 of 8 passed.
- `npm run lint` with the real React and react-hooks plugins: 0 errors, 9 `exhaustive-deps` warnings (intended patterns such as `Boolean(x)` dependencies).
- `npm audit`: 0 vulnerabilities after the react-router 7 upgrade.
- The larger browser checks written during development (alert flow, ambulance tracking, admin, scope, activity log, offline banner, languages) ran in a sandbox harness that is **not** in this repo. Only the 8 tests in `e2e/portal.spec.js` are repeatable by anyone else.

## Checked against Jehal's mock (14 Nov 2026, by hand on the laptop)

Verified:
- Staff login returns hospital `HSP-AMD-002`.
- An unanswered alert escalates and the card shows the escalation (orange banner).
- Hindi and Gujarati render without boxes.
- Acknowledge and dispatch work.

Also verified later on 14 Nov (checked from the browser extension):
- The mock moves the ambulance by itself after dispatch (28 updates, ETA 54 s to 0 s in about 15 s). It does not send "arrived"; the desk clicks Arrived and Handed over.
- Live availability: a PATCH from outside changed beds free in an already-open portal tab with no refresh.

Also verified in the second round on 14 Nov (two real browser tabs, fresh `npm run dev`):
- The browser loaded the new translation code (`phrases.js`).
- Live availability: beds free changed 11 to 6 in both open tabs with no refresh, then restored.
- Escalation: an unanswered alert escalated after about 6 s (DEMO_SPEED 5), and "now at" followed each new hospital. No flicker between states.
- Hindi and Gujarati: the card, detail panel, timeline and dispatch dialog are translated, with no empty boxes. Left in English on purpose or not yet done: the emergency type, the EMERGENCY badge, HR/SpO₂/BP, and the readiness, notes, passport, nearest AED, responders and ranking cards.
- Two leftovers found and fixed: "now at …" on the card and "No on-call roster". The fix is in the code and passed the unit tests and the sandbox browser suites. It was not yet seen on the laptop, so run `git pull origin Puneet` and look once.

Nothing is left unconfirmed from the 14 Nov list.
