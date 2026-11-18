# Likely jury questions and plain answers

Read these together and say each answer in your own words. Both of you should be able to answer any of them.

1. **What does it do?**
   A patient presses Emergency help, picks symptoms and, after a 10 second countdown to cancel a false alarm, an alert goes to the hospital desk. The desk acknowledges and dispatches an ambulance; the patient watches the timeline. Everything is simulated.
2. **Why a simulated server?**
   There are no real hospitals or ambulances to connect to, so the server plays them. It keeps data in memory and every screen says it is simulated. It means the whole demo runs from one command.
3. **How does the portal choose which hospital gets an alert?**
   It rules out hospitals that are not verified or lack the unit the emergency needs, then scores the rest by capability, travel time and free beds. Distances are straight-line; only the tracking map uses road routes.
4. **What if nobody answers the alert?**
   After 30 seconds (shorter at demo speed) it moves to the next ranked hospital and the card shows it.
5. **How is privacy handled?**
   The patient chooses what is shared (location, history, vitals, reports) on a consent screen, and can see who looked at their data. Turning a consent off removes that field from the next view.
6. **What is in the QR?**
   Only a link with a random 24-character token. No name, number, blood group or diagnosis. The server finds it by the token's hash.
7. **What does a stranger who scans it see?**
   A minimal page: name, patient code, age band, blood group, allergies, one masked contact, and only what the patient switched on and consented to, with a demo banner.
8. **How do doctors see more?**
   Only after a hospital staff login, by choosing a purpose. Every view and every refusal is audited. There is no emergency override; that would need a clinical and legal review.
9. **What if the QR is lost or shared?**
   The patient can make a new QR (the old one stops at once) or revoke it, and links expire after 1 hour, 24 hours or 7 days. It is a bearer link: anyone holding it can open the quick view until then.
10. **Is this ABHA or a government ID?**
    No. It is a HealthTwin demo token with fictional data.
11. **Does it diagnose?**
    No. It shows what the patient entered and simple draft alert rules, pending doctor review. It never interprets results.
12. **Is anything real?**
    Map tiles (OpenStreetMap), road routes (OSRM, with a labelled fallback), the phone's GPS and a Bluetooth heart-rate strap streamed live to the hospital screen when the patient agrees, a SQLite file for saved data, and real push or SMS messages to the two team phones. The ambulance, the hospitals' replies, the patients' contacts and 112/108 are simulated.
13. **What does it not do?**
    No real ambulance, hospital, 112/108 call or message to patients' contacts; the live and phone parts were not run on a real phone from the build environment; the Hindi and Gujarati text is unreviewed; the tests for the patient app and the browser flows have not all been run on this final version (see `docs/QR_PASSPORT_QA.md`).
14. **Where is the FastAPI backend?**
    It exists on branch `Puneet` with its own tests. The final demo does not use it.
