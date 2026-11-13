# Decisions meeting: Puneet, Daksh, Jehal (about 15 minutes)

Bring `docs/JOINT_REHEARSAL.md`. Record each answer here and in `docs/API_CONTRACT.md`.

| # | Decision | Options | Answer |
|---|---|---|---|
| 1 | Who moves `EMERGENCY_DETECTED` to `SOS_SENT`? | (a) the app calls `POST /emergencies/:id/sos` (today); (b) the backend does it when the 10 s countdown ends (Daksh's proposal; the mock already has this effect for the hospital) | |
| 2 | Hospital availability key names | Portal: `beds_free, icu_free, cath_lab_ready, stroke_unit_ready`. Daksh: `icu_beds, cath_lab_open, stroke_unit_open` | |
| 3 | Who moves the ambulance in the real system? | Portal browser simulator (stops when the desk closes) / backend / crew device | |
| 4 | Cancel after dispatch | Forbidden (Daksh's table). Then the patient app must say so; it currently says "Could not cancel. Please try again." | |
| 5 | Readable symptom labels | Move the table from `mock-server/adapters.js` into the backend? | |
| 6 | Proposed portal endpoints (notes, chat, checklist, onboarding, availability) | Daksh adds, or the portal keeps them local | |
| 7 | ID style | Daksh `pat_001` style vs the realistic style used now (`PT-2026-0417`, `HSP-AMD-001`); apps treat IDs as opaque | |
