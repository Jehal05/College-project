import { describe, expect, it } from 'vitest';
import { reasonsView } from '../../src/utils/reasons';

const data = (extra = {}) => ({
  severity: 'EMERGENCY', reviewed: false,
  matched_rules: [{ id: 'HEART_CHEST_PAIN', type: 'HEART', severity: 'EMERGENCY', reason: 'Chest pain is a red-flag symptom', reviewed: false }],
  inputs: { symptoms: ['CHEST_PAIN'], vitals: { heart_rate: 150, spo2: 95, bp_sys: 159, bp_dia: 101, glucose: 124, resp_rate: 22 }, vitals_at: '2026-11-13T10:00:00Z' },
  ...extra,
});

describe('why this alert view', () => {
  it('never shows a rule\'s own medical sentence while the rule is pending review', () => {
    const v = reasonsView(data());
    expect(v.reviewedLines).toEqual([]); expect(v.hasUnreviewed).toBe(true); expect(JSON.stringify(v)).not.toMatch(/red-flag/);
  });
  it('shows the sentence once a rule is marked reviewed', () => {
    const d = data(); d.matched_rules[0].reviewed = true;
    expect(reasonsView(d).reviewedLines).toEqual([{ id: 'HEART_CHEST_PAIN', text: 'Chest pain is a red-flag symptom' }]);
  });
  it('lists the shared readings with units and joins the two blood pressure numbers', () => {
    const v = reasonsView(data());
    expect(v.readings.map((r) => r.key)).toEqual(['heart_rate', 'spo2', 'bp', 'glucose', 'resp_rate']);
    expect(v.readings.find((r) => r.key === 'bp').value).toBe('159/101');
  });
  it('has no readings when vitals were not shared, and handles nothing matched', () => {
    const d = data({ matched_rules: [] }); d.inputs.vitals = {};
    const v = reasonsView(d); expect(v.readings).toEqual([]); expect(v.matched).toBe(false);
  });
  it('contains no severity score or probability', () => { expect(Object.keys(reasonsView(data()))).not.toEqual(expect.arrayContaining(['score', 'severity', 'probability'])); });
});
