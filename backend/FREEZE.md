# Feature freeze

**Status: NOT STARTED.** The contract is still **0.6.1**, not 1.0, and nothing is tagged `v1.0-demo`.

A freeze means "the contract is final and we only fix bugs". Declaring it now would be untrue, because
most of the contract is not built yet. This file says what must be true before the freeze starts, and the
rules once it has.

## Where we really are (snapshot, from `python scripts/contract_status.py`)

| | Count |
|---|---|
| Endpoints described in CONTRACT.md | 37 |
| Built in the app | 8 |
| **Not built yet** | **29** |
| Served but not documented | 0 |

Of the 8 built, only `GET /health` and `GET /passport/{id}` (with a token) can be used today. The other 6
(`GET /audit`, `POST /demo/vitals`, the three consent endpoints and insights) answer `501` until login exists.

Not built yet: login, patient profile and vitals, the whole emergency lifecycle (create, cancel, acknowledge,
dispatch, status), hospitals and availability, ambulance location, demo reset and scenarios, reports, and the
family, responder, admin, content, feedback and privacy endpoints. Also not built: the WebSocket manager, the
notification engine, the escalation scheduler and the trend warning, FHIR export and metrics.

## Conditions to START the freeze (all must be ticked)

- [ ] Every Tier 1 endpoint in the plan is built (login, profile, vitals, emergencies, hospitals, passport, demo panel)
- [ ] `python scripts/contract_status.py` prints `FREEZE READY`
- [ ] The heart attack scenario runs end to end with Jehal's and Puneet's apps connected (week 2 checkpoint)
- [ ] `NOT_BUILT_YET` in `tests/test_contract_conformance.py` is empty or holds only endpoints the team agreed to drop
- [ ] Full test suite passes in a clean environment
- [ ] Dependencies pinned and the Docker image builds from scratch (not yet checked: no Docker in the sandbox where this was prepared)
- [ ] The team has agreed on the date and time, and it is announced

## Rules once the freeze has started

1. No new endpoints, tables, events or fields. Bug fixes only.
2. Every fix starts with a failing test, then the smallest change that makes it pass.
3. `CONTRACT.md` is locked at 1.0. The conformance tests stop any silent drift.
4. Every number in a report comes from a real run, with the command that produced it.
5. Nothing is tagged or announced as final until the conditions above are ticked.

## Who may approve an exception

- **Daksh** (owner of the contract) must approve any change to the contract.
- The teammate whose part is affected (**Jehal**, **Puneet** or **Shagun**) must agree.
- Daksh records it in the `CONTRACT.md` change log and tells all three the **same day**.
- A change nobody approved is a bug, and gets reverted.
