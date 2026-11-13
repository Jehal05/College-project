// API client. Set VITE_USE_MOCK=true in .env to work without the backend.
// Mock responses use the same shape as the team contract, so switching to
// Daksh's real backend later only means setting VITE_USE_MOCK=false.
import hospitalsSeed from '../data/hospitals.json';
import mockAlerts from '../data/mock-alerts.json';
import { withDistance, DEMO_LOCATION } from './geo.js';
import { hasCapabilities } from './contract.js';

export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const STORAGE_KEY = 'ht_hospital_session';
const mockDelay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

function authHeader() {
  try {
    const token = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')?.token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
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

/** Mock alert list for the dashboard shell (live WebSocket arrives in Phase 2). */
export async function getAlerts() {
  if (USE_MOCK) {
    await mockDelay();
    return mockAlerts;
  }
  return request('GET', '/emergencies?status=active');
}

export const getEmergency = (id) => request('GET', `/emergencies/${id}`);

// Action endpoints. Buttons are wired up in feature #10 (Phase 2).
export async function acknowledge(id) {
  if (USE_MOCK) return { id, state: 'HOSPITAL_ACKNOWLEDGED' };
  return request('POST', `/emergencies/${id}/ack`);
}
export async function dispatch(id, ambulanceId) {
  if (USE_MOCK) return { id, state: 'AMBULANCE_DISPATCHED', ambulance_id: ambulanceId };
  return request('POST', `/emergencies/${id}/dispatch`, { ambulance_id: ambulanceId });
}
export async function updateStatus(id, state) {
  if (USE_MOCK) return { id, state };
  return request('POST', `/emergencies/${id}/status`, { state });
}

// ---------- Ambulances ----------

/** POST /ambulances/{id}/location (used by the route simulator in feature #25). */
export async function postAmbulanceLocation(id, { lat, lng, emergency_id }) {
  if (USE_MOCK) return { id, lat, lng };
  return request('POST', `/ambulances/${id}/location`, { lat, lng, emergency_id });
}
