import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { LABS } from '../../src/config/labs';
import { ORGANS } from '../../src/config/organs';
import { validateDraft, rangeStatus, addLab, removeLab, loadLabs, labsForOrgan } from '../../src/utils/labs';
import { dataQuality } from '../../src/utils/diseaseIntel';

const lang = (c) => JSON.parse(readFileSync(new URL(`../../src/i18n/${c}.json`, import.meta.url), 'utf8'));
const mem = () => { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = v; } }; };
const draft = (o = {}) => ({ lab: 'hba1c', value: '6.1', low: '', high: '', date: '2026-01-10', reportId: '', ...o });
const today = new Date('2026-02-01T00:00:00Z');

describe('lab catalog', () => {
  it('every lab maps to a real organ and has a name in all three languages', () => {
    for (const l of LABS) { expect(ORGANS.map((o) => o.key)).toContain(l.organ); for (const c of ['en', 'hi', 'gu']) expect(lang(c)['lab.' + l.key], c + l.key).toBeTruthy(); }
    const keys = (c) => Object.keys(lang(c)).filter((k) => /^(ri|lab)\./.test(k)).sort();
    expect(keys('hi')).toEqual(keys('en')); expect(keys('gu')).toEqual(keys('en'));
  });
});

describe('validateDraft', () => {
  it('accepts a good value and keeps the unit from the catalog', () => {
    const r = validateDraft(draft(), today);
    expect(r.ok).toBe(true); expect(r.entry).toMatchObject({ lab: 'hba1c', value: 6.1, unit: '%', low: null, high: null });
  });
  it('rejects empty, zero, negative, text and absurd values', () => {
    for (const v of ['', '0', '-3', 'abc', '999999']) expect(validateDraft(draft({ value: v }), today).ok, v).toBe(false);
  });
  it('rejects a reversed range, a future date and a missing date', () => {
    expect(validateDraft(draft({ low: '10', high: '5' }), today).errors.high).toBe('order');
    expect(validateDraft(draft({ date: '2026-06-01' }), today).errors.date).toBe('future');
    expect(validateDraft(draft({ date: '' }), today).errors.date).toBe('required');
  });
  it('rejects an unknown test', () => { expect(validateDraft(draft({ lab: 'zzz' }), today).errors.lab).toBe('required'); });
});

describe('range status (only against the range the person typed)', () => {
  const e = (value, low, high) => ({ value, low, high });
  it('says nothing without a range', () => expect(rangeStatus(e(9, null, null))).toBe('norange'));
  it('compares with one or both bounds', () => {
    expect(rangeStatus(e(5, 4, 6))).toBe('within'); expect(rangeStatus(e(7, 4, 6))).toBe('outside');
    expect(rangeStatus(e(3, 4, null))).toBe('outside'); expect(rangeStatus(e(9, null, 10))).toBe('within');
  });
});

describe('storage', () => {
  it('adds, lists per patient, removes and groups by organ', () => {
    const s = mem(); const a = validateDraft(draft(), today).entry; const b = validateDraft(draft({ lab: 'creatinine', value: '1.2' }), today).entry;
    addLab('P1', a, s, 1); addLab('P1', b, s, 2); addLab('P2', a, s, 3);
    expect(loadLabs('P1', s)).toHaveLength(2); expect(loadLabs('P2', s)).toHaveLength(1);
    expect(labsForOrgan(loadLabs('P1', s), 'kidneys')).toHaveLength(1);
    const id = loadLabs('P1', s)[0].id; removeLab('P1', id, s); expect(loadLabs('P1', s)).toHaveLength(1);
  });
  it('survives broken stored data and blocked storage', () => {
    const bad = { getItem: () => '{oops', setItem: () => {} }; expect(loadLabs('P1', bad)).toEqual([]);
    const blocked = { getItem: () => null, setItem: () => { throw new Error('blocked'); } };
    expect(addLab('P1', validateDraft(draft(), today).entry, blocked, 1)).toBe(null);
  });
});

describe('data quality counts confirmed values like a report', () => {
  it('drops the "no reports" reason when a lab value exists', () => {
    expect(dataQuality({ hasMetrics: false, readings: 0, hasBaseline: false, reports: 0, conditions: 0, labs: 1 }).reasons).toEqual(['noLive']);
  });
});
