// Settings used for demos. The demo location is in Ahmedabad and matches the mock server.
export const DEMO_LOCATION = { lat: 23.0225, lng: 72.5714, accuracy: 50 };

// Seconds the user has to cancel a false alarm before the SOS is sent.
export const COUNTDOWN_SECONDS = 10;

// The demo panel (/demo) and its helpers are for rehearsals only. They are on in `npm run dev` and in a build made with
// VITE_DEMO_TOOLS=true; a normal build leaves them out, so the route answers "not found".
export const DEMO_ENABLED = import.meta.env.DEV || import.meta.env.VITE_DEMO_TOOLS === 'true';

// Seconds the "Are you OK?" safety check-in waits for an answer before it starts an alert.
export const CHECKIN_SECONDS = 30;
