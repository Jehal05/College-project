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

CI column = GitHub Actions on commit 2df527c (pushed to `Puneet`). Each commit ran twice (push and pull_request events).

| Check | SANDBOX | CI (2df527c) |
|---|---|---|
| Portal unit tests (`npm test`) | 514 pass, 0 fail | 514 pass, 0 fail (both runs) |
| ESLint (`npm run lint`) | NOT RUN (not installed here) | success (both runs) |
| Vite build (`npm run build`) | NOT RUN (not installed here) | success (both runs) |
| Real Playwright e2e (34 tests: 22 older + 12 new in `phase6a.spec.js`) | 34/34 in a private shim runner (Chrome + esbuild + hand-built Tailwind; not the real Playwright/Vite) | success, but **33 passed + 1 flaky** in both runs: my new analytics test failed on its first try and passed on retry (it read the case count before the history had finished loading: 7 vs 10). Fixed in 09fd6b7 (waits for the numbers to settle). On 09fd6b7 both runs: **34 passed, 0 flaky**. |
| Widths 360 / 768 / 1366 / 1920, no sideways page scroll (5 pages) | pass in the shim | pass in CI (4 width tests, both runs) |
| Keyboard menu (open, Escape, focus return), 44px targets, arrow keys in queue | pass in the shim | pass in CI |
| Backend tests (pytest) | not run here (no FastAPI) | 2324 passed, 7 skipped (unchanged; success) |
| Patient-app unit tests | not run here | 28 files, 180 tests passed |
| Patient-app browser tests | not run here | push run: success. pull_request run: **failed**, 21/22 files, 505 checks: test A1 (`phase10-apps`, admin page: pending GET /admin/users and /content/first_aid_basics). Same commit passed in the push run. Patient-app was not touched by Phase 6A. |
| Hindi and Gujarati wrapping, 200% zoom, landscape phone, screen reader | NOT CHECKED | NOT CHECKED |

### CI on 09fd6b7 (the test fix)

Portal unit tests, lint, build and e2e (34 passed) succeeded in both runs; backend checks succeeded; patient-app unit tests succeeded. Patient-app browser tests: push run success, pull_request run **failed on A1 again** (21/22 files, 505 checks), the same test as on 2df527c. Over the last 14 CI runs A1 failed in 6 of 8 pull_request runs and 1 of 7 push runs, on three branches (Puneet, ui-phase3b), so it is not caused by Phase 6A and not yet root-caused. It is a patient-app test (Jehal's); no patient-app file was changed in Phase 6A.

### Phase 7A: CI on ed3b56b (docs only, 16 Nov 2026)

Docs-only push (ownership map and drafts). All runs finished with success:

| Workflow | Event | Conclusion |
|---|---|---|
| Hospital portal checks (test-and-build, lint, e2e) | push and pull_request | success |
| Backend checks (pytest) | pull_request | success (no push-event run was listed for this sha; the workflow seems to run on pull requests for this change, GUESS) |
| CI (patient-app unit, contract, audit, browser) | push and pull_request | success |

A1 (`phase10-apps.test.mjs`): passed on both events at ed3b56b (22/22 browser files, 505 checks). Run count since `main` was merged: see the next section for the total. No code changed in this phase, so no new SANDBOX test was needed; the decisions commit changes docs only (the backend contract test reads route tables only, and no table row changed).

### Phase 7A: CI on 5a347a7 (decisions commit, docs only) and A1 count

Hospital portal checks (pull_request), Backend checks (push and pull_request): success. CI pull_request run: success, A1 passed, 22/22 browser files, 505 checks. **CI push run: failure, A1 failed again** (21/22 files, 505 checks; `GET /admin/users` and `GET /content/*` still pending), the same pending-request failure as before. No code changed in this commit.

A1 since `main` was merged (3 commits `fdf955f`, `ed3b56b`, `5a347a7`, 2 events each = 6 CI runs): 5 passed, 1 failed. So merging `main` did **not** fix A1, and the earlier idea that the PR-merge tree was the cause is not supported (GUESS withdrawn). The root cause is still unknown. A1 is in the patient app, which is Jehal's area.

### CI on 3fa3aaa (merge of main into Puneet, 16 Nov 2026)

Hospital portal checks, Backend checks (pull_request run): success. CI pull_request run: success (24/24 browser files, 530 checks; accessibility audit PASS). CI push run: **failure, A1 again** (23/24 files; only `GET /admin/users` still pending). No backend run was listed for the push event on this sha.

A1 since `main` was first merged into Puneet (5 commits, 2 events each = 10 CI runs): 8 passed, 2 failed (both on push events, the other failure was on `5a347a7`). A1 also failed on `main` itself (`ad0a311`). It is a real, repeating flake whose root cause is still unknown; it is not caused by Puneet's changes.

## Review fixes (16 Nov 2026, local commits, NOT pushed yet)

Six findings from the detailed review of the Puneet branch. `origin/main` (3 new commits) was merged first, no conflicts. Labels: SANDBOX = run in the working sandbox; CI = only a CI run can show it (the sandbox has no network, so `fastapi`, `ruff`, `playwright` and the patient-app `node_modules` are not installed and the backend pytest suite, the patient-app vitest and the browser tests could **not** be run here).

| # | Finding | Commit | What changed | Test added | Result |
|---|---|---|---|---|---|
| 1 | Portal reconnected about every 2 s on a dead login | `585172d` | New `hospital-portal/src/services/socketLink.js` (portal) and `patient-app/src/utils/reconnect.js` (patient app): no retry after close code 1008 (portal status "Signed out"), back off 2 s to 30 s, the wait starts again from 2 s only after a socket stayed open 10 s | `socketLink.test.js` (5), `patient-app/tests/unit/reconnect.test.js` (6, fake WebSocket and timers) | Portal: SANDBOX 519 of 519 pass (the whole portal unit suite). Patient app: SANDBOX pure functions checked by hand (2000, 4000, 8000, 16000, 30000, 30000); the vitest file itself runs in CI only |
| 2 | A1 flake root cause | `ad150e5` | **Not fixed.** Read-only evidence from 5 failing browser-test runs plus test-only diagnostics (request timeline, direct server probes) printed only when A1 fails | none (diagnostics) | CI only. See "A1 evidence" below |
| 3 | Chunked bodies not limited | `9fad839` | `SecurityMiddleware` counts body bytes as they are read and answers 413 over `MAX_BODY_BYTES` (CORS headers kept) | 3 in `test_hardening.py` | SANDBOX: the middleware was driven directly with a fake app: 180 B chunked gives 413, 100 B and 40 B pass. The pytest tests run in CI only |
| 4 | Limiter singleton had no lock | `2ff844b` | `emergency_limiter()` creates the limiter under a lock (checked twice) | `test_sixteen_threads_share_one_limiter` | SANDBOX: 16 threads gave 1 shared object and 1 construction (same logic as the test, run without fastapi). pytest run in CI only |
| 5 | Duplicate authorization in `extract_report` | `aa55475` | The first block never allowed anyone (it only raised for non-owners); the real check was the second call. Now one call, same 403 and the same audit row (`resource_id` "none") | one assertion added to `test_staff_and_admin_are_403_and_audited` | SANDBOX: compiles. pytest runs in CI only |
| 6 | No CSP or HSTS | `0cbc845` | `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'` on API replies; `Strict-Transport-Security` only over HTTPS (scheme or `X-Forwarded-Proto`). `/docs`, `/redoc` and stored PDF or image files are exempt from the CSP so they keep working | 6 in `test_hardening.py` | SANDBOX: helper functions and the middleware driven directly (CSP on `/health`, absent on `/docs` and a PDF; HSTS only when forwarded as https). pytest runs in CI only |

Other SANDBOX results: `dashboard/test.mjs` 16 passed; `python -m compileall` on `backend/app` and `backend/tests` succeeded. ruff and eslint are not installed here, so lint is CI only.

**Still open after these fixes**
- A1 is **not fixed**. It stays open until 10 green runs in a row of the patient-app browser tests, with the new diagnostics there to read if it fails again.
- No CSP on the static portal or the patient app (the hosts that serve them are outside this repo's backend): open.
- Hindi and Gujarati text for the new "Signed out" badge is unreviewed.

### A1 evidence (read-only, 16 Nov 2026)

Source: logs of 5 failing "Browser tests" jobs (runs on `main`, `Puneet`, `dashboard` and `multicity-apps`), read through the REST API. SEEN in all 5:
- The `/admin` page had loaded: the heading, the "Emergency numbers" editor and the access log table (with the volunteer's `responder.register` row) were on screen. The **Accounts list was empty**.
- The still-pending requests were, each time, the earliest ones the page sends: `GET /admin/users` (5 of 5), sometimes also `GET /content/emergency_numbers` and `GET /content/first_aid_basics`. The access-log request had finished.
- The list of failed or 4xx/5xx requests was empty in every run: nothing was refused, aborted or timed out (the app itself aborts after 10 s, which would show as a failed request).
- Jehal's keep-alive fix (`6ad7baa`, 15 Nov 12:48) is older than all five failures, so stale keep-alive sockets are not the only cause. The retry loop (`15a91bc`) is also older, and still the failure is reached.
- The failure also occurs on `main`, so it is not caused by this branch.

Competing explanations (GUESS, not proven):
1. **The browser never really sent the first requests** (a stalled or queued connection in Chrome after the long audit step). Would show: the direct probe from the test process answers quickly, the server never logs the request, `resources` has no entry for `/admin/users`.
2. **The mock server received them but did not answer** (event loop busy with the simulator and the one-second vitals broadcast). Would show: the direct probes are slow or time out as well, including `/health`.
3. **The page's own timing** (headless timers or the reload loop). Would show: `attemptsUsed` and `attemptLog` differ from the expected three attempts about 20 s apart, or `fail` entries in the timeline.

The new `diag=` text on the A1 failure line holds `attemptsUsed`, `attemptLog`, `timeline` (start, response, finish, fail times in ms for admin, content and ws requests), the page's resource timings and three probes (`/health`, `/admin/users`, `/content/emergency_numbers`, with status and milliseconds). Step 3 (a fix) is **not done**: the evidence does not point to one cause yet.

### Review follow-ups (16 Nov 2026, local, not pushed)

| Finding | Commit | What changed | Test | Result |
|---|---|---|---|---|
| SOS answered 429 showed a bare error | `4529d11` | `beginEmergency` keeps the alert as "not sent yet" on a 429 (the screen says call 112 / 108 and has Try again), as it already did for no connection; other errors still show the error | `patient-app/tests/unit/beginEmergency.test.js` (3) | CI only (no patient-app `node_modules` in the sandbox) |
| Download address revoked at once | `4529d11` | `downloadText` revokes its address after 10 s | none (browser behaviour) | SANDBOX: portal unit tests 519 of 519 |
| Login token in the WebSocket address could be written to uvicorn's log | `9a35550` | `app/security/log_redact.py` replaces `token=` and `access_token=` values with `[hidden]` in the `uvicorn.access` and `uvicorn.error` loggers; installed by `create_app`; `CONTRACT.md` now says so and warns that a proxy in front must do the same | `backend/tests/test_log_redact.py` (3) | SANDBOX: the same checks run without pytest (token gone, 2 lines redacted). pytest runs in CI only. A real uvicorn run was not done here, so the claim that uvicorn logs the address is from knowledge of uvicorn, not seen here |
