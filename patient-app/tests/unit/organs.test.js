import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ORGANS, organByKey, relatedConditions, relatedReports } from '../../src/config/organs';

const lang = (c) => JSON.parse(readFileSync(new URL(`../../src/i18n/${c}.json`, import.meta.url), 'utf8'));

describe('organs', () => {
  it('has the six organs from the design, each drawn on the map with a zoom box', () => {
    expect(ORGANS.map((o) => o.key)).toEqual(['heart', 'brain', 'lungs', 'kidneys', 'liver', 'pancreas']);
    for (const o of ORGANS) { expect(o.shapes.length).toBeGreaterThan(0); expect(o.focus).toHaveLength(4); }
  });
  it('every organ has a name and purpose in English, Hindi and Gujarati', () => {
    for (const c of ['en', 'hi', 'gu']) { const t = lang(c); for (const o of ORGANS) { expect(t[`dtwin.organ.${o.key}.name`], c + o.key).toBeTruthy(); expect(t[`dtwin.organ.${o.key}.purpose`]).toBeTruthy(); } }
  });
  it('only organs with real live readings list metrics', () => {
    expect(organByKey('heart').metrics.map((m) => m.key)).toEqual(['heart_rate', 'bp']);
    expect(organByKey('kidneys').metrics).toEqual([]);
    expect(organByKey('nope').key).toBe('heart');
  });
  it('links conditions and report names by words, and copes with missing data', () => {
    const heart = organByKey('heart'); const pancreas = organByKey('pancreas');
    expect(relatedConditions(heart, ['Hypertension', 'Type 2 Diabetes'])).toEqual(['Hypertension']);
    expect(relatedConditions(pancreas, ['Hypertension', 'Type 2 Diabetes'])).toEqual(['Type 2 Diabetes']);
    expect(relatedReports(heart, [{ name: 'ECG June.pdf' }, { name: 'blood.pdf' }])).toEqual([{ name: 'ECG June.pdf' }]);
    expect(relatedConditions(heart, null)).toEqual([]); expect(relatedReports(heart, undefined)).toEqual([]);
  });
});
