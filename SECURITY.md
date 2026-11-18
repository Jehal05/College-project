# Security notes

HealthTwin AI is a **simulated college prototype**. It is not a medical device and must never hold real patient data.

- **Demo logins.** The five patient passwords are random at every start, stored only as a salted hash, and shown only on the local `/start` page. The older fixed logins (`patient@demo.test`, `staff@demo`) are demo-only and must never be used outside a local demo.
- **QR passport.** A bearer link: anyone holding it can open the minimal quick view until it expires or is revoked. The token is random, looked up by its hash, and never written to a log. Clinical details need a staff login and a purpose, and every view or refusal is audited.
- **Saved data.** The server saves demo data to a local SQLite file (`mock-server/data/healthtwin.db`, git-ignored, fictional data and the passport links). Delete the file or press Reset demo to wipe it. `PERSIST=off` keeps everything in memory.
- **Messages.** Phone alerts go only to the team phones named in `mock-server/live.config.json` (git-ignored, at most 2 per channel), every message is labelled DEMO, and the patients' own contact numbers are never used. Keys and numbers are never logged, saved or sent to the apps. A test fails if sender code appears outside `notify.js`.
- **Local-only pages.** The start-page helpers (logins, reset, vitals, phone status) answer only from this computer. A request that arrives through a tunnel (forwarding headers or a public Host name) is refused too, so the demo passwords are not exposed when you share a tunnel address.
- **Alerts are private.** A patient login reaches only its own alerts, cannot list all alerts and cannot move ambulances.
- **Live stream.** Location and heart rate are accepted only from the patient who owns the open alert, only with the matching consent, and other patients' phones do not receive the events.
- **Report a problem** to the team (Puneet or Jehal) directly.
