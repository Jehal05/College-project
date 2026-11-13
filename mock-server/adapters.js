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

const toEngineSymptoms = (ids) => [...new Set((ids || []).map((id) => SYMPTOM_TO_ENGINE[id]).filter(Boolean))];

// The app's vitals event has "bp": "120/80". The engine wants bp_sys and bp_dia.
function splitBp(bp) {
  const [sys, dia] = String(bp || '').split('/').map(Number);
  return Number.isFinite(sys) && Number.isFinite(dia) ? { bp_sys: sys, bp_dia: dia } : {};
}

module.exports = { SYMPTOM_TO_ENGINE, toEngineSymptoms, splitBp };
