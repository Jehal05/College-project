// The ONE place on the server that translates between the patient app's names and Daksh's rules-engine names.
// App symptom IDs are UPPER_SNAKE_CASE; the rules engine uses lowercase names. A symptom with no
// counterpart in the rules table maps to null and is simply ignored by the engine.
// These choices are a first guess and must be checked by Daksh and a doctor (see docs/CLINICAL_REVIEW.md).
const SYMPTOM_TO_ENGINE = {
  CHEST_PAIN: 'chest_pain', SHORT_BREATH: 'breathlessness', SWEATING: 'sweating', NAUSEA: null,
  ARM_JAW_PAIN: 'left_arm_pain', FAINTING: null,
  FACE_DROOP: 'face_drooping', LIMB_WEAKNESS: 'arm_weakness', SLURRED_SPEECH: 'slurred_speech',
  SUDDEN_CONFUSION: 'confusion', SEVERE_HEADACHE: null,
  DIA_CONFUSION: 'confusion', DIA_SHAKING: null, DIA_SWEATING: 'sweating', DIA_FAINTING: null,
  LOW_GLUCOSE_READING: 'low_glucose',
  WHEEZING: 'wheeze', CANNOT_SPEAK_SENTENCES: null, SEVERE_SHORT_BREATH: 'breathlessness', BLUE_LIPS: null,
};

// Readable English labels for the hospital desk (one lookup table; the app IDs travel next to them as symptom_ids).
const SYMPTOM_LABELS = {
  CHEST_PAIN: 'Chest pain', SHORT_BREATH: 'Shortness of breath', SWEATING: 'Sweating', NAUSEA: 'Nausea',
  ARM_JAW_PAIN: 'Pain spreading to arm or jaw', FAINTING: 'Fainting',
  FACE_DROOP: 'Face drooping', LIMB_WEAKNESS: 'Arm or leg weakness', SLURRED_SPEECH: 'Slurred speech',
  SUDDEN_CONFUSION: 'Sudden confusion', SEVERE_HEADACHE: 'Severe headache',
  DIA_CONFUSION: 'Confusion', DIA_SHAKING: 'Shaking', DIA_SWEATING: 'Sweating', DIA_FAINTING: 'Fainting',
  LOW_GLUCOSE_READING: 'Low glucose reading',
  WHEEZING: 'Wheezing', CANNOT_SPEAK_SENTENCES: 'Cannot finish sentences', SEVERE_SHORT_BREATH: 'Severe breathlessness', BLUE_LIPS: 'Blue lips',
};
const NO_SYMPTOMS_LABEL = 'No symptoms reported (safety check-in)';
const symptomLabels = (ids) => (ids && ids.length ? ids.map((id) => SYMPTOM_LABELS[id] || id) : [NO_SYMPTOMS_LABEL]);

const toEngineSymptoms = (ids) => [...new Set((ids || []).map((id) => SYMPTOM_TO_ENGINE[id]).filter(Boolean))];

// The app's vitals event has "bp": "120/80". The engine wants bp_sys and bp_dia.
function splitBp(bp) {
  const [sys, dia] = String(bp || '').split('/').map(Number);
  return Number.isFinite(sys) && Number.isFinite(dia) ? { bp_sys: sys, bp_dia: dia } : {};
}

module.exports = { SYMPTOM_LABELS, symptomLabels, NO_SYMPTOMS_LABEL, SYMPTOM_TO_ENGINE, toEngineSymptoms, splitBp };
