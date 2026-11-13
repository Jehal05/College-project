import { describe, expect, it } from 'vitest';
import { durationWords, summaryFacts, summaryText } from '../../src/utils/summaryText';

// A stand-in for the translator: shows the key and the values, so the tests do not depend on wording.
const t = (key, o = {}) => key + (Object.keys(o).length ? '(' + Object.values(o).join(',') + ')' : '');
const summary = (extra = {}) => ({
  id: 'E-0001', started_at: '2026-11-13T10:00:00.000Z', ended_at: '2026-11-13T10:05:00.000Z', source: 'MANUAL', final_state: 'HANDOVER_DONE',
  timeline: [{ state: 'EMERGENCY_DETECTED', timestamp: '2026-11-13T10:00:00.000Z' }, { state: 'SOS_SENT', timestamp: '2026-11-13T10:00:10.000Z' }],
  durations: { to_acknowledged: 72, to_dispatched: 90, to_arrived: null, to_handover: null },
  shared: { location: true, history: false, vitals: true, reports: false }, symptoms: ['CHEST_PAIN'],
  vitals_at_alert: { heart_rate: 150, bp_sys: 159, bp_dia: 101 }, contacts_notified: [{ name: 'Asha Demo' }], hospital: { name: 'Demo Hospital' }, ambulance_id: 'AMB-01',
  ...extra,
});

describe('post-incident summary text', () => {
  it('writes durations in plain words', () => {
    expect(durationWords(72, t)).toBe('summary.minSec(1,12)'); expect(durationWords(45, t)).toBe('summary.sec(45)'); expect(durationWords(60, t)).toBe('summary.minSec(1,0)');
  });
  it('lists only the steps that happened and only what was shared', () => {
    const f = summaryFacts(summary(), t);
    expect(f.durations).toHaveLength(2); expect(f.shared).toEqual(['consent.location.title', 'consent.vitals.title']);
    expect(f.readings.map((r) => r.key)).toEqual(['heart_rate', 'bp']);
  });
  it('the text contains the sections, the notes and the footer, and no readings when none were shared', () => {
    const text = summaryText(summary(), t, 'Ask about the pain');
    expect(text).toContain('summary.record'); expect(text).toContain('Ask about the pain'); expect(text).toContain('summary.footer');
    expect(summaryText(summary({ vitals_at_alert: {} }), t)).not.toContain('summary.readingsTitle');
  });
  it('has no notes section when the notes are empty', () => { expect(summaryText(summary(), t, '   ')).not.toContain('summary.notesTitle'); });
});
