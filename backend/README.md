# HealthTwin AI: backend

> **Simulated prototype. Not a medical device. It never diagnoses anyone.**
> Everything here is fake data. Nothing real (no hospital, ambulance, SMS or emergency number) is ever contacted.
> The rules, symptom wording and severity levels have **not been reviewed by a doctor** (every rule is marked
> "pending doctor review").

This is the real backend (FastAPI + SQLite) for the HealthTwin AI demo. The patient app (Jehal), the hospital
portal (Puneet) and the family / responder / admin apps (Shagun) talk to it through the API contract.

## What works today (and what does not)

Run this to see the **real** numbers, not a promise:

```powershell
.\.venv\Scripts\python scripts\contract_status.py      # how many contract endpoints exist in the code
.\.venv\Scripts\python scripts\phase_check.py          # tests and features, phase by phase
```

Built: login, the patient record, vitals, baseline and emergency contacts, consents, the emergency passport, the
audit log, wellbeing insights, the wearable simulator (`POST /demo/vitals`), the rules engine with its symptom map,
encrypted storage, demo seed data.
Not built yet: the emergency lifecycle, the WebSocket, hospitals and ambulances, demo reset, reports, and the
family / responder / admin endpoints. `CONTRACT.md` is the list of
everything that is planned. `FREEZE.md` says how far the project is from a feature freeze.

## Install and run (Windows PowerShell)

You need **Python 3.12** (`python --version`). Open a **new** PowerShell window after installing Python.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Open `.env` in a text editor and replace the two placeholders. Generate the values like this:

```powershell
# FERNET_KEY (encrypts patient data in the database)
.\.venv\Scripts\python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# JWT_SECRET_KEY (signs login and passport tokens)
.\.venv\Scripts\python -c "import secrets; print(secrets.token_urlsafe(48))"
```

The app **refuses to start** with a placeholder or empty key (unless `DEMO_MODE=true`, which uses throw-away keys
and prints a warning). Never commit `.env`.

Start the server:

```powershell
.\.venv\Scripts\python -m uvicorn app.main:app --port 8000 --env-file .env
```

Then open <http://localhost:8000/docs> for the interactive API page, and <http://localhost:8000/health> to check it is up.

## Settings (`.env`)

| Setting | What it does | Default |
|---|---|---|
| `FERNET_KEY` | Encrypts sensitive database fields. `FERNET_OLD_KEYS` (comma separated) keeps old data readable after a key change | none (required) |
| `JWT_SECRET_KEY` | Signs login and passport tokens (at least 16 characters, not the placeholder) | none (required) |
| `DATABASE_URL` | Where the SQLite file lives | `sqlite:///./healthtwin.db` |
| `DEMO_MODE` | `true` loads the fictional demo data and demo logins, and turns on `/demo/*`. **Never use it for anything real** | `false` |
| `CORS_ALLOW_ORIGINS` | Websites allowed to call the API from a browser, comma separated, no wildcard | none |
| `BCRYPT_ROUNDS` | Password hashing cost. Keep 12 or more for anything real | 12 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | How long a login lasts | 480 |
| `LOGIN_MAX_FAILURES`, `LOGIN_IP_MAX_FAILURES`, `LOGIN_WINDOW_SECONDS` | Login rate limit (wrong attempts per login, per address, and the window in seconds) | 5, 30, 60 |
| `PASSPORT_TOKEN_EXPIRE_MINUTES` | How long a passport link lasts | 30 |

## Demo logins (demo mode only, all fictional)

With `DEMO_MODE=true` an empty database is filled with fictional hospitals, ambulances, one patient and these accounts:

| Login | Password | Role |
|---|---|---|
| `patient@demo.test` | `demo1234` | patient |
| `staff@demo.test` | `demo1234` | hospital staff (hospital `HSP-AMD-002`) |
| `admin@demo.test` | `demo1234` | admin |
| `staff@demo`, `admin@demo` | `demo123` | the hospital portal's own accounts |
| `patient1`, `staff1`, `admin1`, `family1`, `responder1` | `demo-password` | the original contract's accounts |

These are public demo values. A normal start (without `DEMO_MODE`) creates **no** accounts at all.
To load the demo data by hand: `$env:DEMO_MODE="true"; .\.venv\Scripts\python -m app.seed`.

## Run the tests

```powershell
.\.venv\Scripts\python -m pytest -q
```

The tests set their own keys and use a temporary database, so they need no `.env`. Run
`.\.venv\Scripts\python -m pytest -q app/rules/tests` for just the rules engine.

## Check the server against the shared contract

Jehal's contract script sends real requests to a running server. From the **repo root** (needs Node 22):

```
npm run contract -- http://localhost:8000
```

If a check fails, do not edit the check: either the server is wrong or the contract is wrong. If you think the
contract is wrong, tell Jehal and Puneet first, change the contract text, then the code.

## Docker

`docker compose up` is set up (it reads `.env`), but it has **not yet been built and run on a real machine**.
Treat it as untested until someone has done it.

## Where things are

```
app/
  api/          the endpoints (auth, patients, contacts, consents, passport, audit, insights, demo)
  models/       database tables, states, roles, the transition table
  rules/        the rules engine, rules.yaml (draft, pending doctor review) and the symptom map
  security/     encryption, passwords, login and passport tokens, login rate limit
  services/     consent rules, audit log, insights, ids
  seed/         fictional demo data (loaded only in demo mode)
  sim/          the wearable simulator and synthetic history
tests/          the automated tests (they run on every push, see .github/workflows/backend.yml)
scripts/        contract_status.py, phase_check.py
docs/           review sheets for the doctor, the list of everything that is simulated
CONTRACT.md     the API contract (source of truth for this backend)
```

## House rules

- No secrets in code, logs or commits. A phone number, token or password never goes into the audit log.
- A field the patient did not agree to share is **left out**, never sent as `null`.
- Only the rules engine decides severity. Nothing here diagnoses; every severity word is guidance, labelled simulated.
- Nothing is claimed as doctor-approved until a named, registered doctor has signed it off.
