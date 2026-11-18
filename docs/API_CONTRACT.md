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
| `PATCH /patients/:id` | any of `name, age, sex, blood_group, allergies, conditions, medications, language, consents, home_city_id` (a known city id, otherwise `400`); answers the updated patient. `GET` carries `home_city_id` |
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
| `GET /hospitals?lat=&lng=&city_id=` | `[ { id, name, lat, lng, capabilities[], available, verified, distance_km, city_id, city_name, state } ]` nearest first. Optional `city_id` keeps one city (unknown id: `400`) |
| `GET /cities` | `[ { city_id, city_name, state, lat, lng, timezone, zoom, simulation_start { lat, lng, label }, simulated } ]`, any logged-in role. Truth: `backend/app/seed/data/cities.json` (AMD Ahmedabad, PNQ Pune) |

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

**`emergency.created` payload.** Always: `type`, `severity`, `symptoms` (readable English labels, e.g. "Chest pain"; a safety check-in alert says "No symptoms reported (safety check-in)"), `symptom_ids` (app IDs), `source`, `patient_id`, `patient_summary { name, age, blood_group }`, `patient { id, name, age, sex, blood_group }`, `created_at`, `reasons`, `consents`, `hospital { id, name, distance_km, rank }`, `simulated: true`. Only with consent: `vitals { heart_rate, spo2, bp, bp_sys, bp_dia, glucose, resp_rate }` (vitals), `location { lat, lng, accuracy }` (location and a known position), `patient.allergies/conditions/medications` (history). A field that is not shared is **left out, never null**.

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

## Phase 9: what Puneet asked for (mock only, Puneet (backend) must agree for the real backend)
**Staff passport.** `GET /passport/{patient_id}` with a `HOSPITAL_STAFF` or `ADMIN` bearer token returns the same fields as the QR page, only for the groups the patient's consents allow (`history` off: no `allergies`, `conditions`, `medications`, `contacts`; `reports` on: `reports: [{ name, content_type }]`). Answer shape: `{ name, age, blood_group, patient_id, shared: { history, reports }, ...groups }`. No login: 401. Patient token for another patient: 403. Unknown patient id with a staff token: 404 "No passport found for this patient". A random QR token in the same place still works as before (public). Every staff read is written to the audit log (`passport.staff_view`).

**Protected clinical view (QR passport step 4, MOCK ONLY, the FastAPI backend does not have it yet).** The staff read now needs `?purpose=` (`emergency_treatment`, `admission_check`, `ambulance_handover`, `follow_up`). Order of checks: role (403), unknown patient (404), missing or unknown purpose (400), hospital scope (403: staff may open patients whose home city is the city of their hospital; admins are not limited). The answer adds `purpose`, `audit_ref` (`AUD-00012`), `passport_expires_at` (or `null`) and `demo: true`. `POST /passport/resolve { token, purpose }` (staff or admin login) turns a live QR token into the same answer; an old, revoked or unknown token gives the neutral 410. Every outcome, allowed or denied, is audited with the purpose. `GET /passport/purposes` lists the purposes. There is no emergency override: that needs a clinical and legal review first.

**`passport_available`** (boolean) in the `emergency.created` payload: `true` when the history consent is on. No token, no data.

**`hospital.escalated`.** If an alert is still `SOS_SENT` (nobody acknowledged) after `ESCALATION_SECONDS` (default 30, divided by `DEMO_SPEED`), the mock broadcasts
`{ event: "hospital.escalated", emergency_id, state: "SOS_SENT", payload: { escalation_level, from_hospital_id, to_hospital_id, to_hospital_name } }`
and then `hospital.alerted` for the new hospital (`payload: { hospital_id, rank, hospital, escalation_level }`). `escalation_level` is 1 for the first move, 2 for the second. It goes through the ranked list and stops at the end, on acknowledge, dispatch or cancel. `GET /emergencies/{id}` then shows the new hospital.

**`PATCH /hospitals/{id}/availability`** (staff of that hospital, or admin; patient 403; staff of another hospital 403; unknown hospital 404). Body: any of `beds_free`, `icu_free` (whole numbers, 0 or more), `cath_lab_ready`, `stroke_unit_ready` (true or false), or Daksh's names `icu_beds`, `cath_lab_open`, `stroke_unit_open` (same meaning). Unknown field, wrong type or negative number: 400 with a plain `error`. Answer: the updated hospital exactly as `GET /hospitals` returns it. `GET /hospitals` now shows both name sets in `availability`. Broadcasts `hospital.availability_updated { hospital_id, availability }`. `POST /demo/reset` restores the seed numbers.

**WebSocket login.** `/ws`, `/ws/emergencies/:id` and `/ws/hospitals/:id` need `?token=<login token>`. A wrong token is accepted and closed at once with code **1008** (a browser can read the code). No token in the address: send `{ "type": "auth", "token": "..." }` within 5 seconds (answer `auth.ok`), otherwise the socket is closed with 1008. An unauthorised socket receives no events. Mock tokens never expire, so "expired" means "unknown". `WS_AUTH=off` switches the check off (old scripts).

**`GET /audit?page=1&page_size=50`** (admin only; others 403). `{ page, page_size, total, rows: [{ at, user, role, action, patient_id, outcome, reason, fields }] }`, newest first. Actions: `passport.view`, `passport.staff_view`, `hospital.availability_update`, `consent.change`. Never contains tokens, passwords or IP addresses.

**Login answer** now carries `hospital_id` for staff (`staff@demo.test` and `staff@demo`: `HSP-AMD-002`).

**Mock-only:** `POST /demo/no-ack { enabled, escalate_after_seconds? }` makes the fake hospital stay silent so the alert escalates (`NO_ACK_DEMO=1` does the same from the start). Not needed on a real backend; the contract test skips that check when it gets 404, 405 or 501.

**Built in the real backend (14 Nov, still built on `4d1ebae`) but PROPOSED, not agreed with Daksh in writing; the mock may differ:** `POST /emergencies/{id}/notes`, `POST /emergencies/{id}/chat`, checklist ticks, hospital add, edit and verify.

**Always shown, whatever the consents (Phase 9 follow-up):** name, age, sex and blood group (`patient`, `patient_summary` and the passport page agree). Allergies, conditions, medications and contacts need the `history` consent. Doctor review of this minimum is still pending.

**Core vs optional contract checks:** `npm run contract` counts the Phase 6 extras (safety check-in setting, medication reminders) separately as optional. A backend can skip them in its first pass: they print `OPTIONAL FAIL` and do not fail the run.

## Phase 10: family, responder and admin apps (mock; shapes follow Daksh's `backend/CONTRACT.md` section 4)

Shagun's three apps are shared out (see `docs/SHAGUN_WORK_SPLIT.md`). The mock now has the endpoints they need, so nobody waits for the real backend. All answers carry `"simulated": true`. A field the patient did not share is **left out**, never `null`. Contract checks: `npm run contract` (Phase 10 checks are optional, 9 of them).

Demo logins (password `demo1234`): `family@demo.test` (FAMILY, not linked yet), `responder@demo.test` (RESPONDER, verified). Usernames `family1` and `responder1` (password `demo-password`) also work.

| Endpoint | Who | Answer |
|---|---|---|
| `POST /patients/{id}/family-invites` | PATIENT (own) | `201 { code, expires_at }` (code like `FAM-4821`, valid 24 h). The demo code `FAM-0417` always works. |
| `POST /family/link { invite_code }` | FAMILY | `200 { patient_id, name, linked }`; `404` unknown code, `410` expired, `400` missing |
| `GET /family/patients` | FAMILY | List of `{ patient_id, name, shared_fields, vitals?, active_emergency }`. `vitals` only with the vitals consent. `active_emergency` is `null` or `{ id, state, started_at, hospital?{name}, eta_seconds?, location?{lat,lng}, checkins[] }` (location only with the location consent). Never allergies, conditions, medications, severity or phone numbers. |
| `POST /family/checkin { patient_id, emergency_id?, message }` | FAMILY (linked) | `201 { id, emergency_id, message, at }`. `message` is `ON_MY_WAY`, `CALLING_NOW` or `CANNOT_REACH`. `403` not linked, `404` no emergency, `400` bad message. |
| `POST /responders/register { name, email, password }` | public | `201 { id, verified:false }`; `409` email taken; `400` missing or password under 8 characters |
| `GET /responders/alerts` | RESPONDER (verified) | List of `{ id, type, distance_m, state, accepted }`. No name, no location. `403` while not verified. |
| `POST /responders/{id}/accept` | RESPONDER (verified) | `200 { id, accepted, patient:{name, age, allergies?}, location? }`: allergies need the history consent, location needs the location consent. A field is released only if the patient allowed it when the SOS was sent **and** still allows it now (the same rule applies to `location` in `GET /family/patients`). `404` unknown or finished. |
| `GET /admin/users?role=` | ADMIN | List of `{ id, email, role, disabled, verified? (responders), hospital_id?, patient_id? }`. No passwords. |
| `PATCH /admin/users { id, disabled?, role?, verified? }` | ADMIN | The changed user. A disabled user is signed out at once and cannot log in (`403`). `409` own account, `404` unknown, `422` bad value. |
| `GET /content/{type}` | all (admin sees unapproved too) | `{ type, version, approved, approved_by, items[] }`; `404` for unapproved content unless ADMIN. Seed: `emergency_numbers` (approved), `first_aid_basics` (not approved, because no doctor has reviewed it). |
| `PUT /content/{type} { items, approved? }` | ADMIN | Version goes up by 1. A changed text is **not approved** unless the same request sets `approved:true`. |
| `POST /feedback { emergency_id, rating 1-5, comment? }` | PATIENT, FAMILY (linked) | `201 { id }`; `409` second feedback for the same emergency; `422` bad rating |
| `POST /privacy-requests { type: EXPORT or DELETE, patient_id? }` | PATIENT (own), ADMIN | `202 { id, status:"RECEIVED" }`. Nothing is exported or deleted in the mock. |

**WebSocket per role.** Patients, staff and admin receive every event as before. A **family** socket receives only `family.status` (`{ emergency_id, state, timestamp, payload:{} }`) for linked patients: no vitals, no details. Re-read `GET /family/patients` when one arrives. A **verified responder** socket receives only `responder.alert` (`payload: { alert_id, distance_m, type }`). Other roles receive nothing.

Audit rows added (visible to admin at `GET /audit`): `family.invite_created`, `family.link`, `family.checkin`, `responder.register`, `responder.accept`, `admin.user_update`, `content.update`, `privacy.export_request`, `privacy.delete_request`.

States used by these endpoints (from Daksh's table): `SOS_SENT`, `HOSPITAL_ACKNOWLEDGED`, `AMBULANCE_DISPATCHED`, `EN_ROUTE`, `ARRIVED` count as "live".

## Proposed: predictions, organs, report extraction

**PROPOSED, NOT AGREED. BUILT ON BRANCH `Puneet` ONLY (not merged to `main`, not in the mock).** Written 15 Nov 2026 by Puneet for review by Puneet (backend; Daksh until 16 Nov 2026) and Jehal (patient app and mock). The routes below exist in `backend/app` on that branch (Phase 2 and Phase 3 builds, notes under each section), so the endpoint counts elsewhere in the docs (for example "77 contract endpoints") do **not** include them. When a route is agreed, move it into the sections above and update the counts. The rows in `backend/CONTRACT.md` marked PROPOSED exist only so the backend's contract test, which compares the served routes with that file, keeps passing.

Rules for all three: they are simulated estimates for a prototype, not medical advice. Errors use the real backend's shape `{ "error": "plain text", "detail": "same text" }` (the older conventions line at the top says only `error`; the real backend sends both). `401` = login missing, bad or expired; `403` = logged in but not allowed; an unknown id answers `404`, the same as a patient who is not yours, so ids cannot be probed. Every access to a patient's data is written to the audit log.

### 1. Predictions: `POST /predictions/{model}`

`model` is `heart` or `diabetes`. Who may call: PATIENT (own data only). Clinical roles are not decided yet (open question 3: decided 16 Nov 2026, PATIENT only for now).

Request: `{ "patient_id"?: "PT-...", "inputs"?: { ...model features... } }`. If `inputs` is missing, the server fills what it can from the patient's own record and answers `400` listing the **names** of the missing features. If `inputs` is given (the what-if case for the Simulator) the server scores exactly those.

Answer `200`:

```json
{
  "model": "heart",
  "risk": 0.23,
  "band": "low",
  "top_factors": [
    { "feature": "systolic_bp", "direction": "raises", "contribution": 0.08 }
  ],
  "model_card": {
    "name": "heart-logreg", "version": "0.1.0",
    "dataset": "TO FILL (see docs/ML_DATASETS.md)", "dataset_source": "TO FILL",
    "trained_on": "YYYY-MM-DD",
    "metrics": { "precision": null, "recall": null, "f1": null, "roc_auc": null, "calibration": null }
  },
  "limits": "Plain text shown next to the score: small public dataset, not validated on Indian patients, not a diagnosis.",
  "notice": "Estimate, not a diagnosis. In an emergency call 112.",
  "simulated": true
}
```

- `risk` is 0 to 1. `band` is `low`, `medium` or `high`; the cut-offs are stored with the model card, not invented in the screen.
- `top_factors`: 3 to 5 entries, ordered by size. `direction` is `raises` or `lowers`. `contribution` is in the same units as `risk`.
- Errors: `404` unknown model name; `403` not your patient; `400` missing or out-of-range features (field names only, never the values; the real backend answers validation errors with 400); `503` if the model file is not loaded.
- The score never delays or replaces an emergency: the SOS flow does not call this route.

**Phase 2 build notes (deviations from the text above; to be agreed).** `top_factors[].contribution` is the change in risk if that input sat at the training average (so it is in the same units as `risk`), and each factor also carries `log_odds` (coefficient times the standardised value). `model_card` also carries `confusion_matrix`, `threshold` and `synthetic`. Unknown input names are refused with `400`. Until real model files replace the shipped ones, the `notice` starts with "PRACTICE MODEL trained on invented data". The route is built in `backend/app/api/predictions.py` on branch `Puneet` only. Only `age` and `sex` are taken from the patient's record; everything else must be sent.

**Phase 3 build notes (what-if).** `POST /predictions/{model}` also accepts an optional `scenario`: an object of model-input names to new values, laid over the inputs the request or the record gives. Without `scenario` the answer is exactly the Phase 2 answer. With it the answer is:

```json
{
  "model": "heart",
  "current":  { "risk": 0.5067, "band": "high" },
  "scenario": { "risk": 0.3886, "band": "high" },
  "difference": -0.1181,
  "changed_inputs": [
    { "feature": "resting_bp", "from": 138.0, "to": 120.0, "risk_if_only_this_changes": 0.4359, "change": -0.0708 }
  ],
  "interaction": 0.0014,
  "note": "These models are logistic: the effect of one change depends on the other inputs, so the single-change numbers do not add up to the total. `interaction` is the part that does not add up.",
  "notice": "Hypothetical. Not a prediction of what will happen. (plus the practice-model sentence while the model is synthetic)",
  "limits": "...", "model_card": { "...": "..." }, "simulated": true
}
```

- `change` is the risk with only that input changed minus the current risk. `interaction` is `difference` minus the sum of the single changes. `current` is what the plain call would answer for the same inputs. `current` and `scenario` hold no `top_factors`.
- Only the model's own inputs can change, inside the model's accepted range. An unknown name, a value that is not a number or is out of range, an empty scenario and a scenario that changes nothing are each `400` naming the field(s), never the values. Real missing inputs are reported first.
- **`exercise`, `smoking`, `sleep` and `diet` are not model inputs, so they cannot be changed here and no coefficient was invented for them.** The patient app's Simulator controls (`heart_rate`, `spo2`, `bp`, `glucose`) do not line up with the model inputs either: `bp` (systolic) could feed `heart.resting_bp` but the diabetes model's `blood_pressure` is a diastolic value; the diabetes `glucose` is a lab glucose, not the simulated live glucose; `max_heart_rate` is a stress-test peak, not the live heart rate; `spo2` has no input. The screen must therefore offer the model inputs themselves, not map the four sliders silently. Which mapping is clinically acceptable is for the doctor review.


### 2. Organ data: `GET /patients/{id}/organs/{organ}`

`organ` is `heart`, `lungs`, `kidneys` or `liver`. Who may call: PATIENT (own); a linked FAMILY user and hospital staff only where the existing consent rules already release the same fields (open question 4).

Answer `200`:

```json
{
  "organ": "kidneys",
  "has_data": true,
  "items": [
    {
      "key": "creatinine", "kind": "lab", "value": 1.1, "unit": "mg/dL",
      "source": "entered", "last_updated": "2026-11-14T09:30:00Z",
      "reference_range": { "low": 0.6, "high": 1.3 },
      "trend": [ { "at": "2026-08-02T00:00:00Z", "value": 1.0 } ]
    }
  ],
  "mapping_note": "Which readings belong to which organ is a fixed table, documented in the backend.",
  "label": "Educational representation, not a medical image."
}
```

- `source` is one of `entered`, `imported`, `simulated`. Every item carries it, and `last_updated`.
- **No data:** `{ "organ": "...", "has_data": false, "items": [] }`. Never `0` or a made-up value.
- `trend` holds the last N values (N is set by the server, at most 12).
- Errors: `404` unknown organ or patient; `403` not allowed; fields the patient has not consented to are left out, not blanked.

**Phase 3 build notes (organs; deviations from the text above, to be agreed).**

- Built in `backend/app/api/organs.py` and `backend/app/services/organs.py`. PATIENT, own record only: everybody else gets `403` (audited) before any `404`. The contract's "family and staff where consent allows" is **not** built (open question 4).
- The organs are the patient app's own six: `heart`, `lungs`, `kidneys`, `liver`, `pancreas`, `brain`. The text above names four. `pancreas` is added because the app's Twin screen and `labs.js` use it (HbA1c, fasting glucose, and the glucose reading); `brain` is answered but has **no mapped reading**, so it always says `has_data: false`. Any other name is `404`.
- `source` is `simulated`, `entered` or `report_extracted` (the text above says `entered`, `imported`, `simulated`; there is no import route, and `report_extracted` says where a confirmed value came from).
- `mapping_note` and `label` are at the top of the answer, as above. Each item has `key`, `kind` (`vital` or `lab`), `value`, `unit`, `source`, `last_updated`, `reference_range` (or `null`) and `trend`.
- **Vitals** are one current simulated reading with **no trend** (`trend: []`): the simulator keeps no history. They always exist, so an organ with a vital always has `has_data: true`. **Labs** carry the newest value, its unit, source and printed range, and `trend` holds up to the last 12 values, oldest first, as `{ "at": "<taken_on>T00:00:00Z", "value": n }`. Only labs that have a stored value are listed.
- `reference_range` is only ever a range the patient saved from a report. The server never invents one, so vitals have `null`.

The fixed mapping (`app/services/organs.py`, pinned by a test that spells the table out):

| organ | vitals (simulated, no trend) | labs (stored, with trend) |
|---|---|---|
| heart | `heart_rate` (bpm), `bp_sys` (mmHg), `bp_dia` (mmHg) | `cholesterol`, `ldl` (mg/dL) |
| lungs | `spo2` (%), `resp_rate` (breaths/min) | none |
| kidneys | none | `creatinine` (mg/dL), `egfr` (mL/min/1.73 m2) |
| liver | none | `alt`, `ast` (U/L), `bilirubin` (mg/dL, total) |
| pancreas | `glucose` (mg/dL) | `hba1c` (%), `fasting_glucose` (mg/dL) |
| brain | none | none |

### 3. Report extraction: `POST /reports/extract`

Who may call: PATIENT (own). Request: the file as the raw body, `Content-Type` `application/pdf`, `image/jpeg` or `image/png`, max 2 MB (the same limits as the existing upload). `?patient_id=` is optional and defaults to the caller's own.

Answer `200`. **Nothing is saved by this call.**

```json
{
  "status": "proposed",
  "values": [
    {
      "test": "HbA1c", "value": 6.4, "unit": "%",
      "reference_range": { "low": 4.0, "high": 5.6 },
      "flag": "high", "confidence": 0.82, "raw_text": "HbA1c 6.4 %"
    }
  ],
  "unreadable": ["page 2 could not be read"],
  "notice": "Read by software. Please check each value against your report before saving."
}
```

- `flag` is `low`, `normal` or `high`, or `unknown` when no range was found. `confidence` is 0 to 1.
- Only a short list of tests is supported at first; anything else is left out and named in `unreadable`.
- Errors: `415` wrong type; `413` too big; `400` empty, unreadable or nothing recognised (the same code as an unreadable file; the message tells them apart).

**Saving confirmed values is a separate step, and it does not exist yet.** The existing report endpoints store files only, not values. The proposal is a new route, `POST /patients/{id}/lab-values { values: [ { test, value, unit, reference_range, taken_on } ] }`, which stores each value with `status: "confirmed_by_patient"`, `source: "report_extracted"` and an audit entry. The patient app calls it only after the person has reviewed and, if needed, corrected the values. Extracted values are never saved automatically.

**Phase 3 build notes (extraction; deviations from the text above, to be agreed).**

- Built in `backend/app/api/report_extract.py` and `backend/app/services/report_text.py` (pure standard library). PATIENT only, always the caller's own record (`?patient_id=` is not read). Nothing is saved; a test counts the rows before and after.
- **Only PDFs with selectable text are read.** `image/jpeg` and `image/png` answer `400` ("Scanned images need OCR, which is not available yet"), and so does a PDF with no text layer. `415` for any other type, `413` over 2 MB, `400` for an empty body or a file that is not a PDF, exactly as the existing upload.
- Reading PDF text needs the optional package `pypdf`. It is **not** added to `requirements.txt`. If it is not installed the route answers `503` ("Text reading is not installed on this server") and nothing else is affected. Proposal for Daksh: add `pypdf` (pure Python, BSD licence) to `requirements.txt` and the lock, or leave extraction switched off.
- Supported tests, as the patient app's keys: `hba1c`, `fasting_glucose`, `creatinine`, `egfr`, `alt`, `ast`, `bilirubin` (total only), `cholesterol` (total), `ldl`. `test` is this key, not the display name in the example above.
- `value` and `unit` are in the app's unit. A report in other units is converted (HbA1c mmol/mol to % by the IFCC-NGSP master equation, glucose mmol/L x 18.016, creatinine umol/L / 88.4, cholesterol and LDL mmol/L x 38.67, bilirubin umol/L / 17.1) and the printed range with it. `raw_text` is the matched line, and each value also carries `original_value` and `original_unit`.
- `flag` is `low`, `normal` or `high` **only against a range printed on the report**; otherwise `unknown`. `confidence` is a documented rule, not a probability: 0.6 for a label, a number and a recognised unit, plus 0.3 for a printed range, plus 0.1 when nothing unexpected is left on the line.
- `unreadable` is a list of objects, not strings: `{ "test": key or null, "raw_text": "...", "reason": "test_not_supported" | "unit_missing_or_unknown" | "ambiguous_number" | "value_not_positive" }`. A value with a missing or unknown unit is listed there, never guessed.
- One result per line, label first. A value on the line below its label is not read. A decimal comma is read as a decimal point; a comma followed by exactly three digits (`1,200`) is ambiguous and not read. The first result for a test wins.
- The answer also has `notice`: "Read from the text of your report by a simple program, so it can be wrong. Check every value against the report. Nothing has been saved."

### 4. Lab values: `POST` and `GET /patients/{id}/lab-values`, `DELETE /patients/{id}/lab-values/{lab_id}`

The step that saves what the patient confirmed. PATIENT, own record only; `403` (audited) comes before `404`.

`POST` body (`extra` fields are refused):

```json
{ "values": [ {
    "test": "hba1c", "value": 6.4, "unit": "%",
    "reference_range": { "low": 4.0, "high": 5.6 },
    "taken_on": "2026-11-01",
    "source": "report_extracted", "report_id": "REP-..."
} ] }
```

- 1 to 20 values per call, more is `400`. `test` is one of the nine keys above. `unit` must be the app unit for that test. `value` is a number above 0. `reference_range` is optional, each side optional, low not above high. `taken_on` is a date, not in the future. `source` is `entered` (default) or `report_extracted`; `report_id` is optional and must be one of the caller's reports. All values are checked first and saved together or not at all. At most 1000 values are stored per patient.
- `201` `{ "values": [ { "id": "LAB-...", "test", "value", "unit", "reference_range": {low, high} or null, "taken_on", "status": "confirmed_by_patient", "source", "report_id", "created_at" } ] }`.
- `GET ?test=hba1c` answers `200` `{ "values": [...] }`, newest first (by `taken_on`, then by when it was saved); an unknown `test` is `400`.
- `DELETE` answers `204`; an id that is not the patient's is `404`.
- The value and the range are stored **encrypted** (a test reads the raw column). Every save, read and delete is audited with test names only (`hba1c` appears as `hba_c`, because the audit log accepts letters and underscores only). Extracted values are never saved by `/reports/extract`; the app calls this route after the person has checked them.
- Errors name the field and position (`values[1].unit`), never the value.

### Open questions for review

Status on 16 Nov 2026: Puneet owns the backend (Daksh is off the project), Jehal owns the frontend. The original questions are kept; the status and decision follow each one.

1. **Daksh:** do you accept the three routes and the lab-values route in `backend/app/api`, and should the model files live in the repo or be loaded from a path in `.env`?
   **DECIDED 16 Nov 2026 (Puneet, backend):** accept the PROPOSED routes (predictions, organs, lab values, report extract, what-if) as built. Model files stay in the repo.
2. **Daksh:** I used `400` for validation failures because that is what `app/errors.py` does today (not FastAPI's `422`). Confirm.
   **DECIDED 16 Nov 2026 (Puneet, backend):** validation failures stay `400`.
3. **Team:** may hospital staff or a doctor call `/predictions`? Not decided; for now PATIENT only.
   **DECIDED for now 16 Nov 2026 (Puneet, backend):** PATIENT only. Staff and doctor access is **DEFERRED** to a later phase.
4. **Team:** may family and hospital staff read organ data, and under which consent keys?
   **DECIDED for now 16 Nov 2026 (Puneet, backend):** the patient's own record only. Family and hospital staff access and the consent keys are **DEFERRED**.
5. **Jehal:** can the mock return fixed examples of all three answers so the screens can be built first?
   **DEFERRED, owner Jehal** (the mock is part of the frontend).
6. **Team:** the patient app has six organs, this contract had four. Phase 3 serves `pancreas` and an empty `brain`. Confirm, or tell the app to drop them.
   **DECIDED 16 Nov 2026 (Puneet, backend):** keep serving `pancreas` and an empty `brain`. Jehal can ask for a change.
7. **Daksh:** add `pypdf` to `requirements.txt` (and the lock) so `/reports/extract` works, or keep it off? Scanned reports need OCR (Tesseract), which is a heavier decision.
   **DEFERRED, owner Puneet (backend):** no new dependency for now; `pypdf` stays optional and OCR is not decided.
8. **Jehal:** `test` is the app's key (`hba1c`), the lab-values and extract routes use the same nine keys, and `unreadable` is a list of objects. Can the Report and Twin screens read that?
   **DEFERRED, owner Jehal** (frontend screens).

#### Decisions (16 Nov 2026)

| # | Topic | Status | Decision | Owner |
|---|---|---|---|---|
| 1 | PROPOSED routes and model files | DECIDED | Accept as built; model files stay in the repo | Puneet (backend) |
| 2 | Validation error code | DECIDED | `400` | Puneet (backend) |
| 3 | Who may call `/predictions` | DECIDED for now | PATIENT only; staff deferred | Puneet (backend) |
| 4 | Who may read organ data | DECIDED for now | Own record only; family and staff and consent keys deferred | Puneet (backend) |
| 5 | Mock examples for the three answers | DEFERRED | Not decided | Jehal |
| 6 | Six organs | DECIDED | Keep `pancreas` and empty `brain` | Puneet (backend) |
| 7 | `pypdf` and OCR | DEFERRED | No new dependency now | Puneet (backend) |
| 8 | Report and Twin screens read the keys | DEFERRED | Not decided | Jehal |

## Phase 6A: PROPOSED additions (portal polish, 15 Nov 2026)

The portal works **without** every row below (the field is simply left out of the screen). Nothing here is built in the backend by this phase.

| Where | Field | Why the portal wants it | Today |
|---|---|---|---|
| `GET /emergencies`, `GET /emergencies/{id}`, `hospital.alerted` | `hospital.distance_km` (km, number) for the alerted hospital | Distance on the alert card | The backend already puts `distance_km` in the hospital reference when it ranked hospitals (`services/emergencies.py` `_hospital_ref`). The portal shows it only when present and drops it when the alert moves to another hospital. Please confirm it is sent on every read, not only on create. |
| `GET /ambulances` (list) | `registration` (string, optional) | A plate number on the unit panel | No such field; the panel shows call sign and id only. |
| `GET /ambulances`, `ambulance.location` | live `speed_kmh` (optional) | Speed on the unit panel | Not sent. The portal will not show a speed it did not receive. |
| `GET /hospitals/{id}/availability/history` | beds over time | Bed trend on Analytics | Does not exist. Analytics shows no bed history. |

## Two cities (Ahmedabad and Pune)

- `GET /cities`, `city_id` / `city_name` / `state` on hospitals and ambulances, `?city_id=` on `GET /hospitals` and `GET /ambulances`, and `home_city_id` on the patient are the same on the mock server and on Daksh's backend. `scripts/contract.mjs` checks all of them.
- Ids keep their city prefix: `HSP-AMD-001..005`, `HSP-PNQ-001..005`, `AMB-AMD-01..05`, `AMB-PNQ-01..05`. Pune patients `PT-2026-0420..0422` and Ahmedabad patients `PT-2026-0417..0419` are the same on both (mock: copied from `backend/app/seed/data/patients_more.json`).
- **Mock only (the backend ranks across cities in a later phase).** The mock picks the patient's current city from the SOS location (nearest city centre within 80 km; otherwise the patient's `home_city_id`, and the location is replaced by that city's `simulation_start` with `source: "simulated"`). Hospitals of that city are ranked first. A hospital of another city is chosen only when no hospital in the patient's own city can handle the emergency. Then `emergency.hospital` has `other_city: true` and a plain `note`. `emergency.city_id` and `city_name` say which city the response ran in.
- `POST /demo/scenario` accepts an optional `{ city_id, patient_id }`. The practice emergency starts at that city's `simulation_start` (default: the patient's home city).
