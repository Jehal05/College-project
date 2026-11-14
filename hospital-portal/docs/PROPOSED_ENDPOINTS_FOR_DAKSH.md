# Proposed endpoints and events: hospital portal → Daksh's backend

**From:** Puneet (hospital portal) **To:** Daksh (backend) **Checked against:** `backend/CONTRACT.md` v0.6.1 and Jehal's mock server (branch `Jehal`).
Simulated prototype. Nothing here is a real hospital system.

You do not have to accept everything. Each item below says **what the portal does if you say no**. The portal never shows a blank page or crashes because an endpoint is missing: that one feature is limited and the screen says why in plain words.

Please answer each item with **Yes / Yes with changes / No**. Reply in the group chat or edit this file.

## A. Already in your contract (no change asked), how the portal uses it

| Call | The portal sends | The portal reads |
|---|---|---|
| `POST /auth/login` | `{ "username", "password" }` (real mode sends **username**, never email) | `token`, `role` (`HOSPITAL_STAFF` → staff, `ADMIN` → admin; `PATIENT` is refused), `user_id`, optional `hospital_id` |
| `GET /hospitals` | no query needed; `?lat&lng&type` if given | `capabilities` as object **or** list; `availability` with `beds_free / icu_free / cath_lab_ready / stroke_unit_ready` **or** your `icu_beds / cath_lab_open / stroke_unit_open`; `verified`; any id style |
| `PATCH /hospitals/{id}/availability` | `{ beds_free, icu_free, cath_lab_ready, stroke_unit_ready }` | ok |
| `GET /emergencies/{id}` | – | `id`, `state`, `hospital {id,name}`, `ambulance {id}`, `timeline` or `status_events`, `location`, `vitals_at_alert` |
| `POST /emergencies/{id}/ack` | `{ hospital_id }` | any 2xx |
| `POST /emergencies/{id}/dispatch` | `{ hospital_id, ambulance_id }` (**`ambulance_id` is an extra field**, see item 7) | any 2xx |
| `POST /emergencies/{id}/status` | `{ state }` (EN_ROUTE, ARRIVED, HANDOVER_DONE) | any 2xx |
| `POST /ambulances/{id}/location` | `{ emergency_id, lat, lng, eta_seconds }` plus optional `heading, remaining_km, progress, leg` | any 2xx |
| `GET /passport/{patient_id}` | nothing, **only when staff press "Open passport"** (once per click; never automatically, never polled), with the staff login token | `name, age, blood_group, conditions, allergies, contacts, reports`. Fields left out by the patient's consent read **Not shared**. `401` → "log in again", `403` → "not allowed", `404` → "no passport found". Your audit log records each view. |
| `GET /audit?page=1&page_size=50` | nothing, **admin login only**, when an admin opens the Activity page or presses Refresh | rows of `at, user, role, action, patient_id, outcome, reason, fields` (names of shared fields only). `404/405/501` → "The backend has no audit log yet." `403` → "Only an admin can read the server audit log." The portal shows only those whitelisted columns and never any token. |
| WebSocket | `ws://…/ws?token=<jwt>` (one socket, all events) | see section C |

**Question W:** the portal opens **one** socket with `?token=`. Your contract has `/ws/hospitals/{id}?token=`. The portal can use that path once login or `GET /hospitals` tells it the hospital id: please say which you prefer.

## B. Proposed REST endpoints (not in your contract)

| # | Method and path | Body | Response | Who calls it | If you say no |
|---|---|---|---|---|---|
| 1 | `GET /emergencies?status=active` | – | list of emergencies not in `HANDOVER_DONE` / `CANCELLED` (no timeline needed) | portal on login and after a dropped WebSocket reconnects | Queue starts empty and shows "The backend has no GET /emergencies yet". New alerts still arrive live. After a reconnect, missed alerts are not recovered. |
| 2 | `GET /emergencies?status=finished` | – | list of finished and cancelled emergencies, **each with `timeline`/`status_events`** | History, Analytics and Report pages | Those pages show live cases only, with a note. |
| 3 | `GET /ambulances` | – | `[{ id, call_sign, crew:{driver,paramedic}, base_hospital_id, lat, lng, status }]` | Fleet page, Dispatch dialog | A **sample fleet** is shown, clearly marked "not real units", placed at the hospitals. Dispatch still works. |
| 4 | `PATCH /emergencies/{id}/checklist` | `{ item_id, done }` | `{ checklist: { [item_id]: { done, by, at } } }` | Pre-arrival checklist ticks | Ticks stay on this screen only (lost on reload). |
| 5 | `POST /emergencies/{id}/notes` | `{ kind: pickup\|corridor\|assignment\|handover\|desk, note, fields }` (note: 500 characters at most) | `{ note_id, kind, note, fields, timestamp, actor }`; also broadcast `emergency.note` | Team assignment, corridor request, patient pickup, **shift handover note and desk note** (the portal adds `handover` and `desk`). **Take over:** when a desk acts on an alert held by another hospital it first sends a `desk` note with `fields: { taken_over_by, taken_over_from }` (hospital ids) and the reason as the note text. This is not a new call; please store `fields` as sent. | Notes stay on this screen only and are marked "saved on this screen only"; the report says so too. |
| 6 | `POST /emergencies/{id}/chat` | `{ text, sender_role: desk\|crew, sender_name }` | `{ message_id, … }`; also broadcast `chat.message` | Desk and crew chat | Chat stays on this screen only. |
| 7 | `ambulance_id` inside `POST …/dispatch` | `{ hospital_id, ambulance_id }` | `{ state, ambulance_id }` | Dispatch dialog (desk chooses the unit) | If ignored, the portal still marks the unit locally; please tell us how a unit should be chosen. |
| 8 | `POST /hospitals` | `{ name, address, phone, lat, lng, capabilities, availability }` | the new hospital with `id`, **saved with `verified: false`** | Admin → add hospital | Shows "The backend has no POST /hospitals yet". Nothing is lost. |
| 9 | `PUT /hospitals/{id}` | same body, must **not** change `verified` | the hospital | Admin → edit hospital | Same clear message. |
| 10 | `PATCH /hospitals/{id}/verify` | `{ verified }` | `{ id, verified }` | Admin → verify toggle (ranking only uses verified hospitals) | Same clear message; list unchanged. |
| 11 | `hospital_id` in the **login answer** | – | `"hospital_id": "hosp_001"` for `HOSPITAL_STAFF` | Decides which hospital this desk belongs to | The desk picks a hospital from a list after login (first verified by default). Works, but one person could pick another hospital's desk. |

"Missing" means the backend answers **404, 405 or 501**. Any other error (500, 401, 403, 409, 422) is shown as an ordinary error and nothing is silently ignored.

## C. WebSocket events the portal reads

Envelope: `{ event, emergency_id, state, timestamp, payload }`. The name may be in `event` **or** `type` (Jehal sends both).

| Event | Payload the portal reads | Status | If you say no |
|---|---|---|---|
| `emergency.created` | `type, severity, symptoms (IDs ok), source, reasons.inputs.vitals, location?, patient_id?` | agreed | – |
| `emergency.sos_sent` | – (state `SOS_SENT`) | **proposed** | Not needed if you create the alert at `SOS_SENT` (decision 2). |
| `hospital.alerted` | `hospital_id` **or** `hospital { id, name, distance_km }` | **proposed** | The hospital name is read from `GET /emergencies/{id}` instead. |
| `hospital.acknowledged` | `hospital_id`, `acknowledged_by` | agreed | – |
| `hospital.escalated` | `from_hospital_id, to_hospital_id, to_hospital_name, escalation_level` | agreed | – |
| `hospital.availability_updated` | `hospital_id, availability` (our key names or yours; only the sent keys change) | **proposed** | Numbers refresh on the next hospital reload. Jehal's mock already sends it. |
| `ambulance.dispatched` | `ambulance_id, eta_seconds` | agreed | – |
| `ambulance.location` | `ambulance_id, lat, lng, eta_seconds` (state `EN_ROUTE`). **`heading` and `progress` are optional**: the portal works them out itself | agreed | – |
| `emergency.arrived`, `emergency.handover_done`, `emergency.cancelled` | – | agreed | – |
| `emergency.note` | `{ note_id, kind, note, actor, fields }` | **proposed** | see item 5 |
| `chat.message` | `{ message_id, sender_role, sender_name, text }` | **proposed** | see item 6 |

Ignored without error: `vitals.update`, `contacts.notified`, any unknown event.

## D. Values the portal now understands

- `type: "UNKNOWN"` with `symptoms: []` and `source: "FALL_CHECK"` or `"INACTIVITY_CHECK"` (the patient app's **safety check-in**). Ranking for UNKNOWN requires only an **emergency department**. Please add `UNKNOWN` and `source` to your contract. **If you say no:** the portal still shows any alert whose type or symptoms are missing as "Safety check-in / No symptoms reported".
- Missing `patient_id`, `location` or `vitals` in an alert: shown as **Not shared**, never a crash.
- IDs: the portal never assumes an ID style (`em_001`, `E-1001`, UUID all work) and never hard-codes a hospital such as `H2`.

## E. Open decisions: the portal works with both answers

1. **Who moves `EMERGENCY_DETECTED → SOS_SENT`?** (backend after the cancel countdown, or the patient app calling `POST /emergencies/{id}/sos`). The portal does not care: it reacts to the state in the events.
2. **When does the hospital first see the alert?** Portal behaviour for both:
   - *Created at `EMERGENCY_DETECTED` (what Jehal's mock does today, and what your contract describes):* the card appears greyed as an **Early notice**. No sound, no flashing, no Acknowledge or Dispatch button. If the patient cancels, it turns to CANCELLED quietly. When `SOS_SENT` arrives it becomes a normal alert with sound.
   - *Created straight at `SOS_SENT`:* normal alert at once, as before.
3. **Does `UNKNOWN` exist?** Yes in the patient app today. See section D.

## F. Please also confirm

- `ESCALATED` followed by `SOS_SENT` (your table) vs the portal's single `ESCALATED` state: the portal accepts both orders.
- A second `ambulance.location` stream is sent by the portal itself (its simulated trip). If your backend also simulates the ambulance, tell us which one should win; only one should run in the demo. The portal's `VITE_PORTAL_SIMULATES_AMBULANCE=auto` already handles both: it stops its own trip as soon as it sees a position that it did not send. Set it to `false` once you confirm the backend simulates the trip.
- **WebSocket first-message auth.** Today the portal connects to `ws://…/ws?token=<jwt>`. Tokens in addresses can leak into logs. Can the socket also accept the token as the **first message**, `{"type":"auth","token":"<jwt>"}`, and close with an error if none arrives in a few seconds? The portal already supports it: set `VITE_WS_AUTH=message` (default `query`). **If you say no:** nothing changes, the portal keeps using `?token=`.

- **`GET /health` (optional).** Every 15 seconds the portal sends a tokenless `GET /health` and treats **any** answer (200, 404, anything) as "the server is up"; only a network failure or no answer in 5 seconds counts as down, and two misses in a row show the red banner "Backend unreachable, using mock data". A simple `200 {"ok":true}` is enough, but nothing breaks without it. **If you say no:** nothing changes.

- **Error answers.** On any call except login, an HTTP **401** makes the portal clear the login and show "Your session expired. Please log in again." (so please use 401 for a missing or expired token, and 403 for "logged in but not allowed"). For other errors the portal shows your own short message when the body has `message`, `error` or `detail` (one line, no tokens), else "METHOD /path failed: 500". **If you say no:** the generic text is shown.

## Mock status (Jehal Phase 9, commit bd7d8aa)

Jehal's mock now implements: `GET /passport/{patient_id}` (staff), `GET /audit` (admin), `PATCH /hospitals/{id}/availability` (staff own hospital only, both name sets), `hospital.escalated` after about 30 s without acknowledgement, `hospital.availability_updated`, WebSocket login by `?token=` or first message, and `hospital_id` in the staff login answer. This only means the mock accepts them. Daksh still decides which availability names win and whether his backend does the same. Notes and chat are not built yet.
