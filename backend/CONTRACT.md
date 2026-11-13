# HealthTwin AI: API and Event Contract

**Version 0.6.1 | Owner: Daksh (backend) | Date: 13 November 2026**

> Simulated prototype. Not a medical device. The system supports emergency escalation. It does not diagnose.
> Anyone with possible heart attack symptoms should call 112 (or 108) immediately.

This file is the single source of truth for Jehal (patient app), Puneet (hospital portal), Shagun (family, responder, admin) and the mock server. **A field name or value changes only by agreement, and the change is announced the same day.**

Base URL (local): `http://localhost:8000` | Interactive docs: `/docs`

---

## 1. Shared values

### 1.1 Emergency states (in order)

`MONITORING → SYMPTOMS_REPORTED → EMERGENCY_DETECTED → SOS_SENT → HOSPITAL_ACKNOWLEDGED → AMBULANCE_DISPATCHED → EN_ROUTE → ARRIVED → HANDOVER_DONE`

Extra states: `CANCELLED`, `ESCALATED`.

### 1.2 Emergency types

`HEART`, `STROKE`, `DIABETIC`, `ASTHMA`

### 1.3 Severity

`EMERGENCY`, `URGENT`, `WATCH`, `NONE`

**Safety rule:** a low score from any model must never reduce severity when emergency symptoms are reported. Only the rules engine decides severity.

**Rules engine status:** every rule in `app/rules/rules.yaml` is marked **pending doctor review**. Symptom lists and thresholds are draft values, not medical advice. Chest pain always gives `EMERGENCY` (a hard-coded safety floor repeats the YAML rule). Vitals alone never go above `URGENT`. Severity never drops when evidence is added.

**What each severity triggers**

| Severity | Action code | Meaning |
|---|---|---|
| EMERGENCY | `alert_hospital_now` | Create the emergency, alert the hospital, notify family |
| URGENT | `prompt_symptom_check` | Ask the patient to confirm symptoms, show the call 112/108 option |
| WATCH | `log_only` | Record the reading, no alert |
| NONE | `no_action` | No indicators. This does not rule out any condition |

**Rules engine output** (used inside the `POST /emergencies` response):
```json
{ "type": "HEART", "severity": "EMERGENCY", "reasons": ["Chest pain is a red-flag symptom"],
  "action": "alert_hospital_now", "rule_ids": ["HEART_CHEST_PAIN"], "review_status": "pending doctor review" }
```
`type` is `null` when severity is `NONE`.

**Symptom names** the engine understands: `chest_pain`, `breathlessness`, `sweating`, `left_arm_pain`, `face_drooping`, `arm_weakness`, `slurred_speech`, `confusion`, `wheeze`, `low_glucose`. Vital names: `heart_rate`, `spo2`, `bp_sys`, `bp_dia`, `glucose`, `resp_rate`. Unknown names are ignored.

### 1.4 Roles

`PATIENT`, `HOSPITAL_STAFF`, `ADMIN`, `FAMILY`, `RESPONDER`

### 1.5 Timestamps and IDs

- All timestamps are ISO 8601 in UTC, for example `2026-11-16T10:00:00Z`.
- IDs are strings with a prefix: `pat_001`, `em_001`, `hosp_001`, `amb_001`, `usr_001`.

---

## 2. State transition table

Defined once in code (`app/models/enums.py`) and used by the API and by Puneet's buttons.

| From | Allowed next states |
|---|---|
| MONITORING | SYMPTOMS_REPORTED |
| SYMPTOMS_REPORTED | EMERGENCY_DETECTED |
| EMERGENCY_DETECTED | SOS_SENT, CANCELLED |
| SOS_SENT | HOSPITAL_ACKNOWLEDGED, ESCALATED, CANCELLED |
| ESCALATED | SOS_SENT (next hospital alerted), HOSPITAL_ACKNOWLEDGED, CANCELLED |
| HOSPITAL_ACKNOWLEDGED | AMBULANCE_DISPATCHED, CANCELLED |
| AMBULANCE_DISPATCHED | EN_ROUTE |
| EN_ROUTE | ARRIVED |
| ARRIVED | HANDOVER_DONE |
| HANDOVER_DONE | none (final) |
| CANCELLED | none (final) |

Rules:
- Each state moves only to the next one. No skipping.
- `CANCELLED` is allowed only **before** `AMBULANCE_DISPATCHED`.
- `ESCALATED` happens from `SOS_SENT` when there is no acknowledgement in 30 seconds (`ESCALATION_TIMEOUT_SECONDS`). The alert then goes to the next-ranked hospital.
- An invalid move returns **409 Conflict** with `{"detail": "Invalid transition", "from": "...", "to": "..."}`.
- `AMBULANCE_DISPATCHED` is set only through `POST /emergencies/{id}/dispatch`. Apps must show "Notification sent" until the mock operator confirms (see feature 60).

Emergency records start at `EMERGENCY_DETECTED`. `MONITORING` and `SYMPTOMS_REPORTED` describe the patient state and feed the digital twin bar.

**Open decision (confirm with Jehal on day 1):** who moves `EMERGENCY_DETECTED → SOS_SENT`? Proposal: the backend does it automatically when the cancel countdown ends (`COUNTDOWN_SECONDS`, default 10, set to 0 in the demo panel).

---

## 3. Authentication

Send `Authorization: Bearer <token>` on every endpoint except `/auth/login`, `/health` and the public passport link (which uses its own signed `token` query value).

### POST /auth/login
Request:
```json
{ "username": "patient1", "password": "demo-password" }
```
Response 200:
```json
{ "token": "eyJhbGciOi...", "role": "PATIENT", "user_id": "usr_001", "patient_id": "pat_001" }
```
Errors: `401` wrong credentials. `403` wrong role for the endpoint. `401` expired token.

`patient_id` is `null` for staff and admin users.

---

## 4. Endpoints

| Method and path | Purpose | Roles allowed | Main user |
|---|---|---|---|
| POST /auth/login | Log in, get token and role | public | all |
| GET /health | Liveness check. Returns `{"status": "ok", "simulated": true}`. No patient data | public | all |
| GET /patients/{id} | Read patient profile | PATIENT (own), HOSPITAL_STAFF (with consent), ADMIN | Jehal |
| PATCH /patients/{id} | Update patient profile | PATIENT (own), ADMIN | Jehal |
| GET /patients/{id}/consents | Current consent choices | PATIENT (own), ADMIN (read-only) | Jehal, Shagun |
| PUT /patients/{id}/consents | Change consent choices | PATIENT (own only) | Jehal |
| GET /patients/{id}/consents/history | Every consent change, oldest first | PATIENT (own), ADMIN (read-only) | Jehal, Shagun |
| GET /patients/{id}/vitals | Latest vitals (also streamed as `vitals.update`) | PATIENT (own), FAMILY (linked) | Jehal |
| POST /emergencies | Create an emergency | PATIENT | Jehal |
| POST /emergencies/{id}/cancel | Cancel a false alarm | PATIENT | Jehal |
| GET /emergencies/{id} | Details and timeline | all, scoped by role | all |
| POST /emergencies/{id}/ack | Hospital acknowledges | HOSPITAL_STAFF | Puneet |
| POST /emergencies/{id}/dispatch | Ambulance dispatched | HOSPITAL_STAFF | Puneet |
| POST /emergencies/{id}/status | Move to EN_ROUTE, ARRIVED or HANDOVER_DONE | HOSPITAL_STAFF | Puneet |
| GET /hospitals?lat&lng&type | Candidate hospitals with capabilities | HOSPITAL_STAFF, PATIENT, ADMIN | Puneet |
| PATCH /hospitals/{id}/availability | Update beds, ICU, cath lab, stroke unit | HOSPITAL_STAFF | Puneet |
| POST /ambulances/{id}/location | Ambulance position update | HOSPITAL_STAFF | Puneet |
| GET /passport/{id}?token | Emergency passport (respects consent, always audited) | signed token for that patient, HOSPITAL_STAFF, or the patient | Hospital staff |
| GET /audit | Search the audit log | ADMIN only | Shagun (feature 76) |
| GET /patients/{id}/insights | Sleep, activity and stress notes (wellbeing only) | PATIENT (own). Linked FAMILY with `vitals` consent, once feature 61 exists | Shagun (feature 67) |
| POST /reports | Upload a health report | PATIENT | Jehal |
| POST /demo/scenario | Run a scenario | ADMIN (demo) | Demo panel |
| POST /demo/reset | Reset to start state | ADMIN (demo) | Demo panel |
| POST /demo/vitals | Switch wearable profile or override vitals | ADMIN (demo) | Demo panel |

### Added for family, responder and admin apps (Shagun)

| Method and path | Purpose | Roles allowed |
|---|---|---|
| POST /family/link | Link a relative with an invite code | FAMILY |
| GET /family/patients | List linked patients | FAMILY |
| POST /family/checkin | Family reply, for example "I'm on my way" | FAMILY |
| POST /location-shares | Time-limited location sharing | PATIENT |
| GET /responders/alerts | Alerts for a responder | RESPONDER |
| POST /responders/{id}/accept | Accept an alert and release identity | RESPONDER |
| POST /responders/register | Volunteer sign-up | public, then RESPONDER |
| GET /admin/users, PATCH /admin/users | List, disable, change roles | ADMIN |
| GET /content/{type}, PUT /content/{type} | Medical content with `version` and `approved` | ADMIN (PUT), all (GET approved only) |
| POST /feedback | Rate the response | PATIENT, FAMILY |
| POST /privacy-requests | Data export or deletion request | PATIENT, ADMIN |

Rule: apps only show content where `approved = true`.

### 4.1 Key request and response shapes

**POST /emergencies**

Request:
```json
{
  "patient_id": "pat_001",
  "type": "HEART",
  "symptoms": ["chest_pain", "breathlessness"],
  "location": { "lat": 23.0225, "lng": 72.5714, "accuracy": 15 },
  "consent": { "location": true, "history": true, "vitals": true, "reports": false },
  "simulated": true
}
```
`type` is optional. If missing, the rules engine decides it from `symptoms`.

Response 201:
```json
{
  "id": "em_001",
  "patient_id": "pat_001",
  "state": "EMERGENCY_DETECTED",
  "type": "HEART",
  "severity": "EMERGENCY",
  "reasons": ["chest_pain is a red-flag symptom"],
  "created_at": "2026-11-16T10:00:00Z",
  "simulated": true
}
```

**GET /emergencies/{id}**
```json
{
  "id": "em_001",
  "patient_id": "pat_001",
  "state": "SOS_SENT",
  "type": "HEART",
  "severity": "EMERGENCY",
  "hospital": { "id": "hosp_001", "name": "Sample Hospital A" },
  "ambulance": null,
  "timeline": [
    { "state": "EMERGENCY_DETECTED", "timestamp": "2026-11-16T10:00:00Z", "actor": "system", "seconds_since_start": 0 },
    { "state": "SOS_SENT", "timestamp": "2026-11-16T10:00:10Z", "actor": "system", "seconds_since_start": 10 }
  ],
  "simulated": true
}
```
`timeline` comes from the `status_events` table (feature 19 reads it).

**POST /emergencies/{id}/ack**, **/dispatch**
```json
{ "hospital_id": "hosp_001", "note": "optional" }
```

**POST /emergencies/{id}/status**
```json
{ "state": "EN_ROUTE" }
```

**GET /hospitals?lat=23.02&lng=72.57&type=STROKE**
```json
[
  {
    "id": "hosp_001",
    "name": "Sample Hospital A",
    "lat": 23.03, "lng": 72.58,
    "capabilities": { "emergency": true, "cath_lab": true, "stroke_unit": false, "icu": true },
    "availability": { "icu_beds": 3, "cath_lab_open": true, "stroke_unit_open": false },
    "verified": true,
    "distance_km": 1.8,
    "simulated": true
  }
]
```

**POST /ambulances/{id}/location**
```json
{ "lat": 23.025, "lng": 72.575, "eta_seconds": 240, "emergency_id": "em_001" }
```

**GET /passport/{id}?token=...**

Returns only what the patient consented to share. Tokens expire (`PASSPORT_TOKEN_EXPIRE_MINUTES`). An expired or tampered token returns `401`.
```json
{
  "patient_id": "pat_001",
  "name": "Demo Patient",
  "age": 58,
  "blood_group": "B+",
  "conditions": ["hypertension"],
  "allergies": ["penicillin"],
  "contacts": [{ "name": "Demo Relative", "phone": "+91-0000000000", "order": 1 }],
  "reports": [{ "id": "rep_001", "name": "ECG.pdf" }],
  "shared_fields": ["location", "history", "vitals"],
  "simulated": true
}
```
Fields that the patient did not consent to are omitted, not sent as `null`.

**Passport access and errors**

Who can open `GET /passport/{id}`: a valid signed token **for that patient** (`?token=...`), a logged-in `HOSPITAL_STAFF` user, or the patient themselves. Admin, family and responders cannot.

| Status | When | Audit reason |
|---|---|---|
| 200 | allowed | none |
| 401 | token expired | `expired_token` |
| 401 | token tampered, forged or garbage | `tampered_token` |
| 401 | no token and no login | `missing_credentials` |
| 403 | token belongs to another patient | `token_patient_mismatch` |
| 403 | logged in, but not staff or that patient | `forbidden_role` |
| 404 | no such patient | `patient_not_found` |

A token is valid for `PASSPORT_TOKEN_EXPIRE_MINUTES` (default 30) and opens one patient only. Fields the patient did not consent to are omitted (see the consent rules above).

**Audit log** (feature 50)

Every passport view and every emergency read writes exactly one row, allowed or denied. Rows can never be edited or deleted (only `POST /demo/reset` in demo mode clears them).

`GET /audit?patient_id&user_id&action&from&to&page&page_size` (ADMIN only; `403` for everyone else). `from` and `to` are ISO 8601 times such as `2026-11-16T10:00:00Z` (an offset like `+05:30` also works). `page` starts at 1. `page_size` is 1 to 200, default 50. Newest first.
```json
{
  "items": [
    { "id": 7, "timestamp": "2026-11-16T10:04:12Z", "user_id": "usr_010", "role": "HOSPITAL_STAFF",
      "action": "passport.view", "resource_type": "passport", "resource_id": "pat_001",
      "patient_id": "pat_001", "outcome": "allowed", "reason": null,
      "fields_released": ["history", "reports"] },
    { "id": 6, "timestamp": "2026-11-16T10:03:55Z", "user_id": null, "role": "ANONYMOUS",
      "action": "passport.view", "resource_type": "passport", "resource_id": "pat_001",
      "patient_id": "pat_001", "outcome": "denied", "reason": "expired_token",
      "fields_released": [] }
  ],
  "page": 1, "page_size": 50, "total": 2, "simulated": true
}
```
- `role` is a user role, or `TOKEN` (opened with a valid token) or `ANONYMOUS` (no valid credentials).
- `fields_released` lists consent **names** only (`location`, `history`, `vitals`, `reports`), never values.
- The log never contains a token, a password or any patient data. Reasons come from the fixed list above. Ids that are not plain ids are stored as `invalid_id`.
- Actions so far: `passport.view`, `emergency.read`, `insights.read`. Extra reason code: `consent_missing`.

**Wellbeing insights** (feature 54) `GET /patients/{id}/insights`

Plain-language notes on sleep, activity and stress from the last 7 days of **simulated** wearable data. They are wellbeing notes only: **never a severity, never an alert, never a diagnosis**, and they never change what the rules engine decides.

```json
{
  "patient_id": "pat_001",
  "period_days": 7,
  "sleep":    { "status": "ok", "avg_hours": 7.8, "nights_used": 6, "band": "typical",
                "message": "Estimated sleep was in a typical range." },
  "activity": { "status": "ok", "avg_steps_per_day": 9629, "avg_active_minutes_per_day": 61, "days_used": 7,
                "band": "typical", "message": "Daily steps were in a typical range." },
  "stress":   { "status": "ok", "index": 47, "band": "typical",
                "message": "Your heart rate variability was close to your own usual." },
  "summary": "Over the last 7 days: sleep in a typical range; steps in a typical range; variability close to usual. These are general notes from simulated data. If something worries you, talk to a doctor.",
  "wording_review": "pending doctor review",
  "data_note": "based on simulated wearable data, not a diagnosis",
  "simulated": true
}
```
- `band` values: sleep `shorter` / `typical` / `longer`, activity `lower` / `typical` / `higher`, stress `lower` / `typical` / `higher`. Stress `index` is 0 to 100, where 50 means "the same as your own usual".
- Not enough data: `status` is `"not_enough_data"`, `band` and the numbers are `null`, and `message` says "Not enough data yet ...". Needs at least 3 nights (sleep), 3 days (activity) or 3 baseline days plus recent data (stress).
- **All wording is fixed text, pending doctor review.** No diagnosis or urgency words appear anywhere (a test scans every possible sentence).
- Bands and thresholds are draft values, pending doctor review.
- **Who can read it:** the patient (no audit row). A linked `FAMILY` member only while the patient's `vitals` consent is on. Everyone else gets `403`. Every read by anyone other than the patient is written to the audit log (`insights.read`, allowed or denied, reason `forbidden_role` or `consent_missing`).
- **TODO (feature 61):** family linking does not exist yet, so for now only the patient can read this. Shagun's feature 67 can be built against the mock server and will work for family once feature 61 is done.
- `404` unknown patient (only after the access check passes). Revoking `vitals` consent blocks a family member on the very next request.

**POST /demo/scenario**
```json
{ "scenario": "HEART" }
```
Allowed values: `HEART`, `STROKE`, `DIABETIC`, `ASTHMA`. **POST /demo/reset** takes no body and returns `{ "status": "reset" }`.

**POST /demo/vitals** (ADMIN, demo only)

Request (send `profile`, `overrides`, or both; `patient_id` defaults to `pat_001`):
```json
{ "patient_id": "pat_001", "profile": "heart_attack", "overrides": { "heart_rate": 150 } }
```
- `profile`: `normal`, `heart_attack`, `stroke`, `low_glucose`, `asthma`. The scenario names `HEART`, `STROKE`, `DIABETIC`, `ASTHMA` are also accepted.
- `overrides`: pins a vital to an exact value. `{"heart_rate": null}` clears one override, `{}` clears all. Vitals: `heart_rate`, `spo2`, `bp_sys`, `bp_dia`, `glucose`, `resp_rate`.
- A profile switch shows in the `vitals.update` stream within 2 seconds (the stream ticks once per second).
- `POST /demo/reset` also returns every simulator to `normal`.

Response 200:
```json
{
  "patient_id": "pat_001",
  "profile": "heart_attack",
  "overrides": { "heart_rate": 150.0 },
  "reading": { "patient_id": "pat_001", "profile": "normal", "timestamp": "2026-11-16T10:00:00Z",
               "heart_rate": 72, "spo2": 98.0, "bp_sys": 120, "bp_dia": 80, "glucose": 100, "resp_rate": 16 },
  "simulated": true
}
```
`reading` is the last reading already sent, so it can still show the old profile. The next tick shows the new one. Errors: `400` unknown profile, unknown vital or out-of-range value (nothing is changed), `422` unknown field.

**Consent API** (feature 51)

Four consent flags: `location`, `history`, `vitals`, `reports`.

`GET /patients/{id}/consents` response:
```json
{ "patient_id": "pat_001",
  "consents": { "location": true, "history": true, "vitals": false, "reports": false },
  "simulated": true }
```

`PUT /patients/{id}/consents`: send only the flags you want to change. Values must be real `true` or `false`.
```json
{ "history": false }
```
Response: the same as GET plus `"changed": ["history"]`. A flag that already has that value is not in `changed` and adds no history row. Errors: `400` empty body, `403` not the patient (staff, admin, family and responders can never change consent), `404` unknown patient, `422` unknown field or non-boolean value.

`GET /patients/{id}/consents/history` response:
```json
{ "patient_id": "pat_001",
  "history": [ { "field": "history", "granted": true, "timestamp": "2026-11-16T10:00:00Z",
                 "actor": "usr_001", "actor_role": "PATIENT" } ],
  "simulated": true }
```

Rules every app and endpoint must follow:
- **No row means no consent.** A patient who never chose anything shares nothing sensitive.
- **Revoking takes effect on the very next request.** Nothing is cached.
- **Omit, never null.** A field without consent is left out of the JSON completely.
- **The ledger is append-only.** Rows are never edited or deleted (only `POST /demo/reset` in demo mode clears it).

Which flag guards which field (used for the passport, the hospital alert, SMS and map links, and report lists):

| Payload field | Needs consent |
|---|---|
| `location`, `lat`, `lng`, `accuracy`, `map_link` | `location` |
| `conditions`, `allergies`, `medications` | `history` |
| `vitals` | `vitals` |
| `reports` | `reports` |
| name, age, blood group, contacts, emergency type | always shown |

**Encrypted at rest:** conditions, allergies, medications, contact phone numbers and report file names. The API still returns normal readable values. Only the database holds ciphertext, and you cannot search or sort by those columns.

### 4.2 Error format

```json
{ "detail": "Human readable message" }
```
Status codes used: `200`, `201`, `400` (bad input), `401` (not logged in or token expired), `403` (wrong role or no consent), `404`, `409` (invalid state transition), `422` (validation error from FastAPI).

---

## 5. WebSocket

Connect to `ws://localhost:8000/ws/hospitals/{hospital_id}?token=<jwt>` for hospital rooms and `ws://localhost:8000/ws/emergencies/{emergency_id}?token=<jwt>` for patient, family and responder views.

### 5.1 Event envelope (every event uses it)

```json
{
  "event": "emergency.created",
  "emergency_id": "em_001",
  "state": "EMERGENCY_DETECTED",
  "timestamp": "2026-11-16T10:00:00Z",
  "payload": {}
}
```
`vitals.update` has no emergency, so `emergency_id` is `null` and `payload` carries `patient_id`.

### 5.2 Events

| Event | Sent when | Payload (main fields) |
|---|---|---|
| emergency.created | Emergency created | `type`, `severity`, `symptoms`, `location`, `patient_summary` |
| emergency.cancelled | Patient cancels | `cancelled_by`, `reason` |
| hospital.alerted | Hospital receives the alert | `hospital_id`, `rank`, `score_breakdown` |
| hospital.acknowledged | Staff acknowledges | `hospital_id`, `acknowledged_by` |
| hospital.escalated | No ack in 30 s, next hospital alerted | `from_hospital_id`, `to_hospital_id` |
| ambulance.dispatched | Dispatch confirmed | `ambulance_id`, `eta_seconds` |
| ambulance.location | Position update | `ambulance_id`, `lat`, `lng`, `eta_seconds` |
| emergency.arrived | Ambulance arrived | `ambulance_id` |
| emergency.handover_done | Handover finished | `handover_by` |
| vitals.update | Every second while monitoring | `patient_id`, `heart_rate`, `spo2`, `bp_sys`, `bp_dia`, `glucose`, `resp_rate` |
| responder.alert | Nearby volunteer alerted | `distance_m`, `type` (no identity until accepted) |

Reconnect: a client can send `{"replay_since": "<ISO timestamp>"}` after connecting to get missed events (full replay arrives in Phase 2).

---

## 6. Data tables

`patients`, `users`, `vitals`, `symptom_reports`, `emergencies`, `status_events`, `hospitals`, `hospital_alerts`, `ambulances`, `emergency_passports`, `reports`, `contacts`, `consents`, `audit_log`

---

## 7. Seed users (development only)

| Username | Role | Notes |
|---|---|---|
| patient1 | PATIENT | linked to `pat_001` |
| staff1 | HOSPITAL_STAFF | linked to `hosp_001` |
| admin1 | ADMIN | demo panel and admin console |
| family1 | FAMILY | linked to `pat_001` |
| responder1 | RESPONDER | verified |

Passwords are set in the seed script and are demo values only.

---

## 8. Honest labels

- Every response that describes an emergency carries `"simulated": true`.
- Say "notification sent", not "ambulance dispatched", until the mock operator confirms.
- Medical text shown in any app must have `approved = true`.

---

## 9. Change log

| Date | Version | Change |
|---|---|---|
| 13 Nov 2026 | 0.1 | First draft for team review |
| 13 Nov 2026 | 0.2 | Added rules engine status, action codes, symptom and vital names |
| 13 Nov 2026 | 0.3 | Added POST /demo/vitals and wearable profiles (feature 13) |
| 13 Nov 2026 | 0.4 | Added consent API, default-deny and omit-not-null rules, field-to-consent map, encrypted fields (feature 51) |
| 13 Nov 2026 | 0.5 | Added GET /audit, audit rules, passport access rules and error codes (features 11, 50) |
| 13 Nov 2026 | 0.6 | Added GET /patients/{id}/insights, fixed wording rules, family-access TODO (feature 54) |
| 13 Nov 2026 | 0.6.1 | Documented the existing GET /health. No behaviour change |
