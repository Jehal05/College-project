# Changelog

All changes are to a SIMULATED prototype. It is not a medical device and never diagnoses.

## Phase 5: health passport, integration and release
- QR health passport: `/passport` (create for 1 hour, 24 hours or 7 days; QR holds only a link with a random token; download PNG, print, revoke, "Opened N times"), public responder page `/p/:token` in three languages that respects the consent settings.
- Mock server: passport routes, `passport.opened` event, `POST /demo/fail` test switch.
- `docs/API_CONTRACT.md` and `npm run contract -- <url>` (16 checks) so the real backend can be checked; `npm run integration` plays a whole emergency and prints the events teammates can copy.
- Error handling for a real backend: 401 signs out with a message (never on the emergency screens), friendly 5xx with retry, 10 second limit on non-emergency calls; Call 112 / 108 link on the login screen.
- In-app notification bell (hospital acknowledged, ambulance dispatched, contacts notified, passport opened) and opt-in browser alerts.
- `npm test`: 28 unit tests (vitest) and 7 browser test files (Playwright, headless Chrome) that start their own servers; GitHub Actions workflow; Content-Security-Policy on the built app; `robots.txt`, Netlify files and `docs/DEPLOY.md`; `docs/CLINICAL_REVIEW.md`; `docs/RELEASE_CHECKLIST.md`.

## Phase 4: reach, resilience and polish
Hindi and Gujarati; voice input that only suggests symptoms; offline mode (service worker, saved copies, "Not sent yet" emergency with automatic sending); accessibility audit (axe-core, 0 violations) and fixes; crash screen that keeps the call button; demo script, accessibility and translation review documents.

## Phase 3: personal data and context
Consent screen, emergency contacts, report upload, digital twin bar, "Time since alert" clock, "contacts notified" card.

## Phase 2: core emergency flow
Symptom checklist, emergency screen with a 10 second countdown, SOS with location, simulated hospital and ambulance response over the WebSocket.

## Phase 1: foundation
Login, profile, live vitals, mock server, PWA shell.
