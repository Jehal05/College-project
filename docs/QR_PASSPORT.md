# QR health passport (HealthTwin demo)

**This is a HealthTwin demo token. It is not ABHA, not identity proof, not a government credential, and not a medical record.** Everything shown is fictional, simulated data. Anyone who has the link can open the quick view until it expires or is revoked (a bearer link). Phone numbers are masked demo numbers; the demo never sends an SMS or makes a call.

Status: built in the simulated server (`npm run one`), the patient app and the hospital portal.

## The five demo patients

| Patient | Login (patient app) | City |
|---|---|---|
| Amit Verma (PT-2026-0417, 52) | `amit.verma@demo.test` | Ahmedabad |
| Priya Singh (0418, 47) | `priya.singh@demo.test` | Ahmedabad |
| Rohan Mehta (0419, 35) | `rohan.mehta@demo.test` | Ahmedabad |
| Rahul Sharma (0420, 28) | `rahul.sharma@demo.test` | Pune |
| Neha Kapoor (0421, 24) | `neha.kapoor@demo.test` | Pune |

Each login has its own random password, new at every server start. Open `http://localhost:4000/start` on the laptop running the demo to read them (the list is refused to any other computer). The server keeps only a salted hash. The old `patient@demo.test` / `demo1234` login still works and opens Amit Verma.

## How it works

1. The patient opens **Profile > Health passport**, chooses which fields a scan shows (blood group, allergies, one emergency contact), chooses 1 hour, 24 hours or 7 days, and presses Create.
2. The QR holds only `<address>/p/<token>`. The token is 24 random URL-safe characters. It contains no name, number, blood group, diagnosis or id.
3. The server finds the link by the SHA-256 hash of the token. The raw token is kept only as the owner's copy, so the patient can see the QR again. It is never written to the audit log.
4. One live link per patient. "Make a new QR" stops the old one at once. Revoke stops it at once. Expiry stops it at once.
5. Old, revoked and unknown links all give the same answer: **Passport link unavailable** (HTTP 410).
6. The public link allows 30 opens a minute per address (429 after that). Wrong logins: 10 a minute per address.

## The two views

**Anonymous quick view** (no login, `/p/<token>`): name, patient code (`HT-` plus the last four digits), age band, blood group, allergies, one emergency contact with a masked number and no call link, an optional patient-entered medical alert, source ("simulated demo data"), last updated, link validity. A demo banner is on every state. The patient's consent switches are the upper limit: history off removes allergies and the contact from the next scan. Never returned to an anonymous scan: conditions, medicines, reports, lab values, vitals, location, login id, full phone number, the token.

**Protected clinical view** (hospital portal, `/portal/passport`): needs a hospital staff or admin login. Staff paste or scan the QR link, choose a purpose (emergency treatment, admission check, ambulance handover, follow-up) and see the details the patient's consents release, with the passport expiry and an audit reference (`AUD-00012`). Staff of a hospital see patients whose home city is the hospital's city; admins are not limited. Every view and every refusal is audited with staff login, patient, purpose, time and fields. There is no emergency override; adding one needs a clinical and legal review first.

**Patient's own screen**: preview of exactly what a scan shows, "Who looked" (time, anonymous or hospital staff, purpose, allowed or denied; no names, IP addresses or devices), a printable card (logo, Demo profile badge, name, code, large QR, expiry, status, the line "Scan to view the information this patient has chosen to share", demo disclaimer). Print also saves a PDF.

## Setting the address so a phone can scan it

A phone cannot open `localhost`. Start the demo with the laptop's network address:

`PUBLIC_URL=http://192.168.1.20:4000 npm run one` (use your own address; phone and laptop on the same Wi-Fi)

The patient app asks the server for this address (`GET /api/public-config`). If it is empty or local, the passport screen shows a yellow warning.

## What is sent where

| Data | Goes to |
|---|---|
| Token | The QR image, the patient's screen, and the link. Hash only on the server's lookup table |
| Quick-view fields | Whoever opens the link, only while it is live |
| Clinical fields | Signed-in staff or admin, for a chosen purpose, audited |
| Audit rows | The server's log, saved in the SQLite file (wiped by Reset demo) |

## Limits (be honest about these)

- The server saves passports to its SQLite file, so a restart keeps them (with `PERSIST=off` a restart forgets all passports).
- Age band and "last updated" are rough; the seed has no per-field dates.
- "Other hospital" is decided by city.
- Hindi and Gujarati text has not been reviewed by a native reader.
- Camera scanning in the portal needs a recent Chrome or Edge (`BarcodeDetector`); otherwise paste the link.
- Patient-app and backend test suites and the screenshots at 360 and 1440 px were not run in the build sandbox. See `docs/QR_PASSPORT_QA.md`.

## Not in the backend

The FastAPI backend is not part of this branch. On branch `Puneet` it still has its own, older passport (full details for anyone with the link) without the purpose rule, resolve route, preview, history or `PUBLIC_URL`.

## Manual test steps

See `docs/QR_PASSPORT_QA.md`, section "Manual test: phone-camera scan".
