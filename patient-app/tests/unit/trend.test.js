import { describe, expect, it } from 'vitest';
import { bandFor, emptyHistory, pushReading, spread, WINDOW } from '../../src/utils/trend';
import { bpParts, readingFromPayload } from '../../src/utils/adapters';

describe('vitals trend ring buffer', () => {
  it('keeps only the newest 60 readings of each series', () => {
    let h = emptyHistory();
    for (let i = 0; i < 75; i += 1) h = pushReading(h, { heart_rate: i, spo2: 98 });
    expect(h.heart_rate).toHaveLength(WINDOW); expect(h.heart_rate[0]).toBe(15); expect(h.heart_rate.at(-1)).toBe(74);
  });
  it('does not change the old history (returns a new object) and skips missing values', () => {
    const h = emptyHistory(); const next = pushReading(h, { heart_rate: 70 });
    expect(h.heart_rate).toEqual([]); expect(next.heart_rate).toEqual([70]); expect(next.spo2).toEqual([]);
  });
  it('finds the usual range, mapping the blood pressure names', () => {
    const b = { heart_rate: { min: 60, max: 85 }, bp_systolic: { min: 100, max: 130 }, bp_diastolic: { min: 65, max: 85 } };
    expect(bandFor('heart_rate', b)).toEqual({ min: 60, max: 85 }); expect(bandFor('bp_sys', b)).toEqual({ min: 100, max: 130 });
    expect(bandFor('bp_dia', b)).toEqual({ min: 65, max: 85 }); expect(bandFor('glucose', null)).toBe(null);
  });
  it('spread gives the smallest and largest value, or null when empty', () => {
    expect(spread([72, 78, 75])).toEqual({ min: 72, max: 78 }); expect(spread([])).toBe(null);
  });
});

describe('adapter for the vitals event', () => {
  it('splits the old bp string, and prefers bp_sys and bp_dia when present', () => {
    expect(bpParts('120/80')).toEqual({ bp_sys: 120, bp_dia: 80 }); expect(bpParts('')).toEqual({});
    expect(readingFromPayload({ heart_rate: 70, bp: '110/70' })).toEqual({ heart_rate: 70, bp_sys: 110, bp_dia: 70 });
    expect(readingFromPayload({ bp: '110/70', bp_sys: 130, bp_dia: 85 })).toEqual({ bp_sys: 130, bp_dia: 85 });
  });
});
