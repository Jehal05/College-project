# Real data in the demo: map, GPS, road routes, heart-rate strap

HealthTwin AI is a **simulated prototype and not a medical device**. This page says which parts of the demo can now use real data, what is sent where, and what is still simulated. Hospitals, ambulances and patients stay fictional.

## What is real now

| Part | Real when | Otherwise | Where |
|---|---|---|---|
| Street map | You are online (tiles from OpenStreetMap) | Drawn simple map / a notice on the portal map | `patient-app/src/components/themed/StreetMap.jsx`, portal `Map.jsx`, `TrackingMap.jsx`, `PatientMiniMap.jsx` |
| GPS location | The location consent is on, the browser permission is granted and the fix is inside the chosen city | A labelled **simulated** start point of the chosen city | `patient-app/src/services/geo.js` |
| Road route and time | The routing server answers within 4 seconds | The simulated path and the assumed-speed estimate, labelled | `hospital-portal/src/services/roadRoute.js` |
| Heart rate | A Bluetooth strap is connected and the vitals consent is on | The simulated heart rate, labelled **Simulated** | `patient-app/src/services/heartStrap.js` |

## One place for every outside address

`patient-app/src/config/external.js` and `hospital-portal/src/config/external.js` hold the tile address and the routing address. Change them there, or with `VITE_TILE_URL` and `VITE_ROUTING_URL` in `.env`. A portal test fails if any other file brings its own address back. `VITE_ROAD_ROUTES=false` stops the portal from ever calling the routing server (the portal's end-to-end tests use it).

Both defaults are free public servers without a key: `tile.openstreetmap.org` (OpenStreetMap tile rules: light, demo-sized use, credit line kept on the map) and `router.project-osrm.org` (the OSRM demo server, not meant for heavy use). For anything beyond a demo, use your own tile and routing server.

## What leaves the device

- **Map and routing services get coordinates only.** Tiles are asked for by map square numbers. A route request holds four numbers (two points). Never a name, id or health data, no cookies, no referrer.
- **GPS** is read only after the location consent is on, with a fresh high-accuracy fix (up to 8 seconds). It is sent only to this app's own server, only together with the SOS, and is labelled `gps` with its accuracy. During the countdown the screen says what will be sent and offers **Stop sharing my location**; the alert is then sent without a location.
- **Heart rate from a strap stays on the phone.** It is shown with the label "Device (chest strap)". The oxygen value and every other number stay labelled "Simulated". The two are never mixed silently.

## Honest limits

- A real GPS position outside the chosen city is not used (the demo hospitals are in Ahmedabad and Pune); the simulated start point is used and labelled.
- GPS is sent once, with the SOS. There is no live location stream yet: that needs a backend endpoint.
- The strap reading is **not sent to the server**: the hospital still sees the simulated vitals. Sending it needs a backend endpoint that accepts a device reading; it has not been built or tested.
- Road routes are used on the portal's ambulance tracking map. Hospital ranking and the list ETAs still use straight-line distance and an assumed speed. OSRM's time is before traffic; the ambulance's movement along the road is still simulated and faster than real time.
- Web Bluetooth works in Chrome and Edge on Android and computers, not in iPhone browsers or Firefox.
- Hindi and Gujarati text added for this work has not been reviewed by a native reader.

## How to test by hand

**Map and routes (online):** `npm run one`, open `/portal/`, sign in as `staff@demo` / `demo123`, open an emergency with a dispatched ambulance. The tracking card should say "Real road route" with km and minutes. Turn the network off and reload: it says "Not a road route" and the drawn/straight version stays.

**GPS:** in the patient app, sign in as `patient@demo.test` / `demo1234`, make sure the location consent is on, start an alert. During the countdown the line says the phone GPS will be sent. Allow the browser prompt. Press **Stop sharing my location** to see the line change. Real GPS needs HTTPS or localhost.

**Strap:** Chrome on a phone or computer, vitals consent on, Home screen, **Connect heart-rate strap**, pick the strap (moisten the contacts and wear it). The heart-rate tile should change to "Device (chest strap)". Switch the strap off: after about six seconds the tile returns to the simulated number with "Simulated" and the card reports the lost connection.

## Tests

No test uses the internet or real hardware. Routing tests use a fake `fetch`, strap tests a fake Bluetooth device, GPS tests a stubbed `navigator.geolocation`. In this sandbox the portal tests (`npm test`) and the strap logic were run; the patient-app vitest and browser suites run only in CI or on a laptop with `npm ci`.
