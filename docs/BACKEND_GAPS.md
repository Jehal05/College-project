# Backend gaps: what the apps call and what Daksh's backend has

**Draft for Daksh. Nothing here has been agreed with him.** Measured from the code on **14 Nov 2026**: the routes found in `backend/app/` (`main.py` and `api/*.py`) compared with the calls in `hospital-portal/src/services/api.js` and `patient-app/src/services/api.js`, and with `backend/CONTRACT.md` (v0.6.1/0.7 notes). The backend tests were **not run** (the sandbox has no Python packages); "built" means "a route exists in the code".

Status words: **built** = a route with that method and path exists. **not built** = no such route. **differs** = a similar route exists but the path or shape is different.
"In contract?" = the path appears in `backend/CONTRACT.md`.

## Hospital portal (Puneet)

| Call the portal makes | Backend | In contract? | If it is missing, the portal... |
|---|---|---|---|
| `GET /health` (every 15 s) | built | yes | treats any answer as "up" |
| `POST /auth/login` (sends `username`) | built | yes | cannot log in |
| `GET /hospitals?lat&lng&type` | not built | yes | falls back to the saved sample hospitals and says so in a banner |
| `PATCH /hospitals/{id}/availability` | not built | yes | shows an error; nothing saved |
| `POST /hospitals`, `PUT /hospitals/{id}`, `PATCH /hospitals/{id}/verify` | not built | no | Admin screen says "The backend has no ... yet" |
| `GET /emergencies?status=active` and `?status=finished` | not built | no (only `GET /emergencies/{id}`) | queue starts empty and says why; new alerts still arrive live if the WebSocket works |
| `GET /emergencies/{id}` | not built | yes | cannot open the detail |
| `POST /emergencies/{id}/ack` | not built | yes | the click is applied on the portal screen only |
| `POST /emergencies/{id}/dispatch` | not built | yes | same, on the screen only |
| `POST /emergencies/{id}/status` | not built | yes | same, on the screen only |
| `PATCH /emergencies/{id}/checklist` | not built | no | tick stays on this screen only |
| `POST /emergencies/{id}/notes` | not built | no | note stays on this screen, marked "saved on this screen only" |
| `POST /emergencies/{id}/chat` | not built | no | shows "not sent" |
| `GET /ambulances` | not built | no (only the location call is) | shows a sample fleet, marked not real |
| `POST /ambulances/{id}/location` | not built | yes | the movement is shown on this screen only |
| `GET /passport/{patient_id}` (staff login) | built | yes | shows a plain message for 401, 403, 404 |
| `GET /audit?page&page_size` (admin) | built (also accepts filters the portal does not send) | yes | "The backend has no audit log yet" |
| WebSocket `ws://host/ws?token=` | not built (contract names `/ws/hospitals/{id}` and `/ws/emergencies/{id}`) | yes, different path | shows "Reconnecting" and the connection-lost banner; no live alerts |

Details and exact bodies for the portal's proposed calls: `hospital-portal/docs/ENDPOINTS_TO_AGREE.md` and `PROPOSED_ENDPOINTS_FOR_DAKSH.md`.

## Patient app (Jehal)

| Call the app makes | Backend | In contract? | Note |
|---|---|---|---|
| `POST /auth/login` (sends `username`) | built | yes | |
| `GET`, `PATCH /patients/{id}` | built | yes | |
| `GET /patients/{id}/vitals`, `/baseline` | built | yes | |
| `GET`, `PUT /patients/{id}/consents` | built | yes | |
| `GET, POST, PUT, DELETE /patients/{id}/contacts` | built | yes | |
| `POST /demo/vitals` | built | yes | |
| `GET /audit` | built | yes | admin screen |
| `POST /emergencies` | not built | yes | the core flow |
| `POST /emergencies/{id}/sos` | not built | **no** | contract has no SOS call; "who moves to SOS_SENT" is still an open decision |
| `POST /emergencies/{id}/cancel`, `GET /emergencies/{id}` | not built | yes | |
| `GET /emergencies/{id}/reasons` | not built | no | |
| `GET /patients/{id}/emergencies` and `.../emergencies/{eid}/summary` | not built | no | |
| `POST /demo/scenario`, `POST /demo/reset` | not built | yes | demo panel |
| `GET /demo/state`, `POST /demo/speed`, `POST /demo/fail` | not built | no | mock-only helpers |
| `GET /patients/{id}/reports`, `DELETE .../reports/{rid}` (and upload) | not built | `POST /reports` only | |
| `POST, GET, DELETE /patients/{id}/passport`, `GET .../passport/log` | not built | no | **differs**: the backend only has `GET /passport/{patient_id}` (with `?token=` or a login) |
| Reminders (`/patients/{id}/reminders` ...) and preferences | not built | no | |
| `POST /patients/{id}/family-invites`, `POST /family/link`, `GET /family/patients`, `POST /family/checkin` | not built | partly (`/family/link`, others listed) | |
| `POST /responders/register`, `GET /responders/alerts`, `POST /responders/{id}/accept` | not built | yes | |
| `GET, PATCH /admin/users` | not built | yes | |
| `GET, PUT /content/{type}` | not built | yes | |

## What the demo needs most (in order)
1. Emergency create, SOS (or the agreed alternative), cancel and `GET /emergencies/{id}`.
2. Acknowledge, dispatch and status (`ack`, `dispatch`, `status`).
3. `GET /hospitals` and `PATCH /hospitals/{id}/availability`.
4. The WebSocket and its events (one agreed path).
5. `POST /ambulances/{id}/location` and `GET /ambulances`.

Daksh's own `backend/FREEZE.md` says the same: the whole emergency lifecycle, hospitals, ambulance location, demo reset and the WebSocket are "not built yet".
