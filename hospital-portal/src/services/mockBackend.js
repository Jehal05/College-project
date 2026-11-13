// A tiny pretend backend that lives in the browser (mock mode only).
// It remembers each emergency's state, refuses invalid steps exactly like the real
// backend should, and sends the matching WebSocket event through emitMock().
import mockAlerts from '../data/mock-alerts.json';
import { emitMock } from './socket.js';
import { canTransition, canCancel } from './stateMachine.js';
import { EVENT_FOR_STATE } from './contract.js';

const records = new Map(); // emergency_id -> emergency with status_events
let seeded = false;
let counter = 2000;
const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

function seed() {
  if (seeded) return;
  seeded = true;
  // Make the sample alerts look recent: 45, 25 and 10 seconds old.
  const ages = [45, 25, 10];
  mockAlerts.forEach((a, i) => {
    const created_at = new Date(Date.now() - (ages[i] ?? 5) * 1000).toISOString();
    records.set(a.emergency_id, {
      ...a,
      created_at,
      status_events: [{ state: 'SOS_SENT', timestamp: created_at, actor: 'Patient app' }],
    });
  });
}

const copy = (r) => ({ ...r, status_events: [...r.status_events] });

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
  records.set(emergency_id, {
    emergency_id,
    state: 'SOS_SENT',
    created_at,
    ...data,
    status_events: [{ state: 'SOS_SENT', timestamp: created_at, actor: 'Patient app' }],
  });
  emitMock('emergency.created', { emergency_id, state: 'SOS_SENT', timestamp: created_at, payload: data });
  return emergency_id;
}
