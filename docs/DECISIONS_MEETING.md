# Decisions meeting: Puneet, Daksh, Jehal (about 15 minutes)

Bring `docs/JOINT_REHEARSAL.md`. Record each answer here and in `docs/API_CONTRACT.md`.

| # | Decision | Options | Answer |
|---|---|---|---|
| 1 | Who moves `EMERGENCY_DETECTED` to `SOS_SENT`? | (a) the app calls `POST /emergencies/:id/sos` (today); (b) the backend does it when the 10 s countdown ends (Daksh's proposal; the mock already has this effect for the hospital) | Jehal's suggestion, Daksh must agree: the backend moves it when the 10 s countdown ends, so a closed app cannot block an SOS. Today the app calls `POST /emergencies/:id/sos`; the mock does NOT do it by itself (missing: an automatic SOS 10 s after creation when nobody cancels). |
| 2 | Hospital availability key names | Portal: `beds_free, icu_free, cath_lab_ready, stroke_unit_ready`. Daksh: `icu_beds, cath_lab_open, stroke_unit_open` | Jehal's suggestion, Daksh must agree: Daksh's names `icu_beds`, `cath_lab_open`, `stroke_unit_open` (plus `beds_free`) win. Until then the mock accepts and shows both sets (Phase 9). |
| 3 | Who moves the ambulance in the real system? | Portal browser simulator (stops when the desk closes) / backend / crew device | Jehal's suggestion, Daksh must agree: the backend simulates the ambulance. The mock already does this in manual mode after dispatch, so Puneet sets `VITE_PORTAL_SIMULATES_AMBULANCE=false`. |
| 4 | Cancel after dispatch | Forbidden (Daksh's table). Then the patient app must say so; it currently says "Could not cancel. Please try again." | Forbidden after dispatch (Daksh's table). Done: the patient app now says "The ambulance is already sent. Please call the number shown." (Phase 9; Hindi and Gujarati need a native check). |
| 5 | Readable symptom labels | Move the table from `mock-server/adapters.js` into the backend? | Jehal's suggestion, Daksh must agree: move the table from `mock-server/adapters.js` into the backend; it is the source. The portal keeps its fallback map. |
| 6 | Proposed portal endpoints (notes, chat, checklist, onboarding, availability) | Daksh adds, or the portal keeps them local | Daksh decides (Jehal's suggestion: add availability now, notes and chat later). Availability PATCH exists in the mock (Phase 9); notes, chat, checklist and onboarding are NOT built. |
| 7 | ID style | Daksh `pat_001` style vs the realistic style used now (`PT-2026-0417`, `HSP-AMD-001`); apps treat IDs as opaque | Realistic IDs are fine; the apps treat IDs as opaque text. Daksh to pick one style for the contract. |
