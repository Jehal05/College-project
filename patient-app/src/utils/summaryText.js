// Builds the plain-text version of a post-incident summary (for Share, Copy and Download). Pure: it only needs a `t` function.
// It is a record of what the app did. It never interprets, gives a cause or says how things turned out for the person's health.
import { formatDateTime, formatTime } from './time';

// 72 -> "1 min 12 s", 45 -> "45 s"
export function durationWords(seconds, t) {
  const m = Math.floor(seconds / 60);
  return m > 0 ? t('summary.minSec', { m, s: seconds % 60 }) : t('summary.sec', { s: seconds });
}

const STEPS = [['to_acknowledged', 'summary.after.ack'], ['to_dispatched', 'summary.after.dispatch'],
  ['to_arrived', 'summary.after.arrive'], ['to_handover', 'summary.after.handover']];
const READINGS = [['heart_rate', 'unit.bpm'], ['spo2', 'unit.percent'], ['glucose', 'unit.mgdl'], ['resp_rate', 'unit.perMinute']];

// The pieces both the screen and the text use, so they can never disagree.
export function summaryFacts(s, t) {
  const v = s.vitals_at_alert || {};
  const readings = READINGS.filter(([k]) => typeof v[k] === 'number').map(([k, unit]) => ({ key: k, value: v[k], unit }));
  if (typeof v.bp_sys === 'number' && typeof v.bp_dia === 'number') readings.splice(2, 0, { key: 'bp', value: v.bp_sys + '/' + v.bp_dia, unit: 'unit.mmhg' });
  return {
    startedBy: t('summary.by.' + (s.source || 'MANUAL')),
    durations: STEPS.filter(([k]) => s.durations[k] != null).map(([k, key]) => t(key, { time: durationWords(s.durations[k], t) })),
    shared: ['location', 'history', 'vitals', 'reports'].filter((k) => s.shared[k]).map((k) => t('consent.' + k + '.title')),
    readings,
  };
}

export function summaryText(s, t, notes = '') {
  const f = summaryFacts(s, t);
  const lines = [
    t('summary.docTitle'), t('summary.record'), '',
    t('summary.started', { time: formatDateTime(s.started_at) }), t('summary.startedBy', { who: f.startedBy }), '',
    t('summary.timeline'), ...s.timeline.map((e) => '- ' + formatTime(e.timestamp) + '  ' + t('state.' + e.state)), '',
    ...(f.durations.length ? [...f.durations, ''] : []),
    t('summary.sharedTitle') + ': ' + (f.shared.length ? f.shared.join(', ') : t('summary.nothingShared')),
    t('summary.hospital') + ': ' + (s.hospital ? s.hospital.name : t('summary.none')),
    t('summary.contactsTitle') + ': ' + (s.contacts_notified.length ? s.contacts_notified.map((c) => c.name).join(', ') : t('summary.none')),
    t('summary.symptomsTitle') + ': ' + (s.symptoms.length ? s.symptoms.map((id) => t('symptom.' + id)).join(', ') : t('summary.none')),
  ];
  if (f.readings.length) lines.push(t('summary.readingsTitle') + ': ' + f.readings.map((r) => t('twin.' + r.key) + ' ' + r.value + ' ' + t(r.unit)).join(', '));
  if (notes.trim()) lines.push('', t('summary.notesTitle') + ':', notes.trim());
  lines.push('', t('summary.footer'));
  return lines.join('\n');
}
