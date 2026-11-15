import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { SIM_METRICS, baselineValue, startValue, placement, compare, spread, wouldLeave, clamp } from '../../src/utils/simulator';

const lang = (c) => JSON.parse(readFileSync(new URL(`../../src/i18n/${c}.json`, import.meta.url), 'utf8'));
const hr = SIM_METRICS[0];
const baseline = { heart_rate: { min: 55, max: 95 }, spo2: { min: 94, max: 100 }, bp_systolic: { min: 100, max: 130 }, glucose: { min: 70, max: 140 } };

describe('simulator maths', () => {
  it('uses the latest reading as the baseline, null when there is none', () => {
    expect(baselineValue(hr, { heart_rate: [60, 72] })).toBe(72); expect(baselineValue(hr, {})).toBe(null);
  });
  it('starts at the latest reading, else the middle of the usual range, else a default', () => {
    expect(startValue(hr, { heart_rate: [80] }, baseline)).toBe(80);
    expect(startValue(hr, {}, baseline)).toBe(75);
    expect(startValue(hr, {}, null)).toBe(72);
  });
  it('clamps to the slider limits', () => { expect(clamp(500, 30, 200)).toBe(200); expect(clamp(1, 30, 200)).toBe(30); });
  it('places a value against the usual range and claims nothing without one', () => {
    expect(placement(80, { min: 55, max: 95 })).toBe('within'); expect(placement(120, { min: 55, max: 95 })).toBe('outside');
    expect(placement(80, null)).toBe(null); expect(placement(null, { min: 1, max: 2 })).toBe(null);
  });
  it('compares baseline and hypothetical and reports the change', () => {
    const r = compare(hr, { history: { heart_rate: [70] }, baseline }, 110);
    expect(r).toMatchObject({ base: 70, hypo: 110, change: 40, baseStatus: 'within', hypoStatus: 'outside' });
    expect(compare(hr, { history: {}, baseline }, 80)).toMatchObject({ base: null, change: null, hypoStatus: 'within' });
  });
  it('lists only what the what-if would push outside (not what was already outside)', () => {
    const rows = [{ key: 'a', hypoStatus: 'outside', baseStatus: 'within' }, { key: 'b', hypoStatus: 'outside', baseStatus: 'outside' }, { key: 'c', hypoStatus: 'within', baseStatus: 'within' }, { key: 'd', hypoStatus: 'outside', baseStatus: null }];
    expect(wouldLeave(rows)).toEqual(['a', 'd']);
  });
  it('summarises the recent spread of readings', () => {
    expect(spread([70, 90, 80])).toEqual({ min: 70, max: 90, count: 3 }); expect(spread([])).toBe(null); expect(spread(undefined)).toBe(null);
  });
});

describe('simulator text', () => {
  it('has all sim.* keys in en, hi and gu, and the words say it is not a prediction', () => {
    const keys = (c) => Object.keys(lang(c)).filter((k) => k.startsWith('sim.')).sort();
    expect(keys('hi')).toEqual(keys('en')); expect(keys('gu')).toEqual(keys('en'));
    expect(lang('en')['sim.notPrediction']).toMatch(/does not predict/); expect(lang('en')['sim.hypothetical']).toMatch(/not a prediction/);
  });
});
