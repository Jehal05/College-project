# Phase 4: two decisions for the team (evidence and a recommendation, nothing implemented)

Written 15 Nov 2026 by Puneet's assistant on branch `Puneet`. **Neither choice below is built.** Each one needs a written answer from the people named. Everything here is a simulated prototype; the numbers are demo data, not clinical advice.

---

## A. Ranking mismatch: Maninagar first in the portal, Navrangpura first in the backend

### The two rule sets (exact lines)

**Backend**, `backend/app/services/hospital_match.py`:

```python
scored.sort(key=lambda s: (not s["suitable"], s["distance_km"], s["hospital"].id))
```

Suitable hospitals first, then the nearest, then the id. Bed counts and ICU counts play no part. A hospital that is NOT suitable is still listed (after the suitable ones). `is_suitable` needs the emergency department, the capability for the type, and for HEART and STROKE the "ready" flag. Only verified hospitals with an emergency department are candidates.

**Portal**, `hospital-portal/src/services/ranking.js` (weights from `src/data/ranking-config.json`):

```js
const points = { capability: round1(capability * weights.capability), travel_time: round1(travel_time * weights.travel_time),
                 availability: round1(availability * weights.availability) };   // 0.5 / 0.3 / 0.2
ranked.sort((x, y) => y.total - x.total || (x.eta_min ?? Infinity) - (y.eta_min ?? Infinity) || String(x.hospital.id).localeCompare(String(y.hospital.id)));
```

Hospitals missing a required capability are **ruled out** (not ranked at all). The rest are scored on capability (50%), travel time (30%, zero at 30 min) and free beds and ICU beds (20%).

### Same hospitals, same inputs

Run with `python backend/scripts/compare_rankings.py` (needs Python and Node only; it first checks that both sides hold the same five hospitals, and they do). Measured on the sandbox on 15 Nov 2026.

| type | patient at | backend order (`*` = listed but not suitable) | portal order (score) | first rank that differs |
|---|---|---|---|---|
| HEART | demo location | Navrangpura > Maninagar > Sabarmati* > Vastrapur* > Naroda* | Maninagar (94) > Navrangpura (85.3); ruled out: Sabarmati, Vastrapur, Naroda | 1 |
| STROKE | demo location | Navrangpura > Vastrapur > Sabarmati* > Maninagar* > Naroda* | Navrangpura (85.3) > Vastrapur (81); ruled out: Sabarmati, Maninagar, Naroda | same |
| ASTHMA | demo location | Sabarmati > Navrangpura > Maninagar > Vastrapur > Naroda* | Sabarmati (94.7) > Maninagar (94) > Navrangpura (85.3) > Vastrapur (56); ruled out: Naroda | 2 |
| DIABETIC | demo location | Sabarmati > Navrangpura > Maninagar > Vastrapur > Naroda | Sabarmati (94.7) > Maninagar (94) > Navrangpura (85.3) > Vastrapur (81) > Naroda (75) | 2 |
| HEART | near Navrangpura | Navrangpura > Maninagar > Sabarmati* > Vastrapur* > Naroda* | Maninagar (89) > Navrangpura (88.3); ruled out: Sabarmati, Vastrapur, Naroda | 1 |
| HEART | near Maninagar | Maninagar > Navrangpura > Sabarmati* > Vastrapur* > Naroda* | Maninagar (99) > Navrangpura (78.3); ruled out: Sabarmati, Vastrapur, Naroda | same |

**Orders that differ: 4 of 6.** Why HEART at the demo location differs: Navrangpura is 2.72 km away and Maninagar 4.30 km (haversine). The backend takes the nearer one. The portal gives Maninagar more points for free beds (20 vs 6) and ICU beds (4 vs 1), which outweighs 1.6 km. **Which one the SOS really alerts first is the backend's order**, so the desk's "Ranking" table can contradict the hospital that actually got the alert. The second difference: the portal removes hospitals without the needed unit, while the backend keeps them at the end of the list (the backend's escalation does check capability before alerting, so this is a display difference, not an alerting one).

### Options

| | What changes | Cost | Risk |
|---|---|---|---|
| **1. Backend is the only source; the portal shows its order** | Portal reads the rank the backend already sends (`hospital.rank` in the alert) and a ranked list, and drops its own score or keeps it as "details" | Small portal change. The backend would also need to return distance and the reasons so the table can still explain itself (a new field, or a new ranked list on `GET /hospitals`). | The table loses the explanation ("why") unless the backend sends it. The rule that decides lives only in Daksh's code. |
| **2. Align the backend to the shared scoring** | Port `ranking.js` and `ranking-config.json` (already marked "shared with Daksh") to `hospital_match.py`; both sides test the same golden cases (the six rows above) | Medium: Daksh changes the SOS ranking and its tests; Puneet adds golden cases to the portal tests. One rule, two implementations, kept equal by shared test cases. | Changes which hospital a HEART alert goes to in the demo (Maninagar, 1.6 km farther, first). That needs the doctor review to be happy with "more beds beats nearer". |
| **3. Keep both, label the portal table "advisory"** | Text change only | Smallest. | The mismatch stays. A viewer of the recording sees two different "first" hospitals. Not recommended. |

### Recommendation (not a decision)

**Option 2**, with the doctor-review question attached. The portal already carries the more explainable rule (it shows points and reasons, and rules out unsuitable hospitals), the config file was written to be shared, and the demo story reads better when the ranking table and the hospital that got the alert agree. If the doctor review says "nearest suitable first" is the safer rule, then do the reverse: change `ranking-config.json` weights so travel time dominates, and the same golden cases then pin that rule on both sides.

**Who must agree:** Daksh (backend owner, changes the SOS ranking) and Puneet (portal owner). Jehal only needs to know because his demo recording shows the order. Until they agree, nothing is changed.

---

## B. Who moves the ambulance

### What the code does today

- **The real backend does not move the ambulance by itself.** `POST /ambulances/{id}/location` (`backend/app/api/hospitals.py`) stores a position that a staff member sends and broadcasts `ambulance.location`. There is no timer or mover in the backend. (A check on 14 Nov, written in `hospital-portal/docs/RUN_BOTH_APPS.md`, saw the same.)
- **Jehal's mock moves it** after a dispatch (`mock-server/hospitalMode.js`, until the portal posts positions itself).
- **The portal** (`AmbulanceProvider.jsx`, `services/movement.js`) has three modes, set by `VITE_PORTAL_SIMULATES_AMBULANCE`: `true` (the portal runs the trip and posts each position to the backend), `false` (the portal never moves it), `auto` (default: wait 3 s for a backend position, then the portal moves it).

### Options

| | Where the position comes from | What the other apps see | On the real backend without the mock | Effect on the demo recording |
|---|---|---|---|---|
| **1. The portal moves it** (`true`) | The portal's simulated route, posted to the backend each tick | Patient app and family get `ambulance.location` through the backend, as long as the portal tab stays open | Works today (checked on 14 Nov by Puneet's laptop run) | Deterministic. The ambulance stops if the portal tab is closed or the staff session expires. |
| **2. The backend moves it** | A new simulation in Daksh's code (timer per dispatched ambulance) | Everyone sees the same positions with no dependency on a portal tab | Needs new backend code, tests and a decision on speed and route | Cleanest for a multi-app demo, but not built, so not available for the recording |
| **3. The mock moves it** | Jehal's mock server | Only works when the apps talk to the mock | The real backend would show nothing moving | Fine for a mock demo, wrong for a recording "on the real backend" |

### Recommendation (not a decision)

**For the recording: Option 1 with the setting made explicit** (`VITE_PORTAL_SIMULATES_AMBULANCE=true`), not left on `auto`, so there is no 3-second wait to explain. **Longer term: Option 2**, so no screen has to stay open for another app to see the ambulance; if Daksh agrees, set the portal to `false`. The demo checklist (`docs/DEMO_RECORDING_CHECKLIST.md`) uses Option 1 until then.

**Who must agree:** Daksh (will the backend ever simulate the trip?) and Jehal (his recording setup and his mock mode). Puneet then sets the portal setting.
