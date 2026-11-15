# Test report (Phase 4)

Simulated prototype. Not a medical device. This page says **what to type**, **what each result looks like**, and **what has actually been measured**. Every number below has a label:

- **SANDBOX** = measured by Claude in a cloud sandbox on 15 Nov 2026 (Linux, 2 CPUs).
- **LAPTOP** = measured on Puneet's laptop. **Nothing in this report is LAPTOP yet.** The column is empty on purpose; fill it from `test-results.txt` after you run the script.
- **NOT RUN** = nobody has run it. Never read it as "should pass".

## 1. The short way

From the repository root, in PowerShell (Windows) or bash (Linux/macOS):

```powershell
.\scripts\run-all-tests.ps1            # add -SkipBrowser to leave out the two parts that open a browser
```
```bash
scripts/run-all-tests.sh               # add --skip-browser to do the same
```

It installs nothing. It prints the versions and machine, runs the eight parts below in order, and writes `test-results.txt` with one line per part (`PASS`, `FAIL` or `SKIP`) and the counts each tool printed. A part is `SKIP` when a prerequisite is missing; the script says which one. A `SKIP` is not a pass.

## 2. Prerequisites (install these yourself first)

| What | Version used by the project | How to check |
|---|---|---|
| Python | 3.12 (CI); the backend `requirements.txt` says "tested together on Python 3.12" | `python --version` |
| Backend packages | `pip install -r backend/requirements.txt` (fastapi 0.162.5, sqlalchemy 2.1.8, pydantic 2.14.3, httpx 0.28.1, bcrypt 5.0.0, pytest 9.2.0 ...) | `python -c "import fastapi, sqlalchemy, httpx, bcrypt, pytest"` |
| Node and npm | Node 22 or newer (the laptop has v26.13.1) | `node --version` |
| patient-app and portal packages | `npm install` inside `patient-app` and inside `hospital-portal` | the `node_modules` folders exist |
| Browsers for the browser parts | Playwright's browsers (`npx playwright install` in each app) | not checked by the script |

Optional for the ML and report-reading tests: `numpy`, `pandas`, `scikit-learn`, `pypdf`, `reportlab`. Without them a few tests skip (see section 5).

## 3. The parts, the exact commands, and what has been measured

| # | Part | Command (from the repository root) | SANDBOX 15 Nov 2026 | CI, commit 48a81b7, 15 Nov 2026 | LAPTOP |
|---|---|---|---|---|---|
| 1 | Backend tests | `cd backend` then `python -m pytest -q` | **NOT RUN as a whole.** FastAPI, SQLAlchemy, httpx and bcrypt are not installed in the sandbox and cannot be installed (no network). See the note under the table | **2324 passed, 7 skipped, 0 failed** (both runs) | |
| 2 | Backend route and test accounting | `cd backend` then `python scripts/phase_check.py` | **NOT RUN** (imports the app) | not a separate CI step | |
| 3 | Patient app, unit | `cd patient-app` then `npm run test:unit` | **NOT RUN** (vitest not installed) | **28 files, 178 tests passed** | |
| 4 | Patient app, browser | `cd patient-app` then `npm run test:browser` | **NOT RUN** (no browser, no packages) | push run: 20 of 22 files (A1, S5, S6 failed); pull-request run: **22 of 22 files, 505 checks** (flaky, Jehal's tests) | |
| 5 | Portal, unit | `cd hospital-portal` then `npm test` | **485 tests, 485 pass, 0 fail, 0 skipped** (needs no installed packages) | **485 tests, 485 pass, 0 fail** (job "test-and-build") | |
| 6 | Portal, lint | `cd hospital-portal` then `npm run lint` | **NOT RUN** (eslint not installed) | **pass** (job "lint") | |
| 7 | Portal, build | `cd hospital-portal` then `npm run build` | **NOT RUN** (vite not installed) | **pass** (job "test-and-build") | |
| 8 | Portal, end to end (Playwright, mock data) | `cd hospital-portal` then `npm run e2e` | **NOT RUN** (no browser). 20 test cases are written (14 in `portal.spec.js`, 6 in `flow.spec.js`); that is a count of the files, not a result | **pass** (job "e2e") | |

**Part 1 in the sandbox, for the record.** Running `python3 -m pytest --noconftest --continue-on-collection-errors` there gave 665 passed, 6 failed, 69 errors. That is **not** a backend result: `--noconftest` removes the shared test setup (so the 6 crypto and passport-secret tests fail on a missing key, which is the sandbox's fault) and the 69 errors are test modules that cannot import FastAPI. What it does show is that the tests which need no web framework (the ML models, the report-text parser, the what-if code, the rules engine and similar) run and pass. The 2042 backend tests that CI reported on commit `4d1ebae` (`docs/PROJECT_STATUS.md`) were **before** Phases 1 to 4 and were **not re-run** by anyone for this report. The new endpoint tests from Phases 1 to 3 have therefore never run on a machine with FastAPI; CI or the laptop is the first place they will.

**Part 5.** The portal count was 464 before Phase 4 and is 485 now: 21 new tests in `src/services/commandView.test.js` (the command view). The i18n tests (all three languages have the same keys, no hard-coded English) are part of the 485 and pass.

## 4. What a good result looks like

| Part | Pass looks like |
|---|---|
| 1 | last line `NNNN passed` and no `failed` or `error` (a few `skipped` are listed in section 5) |
| 2 | exits with no message and exit code 0 |
| 3 | `Test Files  N passed` and `Tests  N passed` |
| 4 | every check line `PASS`, process exits 0 |
| 5 | `# fail 0` |
| 6 | no output, exit code 0 |
| 7 | `built in ...` and a `dist` folder |
| 8 | `N passed` (a `flaky` line means a test passed only on retry: write it down) |

## 5. Skipped and flaky tests (known)

- `backend/tests/test_ml_reproduce.py` skips itself if `sklearn` or `pandas` is missing. `backend/tests/test_report_extract_api.py` skips the PDF tests if `pypdf` is missing (`pypdf` is **not** in `requirements.txt`; the route then answers 503 and says so).
- **A1 in the patient app's browser tests** (`patient-app/tests/browser/phase10-apps.test.mjs`, "admin lands on /admin and sees the new volunteer as not verified") failed once in CI and passed on later runs. The test already has a reload workaround and prints the network state when it fails. It is a timing problem on the first admin load, **not seen failing on the laptop**, and not investigated further here because it is Jehal's test (`docs/DEMO_ISSUES_PHASE4.md`, item 7). One passing run does not prove it is fixed.
- The portal's Playwright tests run against **mock data**, not the real backend.

## 6. Performance check

`backend/scripts/perf_check.py` (Python standard library only; needs a running backend with the demo seed):

```powershell
cd backend
python scripts/perf_check.py --base http://localhost:8000 --runs 20 --out ..\perf-result.json
```

It times six calls (login, GET vitals, POST emergency, GET emergency list as staff, POST /predictions/heart, GET organ), one request at a time, and prints the p50, p95 and max in milliseconds plus the machine it ran on. **It is a single-user local check, not a load test**: one client, one machine, a demo database. It says "nothing is accidentally slow", not "N users are fine". `POST /emergencies` is rate limited by the backend to 30 per minute per user, so keep `--runs` at 30 or less.

| Where | Result |
|---|---|
| SANDBOX | **NOT RUN.** There is no backend to call (FastAPI is not installed). The script's own helper functions (percentile, summary) were checked and its "cannot log in" path was run against a closed port; no timing was produced |
| LAPTOP | **NOT RUN yet.** Paste the printed table here, with the machine line, after running it |

## 7. Not covered by any test (honest list)

- The two WebSocket gaps in `docs/DEMO_ISSUES_PHASE4.md` (item 5).
- Sound on a new alert (nobody has heard it).
- The command view's screens (`CommandSummary.jsx`, `ResponseLog.jsx`) have no component test: the portal's unit tests cover pure functions only, and the Playwright suite has not been extended or run for them. Their logic is covered by `commandView.test.js`.
- The real backend with the portal and patient app on screen, except what `docs/LAPTOP_RUN_2026-11-14.md` records.

## 8. Reproducing one number

On a clean checkout, `cd hospital-portal && npm test` needs only Node. A teammate should see `# tests 485`, `# pass 485`, `# fail 0` (the count rises when anyone adds tests; compare with the commit you are on). For the backend, the first full run on a machine with the packages installed is the number that belongs in the LAPTOP column.

## Phase 6A (hospital portal polish), 15 Nov 2026

| Check | SANDBOX | CI |
|---|---|---|
| `npm test` (portal unit tests) | 514 pass, 0 fail | NOT RUN YET (nothing pushed) |
| JSX syntax of all pages and components (esbuild parse) | pass | n/a |
| `e2e/*.spec.js`, 22 older + 12 new in `phase6a.spec.js` | 34/34 pass in a **private shim runner** (Chrome, esbuild bundle, hand-built Tailwind CSS, a stand-in router and map). This is NOT the real Playwright + Vite run. | NOT RUN YET |
| Widths 360, 768, 1366, 1920: no sideways page scroll on dashboard, map, fleet, history, analytics | pass in the shim (tables scroll inside their own box on phones, the page does not) | NOT RUN YET |
| Keyboard: menu button, Escape, focus return, arrow keys in the queue | pass in the shim | NOT RUN YET |
| Reduced motion: no flash, NEW text and border stay | the older e2e test passes in the shim | NOT RUN YET |
| ESLint, Vite build, real Playwright | NOT RUN (not installed in the sandbox) | NOT RUN YET |
| Hindi and Gujarati wrapping, 200% zoom, landscape phone, screen reader | NOT CHECKED | NOT CHECKED |
