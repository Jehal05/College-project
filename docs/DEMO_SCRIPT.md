# Demo script (about 6 minutes)

Everything is simulated. Say so at the start: the banner on every screen says "Simulated event. Not a medical diagnosis."

## Before the jury arrives

1. `PUBLIC_URL=http://<laptop-ip>:4000 npm run one` (see the README). First start builds both apps and takes a few minutes.
2. Open `http://localhost:4000/start`. Press **Reset demo**. Note the five patient logins shown there (new passwords every start).
3. Window A: patient app `http://localhost:4000/` at phone width. Window B: hospital portal `http://localhost:4000/portal/`, signed in as `staff@demo` / `demo123`. Put them side by side.
4. Phone on the same Wi-Fi for the QR scan.

## Walkthrough

| Time | Do | Say / expect |
|---|---|---|
| 0:00 | Window A: sign in as `amit.verma@demo.test` | Home shows his name and simulated heart rate and SpO2 changing |
| 0:30 | Language selector: हिन्दी, ગુજરાતી, English | The whole app changes at once |
| 0:50 | `/start` page, row **Amit Verma**: press **Heart emergency** | Only Amit's Home heart rate jumps (simulated wearable). Priya, Rohan, Rahul and Neha stay resting. Sign in as another patient in a private window to show it |
| 1:00 | **Emergency help**, choose a symptom group, tick a symptom, **Get help now** | Red screen, "Call 112 / 108" first, countdown from 10 |
| 1:30 | Press **Send now** | "Alert sent". Window B: the alert appears in the queue with a map |
| 2:00 | Window B: **Acknowledge**, then **Dispatch** an ambulance | Window A's timeline updates: hospital acknowledged, ambulance dispatched, ETA, arrived. The portal map follows the ambulance on road routes (a labelled simulated route if the routing server cannot be reached) |
| 2:30 | Window A: on the red screen, look at **Live sharing with the hospital** (optionally connect a strap). Window B: open the alert | A green **Live from patient phone** card with the real position and heart rate. Your two phones buzzed with DEMO messages (if set up) |
| 2:45 | Window A: start another alert, this time pick **Severe allergic reaction** or **Burns** (set that patient's wearable on `/start` first) | The red screen shows "Draft suggestions, not reviewed by a doctor" with short first-aid lines under "Call 112 / 108". The portal shows the type name and its staff checklist |
| 3:00 | Window A: **Profile > Consent**, switch Location off | Saved. The next emergency says location sharing is off. Switch it back on |
| 3:20 | **Hospitals** | Real street map with the fictional hospitals |
| 3:40 | **Health passport**: keep all fields, 24 hours, **Create** | QR on a card with "Demo profile" |
| 4:00 | Scan the QR with the phone | Demo banner, name, patient code, age band, blood group, allergies, one masked contact. No conditions or medicines |
| 4:30 | On the phone page press **Staff sign-in** while signed out | The portal login first: signed out means no clinical details |
| 4:50 | Sign in as staff, choose purpose **Emergency treatment**, open | Clinical details with an audit reference. Try `staff.pune@demo.test` / `demo1234` on Amit: refused and logged |
| 5:20 | Window A: passport screen, **Who looked** | Anonymous scan and the staff view with purpose, no names or devices |
| 5:40 | **Make a new QR**, scan the old one | "Passport link unavailable". Close: what is real and what is not |

## If something goes wrong

- **Alert does not appear in the portal:** press Reset demo on `/start`, sign in again.
- **Phones got no message:** check the start page "Phone alerts" line and press the test button; the laptop needs internet. The demo itself never depends on it.
- **Too slow:** start with `DEMO_SPEED=10`.
- **Phone cannot open the QR:** the address in `PUBLIC_URL` is wrong or the phone is on another network. The passport screen shows a yellow warning when the address is localhost.
- **Total failure:** the offline "Not sent yet" screen keeps the Call 112 / 108 button, so safety never depends on the app.

## What to say is NOT real

Simulated hospital replies, ambulance and wearable (unless a strap is connected); fictional patients and hospitals; real SMS or push only to the two team phones, never to patients' contacts or any emergency number; saved data is a local SQLite file; the QR passport is a demo token (not ABHA, not identity proof); the emergency rules are a draft pending doctor review; Hindi and Gujarati not reviewed by a native reader.
