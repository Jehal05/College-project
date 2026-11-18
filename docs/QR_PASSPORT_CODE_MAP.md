# QR passport: code map (Step 0, 18 Nov 2026)

HealthTwin AI is a simulated prototype and not a medical device. This map says what the passport code does **today** on branch Puneet, which gaps against the two master documents are real, and what each later step touches. Nothing here has been changed yet.

## 1. What exists

| Area | Files | What it does today |
|---|---|---|
| Mock server (the demo path, `npm run one`) | `mock-server/passport.js` | Create, read and revoke a link per patient (`POST/GET/DELETE /patients/:id/passport`, `GET .../passport/log`); public read `GET /passport/:token`; staff read `GET /passport/PT-...` with a staff or admin token; `POST /demo/passport/expire`. Token = 18 random bytes, base64url (24 characters). Validity 1, 24 or 168 hours. One live link per patient. |
| Mock storage | `mock-server/store.js` | `passports` (by patient) and `passportTokens` (by **raw token**), both in memory, cleared by `POST /demo/reset`. |
| Mock audit | `mock-server/audit.js` | `record()` and `accessLog()`; rows hold time, user, role, action, patient, outcome, reason, fields. No tokens, no IP. Feeds `GET /patients/:id/access-log` and `GET /audit`. |
| Real backend | `backend/app/api/passport.py`, `api/passport_links.py`, `services/passport_links.py`, `security/passport_token.py`, tables `EmergencyPassport`, `PassportSecret`, `PassportOpen` | Signed token; **SHA-256 hash** used for lookup; an encrypted copy of the token is kept so the owner can see the QR again; open log (times only); audit rows; revoked, expired and unknown links all answer 410 with the same body. |
| Patient app | `screens/Passport.jsx`, `screens/PassportView.jsx` (route `/p/:token`), `components/PassportQr.jsx`, `components/PassportSection.jsx`, `hooks/usePassport.js`, `config/env.js` (`passportLink`), `services/api.js` | Create (1h/24h/7d), show QR (library `qrcode`), download PNG, print, revoke, open count and times, public page in three languages with a call button and `noindex`. |
| Hospital portal | `services/mockBackend.js`, `components/detail/ReadinessCard.jsx` | Only mentions the passport in readiness text. **No** staff scan route and no passport view. |
| Consent | mock `patientData.js`, backend `api/consents.py` | Four switches: location, history, vitals, reports. The passport follows `history` and `reports`. |
| Tests that exist | backend `test_passport_links_api.py` (31), `test_passport_audit.py` (19), `test_passport_token.py` (17); patient-app browser test `phase8-ui.test.mjs`; portal 544 unit tests | See section 4 for what ran. |

## 2. Gaps against the documents (verified in code)

1. **Mock: any signed-in user can use any patient's passport routes.** `POST/GET/DELETE /patients/:id/passport` and `.../passport/log` only call `requireAuth`. They do not check that the caller owns patient `:id`. So another patient, a family member or a volunteer can read that patient's raw token (GET), create a new one, or revoke it. The real backend does check ownership (`authorize_patient_record`). **This is the most serious finding and a QR-passport security hole in the demo path.**
2. **Anonymous view shows too much.** On both mock and backend the public QR page returns allergies, conditions, medications and **emergency-contact phone numbers** whenever the `history` consent is on. The documents want a minimal quick view only.
3. **No per-field QR scope.** The patient cannot choose fields for the QR; only the existing consents act.
4. **Mock keeps the raw token as the lookup key** (`passportTokens`). The backend looks up by hash. They behave differently.
5. **No rotate.** Creating a new link revokes the old one, but there is no explicit rotate action or audit event name.
6. **Public route has no rate limit** (neither mock nor backend). `write_limiter.py` exists but is used only for creating emergencies.
7. **Staff read has no hospital scope and no purpose.** Any `HOSPITAL_STAFF` (and in the mock any `ADMIN`) can read any patient by id. The backend allows any `HOSPITAL_STAFF` too.
8. **Unknown vs revoked tokens.** Backend: all three states answer 410 (good). Mock: revoked and expired answer 410, unknown token-shaped strings answer 410, but a string shaped like a patient id (`PT-0000-0000`) answers 401 (needs login), so the two paths differ for an attacker probing.
9. **Access history is times only.** There is no actor type, purpose or outcome on the patient's list (the audit log has outcome and role, but the passport screen shows only opened-at times).
10. **No printable passport card** (only a QR image with Download and Print buttons) and **no demo-data banner** on the QR page or QR image.
11. **QR address:** `passportLink()` uses `VITE_APP_URL`, which is fixed **at build time**, else `window.location.origin`. On a laptop that is `http://localhost:...`, which a phone camera cannot open. There is no warning and no runtime setting.
12. **Five named patients do not exist.** The mock seed has the demo patient `PT-2026-0417` ("Rahul Mehta") and the patients in `mock-server/data/patients_more.json` (copied from the backend seed). None is called Rahul Sharma, Amit Verma, Priya Singh, Rohan Mehta or Neha Kapoor.
13. **Logins:** `mock-server/data/users.json` has fixed demo passwords in plain text (`demo1234`); the documented logins also use them. Only the one demo patient has a patient login.

## 3. Files each later step will touch

- Step 1 (five patients): `mock-server/data/` (new seed file), `mock-server/store.js`, `mock-server/routes.js` (login), backend `app/seed/` plus its tests, the demo panel (`mock-server/demoScenario.js`, patient-app `/demo`).
- Step 2 (token service): `mock-server/passport.js`, `mock-server/store.js`, backend `services/passport_links.py` and `api/passport.py`, tests on both sides.
- Step 3 (quick view): both `build_passport`-style builders, `PassportView.jsx`, `PassportSection.jsx`, i18n en/hi/gu.
- Step 4 (staff view): portal new route and page, `mock-server/passport.js`, backend staff route, audit names.
- Step 5 (patient controls, card): `Passport.jsx`, `PassportQr.jsx`, `usePassport.js`, `services/api.js`, print CSS.
- Step 6 and 7: tests, screenshots, `docs/QR_PASSPORT.md`, README, CHANGELOG, `.env.example`, demo script and Q&A.

## 4. What was run in this sandbox (real numbers)

| Suite | Result |
|---|---|
| Hospital portal `npm test` (`node --test`) | 544 tests, 544 pass, 0 fail |
| Mock server (`node`) | **Not run**: `node_modules` is not installed here (express and ws missing) |
| `npm run contract`, `npm run integration` | **Not run**: they need the mock server running |
| Backend pytest (including the 67 passport tests) | **Not run**: no Python packages here |
| Patient-app vitest and Playwright | **Not run**: no `node_modules` |

So changes to the mock server and the backend will be checked only by reading the code and by tests that I can run without those packages, unless you run them on your laptop or from the Actions tab (the workflows are manual-only now).

## 5. Open decisions (asked in Step 0)

1. How to add the five patients (new alongside, or rename).
2. How the mock stores the token (hash only, or hash plus an owner copy like the backend).
3. How the QR learns the laptop's LAN address.
4. What "hospital scope" means for the staff view.
