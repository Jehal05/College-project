// Emergency simulator: broadcasts WebSocket events and plays the fake hospital response.
// Timing is divided by DEMO_SPEED (default 1) so demos can run faster, e.g. DEMO_SPEED=5.
const store = require('./store');
const { rankHospitals, DEMO_LOCATION } = require('./helpers');
const { buildCreatedPayload } = require('./alertPayload');
const { getSpeed } = require('./demoState');
const { evaluate } = require('./rules');
const { sharedVitals, VITAL_KEYS } = require('./vitals');
const escalation = require('./escalation');

let wss = null; // set by server.js
const timers = new Map(); // emergency id -> list of timeouts

function setServer(server) { wss = server; }

// Send one event to every connected client. Shape: { type, emergency_id, state, timestamp, payload }
function broadcast(event) {
  if (!wss) return;
  const message = JSON.stringify({ event: event.type, ...event }); // `event` is Daksh's name for `type`; both are sent
  wss.clients.forEach((client) => { if (client.readyState === 1 && client.authed) client.send(message); });
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

const alertAt = () => (process.env.ALERT_AT === 'detected' ? 'detected' : 'sos');
const hospitalMode = () => (process.env.HOSPITAL_MODE === 'manual' ? 'manual' : 'auto');

// emergency.created: everything the hospital needs, only what the patient shares (see alertPayload.js).
function announceCreated(emergency, hospital, rank) {
  const patient = store.patients[emergency.patient_id];
  broadcast({ type: 'emergency.created', emergency_id: emergency.id, state: emergency.state, timestamp: new Date().toISOString(),
    payload: buildCreatedPayload({ emergency, patient, hospital, rank, vitals: emergency.vitals_at_alert }) });
}

// Create an emergency in state EMERGENCY_DETECTED (not yet announced to the hospital, see ALERT_AT).
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
  // Default (ALERT_AT=sos): the hospital hears nothing until the SOS. ALERT_AT=detected sends a first, thin created event now.
  if (alertAt() === 'detected') announceCreated(emergency, null, null);
  return emergency;
}

// Send the SOS: rank the hospitals, alert the best one and (auto mode) play the response timeline (ms after the SOS).
function sendSos(emergency, location) {
  const ranked = rankHospitals(emergency.type, location);
  const top = ranked[0] || null;
  const h = top && { id: top.id, name: top.name, distance_km: top.distance_km, lat: top.lat, lng: top.lng };
  const where = location || DEMO_LOCATION;
  const hospital = h && { id: h.id, name: h.name, distance_km: h.distance_km };
  const first = emergency.state === 'EMERGENCY_DETECTED';
  emergency.location = location || null;
  emergency.hospital = hospital || null;
  if (alertAt() === 'sos') {
    // The created event now carries the state SOS_SENT, the location and the hospital. Same state change as below.
    Object.assign(emergency, { state: 'SOS_SENT' });
    emergency.status_events.push({ state: 'SOS_SENT', timestamp: new Date().toISOString() });
    announceCreated(emergency, hospital, top && top.rank);
    broadcast({ type: 'emergency.sos_sent', emergency_id: emergency.id, state: 'SOS_SENT', timestamp: new Date().toISOString(), payload: {} });
  } else {
    emit(emergency, 'emergency.sos_sent', 'SOS_SENT', {}, { location, hospital });
  }
  if (!first) return emergency;

  // Phase 3: tell the patient's contacts (simulated). Phone numbers are never put in the event.
  const contacts = ((store.patients[emergency.patient_id] || {}).contacts || [])
    .map((c) => ({ id: c.id, name: c.name, relation: c.relation }));
  if (contacts.length) {
    later(emergency, 2000, () => emit(emergency, 'contacts.notified', emergency.state, { contacts }, { contacts_notified: contacts }));
  }
  if (!h) return emergency;

  later(emergency, 1000, () => emit(emergency, 'hospital.alerted', 'SOS_SENT', { hospital_id: h.id, rank: top.rank, hospital }));
  escalation.start(emergency, ranked, { emit, later }); // nobody acknowledges in time: next hospital (escalation.js)
  if (hospitalMode() === 'manual' || escalation.noAck()) return emergency; // the portal acknowledges, dispatches and moves the ambulance

  const amb = store.ambulances.find((a) => a.base_hospital_id === h.id) || store.ambulances[0];
  later(emergency, 4000, () => emit(emergency, 'hospital.acknowledged', 'HOSPITAL_ACKNOWLEDGED',
    { hospital_id: (emergency.hospital || h).id, acknowledged_by: 'ER desk (simulated)' }));
  later(emergency, 8000, () => emit(emergency, 'ambulance.dispatched', 'AMBULANCE_DISPATCHED',
    { ambulance_id: amb.id, eta_seconds: 60 }, { ambulance: { id: amb.id, call_sign: amb.call_sign }, eta_seconds: 60 }));

  // Ambulance moves in a straight line from the hospital to the patient from 10 s to 40 s.
  for (let at = 10000; at <= 40000; at += 2000) {
    const progress = (at - 10000) / 30000;
    const eta = Math.round((60 * (40000 - at)) / 32000);
    const lat = h.lat + (where.lat - h.lat) * progress;
    const lng = h.lng + (where.lng - h.lng) * progress;
    later(emergency, at, () => emit(emergency, 'ambulance.location', 'EN_ROUTE',
      { ambulance_id: amb.id, lat, lng, eta_seconds: eta }, { eta_seconds: eta }));
  }
  later(emergency, 40000, () => emit(emergency, 'emergency.arrived', 'ARRIVED', { ambulance_id: amb.id }));
  later(emergency, 50000, () => emit(emergency, 'emergency.handover_done', 'HANDOVER_DONE', {}));
  return emergency;
}

// Used by hospitalMode.js: a state change driven by the portal.
function manualEmit(emergency, type, state, payload = {}, patch = {}) { emit(emergency, type, state, payload, patch); }
const manualLater = (emergency, ms, fn) => later(emergency, ms, fn);

function cancelEmergency(emergency) {
  stopTimers(emergency.id);
  emit(emergency, 'emergency.cancelled', 'CANCELLED', {});
  return emergency;
}

module.exports = { setServer, manualEmit, manualLater, broadcast, createEmergency, sendSos, cancelEmergency, stopAll };
