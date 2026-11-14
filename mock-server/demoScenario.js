// POST /demo/scenario: start a ready-made emergency (used by the demo panel).
const express = require('express');
const store = require('./store');
const simulator = require('./simulator');
const { requireAuth, DEMO_LOCATION } = require('./helpers');
const router = express.Router();

// ---- Demo helpers for the demo control panel ----
const DEFAULT_SYMPTOMS = {
  HEART: ['CHEST_PAIN', 'SHORT_BREATH', 'SWEATING'],
  STROKE: ['FACE_DROOP', 'LIMB_WEAKNESS', 'SLURRED_SPEECH'],
  DIABETIC: ['DIA_CONFUSION', 'DIA_SHAKING', 'LOW_GLUCOSE_READING'],
  ASTHMA: ['WHEEZING', 'CANNOT_SPEAK_SENTENCES', 'SEVERE_SHORT_BREATH'],
};

router.post('/demo/scenario', requireAuth, (req, res) => {
  const type = req.body && req.body.type;
  if (!DEFAULT_SYMPTOMS[type]) return res.status(400).json({ error: 'type must be HEART, STROKE, DIABETIC or ASTHMA' });
  const patient = store.patients['PT-2026-0417'];
  const e = simulator.createEmergency({ patient_id: patient.id, type, symptoms: DEFAULT_SYMPTOMS[type], consents: patient.consents });
  simulator.sendSos(e, { ...DEMO_LOCATION, source: 'demo' });
  res.status(201).json({ id: e.id, state: e.state });
});

module.exports = router;
