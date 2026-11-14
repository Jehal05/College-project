# Endpoints to agree with Daksh (notes, chat, checklist, hospital add / edit / verify)

**Simulated prototype.** From Puneet (hospital portal) to Daksh (backend). Written 14 Nov 2026 from the portal code (`src/services/api.js`, `EmergencyProvider.jsx`, `chatStore.js`, `hospitalForm.js`).

**Status of every row: PROPOSED, not agreed.** Nobody has agreed to any of it. A row only becomes AGREED when Daksh says so in writing; then change its status to `AGREED (Daksh, written, <date>)` and write his words (or "OK") in the last column. `src/services/endpointsToAgree.test.js` fails if the portal code and this table drift apart, or if a row says AGREED with nothing in the last column.

**Where this stands in his contract.** None of these calls is in `backend/CONTRACT.md` on branch `Daksh` (checked 14 Nov 2026): the endpoint table there has no notes, chat, checklist, `POST /hospitals`, `PUT /hospitals/{id}` or `PATCH /hospitals/{id}/verify`. Jehal's mock does not have them either. The longer explanation of the same items, with the events and other calls, is in `PROPOSED_ENDPOINTS_FOR_DAKSH.md`.

"Missing" below means the backend answers **404, 405 or 501**. Every other error (401, 403, 409, 422, 500) is shown as a normal error.

## Endpoints

| ID | Method | Path | Body the portal sends | Body keys (checked by the test) | Response the portal expects | If the endpoint is missing (404, 405, 501) | Other error cases | Status | Daksh: OK / change to |
|---|---|---|---|---|---|---|---|---|---|
| E1 | PATCH | `/emergencies/{id}/checklist` | `{ "item_id": "heart-1", "done": true }` | `item_id, done` | `{ "checklist": { "<item_id>": { "done", "by", "at" } } }` (the whole checklist; the portal uses it as the new state) | The tick stays on this screen only (lost on reload); no error shown | 401 logs the desk out; other errors are shown and the tick is not applied. A cancelled emergency should refuse (the mock answers with an error) | PROPOSED, not agreed | |
| E2 | POST | `/emergencies/{id}/notes` | `{ "kind": "desk", "note": "text, 500 characters at most", "fields": {} }` | `kind, note, fields` | `{ "note_id", "kind", "note", "fields", "timestamp", "actor" }`; the backend also broadcasts `emergency.note` and merges `fields` into the emergency | The note stays on this screen and is marked "saved on this screen only"; the report says so too | A closed emergency (HANDOVER_DONE, CANCELLED) should refuse. Other errors are shown and nothing is added | PROPOSED, not agreed | |
| E3 | POST | `/emergencies/{id}/chat` | `{ "text": "...", "sender_role": "desk", "sender_name": "..." }` | `text, sender_role, sender_name` | `{ "message_id", "sender_role", "sender_name", "text", "timestamp" }`; the backend also broadcasts `chat.message` to every open screen | **Not kept anywhere.** The desk sees "not sent" with the message "The backend has no POST /emergencies/{id}/chat yet (404)" and the text stays in the box | Same: the error text is shown, nothing is added | PROPOSED, not agreed | |
| E4 | POST | `/hospitals` | the hospital object listed under "Hospital body" below | `name, address, phone, lat, lng, capabilities, availability` | the saved hospital with its new `id` and `verified: false` | The Admin screen shows "The backend has no POST /hospitals yet (404)"; nothing is lost | 422 or 409 text is shown next to the form. The backend must save it as **unverified** whatever the body says | PROPOSED, not agreed | |
| E5 | PUT | `/hospitals/{id}` | the same hospital object as E4 | `name, address, phone, lat, lng, capabilities, availability` | the updated hospital | Same message, list unchanged | The backend must **not** change `verified` here | PROPOSED, not agreed | |
| E6 | PATCH | `/hospitals/{id}/verify` | `{ "verified": true }` | `verified` | `{ "id", "verified" }` | Same message, the toggle does not change | Admin login only; others should get 403 | PROPOSED, not agreed | |

### Hospital body (E4 and E5)

The portal sends the object the form produces after checking it (`validateHospital` in `hospitalForm.js`):

| Field | Type and rule |
|---|---|
| `name` | text, 3 to 80 letters |
| `address` | text, not empty |
| `phone` | text: digits, spaces or dashes, 7 to 20 characters, may start with `+` |
| `lat`, `lng` | numbers, -90 to 90 and -180 to 180 |
| `capabilities` | `{ cath_lab, stroke_unit, icu, emergency }`, each true or false, at least one true |
| `availability` | `{ beds_free, icu_free, cath_lab_ready, stroke_unit_ready }`: two whole numbers 0 or more and two booleans (a cath lab or stroke unit can be "ready" only if the hospital has one) |

The portal never sends `id` or `verified`. If the backend uses other field names (for example `icu_beds`), tell us in the last column; the portal already reads both name sets when it receives a hospital.

### Note kinds sent in E2

`handover`, `desk`, `pickup`, `corridor`, `assignment`, `responder`. Please accept all six, or tell us which ones you will not store.
- `pickup` sends `fields: { picked_up: true }`; `corridor` sends `{ corridor_requested: true }`; `assignment` sends `{ assigned_team: { ... } }`; `responder` sends `{ responders_notified: [ids] }`.
- When a desk acts on an alert held by another hospital, it first sends a `desk` note with `fields: { taken_over_by, taken_over_from }` (hospital ids). Please store `fields` exactly as sent.

## Events the same calls depend on

| ID | WebSocket event | Payload the portal reads | Status | Daksh: OK / change to |
|---|---|---|---|---|
| EV1 | `emergency.note` | `{ note_id, kind, note, actor, fields }` | PROPOSED, not agreed | |
| EV2 | `chat.message` | `{ message_id, sender_role, sender_name, text }` | PROPOSED, not agreed | |

The envelope is the usual `{ event, emergency_id, state, timestamp, payload }`. The portal ignores a message whose `message_id` it has already shown (so the echo of its own message is harmless).

## Corrections to older text

- `PROPOSED_ENDPOINTS_FOR_DAKSH.md` used to say that without a chat endpoint "chat stays on this screen only". That was wrong: chat has no local fallback (see E3). Corrected 14 Nov 2026.
- The same file listed five note kinds; the portal also sends `responder` (E2).
