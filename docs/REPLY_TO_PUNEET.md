# Reply to Puneet: what is done (Phase 9, mock server)

Tested against your branch `Puneet` at commit 5a42859. Run it yourself: `node scripts/joint-rehearsal.mjs` (26 checks, all pass). Simulated prototype, not a medical device.

| Item | Status | What to know |
|---|---|---|
| 1.1 Staff passport | **Done** (option a) | `GET /passport/PT-2026-0417` with the staff token. History consent off: no allergies, conditions, medicines or contacts (your rows read "Not shared"). Logged. 401 no login, 403 other patient, 404 unknown patient. No portal change needed. |
| 1.2 `hospital.escalated` | **Done** | After `ESCALATION_SECONDS` (30, divided by `DEMO_SPEED`) without acknowledgement: `{ escalation_level, from_hospital_id, to_hospital_id, to_hospital_name }`, then `hospital.alerted` for the new hospital. Your card goes to `ESCALATED`. |
| 1.3 `PATCH /hospitals/{id}/availability` | **Done** | Your body works as it is. Answer is the updated hospital. Staff: own hospital only (403 otherwise). Also broadcasts `hospital.availability_updated`. |
| 1.4 WebSocket login | **Done** | `/ws?token=...`. Wrong token: closed with code 1008. No token: send `{"type":"auth","token":"..."}` within 5 s or it is closed with 1008. |
| 2.1 Rehearsal again | **Done** | 26 of 26 against 5a42859 (only docs changed since 3510bf5). No failing check on your side. |
| 2.2 Notes and chat | **Not built** | Waiting for Daksh. |
| 2.3 Cancel after dispatch | **Done** | The patient app now says "The ambulance is already sent. Please call the number shown." |
| 2.4 `GET /audit` | **Done** | Admin only (`admin@demo`). Rows `at, user, role, action, patient_id, outcome, reason, fields`. No tokens. |
| 2.5 Data check | Nothing to do | Vitals and location are still left out (never null) when the patient did not consent. |

## Examples
```
GET /passport/PT-2026-0417            (Authorization: Bearer <staff token>)
200 { "name": "Rahul Mehta", "age": 54, "blood_group": "B+", "patient_id": "PT-2026-0417",
      "shared": { "history": true, "reports": true }, "allergies": ["Penicillin"], "conditions": [...], "medications": [...], "contacts": [...], "reports": [...] }

PATCH /hospitals/HSP-AMD-002/availability      { "beds_free": 9 }
200 { "id": "HSP-AMD-002", "availability": { "beds_free": 9, "icu_free": 1, "cath_lab_ready": true, "stroke_unit_ready": true,
      "icu_beds": 1, "cath_lab_open": true, "stroke_unit_open": true }, ... }

{ "event": "hospital.escalated", "emergency_id": "EM-20261113-0002", "state": "SOS_SENT",
  "payload": { "escalation_level": 1, "from_hospital_id": "HSP-AMD-002", "to_hospital_id": "HSP-AMD-003", "to_hospital_name": "Maninagar General Hospital" } }
```

## Run it
`HOSPITAL_MODE=manual DEMO_SPEED=5 CORS_ORIGINS=http://localhost:5173,http://localhost:5174 npm run mock`. To see an escalation on purpose: `POST /demo/no-ack { "enabled": true, "escalate_after_seconds": 5 }`.

## What still needs your side
1. **Escalation in manual mode is real now.** Any alert nobody acknowledges moves on after about 30 s, also in the mock. Expect "Escalated to the next hospital" on the card.
2. Set `VITE_PORTAL_SIMULATES_AMBULANCE=false` if you want the mock to move the ambulance (it already does after dispatch, until your portal posts positions).
3. Send the availability keys you want: the mock accepts both sets. Daksh decides which one wins (`docs/DECISIONS_MEETING.md`, item 2).
4. The staff login (`staff@demo`) now returns `hospital_id` `HSP-AMD-002`; keep your alerts for that hospital in "My hospital" or click "All hospitals".
