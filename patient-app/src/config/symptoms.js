// The four emergency categories and their symptom IDs.
// IDs are stable UPPER_SNAKE_CASE values sent to the API (never display text).
// Labels come from en.json: "category.<TYPE>" and "symptom.<ID>".
export const CATEGORIES = [
  { type: 'HEART', symptoms: ['CHEST_PAIN', 'SHORT_BREATH', 'SWEATING', 'NAUSEA', 'ARM_JAW_PAIN', 'FAINTING'] },
  { type: 'STROKE', symptoms: ['FACE_DROOP', 'LIMB_WEAKNESS', 'SLURRED_SPEECH', 'SUDDEN_CONFUSION', 'SEVERE_HEADACHE'] },
  { type: 'DIABETIC', symptoms: ['DIA_CONFUSION', 'DIA_SHAKING', 'DIA_SWEATING', 'DIA_FAINTING', 'LOW_GLUCOSE_READING'] },
  { type: 'ASTHMA', symptoms: ['WHEEZING', 'CANNOT_SPEAK_SENTENCES', 'SEVERE_SHORT_BREATH', 'BLUE_LIPS'] },
];
