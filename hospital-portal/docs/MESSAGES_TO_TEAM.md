# Messages to send (Simulated prototype)

Copy each message into the group chat.

## To Daksh

Daksh, open items for the hospital portal. Full wording is in `hospital-portal/docs/PROPOSED_ENDPOINTS_FOR_DAKSH.md`.

1. **Notes and chat (items 5 and 6).** `POST /emergencies/{id}/notes` and `POST /emergencies/{id}/chat`, plus the events `emergency.note` and `chat.message`. The portal side is built and falls back to "saved on this screen only" until you add them.
2. **Availability names.** The portal uses `beds_free`, `icu_free`, `cath_lab_ready`, `stroke_unit_ready` (and reads yours too). Jehal's mock accepts both. Which set wins?
3. **Who moves the ambulance?** If the backend does, the portal runs with `VITE_PORTAL_SIMULATES_AMBULANCE=false`.
4. **WebSocket login.** Can the socket accept `{"type":"auth","token":"..."}` as the first message? Jehal's mock already does. The portal supports it with `VITE_WS_AUTH=message`.
5. **Severity NONE.** A real SOS must not be sent as NONE: the portal puts NONE at the bottom of the queue with no sound. Please send at least URGENT and keep the engine result in a separate `engine_severity` field, marked as pending doctor review.
6. **Hospital mode.** Please make it switchable, and default to manual when the portal is used. If both the backend and the portal drive the states we get 409 errors.
7. **Login answer.** Please include `role` and `hospital_id`.
8. **Sex display.** Showing it is a team and clinical decision. The portal shows "Not shared" when the value is missing.

## To Jehal

Jehal, thanks for Phase 9. I ran the portal against your mock (commit f0bce14) and these work: staff login returns `HSP-AMD-002`, and an unacknowledged alert escalates and shows "Escalated to the next hospital". Two notes:

1. My earlier PDF suggested Daksh's availability key names. The portal uses its own (`beds_free`, `icu_free`, `cath_lab_ready`, `stroke_unit_ready`). Your mock accepting both is perfect until Daksh decides.
2. The portal now reacts live to `hospital.availability_updated` (commit 43f57db on `Puneet`).

One small thing: after `POST /demo/reset` the next alert gets the same id (`EM-20261113-0001`), so an open portal keeps showing the old card until you refresh the page. Maybe keep counting ids across a reset?

Also `npm ci` in your repo reports 14 vulnerabilities (1 high, 2 critical). Please look at `npm audit`, but do not run `npm audit fix --force`.
