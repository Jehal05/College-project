# Draft pull request: `integration` into `main`

**Draft text only. The PR has not been opened and nothing has been merged.** Puneet opens it after Jehal and Daksh approve in writing.

## What is in `integration`
- Hospital portal (Puneet), patient app and mock server (Jehal), backend (Daksh, plus hospital blocks P1 to P4 by Puneet).
- Simulated prototype. Not a medical device. No real hospital, ambulance or patient.

## Latest CI numbers (15 Nov 2026)
| Check | Result | Run |
|---|---|---|
| Backend checks | 2042 tests passed; 77 endpoints built, FREEZE READY | commit `4d1ebae` |
| Hospital portal checks | 457 unit tests passed (456 in CI on `4d1ebae`, plus 1 added in `8950341`), 22 browser tests passed | commit `8950341` |
| CI (patient app, mock, contract) | 93 unit tests, 15 of 15 browser test files, contract 27/27 core and 9/9 extras | 43586143472 |
| CI (all apps) on the final commit | check that it is green right before merging; not recorded here | |

## What is NOT done
- Nobody has run `start-all.ps1` or `scripts/phase1-check.ps1` on the Windows demo laptop.
- The apps were run against the real backend on the laptop on 14 to 15 Nov (see `docs/LAPTOP_RUN_2026-11-14.md`). Open: the real backend does not move the ambulance, and the portal's hospital ranking differs from the backend's. The team has to decide.
- Contract script against the real backend and Docker were not run.
- Medical content: no doctor sign-off. `reviewStatus.js` is empty on purpose.
- Hindi and Gujarati text: no named reviewer.
- Proposed endpoints are not agreed in writing by Daksh.
- `POST /location-shares` is built (it came in with `main`).

## Checklist before merge
- [ ] Jehal: reviewed and approved in writing
- [ ] Daksh: reviewed and approved in writing
- [ ] CI green on the final commit of `integration`
- [ ] Laptop run table in `hospital-portal/docs/DEMO_SCRIPT.md` filled by a person
- [ ] Puneet presses merge himself

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Gir1dCTWmZDucjKzXfeZ35
