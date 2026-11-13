// Mock login until Daksh's POST /auth/login is ready.
// In real mode the same function calls the backend and stores its token and role.
import { request } from './api.js';
import { USE_MOCK } from './config.js';
import { getSession, saveSession, clearSession, getToken } from './session.js';

// Demo accounts (mock mode only).
const MOCK_USERS = {
  'staff@demo': { password: 'demo123', role: 'staff', name: 'Desk Staff (Demo)', hospital_id: 'H1' },
  'admin@demo': { password: 'demo123', role: 'admin', name: 'Admin (Demo)', hospital_id: 'H1' },
};

export async function login(email, password) {
  let session;
  if (USE_MOCK) {
    const user = MOCK_USERS[email.trim().toLowerCase()];
    if (!user || user.password !== password) throw new Error('Wrong email or password');
    session = {
      token: `mock-token-${user.role}-${Date.now()}`,
      role: user.role,
      name: user.name,
      hospital_id: user.hospital_id,
    };
  } else {
    session = await request('POST', '/auth/login', { email, password }); // { token, role, ... }
  }
  saveSession(session);
  return session;
}

export function logout() {
  clearSession();
}

export { getSession, getToken };
