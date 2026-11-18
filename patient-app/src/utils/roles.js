// Where each role lands after signing in. This app is for patients. Hospital staff use the hospital portal.
export const HOME = { PATIENT: '/' };
export const homeFor = (role) => HOME[role] || '/login';
export const allowedHere = (role) => Boolean(HOME[role]);
