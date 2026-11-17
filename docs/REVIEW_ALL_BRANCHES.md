# Review of main and every branch (18 Nov 2026)

Method: `git fetch --all`, ahead/behind counts for every branch, the diffs of today's merges (PR #29, #30, #31), a trial merge of main into Puneet (nothing kept), and the CI runs on main read through the REST API. Not run here: the apps themselves (no node_modules and no network in the review sandbox), so anything about how a page looks is read from code, not seen.

## What the branches are
- **main** (752f062, 18 Nov 01:13): has the two-city feature, the one-address build (`npm run one`, port 4000) and the older portal and backend.
- **Puneet**: 50 commits that main does not have (portal redesign, command view, analytics, map notices, backend hardening, 2D organ drawings) and 21 commits behind main. Draft PR #15.
- **Daksh**: 2 commits main does not have (the operations dashboard, `dashboard/`). 98 behind.
- **Jehal**: 249 commits behind main. It is Jehal's old mock server.
- Every other branch (ui-*, multicity*, one-place*, docs-*, dashboard, integration, cleanup) is fully inside main. They can be deleted when the team agrees.

## Why things look wrong
1. **The portal and map look different today (cause found).** `npm run one` builds the portal from main, and main does not contain Puneet's portal work. The map you see there is main's map, plus today's change that makes the map, queue, fleet and analytics city-scoped (start point and zoom come from the chosen city). So the design did not "change by itself": a different branch is being shown.
2. **The mock on port 4000 that was running was the old one.** The `jehal-mock` folder is on branch Jehal (249 commits behind main). It has no `/start`, no `/portal/`, no cities.
3. **Puneet cannot run `npm run one`.** The script exists only on main.
4. **The portal login "Failed to fetch"** was the old mock refusing the portal's address (CORS). It does not apply to the one-address build, where everything is on one origin.

## Fix list (most important first)
| # | Severity | Problem | Fix |
|---|---|---|---|
| 1 | High | Puneet's work is not in main, so the one-address demo shows the old portal | Merge main into Puneet, resolve 7 conflicts (below), run all checks, then take PR #15 out of draft |
| 2 | High | Backend CI on main fails: `test_ws_api.py::test_the_desk_hears_its_own_acknowledge_and_the_patient_hears_it_too` got `vitals.update` before `hospital.acknowledged` | The test assumes message order; make it wait for the event it wants (filter by type) |
| 3 | High | A1 (patient-app admin test) fails on main too. Root cause still unknown | Keep the diagnostics on Puneet; read the `diag=` line in the next failure |
| 4 | Medium | Accessibility audit job timed out starting Chrome ("WS endpoint URL") on main | Re-run; if it repeats, add a launch retry in `patient-app/scripts/a11y-audit.mjs` |
| 5 | Medium | `npm run one` builds the patient app with `VITE_DEMO_TOOLS=true` (demo panel). Fine for a demo, not for a release | Say so in ONE_ADDRESS.md; never deploy that build |
| 6 | Medium | Two mocks now exist (jehal-mock on Jehal and the one in main). Two ways to start, two sets of logins | Use only `npm run one` from main or from Puneet after the merge; delete the `jehal-mock` worktree |
| 7 | Low | `laptop-start-mock.bat` and `laptop-start-all.bat` point at jehal-mock and ports 4000 and 5174 | Replace with one script for `npm run one`, delete at the end |
| 8 | Low | Branch clutter (about 30 merged branches) | Delete merged branches after the team agrees |

## Trial merge of main into Puneet: 7 conflicts, all additive
`README.md`, `docs/API_CONTRACT.md`, `backend/app/main.py` (both sides add routers: keep both lists, so organs, lab_values, predictions, report_extract and cities), `hospital-portal/src/i18n/en.js, hi.js, gu.js` (both sides add keys: keep both), `hospital-portal/src/pages/Analytics.jsx` (Puneet's date range and main's city scope: use both). No file was changed on either side in a way that cannot be combined.

## Not reviewed yet
Line-by-line of the 95 files main changed since 16 Nov apart from the ones above (cities code, mock server stores and simulator, new browser tests), the dashboard code, backend ML, CI workflow files.
