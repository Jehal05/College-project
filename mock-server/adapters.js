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
  SEVERE_BLEEDING: 'severe_bleeding',
  HEAD_INJURY: 'head_injury',
  BROKEN_BONE: 'broken_bone',
  CANNOT_MOVE_LIMBS: 'cannot_move_limbs',
  UNCONSCIOUS_INJURY: 'unconscious_injury',
  SEIZURE_ONGOING: 'seizure_ongoing',
  SEIZURE_LONG: 'seizure_long',
  SEIZURE_REPEAT: 'seizure_repeat',
  SEIZURE_NOT_WAKING: 'seizure_not_waking',
  SEIZURE_INJURY: 'seizure_injury',
  ALLERGY_SWELLING: 'allergy_swelling',
  ALLERGY_BREATH: 'allergy_breath',
  ALLERGY_HIVES: 'allergy_hives',
  ALLERGY_DIZZY: 'allergy_dizzy',
  ALLERGY_TRIGGER: 'allergy_trigger',
  POISON_SWALLOWED: 'poison_swallowed',
  POISON_DROWSY: 'poison_drowsy',
  POISON_VOMIT: 'poison_vomit',
  POISON_BREATH: 'poison_breath',
  POISON_FUMES: 'poison_fumes',
  BURN_LARGE: 'burn_large',
  BURN_FACE: 'burn_face',
  BURN_DEEP: 'burn_deep',
  BURN_BREATH: 'burn_breath',
  BURN_ELECTRIC_CHEM: 'burn_electric_chem',
  PREG_LABOUR: 'preg_labour',
  PREG_BLEEDING: 'preg_bleeding',
  PREG_WATER: 'preg_water',
  PREG_FIT_HEADACHE: 'preg_fit_headache',
  PREG_NO_MOVEMENT: 'preg_no_movement',
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
  SEVERE_BLEEDING: "Heavy bleeding that will not stop",
  HEAD_INJURY: "Injury to the head",
  BROKEN_BONE: "Possible broken bone",
  CANNOT_MOVE_LIMBS: "Cannot move or feel arms or legs",
  UNCONSCIOUS_INJURY: "Was unconscious after the accident",
  SEIZURE_ONGOING: "Fit (seizure) happening now",
  SEIZURE_LONG: "Fit lasting more than 5 minutes",
  SEIZURE_REPEAT: "More than one fit in a row",
  SEIZURE_NOT_WAKING: "Not waking up after the fit",
  SEIZURE_INJURY: "Hurt during the fit",
  ALLERGY_SWELLING: "Swelling of face, lips or tongue",
  ALLERGY_BREATH: "Hard or noisy breathing",
  ALLERGY_HIVES: "Hives or a rash all over",
  ALLERGY_DIZZY: "Dizzy or about to faint",
  ALLERGY_TRIGGER: "Just had a food, sting or medicine they react to",
  POISON_SWALLOWED: "Swallowed medicine, chemical or something harmful",
  POISON_DROWSY: "Very sleepy or hard to wake",
  POISON_VOMIT: "Vomiting again and again",
  POISON_BREATH: "Breathing slowly or with difficulty",
  POISON_FUMES: "Breathed in smoke or fumes",
  BURN_LARGE: "Burn bigger than the person's palm",
  BURN_FACE: "Burn on face, hands, groin or joints",
  BURN_DEEP: "Burnt skin looks white, black or leathery",
  BURN_BREATH: "Breathed smoke or has trouble breathing",
  BURN_ELECTRIC_CHEM: "Electric or chemical burn",
  PREG_LABOUR: "Labour pains or contractions",
  PREG_BLEEDING: "Bleeding from the vagina",
  PREG_WATER: "Water has broken",
  PREG_FIT_HEADACHE: "Severe headache, blurred vision or fits",
  PREG_NO_MOVEMENT: "Baby is not moving as usual",
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
