// Phase 7 mock logic: the created payload (consent gating), the allowed state changes and the hospital ranking.
import { describe, expect, it } from 'vitest';
import alertPayload from '../../../mock-server/alertPayload.js';
import hospitalMode from '../../../mock-server/hospitalMode.js';
import helpers from '../../../mock-server/helpers.js';
import store from '../../../mock-server/store.js';

const { buildCreatedPayload } = alertPayload;
const patient = { id: 'PT-2026-0417', name: 'Rahul Mehta', age: 54, sex: 'M', blood_group: 'B+', allergies: ['Penicillin'], conditions: ['Hypertension'], medications: ['Metformin'] };
const base = (consents, location) => ({
  emergency: { type: 'HEART', severity: 'EMERGENCY', symptoms: ['CHEST_PAIN'], source: 'MANUAL', patient_id: patient.id, consents, location,
    status_events: [{ state: 'EMERGENCY_DETECTED', timestamp: '2026-11-13T10:00:00.000Z' }], reasons: { matched_rules: [] } },
  patient, vitals: { heart_rate: 110, spo2: 94, bp_sys: 150, bp_dia: 95, glucose: 110, resp_rate: 20, timestamp: 't' }, hospital: { id: 'HSP-AMD-002', name: 'X', distance_km: 2.7 }, rank: 1,
});
const loc = { lat: 23.0225, lng: 72.5714, accuracy: 30 };

describe('emergency.created payload', () => {
  it('includes everything when the patient shares everything', () => {
    const p = buildCreatedPayload(base({ location: true, history: true, vitals: true, reports: true }, loc));
    expect(p.location).toEqual(loc); expect(p.vitals.heart_rate).toBe(110); expect(p.vitals.bp).toBe('150/95'); expect('timestamp' in p.vitals).toBe(false);
    expect(p.symptoms).toEqual(['Chest pain']); expect(p.symptom_ids).toEqual(['CHEST_PAIN']);
    expect(p.patient_summary).toEqual({ name: 'Rahul Mehta', age: 54, blood_group: 'B+' });
    expect(p.patient.allergies).toEqual(['Penicillin']); expect(p.hospital.rank).toBe(1); expect(p.simulated).toBe(true);
  });
  it('leaves out (never null) what the patient did not share', () => {
    const p = buildCreatedPayload(base({ location: false, history: false, vitals: false, reports: true }, loc));
    for (const k of ['location', 'vitals']) expect(k in p).toBe(false);
    for (const k of ['allergies', 'conditions', 'medications']) expect(k in p.patient).toBe(false);
    for (const k of ['name', 'age', 'sex', 'blood_group']) expect(k in p.patient).toBe(true); // always shown
    expect(p.patient.name).toBe('Rahul Mehta');
    expect(JSON.stringify(p)).not.toContain('null');
  });
  it('each consent off in turn removes only its own fields', () => {
    const all = { location: true, history: true, vitals: true, reports: true };
    const noLoc = buildCreatedPayload(base({ ...all, location: false }, loc)); expect('location' in noLoc).toBe(false); expect('vitals' in noLoc).toBe(true);
    const noVit = buildCreatedPayload(base({ ...all, vitals: false }, loc)); expect('vitals' in noVit).toBe(false); expect('location' in noVit).toBe(true);
    const noHist = buildCreatedPayload(base({ ...all, history: false }, loc)); expect('allergies' in noHist.patient).toBe(false); expect(noHist.patient_summary.blood_group).toBe('B+');
  });
  it('safety check-in alert (UNKNOWN, no symptoms) has a clear label', () => {
    const b = base({ location: true, history: true, vitals: true }, loc); b.emergency.type = 'UNKNOWN'; b.emergency.symptoms = []; b.emergency.source = 'FALL_CHECK';
    const p = buildCreatedPayload(b);
    expect(p.symptoms).toEqual(['No symptoms reported (safety check-in)']); expect(p.symptom_ids).toEqual([]); expect(p.type).toBe('UNKNOWN');
  });
  it('has no location when none is known', () => {
    expect('location' in buildCreatedPayload(base({ location: true }, null))).toBe(false);
  });
});

describe('allowed state changes', () => {
  const { checkTransition } = hospitalMode;
  it('allows the normal order', () => {
    expect(checkTransition('SOS_SENT', 'HOSPITAL_ACKNOWLEDGED')).toBeNull();
    expect(checkTransition('HOSPITAL_ACKNOWLEDGED', 'AMBULANCE_DISPATCHED')).toBeNull();
    expect(checkTransition('AMBULANCE_DISPATCHED', 'EN_ROUTE')).toBeNull();
    expect(checkTransition('ARRIVED', 'HANDOVER_DONE')).toBeNull();
  });
  it('refuses skipping, going back, cancelled and unknown states', () => {
    expect(checkTransition('SOS_SENT', 'ARRIVED')).toMatch(/Cannot move/);
    expect(checkTransition('HANDOVER_DONE', 'HOSPITAL_ACKNOWLEDGED')).toMatch(/Cannot move/);
    expect(checkTransition('CANCELLED', 'AMBULANCE_DISPATCHED')).toMatch(/Cannot move/);
    expect(checkTransition('SOS_SENT', 'NOPE')).toMatch(/Unknown/);
  });
});

describe('hospital data and ranking', () => {
  it('has five verified hospitals in the portal shape', () => {
    expect(store.hospitals).toHaveLength(5);
    for (const h of store.hospitals) {
      expect(h.id).toMatch(/^HSP-AMD-\d{3}$/);
      expect(Object.keys(h.capabilities)).toEqual(['cath_lab', 'stroke_unit', 'icu', 'emergency']);
      expect(Object.keys(h.availability)).toEqual(['beds_free', 'icu_free', 'cath_lab_ready', 'stroke_unit_ready']);
    }
    expect(store.ambulances.map((a) => a.id)).toEqual(['AMB-AMD-01', 'AMB-AMD-02', 'AMB-AMD-03', 'AMB-AMD-04', 'AMB-AMD-05']);
  });
  it('ranks a hospital with a ready unit first and numbers the list from 1', () => {
    const heart = helpers.rankHospitals('HEART', helpers.DEMO_LOCATION);
    expect(heart.map((h) => h.rank)).toEqual([1, 2, 3, 4, 5]);
    expect(heart[0].capabilities.cath_lab && heart[0].availability.cath_lab_ready).toBe(true);
    const stroke = helpers.rankHospitals('STROKE', helpers.DEMO_LOCATION)[0];
    expect(stroke.availability.stroke_unit_ready).toBe(true);
  });
  it('never ranks a not-ready unit above a ready one even if it is nearer', () => {
    const list = [
      { id: 'near', verified: true, lat: 23.0225, lng: 72.5714, capabilities: { cath_lab: true, emergency: true }, availability: { cath_lab_ready: false } },
      { id: 'far', verified: true, lat: 23.1, lng: 72.6, capabilities: { cath_lab: true, emergency: true }, availability: { cath_lab_ready: true } },
    ];
    expect(helpers.rankHospitals('HEART', helpers.DEMO_LOCATION, list)[0].id).toBe('far');
  });
  it('skips unverified hospitals', () => {
    const list = [{ id: 'u', verified: false, lat: 23.0225, lng: 72.5714, capabilities: { emergency: true }, availability: {} }];
    expect(helpers.rankHospitals('DIABETIC', helpers.DEMO_LOCATION, list)).toEqual([]);
  });
});
