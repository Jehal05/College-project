# PR #15 ownership map (Puneet to main)

Status: draft for review, written 16 Nov 2026 at `fdf955f`. The sample data in this project is simulated and this is not a medical device.
Counts come from `git diff origin/main...HEAD`. "Reviewer" is who should read that part before it merges.

## Summary

| Owner of the area | Paths | Reviewer |
|---|---|---|
| Puneet | `hospital-portal/` (src, e2e, docs, scripts) | Puneet (self); a team member for the UI |
| Daksh | `backend/` (app, ml, scripts, tests, config files) | **Daksh** |
| Jehal | `patient-app/` (3 files) | **Jehal** |
| Jehal | `mock-server/` | none changed (main's keep-alive fix is already in main) |
| Shared | `docs/`, `scripts/`, `.github/`, root docs, `laptop-*` | whoever reads the matching docs |

## Needs review by Jehal (patient-app, 3 files)

| File | Commit | What changed | Why |
|---|---|---|---|
| `patient-app/tests/browser/phase10-apps.test.mjs` | `b2f30ff`, `15a91bc` | Test A1: if the accounts list has not arrived, reload and wait again (up to 3 times). 2 added lines. | A1 failed in CI because `GET /admin/users` stayed pending. This is a workaround, not a root-cause fix. |
| `patient-app/tests/browser/phase15-simulator.test.mjs` | `15a91bc` | Tests S5 and S6 wait (up to 5 s) for the simulator table instead of reading it at once. +9 −2. | S5 and S6 failed once in CI on a timing race. |
| `patient-app/eslint.config.js` (new) | `c5239e9` | ESLint flat config with the same rules as the portal. 40 lines. | Lets the two apps be checked the same way. **Not run in CI:** `.github/workflows/ci.yml` has no lint step for the patient app. |

No source file of the patient app and nothing in `mock-server/` is changed by this branch. Open question for Jehal: A1 passed on both CI events at `fdf955f`, but it failed on the pull_request run at `2df527c` and `09fd6b7`. The root cause is still unknown.

## Needs review by Daksh (backend)

| Area | Files | Commit | What changed |
|---|---|---|---|
| Hardening | `app/hardening.py`, `app/main.py`, `.env.example` | `21a0922`, `c5239e9` | Security headers on every reply, 413 for oversized requests, `DEMO_MODE` defaults to false |
| Rate limit | `app/security/write_limiter.py`, `app/api/emergencies.py` | `69eaf1f` | 429 with `Retry-After` on emergency creation (default 30 per minute per user) |
| Lab values (PROPOSED routes) | `app/api/lab_values.py`, `app/services/lab_values.py`, `app/models/patient_data.py` | `cc490d3`, `48a81b7` | Lab value storage and reading |
| Organ answers (PROPOSED) | `app/api/organs.py`, `app/services/organs.py` | `cc490d3` | Organ question answers |
| Report text (PROPOSED) | `app/api/report_extract.py`, `app/services/report_text.py` | `cc490d3` | Text extraction from a report |
| What-if scenario (PROPOSED) | `app/api/predictions.py` | `cc490d3` | What-if route |
| Practice ML models | `app/ml/predict.py`, `app/ml/models/*` (2 models, 2 cards), `ml/*` (6 files) | `c5239e9` | Practice models trained on invented data. Simulated, not clinical. |
| Scripts | `scripts/compare_rankings.py`, `make_phase3_examples.py`, `perf_check.py`, `phase_check.py` | `3e6b99f`, `cc490d3`, `fa86488` | Checks and examples |
| Tests and fixtures | `tests/` (16 files plus fixtures, 2 synthetic CSVs of 403 lines) | several | Tests for all of the above |
| Config | `Dockerfile`, `ruff.toml`, `requirements-ml.txt`, `README.md`, `CONTRACT.md`, `.dockerignore` | `c5239e9`, `cc490d3` | Build and lint setup, contract text |

The "PROPOSED" routes are listed in `docs/API_CONTRACT.md` and need Daksh's confirmation before anyone depends on them. CI result at `fdf955f`: Backend checks `test` passed (SEEN).

## Puneet's own area (hospital portal)

Phase 4 command view, Phase 6A shared UI parts, stats strip, alert cards, map tile notice, grouped navigation, analytics median/p90/n and date filter, plus the e2e specs. CI at `fdf955f`: test-and-build, lint and e2e passed. Hindi and Gujarati strings are unreviewed drafts.

## Shared (docs, scripts, CI)

`docs/` (about 21 files), `scripts/` (4), `.github/` (1), `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `hospital-portal/docs/` (2 changed) and five `laptop-*` helper scripts. Merge commits `6fe5094` and `fdf955f` bring `main` into this branch and change no code of mine.
