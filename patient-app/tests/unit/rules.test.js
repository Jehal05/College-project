// Parity tests for the ported rules engine (mock-server/rules.js). Each case is written from the rules in Daksh's rules.yaml (v0.1).
import { describe, expect, it } from 'vitest';
import rules from '../../../mock-server/rules.js';

const { evaluate } = rules;
const ids = (r) => r.matched_rules.map((m) => m.id);

describe('rules engine (port of backend/app/rules/rules.yaml v0.1)', () => {
  it('chest pain is always an emergency', () => {
    const r = evaluate(['CHEST_PAIN'], {});
    expect(r.severity).toBe('EMERGENCY'); expect(r.type).toBe('HEART'); expect(ids(r)).toContain('HEART_CHEST_PAIN');
  });
  it('nothing reported and no readings matches nothing', () => {
    const r = evaluate([], {});
    expect(r.severity).toBe('NONE'); expect(r.type).toBe(null); expect(r.matched_rules).toEqual([]);
  });
  it('arm pain with sweating is an emergency, arm pain alone is urgent, sweating alone is watch', () => {
    expect(evaluate(['ARM_JAW_PAIN', 'SWEATING'], {}).severity).toBe('EMERGENCY');
    expect(evaluate(['ARM_JAW_PAIN'], {}).severity).toBe('URGENT');
    expect(evaluate(['SWEATING'], {}).severity).toBe('WATCH');
  });
  it('heart rate thresholds: above 120 urgent, 101 to 120 watch, 100 nothing, below 45 urgent', () => {
    expect(evaluate([], { heart_rate: 121 }).severity).toBe('URGENT');
    expect(evaluate([], { heart_rate: 120 }).severity).toBe('WATCH');
    expect(evaluate([], { heart_rate: 101 }).severity).toBe('WATCH');
    expect(evaluate([], { heart_rate: 100 }).severity).toBe('NONE');
    expect(evaluate([], { heart_rate: 44 }).severity).toBe('URGENT');
  });
  it('systolic pressure thresholds: 180 or more urgent, 160 to 179 watch, below 90 urgent', () => {
    expect(evaluate([], { bp_sys: 180 }).severity).toBe('URGENT');
    expect(evaluate([], { bp_sys: 160 }).severity).toBe('WATCH');
    expect(evaluate([], { bp_sys: 159 }).severity).toBe('NONE');
    expect(evaluate([], { bp_sys: 89 }).severity).toBe('URGENT');
  });
  it('each stroke warning sign is an emergency of type STROKE', () => {
    ['FACE_DROOP', 'LIMB_WEAKNESS', 'SLURRED_SPEECH'].forEach((s) => {
      const r = evaluate([s], {}); expect(r.severity).toBe('EMERGENCY'); expect(r.type).toBe('STROKE');
    });
  });
  it('low glucose reported with confusion is an emergency; a low reading alone is urgent', () => {
    expect(evaluate(['LOW_GLUCOSE_READING', 'DIA_CONFUSION'], {}).severity).toBe('EMERGENCY');
    expect(evaluate([], { glucose: 60 }).severity).toBe('URGENT');
    expect(evaluate(['DIA_SWEATING'], { glucose: 60 }).severity).toBe('EMERGENCY');
    expect(evaluate([], { glucose: 251 }).severity).toBe('WATCH');
  });
  it('asthma rules: wheeze with breathlessness or low oxygen is an emergency', () => {
    expect(evaluate(['WHEEZING', 'SHORT_BREATH'], {}).severity).toBe('EMERGENCY');
    expect(evaluate(['WHEEZING'], { spo2: 90 }).severity).toBe('EMERGENCY');
    expect(evaluate(['WHEEZING'], {}).severity).toBe('URGENT');
    expect(evaluate([], { spo2: 93 }).severity).toBe('WATCH');
    expect(evaluate([], { resp_rate: 25 }).severity).toBe('WATCH');
  });
  it('symptoms with no counterpart in the table are ignored, and bad readings never crash', () => {
    expect(evaluate(['NAUSEA', 'BLUE_LIPS'], {}).severity).toBe('NONE');
    expect(evaluate(['CHEST_PAIN'], { heart_rate: 'abc', spo2: null, bp_sys: true }).severity).toBe('EMERGENCY');
  });
  it('severity never goes down when more evidence is added', () => {
    const rank = { NONE: 0, WATCH: 1, URGENT: 2, EMERGENCY: 3 };
    const steps = [[[], {}], [['SWEATING'], {}], [['SWEATING'], { heart_rate: 130 }], [['SWEATING', 'CHEST_PAIN'], { heart_rate: 130 }]];
    const levels = steps.map(([s, v]) => rank[evaluate(s, v).severity]);
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
  });
  it('every matched rule is still pending doctor review', () => {
    const r = evaluate(['CHEST_PAIN', 'SWEATING'], { heart_rate: 130 });
    expect(r.reviewed).toBe(false); expect(r.matched_rules.every((m) => m.reviewed === false)).toBe(true);
  });
  it('the highest severity wins, and equal severities go to the first type (HEART before ASTHMA)', () => {
    const r = evaluate(['SHORT_BREATH'], {});
    expect(r.severity).toBe('URGENT'); expect(r.type).toBe('HEART');
    expect(ids(r)).toEqual(expect.arrayContaining(['HEART_BREATHLESSNESS', 'ASTHMA_BREATHLESSNESS']));
  });
});
