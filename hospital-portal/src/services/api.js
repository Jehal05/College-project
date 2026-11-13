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
    list = await mock.listHospitals();
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

/** PATCH /hospitals/{id}/availability  body: { beds_free, icu_free, cath_lab_ready, stroke_unit_ready } */
export async function updateAvailability(id, availability) {
  if (USE_MOCK) return mock.patchAvailability(id, availability);
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
  if (USE_MOCK) return mock.transition(id, 'AMBULANCE_DISPATCHED', actor(), { ambulance_id: ambulanceId });
  return request('POST', `/emergencies/${id}/dispatch`, { ambulance_id: ambulanceId });
}

/** POST /emergencies/{id}/status  (EN_ROUTE, ARRIVED, HANDOVER_DONE) */
export async function updateStatus(id, state) {
  if (USE_MOCK) return mock.transition(id, state, actor());
  return request('POST', `/emergencies/${id}/status`, { state });
}

/**
 * Tick or untick one pre-arrival checklist item (feature #26).
 * PROPOSED endpoint, not in the contract yet. Agree it with Daksh:
 * PATCH /emergencies/{id}/checklist  body: { item_id, done }  ->  { checklist }
 */
export async function setChecklistItem(id, itemId, done) {
  if (USE_MOCK) return mock.setChecklistItem(id, itemId, done, actor());
  return request('PATCH', `/emergencies/${id}/checklist`, { item_id: itemId, done });
}

// Mock-only helpers for testing without the patient app.
export const mockEscalate = (id) => mock.escalate(id);
export const mockPatientCancel = (id) => mock.patientCancel(id);
export const mockCreateEmergency = (type) => mock.createEmergency(type);

// ---------- Ambulances ----------

/**
 * List of ambulance units (feature #44).
 * PROPOSED endpoint, not in the contract yet: GET /ambulances
 * -> [{ id, call_sign, crew: { driver, paramedic }, base_hospital_id, lat, lng, status }]
 */
export async function getAmbulances() {
  if (USE_MOCK) return mock.listAmbulances();
  return request('GET', '/ambulances');
}

/**
 * POST /ambulances/{id}/location, sent on every simulator tick (feature #25).
 * body: { emergency_id, lat, lng, heading, eta_seconds, remaining_km, progress, leg }
 * The backend should broadcast the same fields in the ambulance.location event.
 */
export async function postAmbulanceLocation(id, body) {
  if (USE_MOCK) return mock.ambulanceLocation(id, body);
  return request('POST', `/ambulances/${id}/location`, body);
}

// ---------- Timeline notes and chat (PROPOSED endpoints, not in the contract yet) ----------

/**
 * A timeline note with no state change: patient picked up, corridor request, team assignment.
 * POST /emergencies/{id}/notes  body: { kind, note, fields }  ->  { note_id, kind, note, fields, timestamp, actor }
 * The backend stores it, merges `fields` into the emergency, and broadcasts emergency.note.
 */
export async function addNote(id, { kind, note, fields }) {
  if (USE_MOCK) return mock.addNote(id, { kind, note, fields }, actor());
  return request('POST', `/emergencies/${id}/notes`, { kind, note, fields });
}

/**
 * Desk and crew chat (feature #49).
 * POST /emergencies/{id}/chat  body: { text, sender_role, sender_name }
 * The backend broadcasts chat.message { message_id, sender_role, sender_name, text } to both sides.
 */
export async function sendChat(id, { text, sender_role, sender_name }) {
  if (USE_MOCK) return mock.chat(id, { text, sender_role, sender_name });
  return request('POST', `/emergencies/${id}/chat`, { text, sender_role, sender_name });
}

export const mockCrewReply = (id) => mock.crewReply(id);
export const CANNED_CREW_REPLIES = mock.CANNED_CREW_REPLIES;
