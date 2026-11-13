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
| `POST /emergencies` | `{ patient_id, type (HEART\|STROKE\|DIABETIC\|ASTHMA), symptoms[ID], consents? }` -> `201 { id, state: "EMERGENCY_DETECTED", severity }`; `400` for an unknown type or a symptom not valid for that type |
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

## Mock-only helpers (a real backend does NOT need them)

`POST /demo/scenario { type }`, `POST /demo/reset`, `POST /demo/passport/expire`, `POST /demo/fail { mode: off|server|expired|slow }` (makes the mock answer 500, 401 or slowly so error handling can be tested).
