# HealthTwin AI

An emergency-response prototype: a **patient app** (SOS with a countdown, live status timeline, consent, a QR health passport), a **hospital portal** (alert queue, map, acknowledge and dispatch, QR passport lookup) and a **simulated server** that plays the hospital, ambulance and wearable.

**Simulated prototype. Not a medical device. All people, hospitals and numbers are fictional.** The QR passport is a demo token: not ABHA, not identity proof, not a government credential.

## Run it (one command, one address)

Needs Node.js 20 or newer. In this folder:

```
npm install
npm run one
```

Then open **http://localhost:4000/start**. It links to the patient app, the hospital portal, the five demo patient logins for this run (new passwords every start) and a **Reset demo** button.

For a phone to scan the QR code, start with the laptop's network address (same Wi-Fi):

```
PUBLIC_URL=http://192.168.1.20:4000 npm run one
```

(Windows PowerShell: `$env:PUBLIC_URL="http://192.168.1.20:4000"; npm run one`.)

## What it does

| Part | What you can do |
|---|---|
| Patient app (`/`) | Sign in as one of five patients, see simulated vitals, press Emergency help, pick symptoms, cancel in the 10 s countdown or send, watch the timeline (hospital acknowledged, ambulance dispatched, arrived), see nearby hospitals on a real street map, choose what is shared, see who looked at your data. English, Hindi, Gujarati |
| QR passport | Create a QR, choose the fields, preview, make a new QR, revoke, print a card. A stranger's scan shows a minimal page; hospital staff see clinical details only after login, with a purpose, audited |
| Hospital portal (`/portal/`) | Sign in as staff, see the alert queue and map, acknowledge, dispatch, follow the ambulance on road routes, open a patient's passport with a purpose |
| Simulated server | Plays the hospital and ambulance, keeps everything in memory (a restart forgets it all) |

What is real and what is simulated: [`docs/REAL_DATA.md`](docs/REAL_DATA.md). The demo walkthrough: [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md). Likely questions: [`docs/VIVA_QA.md`](docs/VIVA_QA.md).

## Logins

Open `/start` for the five patient logins (random passwords, shown only on the laptop running the demo). Hospital portal: `staff@demo` / `demo123` (Ahmedabad), `staff.pune@demo.test` / `demo1234` (Pune).

## Tests

```
npm test               patient app unit tests
npm run test:portal    hospital portal tests (needs `npm ci` inside hospital-portal once)
npm run test:mock      simulated server tests
npm run smoke          quick check of a running `npm run one`
```

Four browser tests remain in `patient-app/tests/browser` (passport, created alert, cancel, resilience). They need Chrome (`npm run test:browser -w patient-app`). Older browser tests that drove removed screens were deleted. None of the patient-app tests have been run on this branch yet.

## Honest limits

- The server is a simulation with in-memory data. There is no real database, SMS, phone call or hospital.
- The rules that spot emergencies are a draft, pending doctor review. The Hindi and Gujarati text has not been reviewed by a native reader.
- Hospital ranking and list ETAs use straight-line distance; the portal's tracking map can use real road routes (OSRM) and falls back to a labelled simulated route.
- Heart rate from a Bluetooth chest strap works only on the patient screen; it is not sent to the server.
- This branch (`final`) is the simplified project. The full version, with the FastAPI backend and more screens, is on branch `Puneet`.

More: [`docs/QR_PASSPORT.md`](docs/QR_PASSPORT.md), [`docs/QR_PASSPORT_QA.md`](docs/QR_PASSPORT_QA.md), [`docs/ONE_ADDRESS.md`](docs/ONE_ADDRESS.md), [`docs/ACCESSIBILITY.md`](docs/ACCESSIBILITY.md), [`SECURITY.md`](SECURITY.md).
