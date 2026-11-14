// Where the app lives, used to build the link inside the passport QR code.
// Set VITE_APP_URL when the app is deployed; otherwise the current address is used.
export const APP_URL = (import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, '');
export const passportLink = (token) => APP_URL + '/p/' + token;
