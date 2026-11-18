// POST /demo/scenario: start a ready-made emergency (used by the demo panel).
const express = require('express');
const store = require('./store');
const simulator = require('./simulator');
const { requireAuth, cityStart, cityById, DEFAULT_CITY } = require('./helpers');
const router = express.Router();

// ---- Demo helpers for the demo control panel ----
const DEFAULT_SYMPTOMS = {
  HEART: ['CHEST_PAIN', 'SHORT_BREATH', 'SWEATING'],
  STROKE: ['FACE_DROOP', 'LIMB_WEAKNESS', 'SLURRED_SPEECH'],
  DIABETIC: ['DIA_CONFUSION', 'DIA_SHAKING', 'LOW_GLUCOSE_READING'],
  ASTHMA: ['WHEEZING', 'CANNOT_SPEAK_SENTENCES', 'SEVERE_SHORT_BREATH'],
  ACCIDENT: ['SEVERE_BLEEDING',  'HEAD_INJURY'],
  SEIZURE: ['SEIZURE_ONGOING',  'SEIZURE_LONG'],
  ALLERGIC: ['ALLERGY_SWELLING',  'ALLERGY_BREATH',  'ALLERGY_TRIGGER'],
  POISONING: ['POISON_SWALLOWED',  'POISON_DROWSY'],
  BURN: ['BURN_LARGE',  'BURN_FACE'],
  PREGNANCY: ['PREG_LABOUR',  'PREG_WATER'],
};

router.post('/demo/scenario', requireAuth, (req, res) => {
  const type = req.body && req.body.type;
  if (!DEFAULT_SYMPTOMS[type]) return res.status(400).json({ error: 'type must be one of ' + Object.keys(DEFAULT_SYMPTOMS).join(', ') + '' });
  const patient = store.patients[(req.body && req.body.patient_id) || 'PT-2026-0417'];
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  const asked = req.body && req.body.city_id;
  if (asked !== undefined && !cityById(asked)) return res.status(400).json({ error: 'city_id must be one of ' + store.cities.map((c) => c.city_id).join(', ') });
  // The practice emergency starts at the chosen city's simulation start (config file), else the patient's home city.
  const city = asked || (cityById(patient.home_city_id) ? patient.home_city_id : DEFAULT_CITY);
  const e = simulator.createEmergency({ patient_id: patient.id, type, symptoms: DEFAULT_SYMPTOMS[type], consents: patient.consents });
  simulator.sendSos(e, { ...cityStart(city), source: 'demo' });
  res.status(201).json({ id: e.id, state: e.state });
});

module.exports = router;
