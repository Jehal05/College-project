// Emergency simulator: broadcasts WebSocket events and plays the fake hospital response.
// Timing is divided by DEMO_SPEED (default 1) so demos can run faster, e.g. DEMO_SPEED=5.
const store = require('./store');
const { chooseHospital, DEMO_LOCATION } = require('./helpers');
const { getSpeed } = require('./demoState');
const { evaluate } = require('./rules');
const { currentVitals } = require('./vitals');

let wss = null; // set by server.js
const timers = new Map(); // emergency id -> list of timeouts

function setServer(server) { wss = server; }

// Send one event to every connected client. Shape: { type, emergency_id, state, timestamp, payload }
function broadcast(event) {
  if (!wss) return;
  const message = JSON.stringify({ event: event.type, ...event }); // `event` is Daksh's name for `type`; both are sent
  wss.clients.forEach((client) => { if (client.readyState === 1) client.send(message); });
}

// Update the emergency, add a status event if the state changed, then broadcast.
function emit(emergency, type, state, payload = {}, patch = {}) {
  const timestamp = new Date().toISOString();
  Object.assign(emergency, patch);
  if (emergency.state !== state) {
    emergency.state = state;
    emergency.status_events.push({ state, timestamp });
  }
  broadcast({ type, emergency_id: emergency.id, state, timestamp, payload });
}

function later(emergency, nominalMs, fn) {
  const handle = setTimeout(fn, nominalMs / getSpeed()); // the speed can change between emergencies (/demo/speed)
  if (!timers.has(emergency.id)) timers.set(emergency.id, []);
  timers.get(emergency.id).push(handle);
}

function stopTimers(id) {
  (timers.get(id) || []).forEach(clearTimeout);
  timers.delete(id);
}

function stopAll() { [...timers.keys()].forEach(stopTimers); }

// The readings the rules engine and the summary use. Only when the patient shares vitals.
const VITAL_KEYS = ['heart_rate', 'spo2', 'bp_sys', 'bp_dia', 'glucose', 'resp_rate'];
function sharedVitals(consents) {
  if (consents && consents.vitals === false) return null;
  const reading = currentVitals();
  return { ...Object.fromEntries(VITAL_KEYS.map((k) => [k, reading[k]])), timestamp: reading.timestamp };
}

// Create an emergency in state EMERGENCY_DETECTED and announce it.
// source says what started it: MANUAL (the person), FALL_CHECK or INACTIVITY_CHECK (the safety check-in).
function createEmergency({ patient_id, type, symptoms, consents, source }) {
  const id = store.nextEmergencyId();
  const patient = store.patients[patient_id] || {};
  const shared = { ...(patient.consents || {}), ...(consents || {}) }; // consent as it was when the alert started
  const vitals_at_alert = sharedVitals(shared);
  const reasons = {
    ...evaluate(symptoms, vitals_at_alert || {}),
    inputs: { symptoms, vitals: vitals_at_alert ? Object.fromEntries(VITAL_KEYS.map((k) => [k, vitals_at_alert[k]])) : {},
      vitals_at: vitals_at_alert ? vitals_at_alert.timestamp : null },
    simulated: true,
  };
  const emergency = {
    id, patient_id, type, symptoms, consents: shared, location: null, source: source || 'MANUAL', reasons, vitals_at_alert,
    state: 'EMERGENCY_DETECTED', severity: 'EMERGENCY', hospital: null, ambulance: null, eta_seconds: null,
    status_events: [{ state: 'EMERGENCY_DETECTED', timestamp: new Date().toISOString() }],
  };
  store.emergencies.set(id, emergency);
  broadcast({ type: 'emergency.created', emergency_id: id, state: emergency.state, timestamp: emergency.status_events[0].timestamp,
    payload: { type, severity: emergency.severity, symptoms, source: emergency.source, reasons } });
  return emergency;
}

// Send the SOS: pick a hospital and play the response timeline (times in ms after the SOS).
function sendSos(emergency, location) {
  const hospital = chooseHospital(emergency.type, location);
  const h = hospital && { id: hospital.id, name: hospital.name, distance_km: hospital.distance_km, lat: hospital.lat, lng: hospital.lng };
  const where = location || DEMO_LOCATION;
  emit(emergency, 'emergency.sos_sent', 'SOS_SENT', {}, { location, hospital: h && { id: h.id, name: h.name, distance_km: h.distance_km } });

  // Phase 3: tell the patient's contacts (simulated). Phone numbers are never put in the event.
  const contacts = ((store.patients[emergency.patient_id] || {}).contacts || [])
    .map((c) => ({ id: c.id, name: c.name, relation: c.relation }));
  if (contacts.length) {
    later(emergency, 2000, () => emit(emergency, 'contacts.notified', emergency.state, { contacts }, { contacts_notified: contacts }));
  }
  if (!h) return emergency;

  later(emergency, 1000, () => emit(emergency, 'hospital.alerted', 'SOS_SENT', { hospital: emergency.hospital }));
  later(emergency, 4000, () => emit(emergency, 'hospital.acknowledged', 'HOSPITAL_ACKNOWLEDGED',
    { hospital_id: h.id, acknowledged_by: 'Demo ER desk' }));
  later(emergency, 8000, () => emit(emergency, 'ambulance.dispatched', 'AMBULANCE_DISPATCHED',
    { ambulance_id: 'amb_001', eta_seconds: 60 }, { ambulance: { id: 'amb_001' }, eta_seconds: 60 }));

  // Ambulance moves in a straight line from the hospital to the patient from 10 s to 40 s.
  for (let at = 10000; at <= 40000; at += 2000) {
    const progress = (at - 10000) / 30000;
    const eta = Math.round((60 * (40000 - at)) / 32000);
    const lat = h.lat + (where.lat - h.lat) * progress;
    const lng = h.lng + (where.lng - h.lng) * progress;
    later(emergency, at, () => emit(emergency, 'ambulance.location', 'EN_ROUTE',
      { ambulance_id: 'amb_001', lat, lng, eta_seconds: eta }, { eta_seconds: eta }));
  }
  later(emergency, 40000, () => emit(emergency, 'emergency.arrived', 'ARRIVED', { ambulance_id: 'amb_001' }));
  later(emergency, 50000, () => emit(emergency, 'emergency.handover_done', 'HANDOVER_DONE', {}));
  return emergency;
}

function cancelEmergency(emergency) {
  stopTimers(emergency.id);
  emit(emergency, 'emergency.cancelled', 'CANCELLED', {});
  return emergency;
}

module.exports = { setServer, broadcast, createEmergency, sendSos, cancelEmergency, stopAll };
