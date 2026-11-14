import { describe, expect, it } from 'vitest';
import { inRange, twinRows } from '../../src/utils/twin';

const baseline = { heart_rate: { min: 60, max: 80 }, spo2: { min: 95, max: 100 }, bp_systolic: { min: 100, max: 130 }, bp_diastolic: { min: 65, max: 85 }, glucose: { min: 80, max: 120 } };

describe('digital twin usual-range rule', () => {
  it('includes both ends of the range', () => { expect(inRange(60, baseline.heart_rate)).toBe(true); expect(inRange(80, baseline.heart_rate)).toBe(true); });
  it('flags values outside the range, and non-numbers', () => { expect(inRange(59, baseline.heart_rate)).toBe(false); expect(inRange(undefined, baseline.heart_rate)).toBe(false); });
  it('builds four rows, all within for usual readings', () => {
    const rows = twinRows({ heart_rate: 72, spo2: 98, bp: '120/80', glucose: 105 }, baseline);
    expect(rows.map((r) => r.key)).toEqual(['heart_rate', 'spo2', 'bp', 'glucose']); expect(rows.every((r) => r.within === true)).toBe(true);
  });
  it('marks a different reading and handles a missing one', () => {
    const rows = twinRows({ heart_rate: 120, spo2: 98, bp: '', glucose: undefined }, baseline);
    expect(rows[0].within).toBe(false); expect(rows[2].within).toBe(null); expect(rows[3].within).toBe(null);
  });
  it('never uses diagnosis words in its data', () => { expect(JSON.stringify(twinRows({ heart_rate: 72 }, baseline))).not.toMatch(/normal|abnormal|risk|danger/i); });
});
