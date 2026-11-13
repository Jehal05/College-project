# Changelog

## Phase 9: what Puneet needs (mock server)
- `GET /passport/{patient_id}` for staff and admin (consent honoured, every read logged); `passport_available` flag in `emergency.created`.
- `hospital.escalated` + `hospital.alerted` after `ESCALATION_SECONDS` without acknowledgement (works in auto and manual mode, stops on acknowledge, dispatch or cancel). Mock helper `POST /demo/no-ack`, env `NO_ACK_DEMO`.
- `PATCH /hospitals/{id}/availability` (staff own hospital or admin; Daksh's key names accepted and shown too), event `hospital.availability_updated`; `POST /demo/reset` restores seed numbers.
- WebSocket needs the login token (`?token=` or a first `{type:"auth"}` message); otherwise closed with 1008. The patient app, scripts and tests send the token. `WS_AUTH=off` for old scripts.
- `GET /audit` (admin only). Staff login answer has `hospital_id`.
- Patient app: new string `emergency.cancelRefused` (en/hi/gu) shown when the server refuses a cancel (409). English: "The ambulance is already sent. Please call the number shown." Network failures still say "Could not cancel. Please try again."
- Tests: contract 29 checks (was 24), browser 13 files / 345 checks, joint rehearsal 26 checks (was 18), integration prints the new event shapes.

## Phase 8: a real-looking health product (UI only)
- New design system (teal brand, tokens, system fonts, inline icons, shared Button/Card/Chip/Notice/Skeleton/EmptyState). Shell with header and status chip, restyled Home, Symptoms, Emergency, Profile, Contacts, Consent, Reports, Reminders, Summary, Passport, responder page and Login.
- Emergency red is limited to the emergency flow; Login's Call 112 / 108 link is now dark outline instead of red (still a plain `tel:112` link, 56 px).
- Skeleton loading, empty and error states with Retry on every sub-screen. Reminder times show as 8:00 am / 8:00 pm.
- Manifest and browser colours changed to the teal brand.
- Consent, Reports and voice input load on first use (kept out of the offline install; precache 442 KiB, limit 450).
- English strings changed: `status.online` "Online", `status.offline` "Offline", `status.demo` "Demo" (new, in en/hi/gu; hi/gu AI-written, need native review). Login title "Sign in" is now an h2 under the app name. No other wording changed.
- New test `phase8-ui.test.mjs` (41 checks). Language test allowlist gained avatar initials (rm, sm, km).

## Phase 7: made for the hospital portal
- `emergency.created` is now sent at SOS (state `SOS_SENT`), not when the emergency is created, and carries patient summary, readable symptoms, `symptom_ids`, vitals and location (consent decides, omitted not null). `hospital.alerted` has `hospital_id` and `rank`.
- Hospitals H1-H5 style data copied from the portal's seed (Ahmedabad), with capability and availability objects; ambulances too. Realistic-looking fictional IDs and names everywhere (`PT-2026-0417`, `EM-YYYYMMDD-nnnn`, `HSP-AMD-001`, `AMB-AMD-01`, Sunita Mehta, Metformin 500 mg). Demo location moved to Ahmedabad.
- `HOSPITAL_MODE=manual`: the portal's Acknowledge, Dispatch and status buttons drive the emergency (403 for a patient token, 409 for an invalid move). New: `GET /emergencies?status=`, `GET /ambulances`, `POST /ambulances/:id/location`, portal logins `staff@demo` / `admin@demo`.
- `scripts/joint-rehearsal.mjs`: runs the real portal from `origin/Puneet` with the patient app (17 checks). Review packs for the doctor, the language reviewers and the real-device test (`docs/review/`).

All changes are to a SIMULATED prototype. It is not a medical device and never diagnoses.

## Contract alignment with Daksh v0.6 (mock server and app, no merge)
- Mock server speaks his names next to ours (`mock-server/compat.js`): `username` login with `user_id`, `detail` on errors, `event` on every WebSocket message, `timeline`, `consent`/lowercase symptoms/optional type on `POST /emergencies`, partial consent updates with `changed`, `GET /consents/history`, `GET /passport/{id}?token=`, `{ scenario }` and `{ status: "reset" }`. IDs are now `PT-2026-0417`, `em_001`, `hosp_001`, `amb_001`.
- App: sends `username`, reads `event` or `type`, `timeline` or `status_events` (`utils/adapters.js`).
- `npm run contract` now has 21 checks, including one for his names. The list of what is still different is at the end of `docs/API_CONTRACT.md`.

## Phase 6: smarter, safer, demo-ready
- **Why this alert** card on the emergency screen (collapsed): what you told us, what your readings showed (only with vitals consent), neutral checklist line. Built on a JS port of Daksh's rules v0.1 (`mock-server/rules.js`, `data/rules.json`, all pending doctor review). A rule's own sentence is shown only when it is marked reviewed (none are). `GET /emergencies/:id/reasons`; `reasons` and `source` in the `emergency.created` payload.
- **Vitals trend** on Home: hand-drawn SVG sparkline per vital (last 60 readings, in memory only), usual-range band, "Within your usual range" / "Changed from your usual", text alternatives, "Simulated wearable data"; "Live vitals sharing is off" when consent is off (nothing is buffered). Mock vitals profiles (`normal`, `heart_attack`, `stroke`, `low_glucose`, `asthma`) and pinned values via `POST /demo/vitals`; optional `bp_sys`, `bp_dia`, `resp_rate` in `vitals.update`.
- **Safety check-in** (off by default, Profile): inactivity check while the app is open, plus "Simulated fall" in the demo panel. Full-screen "Are you OK?" with a 30 second countdown; no answer starts an emergency through the normal SOS path with `source` `FALL_CHECK` or `INACTIVITY_CHECK`; Cancel still works. The setting is saved on the server (`/patients/:id/preferences`).
- **Demo panel** (`/demo`, only in demo builds: `VITE_DEMO_TOOLS=true` or `npm run dev`): scenario picker, reset, speed 1/2/5/10/20x (`POST /demo/speed`, `GET /demo/state`), vitals profile and pinned values, simulated fall, simulated "no data connection", simulated server error, rehearsal checklist.
- **SMS fallback**: offline "Not sent yet" screen shows "No internet. Tell your contacts by SMS" with the exact text, one `sms:` link per contact (Android `?body=`, iPhone `&body=`). No health data in the text; map link only with location consent and a known position. The app never claims an SMS was sent. Home now preloads contacts and consents so the card works after the connection drops.
- **Medicine reminders** (`/reminders`): create, edit, delete, pause, at most 8; stored on the server; in-app banner with Taken and "Remind me in 10 minutes"; hidden-tab notification says only "Reminder from HealthTwin". Works only while the app is open. No dose or missed-dose advice.
- **Alert record** (`/summary/:id`) and "Past alerts" in Profile: timeline, durations, what was shared, contacts notified (simulated), symptoms, vitals at alert, a "Questions for my doctor" box; Share, Copy, Download, Print. Nothing is uploaded or sent.
- 174 new strings in English, Hindi and Gujarati (`docs/TRANSLATION_REVIEW.md`). Precache 437.9 KiB: rarely used screens are lazy-loaded and cached when first opened.
- Tests: 74 unit tests, 10 browser test files (275 checks), contract 20/20, integration passes, axe 0 violations on 19 screens x 3 languages.
- Fixed: `POST /demo/vitals` returned the previous reading instead of the new profile's.

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
