// A tiny pretend backend that lives in the browser (mock mode only).
// It remembers each emergency's state, refuses invalid steps exactly like the real
// backend should, and sends the matching WebSocket event through emitMock().
import mockAlerts from '../data/mock-alerts.json';
import hospitalsSeed from '../data/hospitals.json';
import rankingConfig from '../data/ranking-config.json';
import { rankHospitals } from './ranking.js';
import { canEscalate, lastAlertTime, nextHospital } from './escalation.js';
import { emitMock } from './socket.js';
import { canTransition, canCancel } from './stateMachine.js';
import { EVENT_FOR_STATE } from './contract.js';

const records = new Map(); // emergency_id -> emergency with status_events
const hospitals = new Map(hospitalsSeed.map((h) => [h.id, { ...h, availability: { ...h.availability } }]));
const timers = new Map(); // emergency_id -> escalation timer
const ESCALATION_MS = (rankingConfig.escalation_seconds || 30) * 1000;
let seeded = false;
let counter = 2000;
const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

function seed() {
  if (seeded) return;
  seeded = true;
  // Make the sample alerts look recent: 20, 12 and 5 seconds old.
  const ages = [20, 12, 5];
  mockAlerts.forEach((a, i) => {
    const created_at = new Date(Date.now() - (ages[i] ?? 5) * 1000).toISOString();
    records.set(a.emergency_id, {
      ...a,
      created_at,
      alerted_hospital_id: rankFor(a)[0]?.hospital.id || null,
      alerted_ids: [],
      escalation_level: 0,
      checklist: {},
      status_events: [{ state: 'SOS_SENT', timestamp: created_at, actor: 'Patient app' }],
    });
    scheduleEscalation(a.emergency_id);
  });
}

// ---------- Hospitals (features #15 and #42) ----------

const rankFor = (emergency) => rankHospitals([...hospitals.values()], emergency.type, emergency.location, rankingConfig).ranked;

export async function listHospitals() {
  await delay();
  return [...hospitals.values()].map((h) => ({ ...h, availability: { ...h.availability } }));
}

export async function patchAvailability(id, availability) {
  await delay();
  const hospital = hospitals.get(id);
  if (!hospital) throw new Error(`Hospital ${id} not found`);
  hospital.availability = { ...hospital.availability, ...availability };
  return { id, availability: { ...hospital.availability } };
}

// ---------- Auto-escalation (feature #43) ----------
// Stand-in for Daksh's 30-second scheduler: an alert nobody acknowledges moves to the next ranked hospital.

function scheduleEscalation(id) {
  clearTimeout(timers.get(id));
  const rec = records.get(id);
  if (!rec || !canEscalate(rec.state)) return;
  const wait = Math.max(0, lastAlertTime(rec) + ESCALATION_MS - Date.now());
  timers.set(id, setTimeout(() => escalateNow(id, true), wait));
}

function escalateNow(id, automatic) {
  const rec = records.get(id);
  if (!rec) throw new Error(`Emergency ${id} not found`);
  if (!canEscalate(rec.state)) {
    if (automatic) return null;
    throw new Error(`Cannot escalate: state is ${rec.state}`);
  }
  const next = nextHospital(rankFor(rec), rec);
  if (!next) {
    if (automatic) return null; // list used up: the last hospital keeps the alert
    throw new Error('No further hospital to escalate to');
  }
  const from = rec.alerted_hospital_id;
  const timestamp = new Date().toISOString();
  const actor = automatic ? `System (no acknowledgement in ${ESCALATION_MS / 1000} s)` : 'System (mock: escalated by hand)';
  if (from) rec.alerted_ids.push(from);
  rec.alerted_hospital_id = next.id;
  rec.escalation_level += 1;
  rec.escalated_to_name = next.name;
  rec.state = 'ESCALATED';
  rec.status_events.push({ state: 'ESCALATED', timestamp, actor, note: `Now alerting ${next.name}` });
  emitMock('hospital.escalated', {
    emergency_id: id,
    state: 'ESCALATED',
    timestamp,
    payload: { from_hospital_id: from, to_hospital_id: next.id, to_hospital_name: next.name, escalation_level: rec.escalation_level, actor },
  });
  scheduleEscalation(id);
  return { emergency_id: id, state: 'ESCALATED', to_hospital_id: next.id };
}

/** "Mock: escalate now" button, so the demo does not have to wait 30 seconds. */
export async function escalate(id) {
  seed();
  await delay(100);
  return escalateNow(id, false);
}

// ---------- Pre-arrival checklist (feature #26) ----------

export async function setChecklistItem(id, itemId, done, actor) {
  seed();
  await delay(100);
  const rec = records.get(id);
  if (!rec) throw new Error(`Emergency ${id} not found`);
  if (rec.state === 'CANCELLED') throw new Error('This emergency was cancelled. The checklist is read-only.');
  rec.checklist = { ...rec.checklist, [itemId]: { done, by: actor, at: new Date().toISOString() } };
  return { emergency_id: id, checklist: { ...rec.checklist } };
}

// ---------- Emergencies ----------

const copy = (r) => ({ ...r, status_events: [...r.status_events], alerted_ids: [...r.alerted_ids], checklist: { ...r.checklist } });

export async function listAlerts() {
  seed();
  await delay();
  return [...records.values()].map(copy);
}

export async function getEmergency(id) {
  seed();
  await delay();
  const rec = records.get(id);
  if (!rec) throw new Error(`Emergency ${id} not found`);
  return copy(rec);
}

function move(id, target, actor) {
  const rec = records.get(id);
  rec.state = target;
  const timestamp = new Date().toISOString();
  rec.status_events.push({ state: target, timestamp, actor });
  emitMock(EVENT_FOR_STATE[target], { emergency_id: id, state: target, timestamp, payload: { actor } });
  scheduleEscalation(id); // acknowledged or cancelled: the countdown stops
  return { emergency_id: id, state: target, timestamp, actor };
}

/** Staff action: acknowledge, dispatch, en route, arrived, handed over. */
export async function transition(id, target, actor) {
  seed();
  await delay();
  const rec = records.get(id);
  if (!rec) throw new Error(`Emergency ${id} not found`);
  if (!canTransition(rec.state, target)) {
    throw new Error(`Not allowed: ${rec.state} cannot change to ${target}`);
  }
  return move(id, target, actor);
}

/** Pretend the patient pressed "I'm OK" (emergency.cancelled). */
export async function patientCancel(id) {
  seed();
  await delay();
  const rec = records.get(id);
  if (!rec) throw new Error(`Emergency ${id} not found`);
  if (!canCancel(rec.state)) throw new Error(`Too late to cancel: state is ${rec.state}`);
  return move(id, 'CANCELLED', 'Patient (simulated)');
}

// Sample content only. Real symptom wording must be reviewed by a doctor.
const SAMPLES = {
  HEART: { severity: 'EMERGENCY', symptoms: ['Chest pain', 'Sweating', 'Shortness of breath'], vitals: { heart_rate: 122, spo2: 93, bp: '155/98' } },
  STROKE: { severity: 'EMERGENCY', symptoms: ['Face drooping', 'Arm weakness', 'Slurred speech'], vitals: { heart_rate: 90, spo2: 97, bp: '175/102' } },
  DIABETIC: { severity: 'URGENT', symptoms: ['Confusion', 'Shaking', 'Sweating'], vitals: { heart_rate: 104, spo2: 97, bp: '118/76' } },
  ASTHMA: { severity: 'URGENT', symptoms: ['Severe breathlessness', 'Wheezing'], vitals: { heart_rate: 112, spo2: 89, bp: '132/84' } },
};

/** Pretend a patient app sent a new SOS (emergency.created). Random type unless one is given. */
export function createEmergency(type) {
  seed();
  const types = Object.keys(SAMPLES);
  const chosen = SAMPLES[type] ? type : types[Math.floor(Math.random() * types.length)];
  const emergency_id = `E-${++counter}`;
  const created_at = new Date().toISOString();
  const data = {
    patient_id: `P-${Math.floor(100 + Math.random() * 900)}`,
    type: chosen,
    ...SAMPLES[chosen],
    location: {
      lat: +(23.0225 + (Math.random() - 0.5) * 0.06).toFixed(4),
      lng: +(72.5714 + (Math.random() - 0.5) * 0.06).toFixed(4),
      accuracy_m: 20,
    },
  };
  data.alerted_hospital_id = rankFor(data)[0]?.hospital.id || null;
  records.set(emergency_id, {
    emergency_id,
    state: 'SOS_SENT',
    created_at,
    ...data,
    alerted_ids: [],
    escalation_level: 0,
    checklist: {},
    status_events: [{ state: 'SOS_SENT', timestamp: created_at, actor: 'Patient app' }],
  });
  emitMock('emergency.created', { emergency_id, state: 'SOS_SENT', timestamp: created_at, payload: data });
  scheduleEscalation(emergency_id);
  return emergency_id;
}
