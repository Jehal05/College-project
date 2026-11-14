import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NOT_SHARED, symptomLabel, symptomLabels, normaliseLogin, normaliseCapabilities, normaliseHospital, normaliseHospitals, defaultHospitalId,
  pickLocation, centroid, originFor, pickVitals, normaliseEmergency, isCheckIn, originText, normaliseEvent, withMotion, bearing, placeSampleFleet, orNotShared,
} from './adapters.js';

// ---- symptoms
test('symptom IDs become readable words', () => {
  assert.equal(symptomLabel('CHEST_PAIN'), 'Chest pain');
  assert.equal(symptomLabel('CANNOT_SPEAK_SENTENCES'), 'Cannot speak full sentences');
  assert.deepEqual(symptomLabels(['FACE_DROOP', 'SLURRED_SPEECH']), ['Face drooping', 'Slurred speech']);
});
test('unknown symptom IDs are tidied up, never dropped; readable text is kept; empty is ignored', () => {
  assert.equal(symptomLabel('NEW_SYMPTOM_FROM_JEHAL'), 'New symptom from jehal');
  assert.equal(symptomLabel('Pain spreading to left arm'), 'Pain spreading to left arm');
  assert.equal(symptomLabel('chest_pain'), 'Chest pain');
  assert.deepEqual(symptomLabels(['', null, 'WHEEZING']), ['Wheezing']);
  assert.deepEqual(symptomLabels(undefined), []);
});

// ---- login
test('login: HOSPITAL_STAFF becomes staff, a missing hospital_id becomes null (the desk picks one)', () => {
  const s = normaliseLogin({ token: 't', role: 'HOSPITAL_STAFF', user_id: 'usr_002' }, 'staff1');
  assert.equal(s.role, 'staff');
  assert.equal(s.hospital_id, null);
  assert.equal(s.hospital_from_login, false);
  assert.equal(s.name, 'staff1');
});
test('login: a hospital_id from the backend is kept exactly, whatever its style', () => {
  for (const id of ['H2', 'hosp_004', 'b1f7c2a0-aaaa-4bbb-8ccc-123456789abc', 7]) {
    const s = normaliseLogin({ token: 't', role: 'ADMIN', hospital_id: id });
    assert.equal(s.hospital_id, String(id));
    assert.equal(s.hospital_from_login, true);
    assert.equal(s.role, 'admin');
  }
});
test('login: patient accounts and unknown roles are refused with a clear message; a missing token is an error', () => {
  assert.throws(() => normaliseLogin({ token: 't', role: 'PATIENT' }), /patient account/);
  assert.throws(() => normaliseLogin({ token: 't', role: 'DOCTOR' }), /cannot use the hospital portal/);
  assert.throws(() => normaliseLogin({ role: 'ADMIN' }), /token/);
});

// ---- hospitals
test('capabilities as a list or as an object give the same result', () => {
  const fromList = normaliseCapabilities(['CARDIAC_CATH_LAB', 'ICU', 'EMERGENCY']);
  const fromObject = normaliseCapabilities({ cath_lab: true, icu: true, emergency: true });
  assert.deepEqual(fromList, fromObject);
  assert.deepEqual(fromList, { cath_lab: true, stroke_unit: false, icu: true, emergency: true });
  assert.equal(normaliseCapabilities(['CT_SCAN']).ct_scan, true);
  assert.deepEqual(normaliseCapabilities(null), { cath_lab: false, stroke_unit: false, icu: false, emergency: false });
});
test('hospital without an availability object: bed numbers stay null, nothing is invented', () => {
  const h = normaliseHospital({ id: 'hosp_002', name: 'Demo Stroke', lat: 21.19, lng: 72.83, capabilities: ['STROKE_UNIT', 'ICU', 'EMERGENCY'], available: true, verified: true });
  assert.equal(h.availability.beds_free, null);
  assert.equal(h.availability.icu_free, null);
  assert.equal(h.availability.stroke_unit_ready, true);
  assert.equal(h.availability.cath_lab_ready, false);
});
test('hospital that is not available: units are not ready', () => {
  const h = normaliseHospital({ id: 'hosp_004', lat: 1, lng: 2, capabilities: ['PULMONOLOGY', 'ICU', 'EMERGENCY'], available: false, verified: true });
  assert.equal(h.availability.ready, false);
});
test('hospital with an availability object keeps its numbers; id style is not assumed', () => {
  const h = normaliseHospital({ id: 42, name: 'X', lat: '23.0', lng: '72.5', verified: 1, capabilities: { emergency: true }, availability: { beds_free: 3, icu_free: 0, cath_lab_ready: false, stroke_unit_ready: false } });
  assert.equal(h.id, '42');
  assert.equal(h.lat, 23);
  assert.equal(h.verified, true);
  assert.equal(h.availability.beds_free, 3);
  assert.equal(normaliseHospitals('nope').length, 0);
});
test("Daksh's availability names (icu_beds, cath_lab_open, stroke_unit_open) are understood", () => {
  const h = normaliseHospital({ id: 'hosp_001', lat: 1, lng: 2, verified: true, capabilities: { emergency: true, cath_lab: true, stroke_unit: false, icu: true }, availability: { icu_beds: 3, cath_lab_open: true, stroke_unit_open: false } });
  assert.equal(h.availability.icu_free, 3);
  assert.equal(h.availability.cath_lab_ready, true);
  assert.equal(h.availability.stroke_unit_ready, false);
  assert.equal(h.availability.beds_free, null);
});
test('desk hospital: the one from login if it exists, else the first verified one; nothing hard-coded', () => {
  const list = [{ id: 'hosp_005', verified: false }, { id: 'hosp_001', verified: true }, { id: 'hosp_003', verified: true }];
  assert.equal(defaultHospitalId(list, null), 'hosp_001');
  assert.equal(defaultHospitalId(list, 'hosp_003'), 'hosp_003');
  assert.equal(defaultHospitalId(list, 'H2'), 'hosp_001'); // login named a hospital we do not have
  assert.equal(defaultHospitalId([], null), null);
});

// ---- location and vitals
test('patient location is found in any known shape; none gives null', () => {
  assert.deepEqual(pickLocation({ location: { lat: 21.17, lng: 72.83, accuracy: 50 } }), { lat: 21.17, lng: 72.83, accuracy: 50 });
  assert.deepEqual(pickLocation({ patient_location: { lat: '21.1', lng: '72.8' } }), { lat: 21.1, lng: 72.8 });
  assert.deepEqual(pickLocation({ lat: 1, lng: 2 }), { lat: 1, lng: 2 });
  assert.equal(pickLocation({}), null);
  assert.equal(pickLocation({ location: { lat: null, lng: null } }), null);
});
test('distance is measured from the patient if shared, otherwise from the middle of the hospitals (no fixed city)', () => {
  const hospitals = [{ lat: 21, lng: 72 }, { lat: 22, lng: 73 }];
  assert.deepEqual(originFor({ location: { lat: 21.5, lng: 72.1 } }, hospitals), { lat: 21.5, lng: 72.1, approximate: false });
  assert.deepEqual(originFor({}, hospitals), { lat: 21.5, lng: 72.5, approximate: true });
  assert.equal(originFor({}, []), null);
  assert.equal(centroid([]), null);
});
test('vitals come from payload.vitals, vitals_at_alert or the rule inputs; bp is built; none gives null', () => {
  assert.equal(pickVitals({ vitals: { heart_rate: 80, bp: '120/80' } }).bp, '120/80');
  assert.equal(pickVitals({ reasons: { inputs: { vitals: { heart_rate: 71, bp_sys: 119, bp_dia: 78 } } } }).bp, '119/78');
  assert.equal(pickVitals({ vitals_at_alert: { spo2: 97 } }).spo2, 97);
  assert.equal(pickVitals({}), null);
});

// ---- emergencies
test('missing patient, location and vitals become null, and the screens print Not shared', () => {
  const e = normaliseEmergency({ emergency_id: 'x', type: 'HEART', symptoms: ['CHEST_PAIN'], severity: 'EMERGENCY' });
  assert.equal(e.patient_id, null);
  assert.equal(e.location, null);
  assert.equal(e.vitals, null);
  assert.deepEqual(e.symptoms, ['Chest pain']);
  assert.deepEqual(e.symptom_ids, ['CHEST_PAIN']);
  assert.equal(orNotShared(e.patient_id), NOT_SHARED);
  assert.equal(orNotShared(0), 0);
});
test('type defaults to UNKNOWN when there is no type and no symptoms; a missing severity is treated as URGENT', () => {
  const e = normaliseEmergency({ emergency_id: 'x' });
  assert.equal(e.type, 'UNKNOWN');
  assert.equal(e.severity, 'URGENT');
  assert.equal(e.source, 'MANUAL');
});
test('detail response: id, hospital object, ambulance object and timeline are mapped', () => {
  const e = normaliseEmergency({ id: 'em_9', hospital: { id: 'hosp_003', name: 'G' }, ambulance: { id: 'amb_001' }, timeline: [{ state: 'SOS_SENT', timestamp: 't' }], type: 'HEART', symptoms: [] });
  assert.equal(e.emergency_id, 'em_9');
  assert.equal(e.alerted_hospital_id, 'hosp_003');
  assert.equal(e.ambulance_id, 'amb_001');
  assert.equal(e.status_events.length, 1);
  assert.equal('id' in e, false);
});
test('safety check-in is recognised by source or by UNKNOWN with no symptoms, and says Simulated', () => {
  assert.equal(isCheckIn({ source: 'FALL_CHECK', type: 'UNKNOWN', symptoms: [] }), true);
  assert.equal(isCheckIn({ source: 'INACTIVITY_CHECK' }), true);
  assert.equal(isCheckIn({ source: 'MANUAL', type: 'HEART', symptoms: ['Chest pain'] }), false);
  assert.equal(isCheckIn({ type: 'UNKNOWN', symptoms: [] }), true);
  assert.match(originText({ source: 'FALL_CHECK', type: 'UNKNOWN', symptoms: [] }), /No symptoms reported.*fall check.*Simulated/);
  assert.equal(originText({ source: 'MANUAL', type: 'HEART', symptoms: ['x'] }), null);
});

// ---- events
test('event name may be in `event` or in `type`; a message with neither is ignored', () => {
  assert.equal(normaliseEvent({ event: 'emergency.cancelled', emergency_id: 'a' }).event, 'emergency.cancelled');
  assert.equal(normaliseEvent({ type: 'emergency.cancelled', emergency_id: 'a' }).event, 'emergency.cancelled');
  assert.equal(normaliseEvent({ type: 'HEART', emergency_id: 'a' }), null); // an emergency type is not an event name
  assert.equal(normaliseEvent(null), null);
  assert.equal(normaliseEvent('x'), null);
});
test('hospital.alerted: hospital_id or hospital { id, name, distance_km } both give hospital_id; IDs stay as sent', () => {
  const a = normaliseEvent({ event: 'hospital.alerted', emergency_id: 'e', payload: { hospital_id: 'H3' } });
  assert.equal(a.payload.hospital_id, 'H3');
  const b = normaliseEvent({ event: 'hospital.alerted', emergency_id: 'e', payload: { hospital: { id: 'hosp_001', name: 'Demo Heart', distance_km: 2.5 } } });
  assert.equal(b.payload.hospital_id, 'hosp_001');
  assert.equal(b.payload.hospital_name, 'Demo Heart');
  assert.equal(b.payload.distance_km, 2.5);
  assert.equal('hospital' in b.payload, false);
  const c = normaliseEvent({ event: 'hospital.alerted', emergency_id: 'e', payload: { hospital: { id: 17 } } });
  assert.equal(c.payload.hospital_id, '17');
});
test('hospital.acknowledged: acknowledged_by becomes the actor shown on the timeline', () => {
  const m = normaliseEvent({ event: 'hospital.acknowledged', emergency_id: 'e', state: 'HOSPITAL_ACKNOWLEDGED', payload: { hospital_id: 'hosp_001', acknowledged_by: 'Demo ER desk' } });
  assert.equal(m.payload.actor, 'Demo ER desk');
  assert.equal(m.state, 'HOSPITAL_ACKNOWLEDGED');
});
test('emergency.created payload goes through the emergency adapter', () => {
  const m = normaliseEvent({ event: 'emergency.created', emergency_id: 'e1', state: 'EMERGENCY_DETECTED', payload: { type: 'UNKNOWN', symptoms: [], source: 'FALL_CHECK', severity: 'EMERGENCY' } });
  assert.equal(m.payload.type, 'UNKNOWN');
  assert.equal(m.payload.location, null);
  assert.equal(m.payload.vitals, null);
  assert.equal('emergency_id' in m.payload, false);
});

// ---- ambulance movement
test('heading is worked out from two positions; north is 0 and east is 90', () => {
  assert.equal(bearing({ lat: 21, lng: 72 }, { lat: 22, lng: 72 }), 0);
  assert.equal(bearing({ lat: 0, lng: 72 }, { lat: 0, lng: 73 }), 90);
});
test('ambulance.location with only lat, lng and ETA gets heading and progress computed locally', () => {
  const first = withMotion(undefined, { ambulance_id: 'amb_001', lat: 21, lng: 72, eta_seconds: 100 });
  assert.equal(first.heading, 0);
  assert.equal(first.progress, 0);
  const second = withMotion(first, { ambulance_id: 'amb_001', lat: 21, lng: 72.01, eta_seconds: 50 });
  assert.equal(second.heading, 90);
  assert.equal(second.progress, 0.5);
  const same = withMotion(second, { lat: 21, lng: 72.01, eta_seconds: 25 });
  assert.equal(same.heading, 90); // did not move: keep the last heading
  assert.equal(same.progress, 0.75);
});
test('heading, progress and ETA sent by the backend always win', () => {
  const m = withMotion({ lat: 1, lng: 1, first_eta_seconds: 100 }, { lat: 2, lng: 2, heading: 123, progress: 0.9, eta_seconds: 90 });
  assert.equal(m.heading, 123);
  assert.equal(m.progress, 0.9);
});
test('sample fleet is placed at the hospitals (verified first) only for sample units', () => {
  const placed = placeSampleFleet(
    [{ id: 'a', sample: true, lat: 23, lng: 72 }, { id: 'b', sample: true, lat: 23, lng: 72 }, { id: 'c', lat: 5, lng: 5 }],
    [{ id: 'h1', verified: false, lat: 1, lng: 1 }, { id: 'h2', verified: true, lat: 2, lng: 2 }],
  );
  assert.equal(placed[0].base_hospital_id, 'h2');
  assert.equal(placed[1].base_hospital_id, 'h1');
  assert.deepEqual([placed[2].lat, placed[2].lng], [5, 5]);
});

test('a missing severity is marked so the screens can warn; a sent severity is not marked', () => {
  const missing = normaliseEmergency({ emergency_id: 'x' });
  assert.equal(missing.severity, 'URGENT');
  assert.equal(missing.severity_missing, true);
  const sent = normaliseEmergency({ emergency_id: 'x', severity: 'WATCH' });
  assert.equal(sent.severity, 'WATCH');
  assert.equal('severity_missing' in sent, false);
});
test('the mark travels with an emergency.created event', () => {
  const ev = normaliseEvent({ event: 'emergency.created', emergency_id: 'E9', payload: { type: 'HEART' } });
  assert.equal(ev.payload.severity_missing, true);
});
