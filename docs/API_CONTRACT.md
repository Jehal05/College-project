# API contract (HealthTwin AI)

This is the single source for the backend. The mock server in `mock-server/` implements it today; the real backend must answer the same URLs with the same JSON.
**Check any server against it:** `npm run contract -- <base-url>` (16 checks, PASS/FAIL per endpoint).

Conventions
- JSON everywhere (except the report upload and file download). Times are ISO 8601 strings (UTC).
- Login: `Authorization: Bearer <token>` on every call except `/health`, `/auth/login` and `GET /passport/:token`.
- Errors are always `{ "error": "plain text" }` with the right HTTP code. The app shows only its own wording, never this text.
- `401` = login missing/expired. The app signs the person out with a message (except on the emergency screens, which stay usable). `5xx` = the app shows a friendly message with a retry. Non-emergency calls give up after 10 s.
- CORS: allow the patient app's origin.
- Fixed values: states `MONITORING, SYMPTOMS_REPORTED, EMERGENCY_DETECTED, SOS_SENT, HOSPITAL_ACKNOWLEDGED, AMBULANCE_DISPATCHED, EN_ROUTE, ARRIVED, HANDOVER_DONE` (+ `CANCELLED`, `ESCALATED`). Consent keys `location, history, vitals, reports`. Symptom IDs are UPPER_SNAKE_CASE.

## Health and login

| Call | Answer |
|---|---|
| `GET /health` | `200 { "status": "ok" }` |
| `POST /auth/login` `{ email, password }` | `200 { token, role, patient_id }` (`role` is `PATIENT` for this app) or `401` |

## Patient

| Call | Body / answer |
|---|---|
| `GET /patients/:id` | `{ id, name, age, sex, blood_group, blood_group_verified, allergies[], conditions[], medications[], language ("en"\|"hi"\|"gu"), contacts[], consents{location,history,vitals,reports} }`; `404` if unknown |
| `PATCH /patients/:id` | any of `name, age, sex, blood_group, allergies, conditions, medications, language, consents`; answers the updated patient |
| `GET /patients/:id/vitals` | `{ heart_rate, spo2, bp "120/80", glucose, resp_rate, timestamp }` |
| `GET /patients/:id/baseline` | `{ heart_rate{min,max}, spo2{min,max}, bp_systolic{..}, bp_diastolic{..}, glucose{..}, updated_at }` |

## Consents

| Call | Body / answer |
|---|---|
| `GET /patients/:id/consents` | `{ consents{4 booleans}, changes[ { key, value, timestamp } ] (last 20, newest first) }` |
| `PUT /patients/:id/consents` | body: the 4 booleans (all required) -> same answer as GET; `400` if any is not a boolean |

Changes apply to the NEXT emergency and to the passport page immediately.

## Contacts (at most 5, exactly one primary)

| Call | Body / answer |
|---|---|
| `GET /patients/:id/contacts` | `[ { id, name, relation, phone, is_primary } ]` |
| `POST /patients/:id/contacts` | `{ name, relation (Mother\|Father\|Spouse\|Sibling\|Child\|Friend\|Other), phone (+ and 8-15 digits), is_primary? }` -> `201` contact; `400` invalid; `409` already 5 |
| `PUT /patients/:id/contacts/:contactId` | same body -> `200` contact; `404` |
| `DELETE /patients/:id/contacts/:contactId` | `204`; `404`. If the primary is deleted another becomes primary |

## Reports (demo files only)

| Call | Body / answer |
|---|---|
| `GET /patients/:id/reports` | `[ { id, name, content_type, size, uploaded_at } ]` (never the bytes) |
| `POST /patients/:id/reports?name=file.pdf` | raw file as the body, `Content-Type` `application/pdf`, `image/jpeg` or `image/png`, max 2 MB, max 10 reports -> `201` info; `415` wrong type; `413/400` too big/empty; `409` full |
| `GET /patients/:id/reports/:reportId/file` | the file bytes with its content type; `404` |
| `DELETE /patients/:id/reports/:reportId` | `204`; `404` |

## Emergencies

| Call | Body / answer |
|---|---|
| `POST /emergencies` | `{ patient_id, type (HEART\|STROKE\|DIABETIC\|ASTHMA\|UNKNOWN for check-in alerts), symptoms[ID], consents?, source? (MANUAL\|FALL_CHECK\|INACTIVITY_CHECK, default MANUAL) }` -> `201 { id, state: "EMERGENCY_DETECTED", severity }`; `400` for an unknown type or a symptom not valid for that type |
| `POST /emergencies/:id/sos` | `{ location?: { lat, lng, accuracy, source } }` -> `200 { id, state, hospital }`. Sending twice is harmless. `409` if cancelled |
| `POST /emergencies/:id/cancel` | `200 { id, state: "CANCELLED" }`; `409` if already finished |
| `GET /emergencies/:id` | `{ id, patient_id, type, symptoms[], location, state, severity, hospital, ambulance, eta_seconds, status_events[ { state, timestamp } ], contacts_notified[] }`; `404` |
| `GET /hospitals?lat=&lng=` | `[ { id, name, lat, lng, capabilities[], available, verified, distance_km } ]` nearest first |

The location is stored only when the `location` consent is on. Symptom IDs per type: HEART `CHEST_PAIN, SHORT_BREATH, SWEATING, NAUSEA, ARM_JAW_PAIN, FAINTING`; STROKE `FACE_DROOP, LIMB_WEAKNESS, SLURRED_SPEECH, SUDDEN_CONFUSION, SEVERE_HEADACHE`; DIABETIC `DIA_CONFUSION, DIA_SHAKING, DIA_SWEATING, DIA_FAINTING, LOW_GLUCOSE_READING`; ASTHMA `WHEEZING, CANNOT_SPEAK_SENTENCES, SEVERE_SHORT_BREATH, BLUE_LIPS`.

## Health passport (Phase 5)

The QR code holds only `<app address>/p/<token>`. No personal or health data goes into the QR.

| Call | Body / answer |
|---|---|
| `POST /patients/:id/passport` | `{ hours: 1 \| 24 \| 168 }` (default 24) -> `201 { token (22+ URL-safe chars), expires_at }`. Replaces any earlier passport. `400` for other hours |
| `GET /patients/:id/passport` | the current `{ token, expires_at }`, or `404` when none/expired/revoked |
| `DELETE /patients/:id/passport` | revoke -> `200 { ok: true }` |
| `GET /patients/:id/passport/log` | `[ { opened_at } ]`. ONLY times: no IP address, no device information |
| `GET /passport/:token` (NO login) | `{ name, age, blood_group, expires_at, shared: { history }, allergies[], conditions[], medications[], contacts[ { name, relation, phone } ] }`. The four lists and contacts are included ONLY when `history` consent is on (omit the keys when off). Expired, revoked or unknown token -> `410 { error }`. Every successful open is logged and broadcast as `passport.opened` |

The responder page never shows the words diagnosis, risk, normal or abnormal and says "Prepared by the patient. Not verified by a doctor."

## Live events: WebSocket `ws://<server>/ws`

Every message: `{ type, emergency_id (or null), state, timestamp, payload }`.

| type | state | payload |
|---|---|---|
| `vitals.update` (every second) | `MONITORING` | `{ patient_id, heart_rate, spo2, bp, glucose }` |
| `emergency.created` | `EMERGENCY_DETECTED` | `{ type, severity, symptoms[] }` |
| `emergency.sos_sent` | `SOS_SENT` | `{}` |
| `hospital.alerted` | `SOS_SENT` | `{ hospital { id, name, distance_km } }` |
| `contacts.notified` | current | `{ contacts[ { id, name, relation } ] }` (names only, NEVER phone numbers) |
| `hospital.acknowledged` | `HOSPITAL_ACKNOWLEDGED` | `{ hospital_id, acknowledged_by }` |
| `ambulance.dispatched` | `AMBULANCE_DISPATCHED` | `{ ambulance_id, eta_seconds }` |
| `ambulance.location` | `EN_ROUTE` | `{ ambulance_id, lat, lng, eta_seconds }` |
| `emergency.arrived` | `ARRIVED` | `{ ambulance_id }` |
| `emergency.handover_done` | `HANDOVER_DONE` | `{}` |
| `emergency.cancelled` | `CANCELLED` | `{}` |
| `passport.opened` | `MONITORING` | `{ patient_id }` (emergency_id is null; no IP or device data) |

`npm run integration` plays one emergency and checks these shapes.

## Phase 6 additions

| Call | Body / answer |
|---|---|
| `POST /emergencies` | New optional `source` (`MANUAL`, `FALL_CHECK`, `INACTIVITY_CHECK`); `400` for any other value. `type: "UNKNOWN"` with `symptoms: []` is accepted only with a check-in `source`. It is stored and returned by `GET /emergencies/:id` |
| `GET /emergencies/:id/reasons` | `{ severity, matched_rules: [ { id, type, severity, reason, reviewed } ], inputs: { symptoms[], vitals{} }, reviewed: false, simulated: true }`. `reviewed` stays `false` until a doctor signs the rules off. Vitals are used only if the vitals consent was on. `404` for unknown ids |
| `GET /patients/:id/emergencies` | Newest first, last 5 or more: `[ { id, started_at, source, final_state } ]` |
| `GET /patients/:id/emergencies/:eid/summary` | `{ id, started_at, ended_at, source, final_state, simulated: true, timeline: [ { state, timestamp } ], durations: { to_acknowledged, to_dispatched, to_arrived, to_handover } (seconds or null), shared: { location, history, vitals, reports } (as consented at the time), symptoms[], vitals_at_alert{}, contacts_notified: [ { name } ], hospital: { name } or null, ambulance_id or null }`. A record of what the app did; no interpretation |
| `GET/PUT /patients/:id/preferences` | `{ safety_checkin: { enabled: boolean, minutes: 5\|15\|30 } }`; `400` for anything else |
| `GET/POST /patients/:id/reminders` | `{ name (max 60), dose_note (max 60), times: ["HH:MM", 1 to 4], days: [0..6] (0 = Sunday), paused }`; at most 8 (`409` on the ninth); `400` with a plain message when invalid |
| `PUT/DELETE /patients/:id/reminders/:rid` | Update (`200`) / delete (`200`); `404` unknown |
| `POST /patients/:id/reminders/:rid/shown` | `{ scheduled_for }` records that a reminder was shown |
| `POST /patients/:id/reminders/:rid/taken` | `{ scheduled_for, at }`. Deviation from the Phase 6 prompt (`{ at }` only): the slot time is needed to know which dose was marked |
| `GET /patients/:id/reminders/log` | Last 7 days: `[ { reminder_id, scheduled_for, taken_at (or null) } ]`. Only a record; no advice |

`emergency.created` payload adds `source` and `reasons` (same object as `/reasons`). `vitals.update` payload may add `bp_sys`, `bp_dia` and `resp_rate` next to the existing `bp` string (consumers that ignore them keep working).

Names: the app uses `CHEST_PAIN`, the rules use `chest_pain`, `bp` is `bp_sys` + `bp_dia`. These translations live in one adapter file per side.

## Mock-only helpers (a real backend does NOT need them)

`POST /demo/scenario { type }`, `POST /demo/reset`, `POST /demo/passport/expire`, `POST /demo/fail { mode: off|server|expired|slow }` (makes the mock answer 500, 401 or slowly so error handling can be tested).

Phase 6 demo helpers: `POST /demo/vitals { profile?, overrides? }` (profiles `normal`, `heart_attack`, `stroke`, `low_glucose`, `asthma`; an unknown profile or an out-of-range value gives `400` and changes nothing; `{ "heart_rate": null }` inside `overrides` clears one pinned value; `{}` clears all), `POST /demo/speed { multiplier }` (only 1, 2, 5, 10, 20; applies to timers started afterwards), `GET /demo/state` (`{ speed, allowed_speeds, vitals: { profile, overrides, profiles } }`). `POST /demo/reset` returns everything to normal, including reminders, past emergencies and preferences.


## Differences from Daksh's contract (`backend/CONTRACT.md` v0.6 on the `Daksh` branch)

The mock server (`mock-server/compat.js`) now speaks Daksh's names **next to** ours; old names keep working. The app translates in one file: `patient-app/src/utils/adapters.js`. `npm run contract` has a block that checks these names, so it can be run against his backend too.

| Topic | Daksh v0.6 | This mock / app today |
|---|---|---|
| Login | `{ username, password }` -> `{ token, role, user_id, patient_id }`; demo `patient1` / `demo-password` | Accepts `username` (the app sends it) and the old `email`; answers with `user_id` too. Both `patient1` and `patient@demo.test` work |
| IDs | `pat_001`, `em_001`, `hosp_001`, `amb_001` | **Different on purpose (Phase 7):** realistic-looking fictional IDs: patient `PT-2026-0417`, emergency `EM-YYYYMMDD-nnnn`, hospital `HSP-AMD-001` to `005`, ambulance `AMB-AMD-01` to `05`. The apps treat IDs as opaque strings. Style lives in `mock-server/data/*.json` and `store.nextEmergencyId()` only. The portal's `H1`-`H5` / `AMB-1`-`AMB-5` are kept in the `portal_id` field of each record. |
| Errors | `{ "detail": text }` | `{ "error", "detail" }` (both, same text) |
| Event envelope | `event` | `event` and `type` (both) |
| WebSocket | `/ws/emergencies/{id}?token=`, `/ws/hospitals/{id}?token=` | `/ws` plus both of his paths (the mock sends every event on all of them and does not check the token) |
| Emergency history | `timeline [ { state, timestamp, actor, seconds_since_start } ]` | `timeline` and `status_events` (both) |
| `POST /emergencies` | `consent` (singular), lowercase symptoms, `type` optional (engine decides), answer has `reasons` (list of strings), `rule_ids`, `action` | All accepted. Our `consents`, UPPER_SNAKE symptoms and `source` still work. The `reasons` OBJECT is at `GET /emergencies/:id/reasons` and in the `emergency.created` payload |
| Consents | `GET`/`PUT` answer `{ patient_id, consents, simulated }`, `PUT` takes only the changed flags and adds `changed`; `GET /consents/history` | All of that, plus our `changes` list |
| Passport | `GET /passport/{patient_id}?token=` (401 expired or tampered, 403 other patient) | Also works (random token from our `POST /patients/:id/passport`); our `GET /passport/:token` (410 when gone) still serves the responder page |
| Demo | `POST /demo/scenario { scenario }`, `/demo/reset` -> `{ status: "reset" }` | Both spellings accepted |

**Not aligned yet (decisions needed):**
- `POST /reports` (his) vs `POST /patients/:id/reports` (ours); no file-upload shape in his contract.
- Hospitals: **aligned in Phase 7.** `capabilities` is an object (`cath_lab`, `stroke_unit`, `icu`, `emergency`) and `availability` is `{ beds_free, icu_free, cath_lab_ready, stroke_unit_ready }` (the portal's names; Daksh v0.6.1 names `icu_beds`, `cath_lab_open`, `stroke_unit_open` are also read by the portal). Open: agree one set of availability names.
- Our Phase 6 endpoints are not in his contract: baseline, contacts, reminders, preferences, alert summary and past emergencies, `/demo/speed`, `GET /emergencies/:id/reasons`, `UNKNOWN` type and `source`. They need to be added to the real backend or dropped.
- Validation status: his `422` for a non-boolean consent, ours `400`.
- His open decision: the backend moves `EMERGENCY_DETECTED` to `SOS_SENT` when the cancel countdown ends. The app currently sends `POST /emergencies/:id/sos` itself. **Phase 7:** this mock matches that effect for hospital listeners: nothing is broadcast before the SOS and `emergency.created` is sent at SOS with state `SOS_SENT`. The REST state is still `EMERGENCY_DETECTED` until the SOS call. The decision (who moves the state, app or backend) is still open.
- His `/insights` (wellbeing notes) has no screen in the patient app.

## Phase 7: what the hospital portal gets

**Order at SOS (nothing is broadcast before it; cancelling inside the countdown sends the hospital nothing):**
`emergency.created` (state `SOS_SENT`) -> `emergency.sos_sent` -> `hospital.alerted`. Set `ALERT_AT=detected` to get the old thin `created` at `EMERGENCY_DETECTED` as well.

**`emergency.created` payload.** Always: `type`, `severity`, `symptoms` (readable English labels, e.g. "Chest pain"; a safety check-in alert says "No symptoms reported (safety check-in)"), `symptom_ids` (app IDs), `source`, `patient_id`, `patient_summary { name, age, blood_group }`, `patient { id, name, age, sex }`, `created_at`, `reasons`, `consents`, `hospital { id, name, distance_km, rank }`, `simulated: true`. Only with consent: `vitals { heart_rate, spo2, bp, bp_sys, bp_dia, glucose, resp_rate }` (vitals), `location { lat, lng, accuracy }` (location and a known position), `patient.blood_group/allergies/conditions/medications` (history). A field that is not shared is **left out, never null**.

**`hospital.alerted` payload:** `hospital_id`, `rank` (1 = best match) and the old `hospital { id, name, distance_km }`.

**Hospitals** (`GET /hospitals`, sorted by distance): `{ id, portal_id, name, address, lat, lng, phone, verified, capabilities {cath_lab, stroke_unit, icu, emergency}, availability {...}, distance_km, simulated }`. Ranking: a hospital with the needed unit present **and ready** first (heart: cath lab; stroke: stroke unit; asthma: ICU; diabetic and unknown: emergency), then nearest. Data copied from the portal's seed (see `_comment` in `mock-server/data/hospitals.json`). Demo location: Ahmedabad 23.0225, 72.5714 (same in the portal, the mock and the app).

**Manual hospital mode (`HOSPITAL_MODE=manual`, default `auto`).** After `hospital.alerted` the mock waits. Staff (`HOSPITAL_STAFF` or `ADMIN` token; a patient token gets 403):

| Call | Moves to | Event |
|---|---|---|
| `POST /emergencies/:id/ack` | `HOSPITAL_ACKNOWLEDGED` | `hospital.acknowledged` |
| `POST /emergencies/:id/dispatch { ambulance_id }` | `AMBULANCE_DISPATCHED` | `ambulance.dispatched`, then `ambulance.location` ticks from the mock until the portal posts positions itself |
| `POST /emergencies/:id/status { state }` | `EN_ROUTE`, `ARRIVED`, `HANDOVER_DONE` | `ambulance.location`, `emergency.arrived`, `emergency.handover_done` |
| `POST /ambulances/:id/location { emergency_id, lat, lng, eta_seconds, ... }` | (state `EN_ROUTE`) | `ambulance.location` relayed to everyone |

An invalid move answers `409 { error, detail: "Invalid transition", from, to }`. In manual mode `POST /emergencies/:id/cancel` is refused (409) from `AMBULANCE_DISPATCHED` on (Daksh's table). The same endpoints also work in auto mode.

**Lists for the portal:** `GET /emergencies?status=active` (SOS sent, not finished or cancelled) and `?status=finished` (handed over or cancelled), each item with `emergency_id`, `created_at`, `status_events` and the created fields. `GET /ambulances` -> `[ { id, portal_id, call_sign, crew, base_hospital_id, lat, lng, status } ]`.

**Portal logins:** `staff@demo` / `admin@demo` with password `demo123` (answer has lowercase role `staff` / `admin` and `hospital_id`), next to the existing logins.

**Not in the mock (the portal keeps these local):** notes, chat, checklist ticks, hospital onboarding and edits, availability updates, responders, AED. Ids and the realistic-name choice: see the IDs row above.
