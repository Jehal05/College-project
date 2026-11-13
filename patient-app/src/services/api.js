// All HTTP calls live here. Components never hard-code URLs.
// Switch from mock to real backend by changing VITE_API_URL in .env.
import { getToken } from './auth';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = 'Bearer ' + token;

  let response;
  try {
    response = await fetch(API_URL + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    const err = new Error('network');
    err.code = 'NETWORK';
    throw err; // Server not reachable.
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.error || 'Request failed');
    err.status = response.status;
    throw err;
  }
  return data;
}

export const login = (email, password) => request('/auth/login', { method: 'POST', body: { email, password } });
export const getPatient = (id) => request('/patients/' + id);
export const updatePatient = (id, fields) => request('/patients/' + id, { method: 'PATCH', body: fields });
export const getVitals = (id) => request('/patients/' + id + '/vitals');

// ---- Emergency flow (Phase 2) ----
export const createEmergency = (body) => request('/emergencies', { method: 'POST', body });
export const sendSos = (id, location) => request('/emergencies/' + id + '/sos', { method: 'POST', body: { location } });
export const cancelEmergency = (id) => request('/emergencies/' + id + '/cancel', { method: 'POST' });
export const getEmergency = (id) => request('/emergencies/' + id);

// ---- Demo helpers ----
export const runDemoScenario = (type) => request('/demo/scenario', { method: 'POST', body: { type } });
export const resetDemo = () => request('/demo/reset', { method: 'POST' });
