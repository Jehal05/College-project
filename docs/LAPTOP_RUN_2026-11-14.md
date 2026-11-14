# Laptop run, 14 Nov 2026 (Windows laptop "puneet", Node v26.13.1, mock backend)

Run by Claude through helper scripts on Puneet's laptop, reading the log files afterwards. Claude did **not** look at the portal or patient app screens, so the "Laptop run" table in `hospital-portal/docs/DEMO_SCRIPT.md` stays empty and no rehearsal box is ticked.

## What was seen (from the log files)
| What | Result |
|---|---|
| `git pull` of `integration` | worked |
| Mock server (`npm run mock`, port 4000) | answers `/health` |
| Portal (5174) and patient app (5173) | both answer after `scripts/start-all.ps1` |
| `scripts/phase1-check.ps1 -Backend mock` | **14 PASS, 0 FAIL, 0 SKIP** (login, hospitals, ambulances, SOS, active list, acknowledge, dispatch, EN_ROUTE, ARRIVED, HANDOVER_DONE, finished list) |

## Two problems found and fixed (commit e18c646)
1. `start-all.ps1` failed twice with "The mock did not answer", although `npm run mock` worked by hand. Starting the parts with `ProcessStartInfo` did not work on this laptop; starting them with `Start-Process` does. The mock now answers in about 2 seconds.
2. `phase1-check.ps1` reported a FAIL for `status EN_ROUTE`: the mock moves the ambulance to EN_ROUTE by itself after dispatch, so asking again gives 409. The check now accepts that when the emergency is already EN_ROUTE or ARRIVED.

## Not done
- Screens (portal, patient app, sound, map, Hindi/Gujarati) were not looked at.
- The real backend (port 8000) was not started or tested on the laptop.
- Not tested: running `start-all.ps1` from a normal interactive PowerShell window (it was started hidden by a helper).
