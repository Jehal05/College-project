# Shagun's work: how it is shared

Update: all three apps are now built by Jehal. Original proposal below. Shagun's branch holds only the initial commit, so the family, responder and admin apps and their backend endpoints are shared. This is a proposal; if Shagun has local work, collect it first and shrink the split.

| Piece | Owner | Why |
|---|---|---|
| Family app (live status, hospital, ambulance, only shared details) | Jehal | Reuses the patient app login, WebSocket and consent code. **Built** as `/family` in the patient app. |
| Mock endpoints for family, responder and admin, plus contract text | Jehal | **Built** (`mock-server/otherApps.js`, `docs/API_CONTRACT.md` Phase 10). |
| Admin app: users, content approval, audit log | Jehal (done, as `/admin` in the patient app) | Puneet's portal keeps its own admin page for hospitals; the two do not overlap. |
| Responder app: sign-up, alerts, accept (volunteer responders) | Jehal (done, `/volunteer` and `/responder`) | The responder status updates (on the way, arrived) are not built: the contract has no endpoint for them yet. |
| Backend endpoints: family, responder, admin, content, feedback, privacy | Daksh | Owns the backend. Starts after the 27 core contract checks pass. |

Order for Daksh: audit and admin users, family, responder, then content, feedback and privacy.

Rules for all three apps: say "Simulated", never diagnose; all text through the language files; "Not shared" instead of blank; WebSocket with `?token=`; no tokens or phone numbers in addresses, logs or the audit log; large touch targets and 200 percent zoom; tell the group before adding a shape the contract lacks.

Done means: each app runs against the mock and passes its own tests, the contract script still passes, and each owner writes a short README.
