// API client. Set VITE_USE_MOCK=true in .env to work without the backend.
// Mock responses use the same shape as the team contract, so switching to
// Daksh's real backend later only means setting VITE_USE_MOCK=false.
import hospitalsSeed from '../data/hospitals.json';
import ambulancesSeed from '../data/ambulances.json';
import * as mock from './mockBackend.js';
import { USE_MOCK, API_BASE_URL } from './config.js';
import { emitMock } from './socket.js';
import { getToken, getSession } from './session.js';
import { withDistance, DEMO_LOCATION } from './geo.js';
import { hasCapabilities } from './contract.js';
import { normaliseHospitals, normaliseEmergency, normaliseEmergencies } from './adapters.js';

/** The backend does not have this endpoint (yet): 404, 405 or 501. The screen then hides or limits that feature. */
export const isMissingEndpoint = (err) => Boolean(err?.missing) || [404, 405, 501].includes(err?.status);

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
  if (!res.ok) {
    // 404, 405 and 501 mean "this backend does not have that endpoint (yet)". Say so in plain words;
    // the screen then limits or switches off that one feature instead of failing.
    const missing = [404, 405, 501].includes(res.status);
    const err = new Error(missing ? `The backend has no ${method} ${path.split('?')[0]} yet (${res.status}).` : `${method} ${path} failed: ${res.status}`);
    err.status = res.status;
    err.missing = missing;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

// ---------- Hospitals ----------

/**
 * GET /hospitals?lat&lng&type
 * Returns hospitals with distance_km, eta_min (simulated) and capability_match.
 * Falls back to the local seed file if the backend cannot be reached.
 */
export async function getHospitals({ lat, lng, type } = {}) {
  let list;
  if (USE_MOCK) {
    list = await mock.listHospitals();
  } else {
    try {
      const q = new URLSearchParams({ ...(lat != null && lng != null ? { lat, lng } : {}), ...(type ? { type } : {}) });
      list = await request('GET', `/hospitals${q.toString() ? `?${q}` : ''}`);
    } catch (err) {
      console.warn('Backend unavailable, using hospitals.json', err);
      list = hospitalsSeed;
    }
  }
  // Mock mode measures from the sample patient. With a real backend we never assume a city:
  // distance is measured only when a location is given, otherwise the backend's own distance_km is kept.
  const from = lat != null && lng != null ? { lat, lng } : USE_MOCK ? DEMO_LOCATION : null;
  const hospitals = normaliseHospitals(list);
  return (from ? withDistance(hospitals, from) : hospitals).map((h) => ({
    ...h,
    capability_match: type ? hasCapabilities(h, type) : null,
  }));
}

/** PATCH /hospitals/{id}/availability  body: { beds_free, icu_free, cath_lab_ready, stroke_unit_ready } */
export async function updateAvailability(id, availability) {
  if (USE_MOCK) return mock.patchAvailability(id, availability);
  return request('PATCH', `/hospitals/${id}/availability`, availability);
}

/**
 * Admin: add a hospital (feature #47). PROPOSED endpoint, not in the contract yet.
 * POST /hospitals  body: { name, address, phone, lat, lng, capabilities, availability }
 * The backend must save it with verified = false and return the new hospital with its id.
 */
export async function createHospital(data) {
  if (USE_MOCK) return mock.addHospital(data);
  return request('POST', '/hospitals', data);
}

/** Admin: edit a hospital. PROPOSED: PUT /hospitals/{id}  (same body; does not change verified). */
export async function updateHospital(id, data) {
  if (USE_MOCK) return mock.updateHospital(id, data);
  return request('PUT', `/hospitals/${id}`, data);
}

/** Admin: verify or unverify. PROPOSED: PATCH /hospitals/{id}/verify  body: { verified }  -> { id, verified } */
export async function setHospitalVerified(id, verified) {
  if (USE_MOCK) return mock.setHospitalVerified(id, verified);
  return request('PATCH', `/hospitals/${id}/verify`, { verified });
}

// ---------- Emergencies ----------
// In mock mode these go to services/mockBackend.js, which also sends the matching
// WebSocket event. In real mode they call Daksh's backend, which does the same.

const actor = () => getSession()?.name || 'Hospital staff';

/** Active emergencies for the alert queue. */
export async function getAlerts() {
  if (USE_MOCK) return mock.listAlerts();
  return normaliseEmergencies(await request('GET', '/emergencies?status=active'));
}

/**
 * Finished and cancelled emergencies for case history and analytics (features #48, #31, #30).
 * PROPOSED: GET /emergencies?status=finished  -> list where every item includes status_events.
 */
export async function getHistory() {
  return normaliseEmergencies(await request('GET', '/emergencies?status=finished'));
}

/** GET /emergencies/{id}: details and timeline (status_events). */
export async function getEmergency(id) {
  if (USE_MOCK) return mock.getEmergency(id);
  const d = await request('GET', `/emergencies/${id}`);
  return d && { ...normaliseEmergency(d), emergency_id: d.emergency_id ?? d.id ?? id };
}

/** POST /emergencies/{id}/ack */
export async function acknowledge(id) {
  if (USE_MOCK) return mock.transition(id, 'HOSPITAL_ACKNOWLEDGED', actor());
  return request('POST', `/emergencies/${id}/ack`, { hospital_id: getSession()?.hospital_id || undefined });
}

/** POST /emergencies/{id}/dispatch */
export async function dispatch(id, ambulanceId) {
  if (USE_MOCK) return mock.transition(id, 'AMBULANCE_DISPATCHED', actor(), { ambulance_id: ambulanceId });
  return request('POST', `/emergencies/${id}/dispatch`, { hospital_id: getSession()?.hospital_id || undefined, ambulance_id: ambulanceId });
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
export const mockCreateEarlyNotice = (type) => mock.createEmergency(type, true);
export const mockConfirmSos = (id) => mock.confirmSos(id);
export const mockCreateEmergency = (type) => mock.createEmergency(type);

// ---------- Ambulances ----------

/**
 * List of ambulance units (feature #44).
 * PROPOSED endpoint, not in the contract yet: GET /ambulances
 * -> [{ id, call_sign, crew: { driver, paramedic }, base_hospital_id, lat, lng, status }]
 */
export async function getAmbulances() {
  if (USE_MOCK) return mock.listAmbulances();
  try {
    return await request('GET', '/ambulances');
  } catch (err) {
    if (!isMissingEndpoint(err)) throw err;
    // Fallback while the endpoint is not agreed: a sample fleet, clearly marked (the provider places it at the hospitals).
    console.warn('No /ambulances endpoint: using the sample fleet.');
    return ambulancesSeed.map((u) => ({ ...u, sample: true }));
  }
}

/**
 * POST /ambulances/{id}/location, sent on every simulator tick (feature #25).
 * body: { emergency_id, lat, lng, heading, eta_seconds, remaining_km, progress, leg }
 * The backend should broadcast the same fields in the ambulance.location event.
 */
export async function postAmbulanceLocation(id, body) {
  if (USE_MOCK) return mock.ambulanceLocation(id, body);
  try {
    return await request('POST', `/ambulances/${id}/location`, body);
  } catch (err) {
    if (!isMissingEndpoint(err)) throw err;
    // No endpoint: show the movement on this screen only, as if the backend had broadcast it.
    emitMock('ambulance.location', { emergency_id: body.emergency_id, payload: { ambulance_id: id, ...body } });
    return null;
  }
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

/**
 * Health passport (C3). GET /passport/{patient_id} as logged-in staff. Returns only what the patient consented to share
 * (other fields are left out). The backend records every view, so this is called ONLY when staff press "Open passport".
 * Errors keep their HTTP status: 401 login, 403 not allowed, 404 no such patient or no endpoint.
 */
export async function getPassport(patientId) {
  if (USE_MOCK) return mock.getPassport(patientId);
  return request('GET', `/passport/${encodeURIComponent(patientId)}`);
}

export const mockCrewReply = (id) => mock.crewReply(id);
export const CANNED_CREW_REPLIES = mock.CANNED_CREW_REPLIES;
