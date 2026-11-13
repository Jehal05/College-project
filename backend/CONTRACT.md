# HealthTwin AI: API and Event Contract

**Version 0.1 | Owner: Daksh (backend) | Date: 13 November 2026**

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
| GET /patients/{id} | Read patient profile | PATIENT (own), HOSPITAL_STAFF (with consent), ADMIN | Jehal |
| PATCH /patients/{id} | Update patient profile | PATIENT (own), ADMIN | Jehal |
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
| GET /passport/{id}?token | Emergency passport (respects consent) | signed token or HOSPITAL_STAFF | Hospital staff |
| POST /reports | Upload a health report | PATIENT | Jehal |
| POST /demo/scenario | Run a scenario | ADMIN (demo) | Demo panel |
| POST /demo/reset | Reset to start state | ADMIN (demo) | Demo panel |

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

**POST /demo/scenario**
```json
{ "scenario": "HEART" }
```
Allowed values: `HEART`, `STROKE`, `DIABETIC`, `ASTHMA`. **POST /demo/reset** takes no body and returns `{ "status": "reset" }`.

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
