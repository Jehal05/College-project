# Mock server (simulated data)

Stands in for the real FastAPI backend during week 1. All data is fake and lives in memory:
restart the server to reset it.

```
npm install        (from the repo root, once)
npm run mock       (from the repo root)   -> http://localhost:4000
```

Demo logins (password `demo1234`): `patient@demo.test` (PATIENT), `staff@demo.test` (HOSPITAL_STAFF), `admin@demo.test` (ADMIN).

Every route except `/health` and `/auth/login` needs the header `Authorization: Bearer <token>`.

| Method and path | Notes |
| --- | --- |
| POST /auth/login | `{ email, password }` -> `{ token, role, patient_id }` or 401 |
| GET, PATCH /patients/:id | Patient profile (edits kept in memory). Contacts and consents are no longer changed through PATCH contacts: use the endpoints below |
| GET /patients/:id/vitals | One normal vitals reading |
| POST /emergencies | Body `{ patient_id, type, symptoms[], consents? }` -> 201 `{ id, state: "EMERGENCY_DETECTED", severity }`. Location is NOT sent here |
| POST /emergencies/:id/sos | Body `{ location: { lat, lng, accuracy, source: "gps"\|"demo" } \| null }` -> `{ id, state: "SOS_SENT", hospital }`. Starts the simulated response. Safe to call twice |
| POST /emergencies/:id/cancel | -> `{ id, state: "CANCELLED" }`, stops the simulation. 409 if already HANDOVER_DONE |
| GET /emergencies/:id | `{ id, patient_id, type, symptoms, location, state, severity, hospital, ambulance, eta_seconds, status_events[] }` |
| POST /demo/scenario | Body `{ type }` -> creates an emergency with default symptoms, sends the SOS with the demo location, returns `{ id, state }` |
| POST /demo/reset | Cancels timers, clears emergencies, restores the seed patient -> `{ ok: true }` |
| GET /hospitals?lat=&lng= | Five fake hospitals with `distance_km`, nearest first |
| GET /patients/:id/consents | `{ consents: { location, history, vitals, reports }, changes: [ { key, value, timestamp } ] }` (last 20 changes, newest first) |
| PUT /patients/:id/consents | Body: all four booleans. Same answer as GET. 400 if a key is missing or not true/false |
| GET /patients/:id/contacts | `[ { id, name, relation, phone, is_primary } ]` |
| POST /patients/:id/contacts | Body `{ name, relation, phone, is_primary? }` -> 201 contact. 400 invalid, 409 when 5 already exist |
| PUT /patients/:id/contacts/:contactId | Same body -> 200 contact (setting `is_primary: true` moves the marker) |
| DELETE /patients/:id/contacts/:contactId | 204. If the primary is deleted the first remaining contact becomes primary |
| GET /patients/:id/reports | `[ { id, name, content_type, size, uploaded_at } ]` |
| POST /patients/:id/reports?name=lab.pdf | Raw file body with `Content-Type` application/pdf, image/jpeg or image/png, max 2 MB -> 201 report. 415 wrong type, 413 too large, 409 after 10 reports |
| GET /patients/:id/reports/:reportId/file | The stored bytes with the stored content type (needs the Authorization header) |
| DELETE /patients/:id/reports/:reportId | 204 |
| GET /patients/:id/baseline | `{ heart_rate, spo2, bp_systolic, bp_diastolic, glucose: { min, max }, updated_at }` |
| WebSocket /ws | `vitals.update` every second (payload now also has `bp` and `glucose`), plus the emergency events below |

Settings: `PORT` (default 4000) and `CORS_ORIGINS` (comma-separated; default allows localhost ports 5173, 5174 and 3000).

Files: `server.js` (setup and WebSocket), `routes.js` (REST endpoints), `store.js` (in-memory data), `helpers.js` (delay, auth, maths), `data/` (seed JSON).

## Emergency events (WebSocket /ws)

Every event is `{ type, emergency_id, state, timestamp, payload }` (`emergency_id` is null for vitals).

| Delay after SOS | Event type | State | Payload |
| --- | --- | --- | --- |
| (on create) | emergency.created | EMERGENCY_DETECTED | `{ type, severity, symptoms }` |
| 0 ms | emergency.sos_sent | SOS_SENT | `{}` |
| 1000 ms | hospital.alerted | SOS_SENT | `{ hospital: { id, name, distance_km } }` |
| 4000 ms | hospital.acknowledged | HOSPITAL_ACKNOWLEDGED | `{ hospital_id, acknowledged_by }` |
| 8000 ms | ambulance.dispatched | AMBULANCE_DISPATCHED | `{ ambulance_id, eta_seconds: 60 }` |
| 2000 ms | contacts.notified | (unchanged, current state) | `{ contacts: [ { id, name, relation } ] }`, only if the patient has contacts. No phone numbers. Also stored as `contacts_notified` on the emergency |
| 10000 ms, then every 2000 ms | ambulance.location | EN_ROUTE | `{ ambulance_id, lat, lng, eta_seconds }` |
| 40000 ms | emergency.arrived | ARRIVED | `{ ambulance_id }` |
| 50000 ms | emergency.handover_done | HANDOVER_DONE | `{}` |
| (on cancel) | emergency.cancelled | CANCELLED | `{}` |

All delays are divided by the environment variable `DEMO_SPEED` (default 1). Example: `DEMO_SPEED=10 npm run mock`
makes the whole response last 5 seconds. Every event also updates what `GET /emergencies/:id` returns.

Hospital choice (placeholder for the real ranking): required capability by type is HEART `CARDIAC_CATH_LAB`,
STROKE `STROKE_UNIT`, ASTHMA `PULMONOLOGY`, DIABETIC `EMERGENCY`. The nearest verified, available hospital with it is used;
otherwise the nearest verified, available hospital with `EMERGENCY`. With `location: null` the demo location is used.
Note: the seed Chest Institute is marked unavailable, so ASTHMA falls back to the nearest EMERGENCY hospital.

## Symptom IDs (always sent as IDs, never display text)

- HEART: CHEST_PAIN, SHORT_BREATH, SWEATING, NAUSEA, ARM_JAW_PAIN, FAINTING
- STROKE: FACE_DROOP, LIMB_WEAKNESS, SLURRED_SPEECH, SUDDEN_CONFUSION, SEVERE_HEADACHE
- DIABETIC: DIA_CONFUSION, DIA_SHAKING, DIA_SWEATING, DIA_FAINTING, LOW_GLUCOSE_READING
- ASTHMA: WHEEZING, CANNOT_SPEAK_SENTENCES, SEVERE_SHORT_BREATH, BLUE_LIPS

Contract notes for Puneet and Daksh: `consents` on create is optional (the server falls back to the patient's saved consents);
the demo location is the same coordinates as the seed Heart hospital, so the ambulance does not visibly move in the HEART demo.
Also: `simulator.js` holds the broadcast helper and the timers.

## Phase 3 notes

- Seed contacts (fake): `C-1 Asha Demo, Mother, +91 00000 00001, primary` and `C-2 Ravi Demo, Friend, +91 00000 00002`. The patient field is named `contacts`.
  Relations: Mother, Father, Spouse, Sibling, Child, Friend, Other. Phone: after removing spaces and dashes, an optional `+` then 8 to 15 digits.
- `GET /patients/:id/consents` is an addition beyond the original list so the screen can show the change log after a reload.
- Reports live in memory only (max 10, names cleaned to letters, digits, space, dot, dash, underscore). `POST /demo/reset` clears reports,
  restores the two contacts, and clears the consent change log.
- Files: `patientData.js` holds the consents, contacts, reports and baseline routes.

## Phase 5 notes (health passport and test helpers)

| Method and path | Notes |
| --- | --- |
| POST /patients/:id/passport | Body `{ hours: 1 \| 24 \| 168 }` (default 24) -> 201 `{ token, expires_at }`. Replaces the earlier passport. 400 for other hours |
| GET /patients/:id/passport | The current `{ token, expires_at }`, or 404 |
| DELETE /patients/:id/passport | Revoke -> `{ ok: true }` |
| GET /patients/:id/passport/log | `[ { opened_at } ]` (times only) |
| GET /passport/:token | NO login. `{ name, age, blood_group, expires_at, shared: { history }, allergies, conditions, medications, contacts }`; the last four only when the `history` consent is on. 410 when expired, revoked or unknown. Each open is logged and broadcast as `passport.opened` |
| POST /demo/passport/expire | Makes the current passport expire now (for tests) |
| POST /demo/fail | Body `{ mode: "off" \| "server" \| "expired" \| "slow" }`: every request (except health, login and `/demo/*`) answers 500, answers 401, or waits 12 s. `POST /demo/reset` switches it off. For testing the app's error handling |

New event: `passport.opened` (`emergency_id: null`, payload `{ patient_id }`, no IP or device data). Passports live in memory only and are forgotten by `POST /demo/reset`.
Files: `passport.js` (passport routes) and `failMode.js` (the failure switch). The full contract for the real backend is `docs/API_CONTRACT.md`; check any server with `npm run contract -- <url>`.
