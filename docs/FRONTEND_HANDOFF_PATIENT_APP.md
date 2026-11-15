# Handoff to Jehal: patient-app ideas from the frontend review

Written 15 Nov 2026 by Puneet (Phase 6A). **Nothing in `patient-app/` or the mock server was changed.** These are ideas, not requests, and not decisions. Only the points marked "checked" were looked up in your code; the rest come from the review and have not been verified.

## Checked against your code
- **Mobile Home goes to `/`, desktop Overview goes to `/overview`.** True: `config/navigation.js` has `BOTTOM_TO = { overview: '/' }` with the comment that on the phone Home is the original home screen. It looks deliberate, so decide whether you want one landing page.
- **Two visual systems.** `THEMED_ROUTES` lists the new design screens; older screens (Home, Symptoms, Profile and others) are outside it. That matches what the review says.
- **ConfirmDialog exists** (`components/ConfirmDialog.jsx`). The review says to reuse it for deletes and revokes; I did not check which screens already do.
- **The review mentions `Feedback.jsx`.** I found no file by that name in `components/`.

## Ideas from the review (not checked)
1. **One design system:** shared Button, Card, Input, Select, Badge, Modal, Skeleton, EmptyState, ErrorState, PageHeader. In the portal I added the small set without Input/Select/Modal (`hospital-portal/src/components/ui/`, `services/uiClasses.js`): you can copy the idea, not necessarily the code.
2. **Overview:** a welcome header with last-updated time, larger vitals cards with unit, time and source, period switch (24 h / 7 d / 30 d / 90 d). Any score must be a data-completeness indicator, not a medical score.
3. **Digital Twin:** selectable organs with an info panel, pause rendering when hidden, a 2D fallback. Colours only from reviewed reference ranges.
4. **Mobile navigation:** five destinations (Home, Monitor, Twin, Reports, Profile) and a More menu; active-page marker that is not colour alone (I used an underline and an arrow in the portal).
5. **Forms:** inline validation, "Saving... / Saved / Could not save" states, confirmation before deleting reports or revoking access.
6. **Reports:** search, date and category filters, sort, download, preview; keep extracted values separate from interpretations and never present them as confirmed findings.
7. **Loading states:** loading, empty, error, offline and refreshing on each data screen.
8. **Checks the review asks for:** widths 360, 390, 430, 768, 1366, 1920; 200% zoom; Hindi and Gujarati wrapping; touch targets 44 px; landscape phone.

## What the portal did that touches you
- The alert card shows **distance** only if `hospital.distance_km` arrives. Your mock's `hospital.alerted` event: does it carry it? If not, the card simply leaves it out.
- Nothing about speed, plate numbers or bed history was added anywhere (no data exists).
