// Mock login until Daksh's POST /auth/login is ready.
// In real mode the same function calls the backend and stores its token and role.
import { request } from './api.js';
import { USE_MOCK } from './config.js';
import { getSession, saveSession, clearSession, getToken } from './session.js';

import { normaliseLogin } from './adapters.js';

// Demo accounts (mock mode only). The first two are the portal's own; the rest are the logins
// that Jehal's patient-app mock uses, so the same credentials work in both apps.
const STAFF = { role: 'staff', name: 'Desk Staff (Demo)', hospital_id: 'H2' };
const ADMIN = { role: 'admin', name: 'Admin (Demo)', hospital_id: 'H2' };
const MOCK_USERS = {
  'staff@demo': { password: 'demo123', ...STAFF },
  'admin@demo': { password: 'demo123', ...ADMIN },
  'staff@demo.test': { password: 'demo1234', ...STAFF },
  staff1: { password: 'demo-password', ...STAFF },
  'admin@demo.test': { password: 'demo1234', ...ADMIN },
  admin1: { password: 'demo-password', ...ADMIN },
};

/** What the login screen asks for: mock mode takes an email, the real backend (Daksh v0.6) takes a username. */
export const LOGIN_FIELD = USE_MOCK ? 'email' : 'username';

export async function login(identifier, password) {
  const name = String(identifier || '').trim();
  let session;
  if (USE_MOCK) {
    const user = MOCK_USERS[name.toLowerCase()];
    if (!user || user.password !== password) throw new Error('Wrong email or password');
    session = {
      token: `mock-token-${user.role}-${Date.now()}`,
      role: user.role,
      name: user.name,
      hospital_id: user.hospital_id,
    };
  } else {
    // Daksh v0.6 expects { username, password } and answers { token, role, user_id }. The adapter maps role and hospital.
    session = normaliseLogin(await request('POST', '/auth/login', { username: name, password }), name);
  }
  saveSession(session);
  return session;
}

export function logout() {
  clearSession();
}

export { getSession, getToken };
