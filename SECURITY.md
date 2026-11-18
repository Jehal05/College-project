# Security notes

HealthTwin AI is a **simulated college prototype**. It is not a medical device and must never hold real patient data.

- **Demo logins.** The five patient passwords are random at every start, stored only as a salted hash, and shown only on the local `/start` page. The older fixed logins (`patient@demo.test`, `staff@demo`) are demo-only and must never be used outside a local demo.
- **QR passport.** A bearer link: anyone holding it can open the minimal quick view until it expires or is revoked. The token is random, looked up by its hash, and never written to a log. Clinical details need a staff login and a purpose, and every view or refusal is audited.
- **In-memory only.** The server keeps everything in memory. Nothing is written to disk.
- **No real messages.** Nothing sends SMS or calls, and the demo phone numbers are fictional.
- **Report a problem** to the team (Puneet or Jehal) directly.
