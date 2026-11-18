# Security notes

HealthTwin AI is a **simulated college prototype**. It is not a medical device and it must never hold real patient data.

## What to know
- **Demo accounts and weak passwords.** When `DEMO_MODE=true` the backend seeds demo accounts (for example `patient@demo.test`, `staff@demo.test`, `admin@demo.test`) with simple demo passwords. This is only for demos. Never turn `DEMO_MODE` on in a real deployment, and never use real names, medical data or phone numbers.
- **Keys.** The backend needs a long random `JWT_SECRET_KEY` and a `FERNET_KEY` (see `backend/.env.example`). Without them it refuses to start, except in demo mode, where it uses temporary keys and prints a warning.
- **No secrets in git.** `.env` files are ignored. Only the `.env.example` files are committed. If a real key is ever committed by mistake, treat it as leaked: replace it, do not just delete the file.
- **Simulated everything.** No real hospital, ambulance, SMS or emergency number is contacted.

## Reporting a problem
Tell the team (Puneet, Jehal or Daksh) directly, or open an issue on the repository. Please do not post keys, passwords or personal data in an issue.
