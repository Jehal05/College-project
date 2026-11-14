# HealthTwin AI: API and Event Contract

**Version 0.7 (in progress) | Owner: Daksh (backend) | Date: 13 November 2026**

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

Also `UNKNOWN`, used **only** for a safety check-in alert (a fall or inactivity check that got no reply, with no symptoms). The patient app and the hospital portal already use it. **Pending agreement with Jehal and Puneet.**

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

**Symptom names** the engine understands: `chest_pain`, `breathlessness`, `sweating`, `left_arm_pain`, `face_drooping`, `arm_weakness`, `slurred_speech`, `confusion`, `wheeze`, `low_glucose`, and (draft, added 2026-11-13) `nausea`, `fainting`, `diabetic_fainting`, `severe_headache`, `sudden_confusion`, `shaking`, `cannot_speak_sentences`, `blue_lips`, `checkin_no_reply`. Vital names: `heart_rate`, `spo2`, `bp_sys`, `bp_dia`, `glucose`, `resp_rate`. Unknown names are ignored by the engine.

**Draft rules added 2026-11-13 (0.6.2).** Twelve rules cover the seven patient-app symptoms that had no rule (`NAUSEA`, `FAINTING`, `SEVERE_HEADACHE`, `DIA_SHAKING`, `DIA_FAINTING`, `CANNOT_SPEAK_SENTENCES`, `BLUE_LIPS`), the stroke "sudden confusion" sign, and a safety check-in with no reply (draft EMERGENCY, type `UNKNOWN`). They were **written by an AI assistant from public first-aid guidance and accepted for the prototype by Daksh. A doctor has NOT reviewed them.** They carry `review_status: pending doctor review` like every other rule. The review sheet is `docs/review/DOCTOR_REVIEW_NEW_RULES.md`. Every one of the 20 patient-app symptoms now maps to a rule, so no symptom a patient taps can give "no indicators".

**Patient-app symptom ids** (`CHEST_PAIN`, `BLUE_LIPS`, ...) are translated to engine names in one place, `app/rules/symptom_map.py`. An id the table does not know is returned as `unmapped` (to be stored and shown to Daksh and the doctor), never silently dropped, and never lowers a severity. A `source` of `FALL_CHECK` or `INACTIVITY_CHECK` adds `checkin_no_reply`.

### 1.4 Roles

`PATIENT`, `HOSPITAL_STAFF`, `ADMIN`, `FAMILY`, `RESPONDER`

### 1.5 Timestamps and IDs

- All timestamps are ISO 8601 in UTC, for example `2026-11-16T10:00:00Z`.
- **IDs are opaque strings. No app and no backend code may read meaning out of an id.** The demo uses the apps' formats:
  patient `PT-2026-0417`, emergency `EM-YYYYMMDD-nnnn` (a counter per day that the demo reset sets back to 0001),
  hospital `HSP-AMD-001` to `HSP-AMD-005`, ambulance `AMB-AMD-01` to `AMB-AMD-05`, contact `C-1`, user `usr_001`.
  Short ids such as `pat_001` and `em_001` in the examples below are only examples.

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

**Decision (0.7, Jehal; pending confirmation by Daksh and Puneet): who moves `EMERGENCY_DETECTED → SOS_SENT`?** The patient app does, with `POST /emergencies/{id}/sos`, when its own cancel countdown ends (as the mock server already works). The backend has no timer for it. The call is idempotent: a second call, or a call after the hospital answered, returns `200` with the current state and changes nothing. A cancelled emergency answers `409` with `from` and `to`. The earlier proposal (a backend countdown, `COUNTDOWN_SECONDS`) is dropped unless the team decides otherwise.

---

## 3. Authentication

Send `Authorization: Bearer <token>` on every endpoint except `POST /auth/login`, `GET /health` and the public passport link (see the passport rules below). No login: `401`.

### POST /auth/login

Request. The login may be sent as `username` (the portal and the original contract), `email` (the patient app) or `login`; if several are sent, `username` wins. Case and surrounding spaces are ignored.
```json
{ "username": "staff@demo.test", "password": "demo1234" }
```
Response 200:
```json
{
  "token": "eyJhbGciOi...",
  "role": "HOSPITAL_STAFF",
  "user_id": "usr_003",
  "patient_id": null,
  "hospital_id": "HSP-AMD-002",
  "name": "Desk Staff (Demo)",
  "expires_at": "2026-11-14T18:00:00Z",
  "simulated": true
}
```
- `patient_id` is set for patient accounts. `hospital_id` is set for hospital desk accounts (and the demo admin). Both are `null` otherwise.
- **`role` label:** it is the real role (`PATIENT`, `HOSPITAL_STAFF`, `ADMIN`, `FAMILY`, `RESPONDER`), except for the portal's own two demo accounts `staff@demo` and `admin@demo`, which answer with the lowercase labels `staff` and `admin` because Jehal's contract check expects that. Permissions always use the real role, never the label. The portal accepts both spellings. *(Decision for Daksh: it would be cleaner for Jehal to let the check accept both, and then the label can go.)*
- The token lasts 8 hours (`ACCESS_TOKEN_EXPIRE_MINUTES`). It only proves who the user is: the server looks the user up again on **every** request, so disabling an account or changing a role takes effect at once.
- A login token cannot open a passport, and a passport token cannot log anyone in.
- The answer is sent with `Cache-Control: no-store`.

Errors (all use the shared error shape in 4.2):

| Status | When |
|---|---|
| 400 | login or password missing, empty, the wrong type or too long |
| 401 | wrong login or password. **The words are always the same** ("Wrong login or password") for an unknown login, a wrong password and a disabled account |
| 429 | too many wrong attempts: 5 per login and 30 per address in 60 seconds (`LOGIN_MAX_FAILURES`, `LOGIN_IP_MAX_FAILURES`, `LOGIN_WINDOW_SECONDS`). Comes with a `Retry-After` header. A success clears the login's count. Unknown logins are limited the same way, so the limit does not reveal which logins exist |

For any other endpoint: `401` means no login or a login that is bad, expired or no longer allowed (the answer carries `WWW-Authenticate: Bearer`), and `403` means the login is fine but the role or the data is not allowed.

---

## 4. Endpoints

| Method and path | Purpose | Roles allowed | Main user |
|---|---|---|---|
| POST /auth/login | Log in, get token and role | public | all |
| GET /health | Liveness check. Returns `{"status": "ok", "simulated": true}`. No patient data | public | all |
| GET /patients/{id} | Read patient profile | PATIENT (own: everything). ADMIN (only what the patient shared, no phone numbers, audited). Others 403 | Jehal |
| PATCH /patients/{id} | Update patient profile | PATIENT (own) only | Jehal |
| GET /patients/{id}/consents | Current consent choices | PATIENT (own), ADMIN (read-only) | Jehal, Shagun |
| PUT /patients/{id}/consents | Change consent choices | PATIENT (own only) | Jehal |
| GET /patients/{id}/consents/history | Every consent change, oldest first | PATIENT (own), ADMIN (read-only) | Jehal, Shagun |
| GET /patients/{id}/vitals | Latest vitals (also streamed as `vitals.update`) | PATIENT (own). FAMILY (linked, with vitals consent) is not built yet | Jehal |
| GET /patients/{id}/baseline | The patient's own usual ranges, for the "usual range" display | PATIENT (own) | Jehal |
| GET /patients/{id}/contacts | List emergency contacts | PATIENT (own) | Jehal |
| POST /patients/{id}/contacts | Add an emergency contact | PATIENT (own) | Jehal |
| PUT /patients/{id}/contacts/{contactId} | Change an emergency contact | PATIENT (own) | Jehal |
| DELETE /patients/{id}/contacts/{contactId} | Remove an emergency contact | PATIENT (own) | Jehal |
| POST /emergencies | Create an emergency (starts at `EMERGENCY_DETECTED`; hospitals hear nothing yet) | PATIENT (own) | Jehal |
| POST /emergencies/{id}/sos | **Send the SOS**: `EMERGENCY_DETECTED` to `SOS_SENT`, alert the best verified hospital. Sending it twice is harmless | PATIENT (own) | Jehal |
| POST /emergencies/{id}/cancel | Cancel a false alarm (only before `AMBULANCE_DISPATCHED`) | PATIENT (own) | Jehal |
| GET /emergencies/{id} | Details and timeline, scoped by role (see 4.3) | PATIENT (own), HOSPITAL_STAFF and ADMIN (after the SOS, audited), linked FAMILY (plain status, audited) | all |
| GET /emergencies/{id}/reasons | Why the alert fired: symptoms, readings, matched draft rules. Never a diagnosis | PATIENT (own), HOSPITAL_STAFF and ADMIN (after the SOS, audited) | Jehal, Puneet |
| GET /patients/{id}/emergencies | The patient's past alerts, newest first (last 20) | PATIENT (own) | Jehal |
| GET /patients/{id}/emergencies/{eid}/summary | Plain record of one alert: timeline, durations, what was shared | PATIENT (own) | Jehal |
| POST /emergencies/{id}/ack | Hospital acknowledges | HOSPITAL_STAFF | Puneet |
| POST /emergencies/{id}/dispatch | Ambulance dispatched | HOSPITAL_STAFF | Puneet |
| POST /emergencies/{id}/status | Move to EN_ROUTE, ARRIVED or HANDOVER_DONE | HOSPITAL_STAFF | Puneet |
| GET /emergencies?status=active or finished | The desk's lists: emergencies the hospital was alerted for (admin: all sent ones), only after the SOS, audited | HOSPITAL_STAFF, ADMIN | Puneet |
| GET /hospitals?lat&lng&type | Candidate hospitals with capabilities | HOSPITAL_STAFF, PATIENT, ADMIN | Puneet |
| PATCH /hospitals/{id}/availability | Update beds, ICU, cath lab, stroke unit | HOSPITAL_STAFF (own hospital), ADMIN | Puneet |
| POST /hospitals | Add a hospital (starts unverified, never alerted until verified). PROPOSED by the portal, not agreed | ADMIN | Puneet |
| PUT /hospitals/{id} | Edit a hospital; never changes `verified`. PROPOSED, not agreed | ADMIN | Puneet |
| PATCH /hospitals/{id}/verify | Verify or unverify a hospital. PROPOSED, not agreed | ADMIN | Puneet |
| GET /ambulances | List ambulances with position and status | HOSPITAL_STAFF, ADMIN | Puneet |
| POST /ambulances/{id}/location | Ambulance position update | HOSPITAL_STAFF | Puneet |
| GET /passport/{id}?token | Emergency passport (respects consent, always audited) | signed token for that patient, HOSPITAL_STAFF, or the patient | Hospital staff |
| GET /audit | Search the audit log | ADMIN only | Shagun (feature 76) |
| GET /patients/{id}/insights | Sleep, activity and stress notes (wellbeing only) | PATIENT (own). Linked FAMILY with `vitals` consent, once feature 61 exists | Shagun (feature 67) |
| POST /reports | Upload a health report | PATIENT | Jehal |
| POST /demo/scenario | Run a scenario | any logged-in user, demo mode only (404 otherwise) | Demo panel |
| POST /demo/reset | Reset to start state | any logged-in user, demo mode only (404 otherwise) | Demo panel |
| POST /demo/vitals | Switch wearable profile or override vitals | any logged-in user, demo mode only (404 otherwise) | Demo panel |

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
    "availability": { "beds_free": 12, "icu_free": 3, "cath_lab_ready": true, "stroke_unit_ready": false },
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

**POST /demo/vitals** (demo mode only, any logged-in user)

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
`reading` is the last reading already sent, so it can still show the old profile. The next tick shows the new one. Errors: `400` unknown profile, unknown vital or out-of-range value (nothing is changed), `400` unknown field.

**Patient record, vitals, baseline and contacts** (Task 3; checked by `scripts/contract.mjs`)

`GET /patients/{id}` answers (owner):
```json
{ "id": "PT-2026-0417", "name": "Rahul Mehta", "age": 54, "sex": "M", "blood_group": "B+", "blood_group_verified": false,
  "language": "en", "allergies": ["Penicillin"], "conditions": ["Hypertension"], "medications": ["Amlodipine"],
  "contacts": [ { "id": "C-1", "name": "Sunita Mehta", "relation": "Mother", "phone": "+91 00000 00001", "is_primary": true, "simulated": true } ],
  "consents": { "location": true, "history": true, "vitals": true, "reports": true }, "simulated": true }
```
- `sex` is left out when unknown. Nothing is ever sent as `null`.
- **Who:** the patient reads and changes their own record. An `ADMIN` may read it, and then sees only what the patient shared (allergies, conditions, medications and contacts need the `history` consent), **no phone numbers**, and every such read is audited (`patient.read`). Everybody else gets `403`, and the attempt is audited. The permission check comes before "does this patient exist", so a refusal never reveals whether an id exists (a patient asking for another id gets `403`, even if it does not exist).
- **`PATCH`** accepts `name`, `age`, `sex`, `blood_group`, `allergies`, `conditions`, `medications`, `language`, and answers with the updated record. Rules (the patient app's own): name not empty (100 characters at most); age a whole number 0 to 120; `blood_group` one of `A+ A- B+ B- AB+ AB- O+ O-`; `language` `en`, `hi` or `gu`; `sex` `M`, `F` or `O`; each list at most 20 items of 100 characters. Anything else is `400` with a plain sentence. `consents` and `contacts` are refused with `400` and a pointer to their own endpoints. A new `blood_group` is stored as not verified.
- **`GET .../vitals`** (simulated): `{ patient_id, heart_rate, spo2, bp: "120/80", bp_sys, bp_dia, glucose, resp_rate, timestamp, simulated }`. Owner only for now.
- **`GET .../baseline`**: `{ heart_rate: {min,max}, spo2, bp_systolic, bp_diastolic, glucose, updated_at, simulated }`, `404` if the patient has none.
- **Contacts:** at most 5, exactly one primary. A contact is `{ id, name, relation, phone, is_primary }`. `relation` is `Mother Father Spouse Sibling Child Friend Other`. A phone number, after removing spaces and dashes, is an optional `+` and 8 to 15 digits. `POST` answers `201`, a bad body `400`, a sixth contact `409`; `PUT` answers `200`, `404` for an unknown contact; `DELETE` answers `204`, then `404`. The first contact becomes primary; sending `is_primary: true` moves the marker; deleting the primary makes the first remaining contact primary. Contact ids are random and opaque.

**Consent API** (feature 51)

Four consent flags: `location`, `history`, `vitals`, `reports`.

`GET /patients/{id}/consents` response:
```json
{ "patient_id": "pat_001",
  "consents": { "location": true, "history": true, "vitals": false, "reports": false },
  "changes": [ { "key": "history", "value": true, "timestamp": "2026-11-16T10:00:00Z" } ],
  "simulated": true }
```
`changes` is the patient's own last 20 changes, newest first (the demo seed rows are not changes). `PUT` answers with the same fields plus `changed`.

`PUT /patients/{id}/consents`: send only the flags you want to change. Values must be real `true` or `false`.
```json
{ "history": false }
```
Response: the same as GET plus `"changed": ["history"]`. A flag that already has that value is not in `changed` and adds no history row. Errors: `400` empty body, `403` not the patient (staff, admin, family and responders can never change consent), `404` unknown patient, `400` unknown field or non-boolean value.

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
| `conditions`, `allergies`, `medications`, `contacts` | `history` |
| `vitals` | `vitals` |
| `reports` | `reports` |
| name, age, sex, blood group, emergency type | always shown |

**Encrypted at rest:** conditions, allergies, medications, contact phone numbers and report file names. The API still returns normal readable values. Only the database holds ciphertext, and you cannot search or sort by those columns.

### 4.2 Error format

Every error, from every endpoint, has the same two fields with the same plain text. The patient app reads `error`, the original contract reads `detail`:
```json
{ "error": "Human readable message", "detail": "Human readable message" }
```
A route may add fields, for example a `409` for an invalid state change is `{ "error": "Invalid transition", "detail": "Invalid transition", "from": "SOS_SENT", "to": "ARRIVED" }`, and a `400` for a bad request lists the names of the bad fields: `{ "error": "Invalid request: password is required", "detail": "...", "fields": ["password"] }`.

Rules: an error never repeats what the caller sent (a password in a bad request never comes back). An unexpected crash is a `500` with the generic text "Something went wrong on the server": no stack trace, no file name, no secret.

Status codes used: `200`, `201`, `400` (bad input, including every validation error; **there is no 422**), `401` (no login, or a bad or expired one), `403` (login fine but role or data not allowed), `404`, `409` (invalid state change), `429` (too many wrong logins), `500`.

### 4.3 Emergencies (0.7)

**POST /emergencies** (see 4.1 for the body). Extras added in 0.7:
- `symptoms` are the patient app's ids (`CHEST_PAIN`, `SHORT_BREATH`) or the lowercase engine names. An id nobody knows is stored (`unmapped_symptoms`), never dropped. If **none** is known the answer is `400`. A safety check-in (`source` `FALL_CHECK` or `INACTIVITY_CHECK`) needs no symptoms and no type (type `UNKNOWN`).
- `source` is `MANUAL` (default), `FALL_CHECK` or `INACTIVITY_CHECK`. `consent` (or `consents`) holds only `location`, `history`, `vitals`, `reports` as true or false; anything else is `400`. The consent used is the ledger as it is now, with these choices on top, and it is kept with the emergency.
- Location is stored only with the `location` consent, vitals only with the `vitals` consent. The response adds `source` and `reasons` (a list of plain sentences). `patient_id` may be left out; it must be the caller's own, otherwise `403`.
- The engine's answer is kept as `engine_severity`. At the SOS a milder severity is raised to `EMERGENCY` (`severity_floor_applied`), because the person asked for help.

**POST /emergencies/{id}/sos** body `{ "location": { "lat", "lng", "accuracy", "source" } }` (all optional). Reply `200 { id, state, hospital: { id, name, distance_km } | null, simulated }`. Ranks the **verified** hospitals with an emergency department (one that can do what the type needs and is ready first, then the nearest), writes the `hospital_alerts` row for rank 1 and "notifies" the patient's contacts **by name only** (simulated, no phone number anywhere). Events, sent after the commit: `emergency.created` (state `SOS_SENT`, only what the patient shared), `emergency.sos_sent`, `hospital.alerted`, `contacts.notified`.

**POST /emergencies/{id}/cancel** optional body `{ "reason": "false_alarm" | "pressed_by_mistake" | "feeling_better" | "other" }`. Reply `200 { id, state: "CANCELLED" }`. Cancelling twice is harmless. From `AMBULANCE_DISPATCHED` on: `409 { detail: "Invalid transition", from, to: "CANCELLED" }`.

**GET /emergencies/{id}** returns the contract fields plus `symptoms`, `source`, `eta_seconds`, `consents`, `status_events` (`[{state, timestamp}]`, the patient app's name) and `timeline` (`[{state, timestamp, actor, seconds_since_start}]`). Who sees what:

| Reader | Sees | Audit |
|---|---|---|
| PATIENT (own) | everything, including `location`, `vitals_at_alert`, `engine_severity`, `severity_floor_applied` | none |
| Another patient | `404`, the same as for an id that does not exist | `denied`, `forbidden_role` |
| HOSPITAL_STAFF, ADMIN | only after the SOS (before it: `404`). `location` only with the location consent, `vitals_at_alert` only with the vitals consent, `passport_available` = history consent. Never a phone number | `allowed` with `fields_released`, or `denied` |
| FAMILY linked to the patient | `{ id, patient_id, state, started_at, simulated }` after the SOS, nothing about health | `allowed` |
| FAMILY not linked, RESPONDER | `403` (same answer whether or not the id exists) | `denied`, `forbidden_role` |

**GET /emergencies/{id}/reasons** reply `{ severity, type, reasons, matched_rules: [{ id, type, severity, reason, reviewed }], reviewed, review_status, inputs: { symptoms, vitals, vitals_at }, simulated }`. `reviewed` is `false` and `review_status` is "pending doctor review" while any rule is. `severity` here is the engine's own answer. Same access as the emergency itself, except that a relative gets `403`.

**GET /patients/{id}/emergencies** `[{ id, started_at, final_state, type, source }]`, newest first, at most 20. **GET /patients/{id}/emergencies/{eid}/summary** `{ id, started_at, ended_at, source, final_state, timeline, durations: { to_acknowledged, to_dispatched, to_arrived, to_handover }, shared, symptoms, vitals_at_alert, contacts_notified: [{ name }], hospital: { name } | null, ambulance_id, simulated }`. Durations are seconds from the start, `null` when that step did not happen. A plain record: no cause, no outcome for the person's health.

**Events** are published through `app/services/events.py` (a hook: the WebSocket manager subscribes to it). Every event carries an `audience` (`hospitals`, `patient:<id>`, `family:<id>`, `responders`, `all`) for the manager to filter on, and both `event` and `type` with the same name.

---

## 5. WebSocket

Connect to `ws://localhost:8000/ws/hospitals/{hospital_id}?token=<jwt>` for hospital rooms and `ws://localhost:8000/ws/emergencies/{emergency_id}?token=<jwt>` for patient, family and responder views.

**As built (14 Nov 2026, Puneet; the path is proposed, not agreed with Daksh and Jehal):** ONE path, `ws://localhost:8000/ws?token=<login token>`, as the mock server and the portal already use. The server filters by role instead of by room: hospital staff hear the emergencies their hospital was alerted for (and hospital-wide news such as `hospital.availability_updated`), an admin hears every sent emergency, a patient hears their own, and family and responders hear nothing yet (the family link and responder alerts are not built). A bad token is accepted and closed at once with code 1008. With no token in the address, send `{"type":"auth","token":"..."}` within 5 seconds and wait for `auth.ok`. `replay_since` is read and ignored (replay is not built). The older two-path design above stays in this contract until the three of us decide.

**Escalation (as built):** an emergency in `SOS_SENT` that nobody acknowledges for `ESCALATION_TIMEOUT_SECONDS` (default 30) goes `SOS_SENT` to `ESCALATED` to `SOS_SENT` and the next verified hospital in the SOS ranking is alerted (`hospital.escalated`, `emergency.created`, `hospital.alerted`). The app checks once a second (`ESCALATION_SWEEP_SECONDS`).

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

## 7. Seed users (demo mode only)

Loaded **only** when `DEMO_MODE=true`, and only into an empty database (`python -m app.seed` does the same by hand). A normal start loads no accounts and no demo passwords. Every account is fictional and only a bcrypt hash is stored.

| Login (username or email) | Demo password | Role | Belongs to |
|---|---|---|---|
| `patient@demo.test` | `demo1234` | PATIENT | patient `PT-2026-0417` |
| `staff@demo.test` | `demo1234` | HOSPITAL_STAFF | hospital `HSP-AMD-002` |
| `admin@demo.test` | `demo1234` | ADMIN | hospital `HSP-AMD-002` |
| `staff@demo` | `demo123` | HOSPITAL_STAFF | hospital `HSP-AMD-002` (the portal's own login) |
| `admin@demo` | `demo123` | ADMIN | hospital `HSP-AMD-002` |
| `patient1`, `staff1`, `admin1` | `demo-password` | PATIENT, HOSPITAL_STAFF, ADMIN | same as the rows above |
| `family1` | `demo-password` | FAMILY | not linked to anyone yet (feature 61) |
| `responder1` | `demo-password` | RESPONDER | not verified yet (feature 68) |

Logins are matched in lowercase. A staff account always belongs to a hospital, and a patient account always belongs to a patient (the database enforces both). The demo hospitals, ambulances, patient, contacts and consents come from the same fictional seed files (`app/seed/data/`). The demo patient shares all four consents, as in the mock server.

---|---|---|
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
| 13 Nov 2026 | 0.6.2 | Draft rules for 7 unmapped symptoms and the safety check-in (pending doctor review), `UNKNOWN` emergency type, symptom-id map |
| 14 Nov 2026 | 0.7 (in progress) | **Patient record, vitals, baseline, contacts (Task 3)**, contacts now need the `history` consent, `sex` is always shown, consent answers carry `changes`. **Login (feature 33):** `POST /auth/login`, real roles, rate limit, one error shape, 400 instead of 422, demo endpoints for any logged-in user in demo mode only. **Foundation, agreed with Puneet:** opaque ids in the apps' formats, hospital availability keys `beds_free` / `icu_free` / `cath_lab_ready` / `stroke_unit_ready`, seed logins (section 7), CORS allow-list, all 14 tables built. More lines are added here as the later tasks land. **Not yet announced: waiting for Jehal's answers.** |
| 14 Nov 2026 | 0.7.1 | **Emergency core (J1, Jehal):** `POST /emergencies`, `POST /emergencies/{id}/sos` (new, decision recorded in section 2), `POST /emergencies/{id}/cancel`, `GET /emergencies/{id}`, `GET /emergencies/{id}/reasons`, `GET /patients/{id}/emergencies`, `GET /patients/{id}/emergencies/{eid}/summary`. Section 4.3 added. Event hook `app/services/events.py`. State changes only through `app/services/emergency_state.py` |
