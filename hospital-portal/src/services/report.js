// Post-event report builder (feature #31). Pure: gives back plain data that the page
// shows, the print view prints, and reportToText() turns into a downloadable file.
import { TYPE_LABELS, STATE_LABELS } from './contract.js';
import { rankHospitals } from './ranking.js';
import { stepDurations, escalationCount, STEPS } from './analytics.js';

const ms = (t) => new Date(t).getTime();

export function formatSeconds(totalSeconds) {
  if (totalSeconds === null || totalSeconds === undefined) return 'Not reached';
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m} min ${s % 60} s` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

/**
 * @param emergency  a finished emergency with status_events
 * @param context    { hospitals, rankingConfig, checklists, ambulances }
 */
export function buildReport(emergency, context = {}) {
  const e = emergency;
  const { hospitals = [], rankingConfig, checklists = {}, ambulances = [] } = context;
  const events = [...(e.status_events || [])]
    .filter((x) => Number.isFinite(ms(x.timestamp)))
    .sort((a, b) => ms(a.timestamp) - ms(b.timestamp));
  const startMs = Number.isFinite(ms(e.created_at)) ? ms(e.created_at) : events[0] ? ms(events[0].timestamp) : null;

  // Hospital: the one holding the alert at the end (alerted_hospital_id). Cancelled before anyone
  // answered means it was only "alerted", never "chosen".
  const acknowledged = events.some((x) => x.state === 'HOSPITAL_ACKNOWLEDGED');
  const hospital = hospitals.find((h) => h.id === e.alerted_hospital_id) || null;
  let rank = null;
  if (hospital && rankingConfig) {
    const result = rankHospitals(hospitals, e.type, e.location, rankingConfig);
    const row = result.ranked.find((r) => r.hospital.id === hospital.id);
    rank = row
      ? { position: row.rank, of: result.ranked.length, total: row.total, why: row.why }
      : { position: null, of: result.ranked.length, total: null, why: result.ruledOut.find((r) => r.hospital.id === hospital.id)?.reason || 'Not in the current ranking' };
  }

  const unit = e.ambulance_id ? ambulances.find((a) => a.id === e.ambulance_id) || { id: e.ambulance_id } : null;
  const items = (checklists[e.type] || []).map((i) => ({ id: i.id, text: i.text, done: Boolean(e.checklist?.[i.id]?.done), by: e.checklist?.[i.id]?.by || null, at: e.checklist?.[i.id]?.at || null }));
  const d = stepDurations(e);

  return {
    emergency_id: e.emergency_id,
    patient_id: e.patient_id,
    type: e.type,
    type_label: TYPE_LABELS[e.type] || e.type,
    severity: e.severity,
    state: e.state,
    state_label: STATE_LABELS[e.state] || e.state,
    outcome: e.state === 'CANCELLED' ? 'Cancelled by the patient (false alarm)' : e.state === 'HANDOVER_DONE' ? 'Handed over to the hospital team' : 'Still open (not finished)',
    created_at: e.created_at,
    sample: Boolean(e.sample),
    symptoms: e.symptoms || [],
    vitals: e.vitals || null,
    location: e.location || null,
    hospital: hospital
      ? { id: hospital.id, name: hospital.name, role: acknowledged ? 'Chosen hospital' : 'Alerted hospital (no one acknowledged)', ...(rank || {}) }
      : null,
    escalations: escalationCount(e),
    ambulance: unit ? { id: unit.id, call_sign: unit.call_sign || unit.id, crew: unit.crew || null } : null,
    team: e.assigned_team || null,
    corridor_requested: Boolean(e.corridor_requested),
    timeline: events.map((x) => ({
      state: x.state,
      label: x.state === 'NOTE' ? x.note : STATE_LABELS[x.state] || x.state,
      note: x.state === 'NOTE' ? null : x.note || null,
      actor: x.actor || null,
      timestamp: x.timestamp,
      offset_seconds: startMs === null ? null : Math.round((ms(x.timestamp) - startMs) / 1000),
    })),
    durations: [
      ...STEPS.map((s) => ({ key: s.key, label: s.label, seconds: d[s.key] })),
      { key: 'total', label: e.state === 'CANCELLED' ? 'Alert to cancelled' : 'Total, alert to handed over', seconds: d.total },
    ],
    checklist: { done: items.filter((i) => i.done).length, total: items.length, items },
    notes: events.filter((x) => x.state === 'NOTE').map((x) => ({ text: x.note, actor: x.actor || null, timestamp: x.timestamp })),
  };
}

/** Plain-text version for the Download button. */
export function reportToText(r) {
  const L = [];
  L.push('HEALTHTWIN AI - POST-EVENT REPORT');
  L.push('SIMULATED PROTOTYPE. Sample content, pending medical review. Not a medical record.');
  if (r.sample) L.push('This case is SAMPLE history data.');
  L.push('');
  L.push(`Emergency ID: ${r.emergency_id}`);
  L.push(`Patient ID:   ${r.patient_id} (sample)`);
  L.push(`Type:         ${r.type_label}`);
  L.push(`Severity:     ${r.severity}`);
  L.push(`Outcome:      ${r.outcome}`);
  L.push(`Alert time:   ${new Date(r.created_at).toLocaleString()}`);
  L.push('');
  L.push(`Hospital: ${r.hospital ? `${r.hospital.name} (${r.hospital.role})` : 'None'}`);
  if (r.hospital?.why) L.push(`Why: ${r.hospital.position ? `ranked ${r.hospital.position} of ${r.hospital.of}, score ${r.hospital.total}. ` : ''}${r.hospital.why} (worked out again from current hospital data, simulated)`);
  L.push(`Escalations: ${r.escalations}`);
  L.push(`Ambulance: ${r.ambulance ? `${r.ambulance.call_sign} (${r.ambulance.id})` : 'None sent'}`);
  L.push(`Assigned team: ${r.team ? `${r.team.name} (${r.team.specialty})` : 'None'}`);
  L.push('');
  L.push('STEP DURATIONS');
  for (const d of r.durations) L.push(`  ${d.label}: ${formatSeconds(d.seconds)}`);
  L.push('');
  L.push('TIMELINE');
  for (const t of r.timeline) L.push(`  ${new Date(t.timestamp).toLocaleTimeString()}  +${t.offset_seconds ?? '?'} s  ${t.label}${t.actor ? ` (${t.actor})` : ''}${t.note ? ` - ${t.note}` : ''}`);
  L.push('');
  L.push(`CHECKLIST: ${r.checklist.done} of ${r.checklist.total} done (sample checklist, pending medical review)`);
  for (const i of r.checklist.items) L.push(`  [${i.done ? 'x' : ' '}] ${i.text}${i.done && i.by ? ` (${i.by})` : ''}`);
  if (r.notes.length) {
    L.push('');
    L.push('NOTES');
    for (const n of r.notes) L.push(`  ${new Date(n.timestamp).toLocaleTimeString()}  ${n.text}`);
  }
  return L.join('\n');
}
