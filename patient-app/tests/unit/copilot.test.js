import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { QUESTIONS, answer } from '../../src/utils/copilot';

const lang = (c) => JSON.parse(readFileSync(new URL(`../../src/i18n/${c}.json`, import.meta.url), 'utf8'));
const nm = (k) => k;
const base = { rows: [], done: { percent: 100, missing: [] }, history: {}, contacts: [], consents: null, reports: [], labs: [] };

describe('copilot rules', () => {
  it('has an answer for every question and null for anything else', () => {
    for (const q of QUESTIONS) expect(answer(q, base, nm), q).toBeTruthy();
    expect(answer('write me a diagnosis', base, nm)).toBe(null);
  });
  it('readings: separates inside, outside and no-range, and says nothing without data', () => {
    expect(answer('readings', base, nm).lines.map((l) => l.k)).toEqual(['cp.a.readings.none']);
    const r = answer('readings', { ...base, rows: [{ key: 'a', within: true }, { key: 'b', within: false }, { key: 'c', within: null }] }, nm);
    expect(r.lines.map((l) => l.k)).toEqual(['cp.a.readings.in', 'cp.a.readings.out', 'cp.a.readings.noRange']);
    expect(r.lines[1].p.names).toBe('b');
  });
  it('missing: lists what is missing, or says nothing is', () => {
    const r = answer('missing', { ...base, done: { percent: 50, missing: ['reports', 'baseline'] } }, nm);
    expect(r.lines[0].p).toMatchObject({ percent: 50 }); expect(r.lines).toHaveLength(3);
    expect(answer('missing', base, nm).lines[0].k).toBe('cp.a.missing.none');
  });
  it('changes: uses only series with two or more readings', () => {
    const r = answer('changes', { ...base, history: { heart_rate: [70, 80, 90], spo2: [97] } }, nm);
    expect(r.lines).toHaveLength(1); expect(r.lines[0].p).toMatchObject({ key: 'heart_rate', first: 70, last: 90, n: 3 });
    expect(answer('changes', base, nm).lines[0].k).toBe('cp.a.changes.none');
  });
  it('circle: counts contacts and lists only explicitly allowed sharing', () => {
    const r = answer('circle', { ...base, contacts: [{}, {}], consents: { location: true, vitals: false } }, nm);
    expect(r.lines[0].p.n).toBe(2); expect(r.lines[1].p.items).toEqual(['consent.location.title']);
    expect(answer('circle', base, nm).lines.map((l) => l.k)).toEqual(['cp.a.circle.none', 'cp.a.circle.nothing']);
  });
  it('doctor: suggests questions only from the data, always adds the generic ones', () => {
    const r = answer('doctor', { ...base, rows: [{ key: 'heart_rate', within: false }], done: { percent: 80, missing: ['baseline'] } }, nm);
    expect(r.lines.map((l) => l.k)).toEqual(['cp.a.doctor.out', 'cp.a.doctor.baseline', 'cp.a.doctor.noReports', 'cp.a.doctor.meds', 'cp.a.doctor.symptoms']);
  });
  it('every answer names its sources', () => { for (const q of QUESTIONS) expect(answer(q, base, nm).from.length, q).toBeGreaterThan(0); });
});

describe('copilot text', () => {
  it('has the same cp.* keys in en, hi and gu, a source label for every source, and never claims to diagnose', () => {
    const keys = (c) => Object.keys(lang(c)).filter((k) => k.startsWith('cp.')).sort();
    expect(keys('hi')).toEqual(keys('en')); expect(keys('gu')).toEqual(keys('en'));
    const en = lang('en');
    for (const q of QUESTIONS) for (const s of answer(q, base, nm).from) expect(en['cp.src.' + s], s).toBeTruthy();
    expect(en['cp.notAi']).toMatch(/not an AI chatbot/); expect(en['cp.notAi']).toMatch(/no diagnosis/);
    for (const k of Object.keys(en).filter((x) => x.startsWith('cp.a.'))) expect(en[k], k).not.toMatch(/\b(you have|diagnosed with|you should take)\b/i);
  });
});
