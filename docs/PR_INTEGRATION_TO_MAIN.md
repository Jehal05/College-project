# Draft pull request: `integration` into `main`

**Draft text only. The PR has not been opened and nothing has been merged.** Puneet opens it after Jehal and Daksh approve in writing.

## What is in `integration`
- Hospital portal (Puneet), patient app and mock server (Jehal), backend (Daksh, plus hospital blocks P1 to P4 by Puneet).
- Simulated prototype. Not a medical device. No real hospital, ambulance or patient.

## Latest CI numbers (14 Nov 2026)
| Check | Result | Run |
|---|---|---|
| Backend checks | 1977 tests passed; 74 endpoints built, 1 not built (`POST /location-shares`) | 43586143495 |
| Hospital portal checks | 454 unit tests passed, 22 browser tests passed | 43587514106 |
| CI (patient app, mock, contract) | 93 unit tests, 15 of 15 browser test files, contract 27/27 core and 9/9 extras | 43586143472 |
| CI on newest commit 79178d6 | still running when this was written, check before merging | 43587514105 |

## What is NOT done
- Nobody has run `start-all.ps1` or `scripts/phase1-check.ps1` on the Windows demo laptop.
- The apps have not been run against the real backend.
- Contract script against the real backend and Docker were not run.
- Medical content: no doctor sign-off. `reviewStatus.js` is empty on purpose.
- Hindi and Gujarati text: no named reviewer.
- Proposed endpoints are not agreed in writing by Daksh.
- `POST /location-shares` is not built.

## Checklist before merge
- [ ] Jehal: reviewed and approved in writing
- [ ] Daksh: reviewed and approved in writing
- [ ] CI green on the final commit of `integration`
- [ ] Laptop run table in `hospital-portal/docs/DEMO_SCRIPT.md` filled by a person
- [ ] Puneet presses merge himself

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Gir1dCTWmZDucjKzXfeZ35
