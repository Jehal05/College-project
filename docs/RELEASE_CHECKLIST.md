# Release checklist (Phase 5)

Honest status of a SIMULATED prototype. A tick means it was run, with the result below. An empty box means it still has to be done by a person.

## Automated results (run on 2026-11-13, Node 22, headless Chrome)

| Check | Command | Result |
|---|---|---|
| Unit tests | `npm run test:unit -w patient-app` | 85 passed (14 files) |
| Browser tests | `npm run test:browser -w patient-app` | 11 of 11 files, 286 checks passed (emergency 29, data 37, language and voice 51, offline 21, accessibility 24, passport 28, resilience 9, phase6-alert 28, phase6-safety 26, phase6-reminders 22) |
| API contract (mock server) | `npm run contract` | 24 of 24 passed |
| Integration (events) | `npm run integration` | all checks passed (10 event types, agreed shape) |
| Accessibility audit (axe-core) | `npm run audit` | 19 screens x 3 languages: 0 violations |
| Production build | `npm run build` | precache 438.1 KiB (limit 450 KiB; tight). Passport, Reminders, Summary and the demo panel are lazy-loaded and cached when first opened, so they are NOT available offline on a first visit |
| Joint rehearsal (real portal, not in CI) | `node scripts/joint-rehearsal.mjs` | 17 of 17 passed (`docs/JOINT_REHEARSAL.md`) |
| Console | all browser tests | no unexpected errors or warnings |

`npm test` runs the unit tests and the browser tests in one command (about 4.5 minutes). The CI workflow `.github/workflows/ci.yml` runs build, unit tests, contract, integration, audit and browser tests. **It has not been run on GitHub from here**; the same commands were run locally, including from a clean clone (see the end of this file).

## Lighthouse (mobile, Lighthouse 13.6, headless Chrome, production build served by `vite preview`)

| Page | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| `/login` | 100 | 100 | 100 | 100 |
| `/p/<token>` (responder page) | 98 | 100 | 100 | 63 |

- Lighthouse 13 no longer has a PWA score. PWA basics were checked by hand: valid manifest with 192 and 512 px icons, service worker active, the app shell opens offline (browser test `offline`).
- The 63 SEO score on the responder page is **deliberate**: it is marked `noindex` so a passport link is never listed by search engines. `robots.txt` also disallows `/p/`.
- Signed-in screens cannot be scored by Lighthouse without a login; they are covered by the axe audit above.
- Timing on the login page: LCP 0.9 s, TBT 50 ms, CLS 0. Responder page: LCP 2.3 s (it waits for the server), TBT 60 ms, CLS 0.
- Not measured: real phones, slow networks.

## Security and privacy checks done

- [x] QR code decoded with an independent decoder: it holds only `<app>/p/<random token, 22+ characters>`, no name or health data.
- [x] Responder call sends no login token. Passport pages are `noindex` and the page sets `Referrer-Policy: no-referrer` (meta and `_headers`) so the token is not leaked to other sites.
- [x] Expired, revoked and unknown tokens all answer 410.
- [x] Passport log holds only times (checked by the contract test).
- [x] Content-Security-Policy in the production build: own files plus the API and WebSocket addresses from `VITE_API_URL` / `VITE_WS_URL`. No inline scripts. Styles allow `'unsafe-inline'` because React and Tailwind set style attributes.
- [x] No health data in `localStorage` or IndexedDB (only the language code). Saved copies and notifications are memory or `sessionStorage` and cleared at sign out.
- [x] No secrets in the repository (`.env.example` only lists addresses).
- [ ] The real backend must implement real authentication, token expiry and rate limiting on `GET /passport/:token` (the mock does none of this).
- [ ] A security review by Daksh (HTTPS, CORS list, headers set by the real host).

## Content and safety sign-offs (still open)

- [ ] **Doctor review** of the three general emergency lines and of each condition's guidance (`docs/CLINICAL_REVIEW.md`). No `reviewed` flag has been changed.
- [ ] **Native-speaker review** of Hindi and Gujarati (`docs/TRANSLATION_REVIEW.md`, 337 strings; the responder page first).
- [ ] Voice keyword list checked by speakers of each language.
- [ ] Test with a real screen reader (TalkBack, VoiceOver) in all three languages.
- [ ] Test on real phones: vibration, beep, GPS, microphone, camera scan of the QR code.

## Integration with the team (still open)

- [ ] Daksh runs `npm run contract -- <backend url>` and fixes failures.
- [ ] Puneet and Shagun run `npm run integration` and copy the event shapes it prints.
- [ ] Set `VITE_API_URL` and `VITE_APP_URL` on the host and deploy (`docs/DEPLOY.md`). Not deployed yet.
- [ ] Replace the simulated notifications with a real service (SMS or push) if the project needs it.

## Clean-clone run

A fresh `git clone --branch Jehal`, `npm ci`, then `npm test`: 28 unit tests and 7 of 7 browser files (199 checks) passed in 4 min 24 s; `npm run contract` 16 of 16 and `npm run integration` passed against a mock server started from that clone. This run found one real bug (a late answer could write a saved copy after sign out), now fixed and covered by the offline test.
