// Phase 7: the hospital hears nothing until the SOS, then gets one rich emergency.created event.
import { API, api, check, finish, freshState, sleep } from './helpers.mjs';

const tok = await freshState();
const events = []; const ws = new WebSocket(API.replace(/^http/, 'ws') + '/ws?token=' + tok); ws.onmessage = (m) => { try { events.push(JSON.parse(m.data)); } catch { /* ignore */ } };
await new Promise((r) => { ws.onopen = r; });

const e = await api('POST', '/emergencies', tok, { patient_id: 'PT-2026-0417', type: 'HEART', symptoms: ['CHEST_PAIN', 'SWEATING'], consents: { location: true, history: false, vitals: true, reports: true } });
const id = e.id;
check('C1 emergency id looks like EM-YYYYMMDD-nnnn', /^EM-\d{8}-\d{4}$/.test(id), id);
await sleep(700);
check('C2 no emergency.created before the SOS', !events.some((x) => x.emergency_id === id && x.type === 'emergency.created'));
const list0 = await api('GET', '/emergencies?status=active', tok);
check('C3 active list does not show an emergency that has not sent its SOS', !list0.some((x) => x.id === id || x.emergency_id === id));

await api('POST', '/emergencies/' + id + '/sos', tok, { location: { lat: 23.0225, lng: 72.5714, accuracy: 25 } });
await sleep(1800);
const mine = events.filter((x) => x.emergency_id === id);
const created = mine.find((x) => x.type === 'emergency.created');
check('C4 emergency.created arrives after the SOS', Boolean(created));
check('C5 created comes before sos_sent and carries state SOS_SENT', mine.findIndex((x) => x.type === 'emergency.created') < mine.findIndex((x) => x.type === 'emergency.sos_sent') && created.state === 'SOS_SENT');
const p = created.payload;
check('C6 payload has patient, location, vitals and the alerted hospital', p.patient.name === 'Rahul Mehta' && p.location.lat === 23.0225 && p.vitals.heart_rate > 0 && p.hospital.id.startsWith('HSP-AMD-') && p.hospital.rank === 1, p);
check('C7 history consent off: no allergies, conditions, medications or blood group', !['allergies', 'conditions', 'medications', 'blood_group'].some((k) => k in p.patient));
const alerted = mine.find((x) => x.type === 'hospital.alerted');
check('C8 hospital.alerted has hospital_id and rank', alerted && alerted.payload.hospital_id === p.hospital.id && alerted.payload.rank === 1, alerted);
const list1 = await api('GET', '/emergencies?status=active', tok);
check('C9 active list shows it after the SOS', list1.some((x) => x.emergency_id === id));
await api('POST', '/emergencies/' + id + '/cancel', tok);
const fin = await api('GET', '/emergencies?status=finished', tok);
check('C10 cancelled alert moves to the finished list', fin.some((x) => x.emergency_id === id));
ws.close(); finish('phase7-created');
