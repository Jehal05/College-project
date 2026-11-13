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
