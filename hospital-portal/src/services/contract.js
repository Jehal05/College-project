// Shared team contract (agreed on day 1 by Jehal, Puneet and Daksh).
// Do NOT rename anything here without agreement from all three.

export const EMERGENCY_STATES = [
  'MONITORING',
  'SYMPTOMS_REPORTED',
  'EMERGENCY_DETECTED',
  'SOS_SENT',
  'HOSPITAL_ACKNOWLEDGED',
  'AMBULANCE_DISPATCHED',
  'EN_ROUTE',
  'ARRIVED',
  'HANDOVER_DONE',
];
export const EXTRA_STATES = ['CANCELLED', 'ESCALATED'];

export const EMERGENCY_TYPES = ['HEART', 'STROKE', 'DIABETIC', 'ASTHMA'];
// UNKNOWN = the safety check-in started the alert with no symptoms (source FALL_CHECK or INACTIVITY_CHECK).
// Jehal's app sends it; it is not in the day-1 contract yet (see docs/PROPOSED_ENDPOINTS_FOR_DAKSH.md).
export const EXTRA_TYPES = ['UNKNOWN'];

// Ordered from most to least serious.
export const SEVERITY = ['EMERGENCY', 'URGENT', 'WATCH', 'NONE'];

export const WS_EVENTS = [
  'emergency.created',
  'emergency.cancelled',
  'hospital.alerted',
  'hospital.acknowledged',
  'hospital.escalated',
  'ambulance.dispatched',
  'ambulance.location',
  'emergency.arrived',
  'emergency.handover_done',
  'vitals.update',
  'responder.alert',
];

// Which hospital capability each emergency type needs.
// Used to highlight hospitals on the map now, and for ranking (#15) later.
// Capability is always checked BEFORE distance.
export const REQUIRED_CAPABILITIES = {
  HEART: ['cath_lab', 'emergency'],
  STROKE: ['stroke_unit', 'emergency'],
  DIABETIC: ['emergency'],
  ASTHMA: ['icu', 'emergency'],
  UNKNOWN: ['emergency'], // nothing is known yet, so only an emergency department is required
};

export const CAPABILITY_LABELS = {
  cath_lab: 'Cath Lab',
  stroke_unit: 'Stroke Unit',
  icu: 'ICU',
  emergency: 'Emergency',
};

export const TYPE_LABELS = {
  HEART: 'Heart attack',
  STROKE: 'Stroke',
  DIABETIC: 'Diabetic emergency',
  ASTHMA: 'Severe asthma',
  UNKNOWN: 'Safety check-in (no symptoms)',
};

export const SEVERITY_STYLES = {
  EMERGENCY: 'bg-red-600 text-white',
  URGENT: 'bg-orange-500 text-white',
  WATCH: 'bg-yellow-400 text-slate-900',
  NONE: 'bg-slate-300 text-slate-900',
};

export function hasCapabilities(hospital, type) {
  const needed = REQUIRED_CAPABILITIES[type] || [];
  return needed.every((cap) => hospital.capabilities?.[cap]);
}

// ---------- Added in Phase 4 ----------

// PROPOSED events, not in the day-1 contract. Agree them with Daksh.
//   emergency.note  payload { note_id, kind, note, actor, fields }  a timeline note with no state change
//                   (kind: pickup | corridor | assignment)
//   chat.message    payload { message_id, sender_role: 'desk' | 'crew', sender_name, text }
export const PROPOSED_EVENTS = ['emergency.note', 'chat.message', 'hospital.availability_updated'];

// Specialty that fits each emergency type (used to suggest who to assign).
export const SPECIALTY_FOR_TYPE = {
  HEART: 'Cardiology',
  STROKE: 'Neurology',
  DIABETIC: 'Emergency Medicine',
  ASTHMA: 'Pulmonology',
  UNKNOWN: 'Emergency Medicine',
};

// ---------- Added in Phase 2 ----------

// Which WebSocket event announces each state change.
// EN_ROUTE has no event of its own in the contract, so it rides on ambulance.location.
export const EVENT_FOR_STATE = {
  HOSPITAL_ACKNOWLEDGED: 'hospital.acknowledged',
  AMBULANCE_DISPATCHED: 'ambulance.dispatched',
  EN_ROUTE: 'ambulance.location',
  ARRIVED: 'emergency.arrived',
  HANDOVER_DONE: 'emergency.handover_done',
  CANCELLED: 'emergency.cancelled',
  ESCALATED: 'hospital.escalated',
};

// What hospital staff read on screen. Honest wording: nothing says an ambulance
// is dispatched until the operator has clicked Dispatch.
export const STATE_LABELS = {
  EMERGENCY_DETECTED: 'Early notice · patient has not confirmed the SOS yet',
  SOS_SENT: 'New alert · notification received, not acknowledged yet',
  ESCALATED: 'Escalated to the next hospital · not acknowledged yet',
  HOSPITAL_ACKNOWLEDGED: 'Acknowledged · no ambulance dispatched yet',
  AMBULANCE_DISPATCHED: 'Ambulance dispatched (simulated)',
  EN_ROUTE: 'Ambulance en route (simulated)',
  ARRIVED: 'Arrived at hospital',
  HANDOVER_DONE: 'Handed over',
  CANCELLED: 'Cancelled by patient',
};
