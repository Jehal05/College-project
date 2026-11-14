# Backend gaps: what the apps call and what Daksh's backend has

**Draft for Daksh. Nothing here has been agreed with him.** Measured from the code on **14 Nov 2026** (updated after merging Daksh's J1 to J4 commits, last `fe52ee4`): the routes found in `backend/app/` (`main.py` and `api/*.py`) compared with the calls in `hospital-portal/src/services/api.js` and `patient-app/src/services/api.js`, and with `backend/CONTRACT.md` (v0.6.1/0.7 notes). The backend suite was run on 14 Nov 2026 with J1 to J4 and Puneet's P1 to P3: **1893 passed**; contract status **70 built, 1 not built**. "Built" means a route exists and is tested.

Status words: **built** = a route with that method and path exists. **not built** = no such route. **differs** = a similar route exists but the path or shape is different.
"In contract?" = the path appears in `backend/CONTRACT.md`.

## Hospital portal (Puneet)

| Call the portal makes | Backend | In contract? | If it is missing, the portal... |
|---|---|---|---|
| `GET /health` (every 15 s) | built | yes | treats any answer as "up" |
| `POST /auth/login` (sends `username`) | built | yes | cannot log in |
| `GET /hospitals?lat&lng&type` | **built** (Puneet, P1 to P3) | yes | falls back to the saved sample hospitals and says so in a banner |
| `PATCH /hospitals/{id}/availability` | **built** (Puneet, P1 to P3) | yes | shows an error; nothing saved |
| `POST /hospitals`, `PUT /hospitals/{id}`, `PATCH /hospitals/{id}/verify` | **built** (Puneet, P1 to P3) | no | Admin screen says "The backend has no ... yet" |
| `GET /emergencies?status=active` and `?status=finished` | **built** (Puneet, P1 to P3) | no (only `GET /emergencies/{id}`) | queue starts empty and says why; new alerts still arrive live if the WebSocket works |
| `GET /emergencies/{id}` | **built** (new) | yes | cannot open the detail if it fails |
| `POST /emergencies/{id}/ack` | **built** (Puneet, P1 to P3) | yes | the click is applied on the portal screen only |
| `POST /emergencies/{id}/dispatch` | **built** (Puneet, P1 to P3) | yes | same, on the screen only |
| `POST /emergencies/{id}/status` | **built** (Puneet, P1 to P3) | yes | same, on the screen only |
| `PATCH /emergencies/{id}/checklist` | **built** (Puneet, P2, proposed) | yes, marked proposed | tick stays on this screen only |
| `POST /emergencies/{id}/notes` | **built** (Puneet, P2, proposed) | yes, marked proposed | note stays on this screen, marked "saved on this screen only" |
| `POST /emergencies/{id}/chat` | **built** (Puneet, P2, proposed) | yes, marked proposed | shows "not sent" |
| `GET /ambulances` | **built** (Puneet, P1 to P3) | no (only the location call is) | shows a sample fleet, marked not real |
| `POST /ambulances/{id}/location` | **built** (Puneet, P1 to P3) | yes | the movement is shown on this screen only |
| `GET /passport/{patient_id}` (staff login) | built | yes | shows a plain message for 401, 403, 404 |
| `GET /audit?page&page_size` (admin) | built (also accepts filters the portal does not send) | yes | "The backend has no audit log yet" |
| WebSocket `ws://host/ws?token=` | **built** (Puneet, P4): one path, filtered by role; the contract's older two-path design is still written there | yes (section 5, as built) | shows "Reconnecting" and the connection-lost banner; no live alerts |

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
| `POST /emergencies` | **built** (new) | yes | the core flow |
| `POST /emergencies/{id}/sos` | **built** (new) | decision recorded by Daksh | Daksh's commit says the contract now records it; check `CONTRACT.md` |
| `POST /emergencies/{id}/cancel`, `GET /emergencies/{id}` | **built** (new) | yes | |
| `GET /emergencies/{id}/reasons` | **built** (new) | not listed | |
| `GET /patients/{id}/emergencies` and `.../emergencies/{eid}/summary` | **built** (new) | not listed | |
| `POST /demo/scenario`, `POST /demo/reset` | **built** (J2) | yes | demo panel |
| `GET /demo/state`, `POST /demo/speed` | **built** (J2) | no | `POST /demo/fail` is still not built |
| `GET /patients/{id}/reports`, `DELETE .../reports/{rid}` (and upload) | **built** (J3) | yes | |
| `POST, GET, DELETE /patients/{id}/passport`, `GET .../passport/log` | **built** (J3) | yes (section 4.5) | `GET /passport/{token}` also works; a revoked, expired or unknown link answers 410 |
| Reminders (`/patients/{id}/reminders` ...) and preferences | **built** (J3) | yes (section 4.5) | |
| `POST /patients/{id}/family-invites`, `POST /family/link`, `GET /family/patients`, `POST /family/checkin` | **built** (J4) | yes (section 4.6) | demo code `FAM-0417` |
| `POST /responders/register`, `GET /responders/alerts`, `POST /responders/{id}/accept` | **built** (J4) | yes | |
| `GET, PATCH /admin/users` | **built** (J4) | yes | |
| `GET, PUT /content/{type}` | **built** (J4) | yes | |

## What the demo needs most (in order)
1. ~~Emergency create, SOS, cancel and `GET /emergencies/{id}`~~: **built in Daksh's latest commit** (the backend's own tests; not yet tried by the apps).
2. ~~Acknowledge, dispatch and status~~, ~~hospitals and availability~~, ~~ambulances~~, ~~the WebSocket~~: **built** (Puneet, P1 to P4). The real-browser run of both apps against this backend has NOT been done yet.
3. Still open: a desk taking over an alert held by another hospital is refused (403) by the backend; `vitals.update` is not streamed once a second; `replay_since` is ignored; the WebSocket path is not agreed with Daksh and Jehal.

Daksh's `backend/FREEZE.md` still shows the older count (17 of 42); the local contract status now says 76 built, 0 not built (FREEZE READY). The WebSocket and the once-a-second vitals stream exist. Still not built: `family.status` and `responder.alert` pushes, WebSocket replay and `POST /demo/fail`. The real contract script passes 24 of 27 core checks (see `backend/FREEZE.md` for the 3 that do not, and why).
