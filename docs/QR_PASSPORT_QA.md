# QR passport: QA checklist (Step 6)

SANDBOX build. All data is fictional. "Ran" means a test ran in the build sandbox on 18 Nov 2026; "Not run" means it could not run there (no installed app dependencies, no browser, no phone, no network).

Tests that ran: `cd mock-server && node --test tests/*.test.js` (31 pass, 0 fail) and `cd hospital-portal && node --test "src/**/*.test.js"` (548 pass, 0 fail; the new page's helper tests are in this count).
The mock tests call the route handlers directly with a fake Router, because `express` is not installed in the sandbox. The real HTTP server was not started.

| # | Item | Result | How |
|---|------|--------|-----|
| 1 | Five unique QRs (five different tokens, 24+ URL-safe characters) | Pass | QA1 |
| 2 | QR URL carries no personal data | Pass | QA2 (shape + no name, blood group, id or phone inside the token) |
| 3 | Anonymous view returns only enabled fields | Pass | passportOwner tests (quick view, field choice) |
| 4 | Sensitive fields hidden for anonymous users | Pass | conditions, medicines, reports, vitals, location, email, token and full phone are absent |
| 5 | Consent switched off removes the field on the next scan | Pass | passportOwner test |
| 6 | Revoke makes the printed QR dead at once | Pass | passportOwner test, QA9 |
| 7 | Expiry shows the neutral page | Pass (API) | QA7 gives the neutral 410. The page text was not looked at in a browser |
| 8 | Rotate kills the old token | Pass | passportOwner test |
| 9 | Every success and denial creates an audit event | Pass | QA9, staff view tests; no token in the log |
| 10 | Login and scan rate limits | Pass | scan: 30 per minute, 429. Login: 10 wrong passwords per minute per address, 429 (QA10). Creation of a passport is limited only by login (no separate limit) |
| 11 | Account isolation | Pass | QA11: another patient gets the same 404 as a missing one. Applies to the mock's `/patients/:id/...` routes |
| 12 | Demo phones never trigger SMS or calls | Pass (static) | QA12: no SMS or mail sender code in the mock, no `tel:` link on the public page, phone is masked |
| 13 | Demo banner on page, card and exports | Pass for page and card (static check), partly for exports | The downloaded QR PNG is only a QR with no text, so it has no banner. There is no data export of the passport |
| 14 | Mobile layout at 360 px and 1440 px | Not run | needs a built app and a browser |
| 15 | Keyboard and screen-reader checks | Partly | static: every input is inside a label. Keyboard order, focus and a screen reader were not tested |
| 16 | Screenshots at 360 and 1440 px (quick view, staff view, card) | Not run | the apps cannot be built here (dependencies not installed, no network) |
| 17 | Patient-app vitest and Playwright suites | Not run | dependencies not installed. The Playwright passport test (`tests/browser/passport.test.mjs`) was edited for the new page and has not been run |
| 18 | FastAPI backend tests | Not run | Python dependencies not available. The backend does not yet have the quick view, purpose rule, resolve route, preview, history or PUBLIC_URL |
| 19 | CI | Not run | all three workflows are manual-only (commit 3b247d8, not pushed) |
| 20 | Real phone-camera scan | Not run | needs you; steps below |

## Things this QA found and fixed
- A patient login could read another patient's `/patients/:id/...` routes in the mock. Now 404.
- The mock had no limit on wrong passwords. Now 10 per minute per address.

## Known limits
- Hindi and Gujarati text has not been reviewed by a native reader.
- Camera scanning in the hospital portal uses the browser's `BarcodeDetector` (recent Chrome or Edge). Other browsers: paste the link.
- "Other hospital" is decided by city (patient's home city against the hospital's city), because the seed has no patient-to-hospital link.
- Patient age band and "last updated" are rough: the seed has no per-field dates.

## Manual test: phone-camera scan (you do this)
1. On the laptop: `cd mock-server && PUBLIC_URL=http://<laptop-lan-ip>:4000 npm run one` (find the address with `ipconfig`; phone and laptop on the same Wi-Fi).
2. Open `http://<laptop-lan-ip>:4000/start`. Note the five demo logins shown there (new passwords every start).
3. Log in to the patient app as `amit.verma@demo.test`. Open Health passport, keep all three fields on, choose 24 hours, press Create passport. No yellow localhost warning should show.
4. Scan the QR on screen with the phone camera. Expect: the amber demo banner, name, patient code, age band, blood group, allergies, one contact with a masked number. No conditions, medicines or full phone number.
5. Back on the laptop, turn the history consent off in Consent settings; rescan: allergies and contact are gone.
6. Press "Make a new QR"; scan the old printed or on-screen QR: "Passport link unavailable".
7. On the phone page, press "Staff sign-in", sign in as `staff@demo`, password `demo123`, choose a purpose, open. Expect the audit reference. Then check "Who looked" on the patient screen.
