// Where each role lands after signing in. Hospital staff use the hospital portal, not this app.
export const HOME = { PATIENT: '/', FAMILY: '/family', RESPONDER: '/responder', ADMIN: '/admin' };
export const homeFor = (role) => HOME[role] || '/login';
export const allowedHere = (role) => Boolean(HOME[role]);
