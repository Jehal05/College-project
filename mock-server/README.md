# Mock server (simulated data)

Stands in for the real FastAPI backend during week 1. All data is fake and lives in memory:
restart the server to reset it.

```
npm install        (from the repo root, once)
npm run mock       (from the repo root)   -> http://localhost:4000
```

Demo logins (password `demo1234`): `patient@demo.test` (PATIENT), `staff@demo.test` (HOSPITAL_STAFF), `admin@demo.test` (ADMIN).

Every route except `/health` and `/auth/login` needs the header `Authorization: Bearer <token>`.

| Method and path | Notes |
| --- | --- |
| POST /auth/login | `{ email, password }` -> `{ token, role, patient_id }` or 401 |
| GET, PATCH /patients/:id | Patient profile (edits kept in memory) |
| GET /patients/:id/vitals | One normal vitals reading |
| POST /emergencies | Stub for Phase 2. Needs `patient_id` and `type` (HEART, STROKE, DIABETIC, ASTHMA) |
| POST /emergencies/:id/cancel | Stub for Phase 2 |
| GET /emergencies/:id | Stub for Phase 2, includes `status_events` |
| GET /hospitals?lat=&lng= | Five fake hospitals with `distance_km`, nearest first |
| WebSocket /ws | `vitals.update` event every second |

Settings: `PORT` (default 4000) and `CORS_ORIGINS` (comma-separated; default allows localhost ports 5173, 5174 and 3000).

Files: `server.js` (setup and WebSocket), `routes.js` (REST endpoints), `store.js` (in-memory data), `helpers.js` (delay, auth, maths), `data/` (seed JSON).
