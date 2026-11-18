# Where we are: phase status

Checked against `main` at `a385f6a` (PR #32, "real street map"). Simulated prototype; nothing here is medical advice.

## Phases finished (from CHANGELOG.md)

| Track | Phases | State |
|---|---|---|
| Patient app + mock server (Jehal) | Phases 1 to 10 (foundation, emergency flow, personal data, offline/languages, passport, smarter/demo-ready, hospital-portal shapes, UI, Daksh-contract alignment, family/responder/admin) | Done |
| UI redesign | UI phases 0 to 4 (digital-twin dashboard, hospital look, 3D body model, 2D fallback) | Done |
| Operations dashboard | Multi-view dashboard with sidebar, command palette, route replay | Done (PR #24) |
| Multi-city | Steps 1 to 5: two-city data model, backend `/cities`, mock, patient app, portal switcher, joint rehearsal, docs | Done (PRs #26 to #29) |
| One address | `npm run one` serves apps, portal, start page and API on one port, plus login-return fix | Done (PRs #30, #31) |
| Real street map | OpenStreetMap on the patient Hospitals screen | Done (PR #32), latest work |
| Backend (Daksh) | J1 to J4: all 76 contract endpoints built, 2042 tests passed on CI | Built, freeze not started |
| Hospital portal (Puneet) | P1 to P4: queue, ranking, dispatch, map, admin, WebSocket | Done |

## Where we are now
The project is at the **polish, integration and release-readiness stage**. All planned feature phases are merged. What is left is verification and sign-off, not new features.

## Still open (from PROJECT_STATUS.md, FREEZE.md, CHANGELOG.md)
1. **Feature freeze not started.** Contract is 0.6.1, not 1.0; nothing is tagged `v1.0-demo`. Conditions in `backend/FREEZE.md` are unticked (heart-attack scenario with both apps on the real backend, clean full-suite run, Docker build from scratch, agreed freeze date).
2. **Demo still runs on the mock.** The portal and patient app were run on the real backend on Puneet's laptop (14 to 15 Nov), but nobody has looked at the screens; the "Laptop run" table is empty. `start-all.ps1` is untested on Windows.
3. **Medical content unreviewed** by a doctor (checklists, severity, 12 AI-drafted rules). Doctor sheet is ready.
4. **Hindi and Gujarati text unreviewed** by a native speaker.
5. **Backend gaps:** `POST /demo/fail` not built; real-backend cross-city SOS ranking not done; the portal's proposed endpoints (notes, chat, checklist) are not formally agreed with Daksh.
6. **Flaky test:** admin test A1 (`phase10-apps.test.mjs`) still flakes on CI.
7. **Shagun's branch** has only the initial commit; the family, responder and admin screens were built by Jehal instead.

## Suggested next steps
1. Run the full demo on the laptop and fill in the "Laptop run" table.
2. Get the doctor and native-speaker reviews.
3. Fix or retire the flaky A1 test.
4. Agree the contract with Daksh, tick the freeze conditions, then tag `v1.0-demo`.
