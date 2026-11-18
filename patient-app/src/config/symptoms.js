// The emergency categories and their symptom IDs.
// IDs are stable UPPER_SNAKE_CASE values sent to the API (never display text).
// Labels come from en.json: "category.<TYPE>" and "symptom.<ID>".
export const CATEGORIES = [
  { type: 'HEART', symptoms: ['CHEST_PAIN', 'SHORT_BREATH', 'SWEATING', 'NAUSEA', 'ARM_JAW_PAIN', 'FAINTING'] },
  { type: 'STROKE', symptoms: ['FACE_DROOP', 'LIMB_WEAKNESS', 'SLURRED_SPEECH', 'SUDDEN_CONFUSION', 'SEVERE_HEADACHE'] },
  { type: 'DIABETIC', symptoms: ['DIA_CONFUSION', 'DIA_SHAKING', 'DIA_SWEATING', 'DIA_FAINTING', 'LOW_GLUCOSE_READING'] },
  { type: 'ASTHMA', symptoms: ['WHEEZING', 'CANNOT_SPEAK_SENTENCES', 'SEVERE_SHORT_BREATH', 'BLUE_LIPS'] },
  { type: 'ACCIDENT', symptoms: ['SEVERE_BLEEDING',  'HEAD_INJURY',  'BROKEN_BONE',  'CANNOT_MOVE_LIMBS',  'UNCONSCIOUS_INJURY'] },
  { type: 'SEIZURE', symptoms: ['SEIZURE_ONGOING',  'SEIZURE_LONG',  'SEIZURE_REPEAT',  'SEIZURE_NOT_WAKING',  'SEIZURE_INJURY'] },
  { type: 'ALLERGIC', symptoms: ['ALLERGY_SWELLING',  'ALLERGY_BREATH',  'ALLERGY_HIVES',  'ALLERGY_DIZZY',  'ALLERGY_TRIGGER'] },
  { type: 'POISONING', symptoms: ['POISON_SWALLOWED',  'POISON_DROWSY',  'POISON_VOMIT',  'POISON_BREATH',  'POISON_FUMES'] },
  { type: 'BURN', symptoms: ['BURN_LARGE',  'BURN_FACE',  'BURN_DEEP',  'BURN_BREATH',  'BURN_ELECTRIC_CHEM'] },
  { type: 'PREGNANCY', symptoms: ['PREG_LABOUR',  'PREG_BLEEDING',  'PREG_WATER',  'PREG_FIT_HEADACHE',  'PREG_NO_MOVEMENT'] },
];
