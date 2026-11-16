import { describe, expect, it } from 'vitest';
import { inRange, organStatuses, twinRows } from '../../src/utils/twin';
import { ORGANS } from '../../src/config/organs';
import { ORGAN_NODES, layerOf, organOfNode } from '../../src/config/bodyModel';

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

describe('organ status for the 3D body', () => {
  const usual = { heart_rate: 72, spo2: 98, bp: '120/80', glucose: 105 };
  it('is within when every linked reading is usual, and nodata where the prototype has no reading', () => {
    const s = organStatuses(ORGANS, usual, baseline);
    expect(s.heart).toBe('within'); expect(s.lungs).toBe('within'); expect(s.pancreas).toBe('within');
    expect(s.brain).toBe('nodata'); expect(s.liver).toBe('nodata'); expect(s.kidneys).toBe('nodata');
  });
  it('is different when any linked reading changed, waiting when a reading has not arrived', () => {
    expect(organStatuses(ORGANS, { ...usual, bp: '190/120' }, baseline).heart).toBe('different');
    expect(organStatuses(ORGANS, { heart_rate: 72, bp: '120/80' }, baseline).pancreas).toBe('waiting');
  });
  it('has a status for every organ even before any reading', () => {
    const s = organStatuses(ORGANS, null, null);
    expect(Object.keys(s).sort()).toEqual(ORGANS.map((o) => o.key).sort());
    expect(Object.values(s).every((v) => ['waiting', 'nodata'].includes(v))).toBe(true);
  });
  it('maps every twin organ to model nodes, and only those nodes are selectable', () => {
    expect(Object.keys(ORGAN_NODES).sort()).toEqual(ORGANS.map((o) => o.key).sort());
    expect(organOfNode('organ_lungs_left_airways')).toBe('lungs'); expect(organOfNode('ctx_stomach')).toBe(null); expect(organOfNode('skin')).toBe(null);
  });
  it('puts nodes into layers', () => {
    expect(layerOf('skin')).toBe('skin'); expect(layerOf('skeleton')).toBe('skeleton'); expect(layerOf('vessels_arterial')).toBe('vessels'); expect(layerOf('ctx_stomach')).toBe('organs'); expect(layerOf('organ_heart')).toBe('organs');
  });
  it('never uses diagnosis words in its data', () => { expect(JSON.stringify(organStatuses(ORGANS, usual, baseline))).not.toMatch(/normal|abnormal|risk|danger/i); });
});
