// API client. Set VITE_USE_MOCK=true in .env to work without the backend.
// Mock responses use the same shape as the team contract, so switching to
// Daksh's real backend later only means setting VITE_USE_MOCK=false.
import hospitalsSeed from '../data/hospitals.json';
import * as mock from './mockBackend.js';
import { USE_MOCK, API_BASE_URL } from './config.js';
import { getToken, getSession } from './session.js';
import { withDistance, DEMO_LOCATION } from './geo.js';
import { hasCapabilities } from './contract.js';

export { USE_MOCK, API_BASE_URL };

const mockDelay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

function authHeader() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Low-level request to the real backend. */
export async function request(method, path, body) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} failed: ${res.status}`);
  return res.status === 204 ? null : res.json();
}

// ---------- Hospitals ----------

/**
 * GET /hospitals?lat&lng&type
 * Returns hospitals with distance_km, eta_min (simulated) and capability_match.
 * Falls back to the local seed file if the backend cannot be reached.
 */
export async function getHospitals({ lat = DEMO_LOCATION.lat, lng = DEMO_LOCATION.lng, type } = {}) {
  let list;
  if (USE_MOCK) {
    await mockDelay();
    list = hospitalsSeed;
  } else {
    try {
      const q = new URLSearchParams({ lat, lng, ...(type ? { type } : {}) });
      list = await request('GET', `/hospitals?${q}`);
    } catch (err) {
      console.warn('Backend unavailable, using hospitals.json', err);
      list = hospitalsSeed;
    }
  }
  return withDistance(list, { lat, lng }).map((h) => ({
    ...h,
    capability_match: type ? hasCapabilities(h, type) : null,
  }));
}

/** PATCH /hospitals/{id}/availability (UI comes in feature #42). */
export async function updateAvailability(id, availability) {
  if (USE_MOCK) {
    await mockDelay();
    return { id, availability };
  }
  return request('PATCH', `/hospitals/${id}/availability`, availability);
}

// ---------- Emergencies ----------
// In mock mode these go to services/mockBackend.js, which also sends the matching
// WebSocket event. In real mode they call Daksh's backend, which does the same.

const actor = () => getSession()?.name || 'Hospital staff';

/** Active emergencies for the alert queue. */
export async function getAlerts() {
  if (USE_MOCK) return mock.listAlerts();
  return request('GET', '/emergencies?status=active');
}

/** GET /emergencies/{id}: details and timeline (status_events). */
export async function getEmergency(id) {
  if (USE_MOCK) return mock.getEmergency(id);
  return request('GET', `/emergencies/${id}`);
}

/** POST /emergencies/{id}/ack */
export async function acknowledge(id) {
  if (USE_MOCK) return mock.transition(id, 'HOSPITAL_ACKNOWLEDGED', actor());
  return request('POST', `/emergencies/${id}/ack`);
}

/** POST /emergencies/{id}/dispatch */
export async function dispatch(id, ambulanceId) {
  if (USE_MOCK) return mock.transition(id, 'AMBULANCE_DISPATCHED', actor());
  return request('POST', `/emergencies/${id}/dispatch`, { ambulance_id: ambulanceId });
}

/** POST /emergencies/{id}/status  (EN_ROUTE, ARRIVED, HANDOVER_DONE) */
export async function updateStatus(id, state) {
  if (USE_MOCK) return mock.transition(id, state, actor());
  return request('POST', `/emergencies/${id}/status`, { state });
}

// Mock-only helpers for testing without the patient app.
export const mockPatientCancel = (id) => mock.patientCancel(id);
export const mockCreateEmergency = (type) => mock.createEmergency(type);

// ---------- Ambulances ----------

/** POST /ambulances/{id}/location (used by the route simulator in feature #25). */
export async function postAmbulanceLocation(id, { lat, lng, emergency_id }) {
  if (USE_MOCK) return { id, lat, lng };
  return request('POST', `/ambulances/${id}/location`, { lat, lng, emergency_id });
}
