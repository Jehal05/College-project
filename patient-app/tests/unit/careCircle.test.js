import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { orderMembers, sharedKeys, hiddenKeys, familyActivity, circleReady } from '../../src/utils/careCircle';

const lang = (c) => JSON.parse(readFileSync(new URL(`../../src/i18n/${c}.json`, import.meta.url), 'utf8'));

describe('care circle helpers', () => {
  it('puts the primary contact first, then sorts by name, without changing the input', () => {
    const input = [{ name: 'Zed' }, { name: 'Amy' }, { name: 'Mid', is_primary: true }];
    expect(orderMembers(input).map((c) => c.name)).toEqual(['Mid', 'Amy', 'Zed']);
    expect(input.map((c) => c.name)).toEqual(['Zed', 'Amy', 'Mid']);
    expect(orderMembers(undefined)).toEqual([]);
  });
  it('treats only an explicit "true" consent as shared, so it never promises more than exists', () => {
    expect(sharedKeys({ location: true, history: false, vitals: undefined })).toEqual(['location']);
    expect(hiddenKeys({ location: true, history: false })).toEqual(['history', 'vitals', 'reports']);
    expect(sharedKeys(null)).toEqual([]); expect(hiddenKeys(null)).toHaveLength(4);
  });
  it('keeps only family looks, newest first, up to the limit', () => {
    const e = (id, kind) => ({ id, who: { kind } });
    const list = [e(1, 'hospital_desk'), e(2, 'relative'), e(3, 'relative'), e(4, 'relative')];
    expect(familyActivity(list, 2).map((x) => x.id)).toEqual([2, 3]);
    expect(familyActivity(undefined)).toEqual([]);
  });
  it('knows an empty circle cannot be told', () => { expect(circleReady([])).toBe(false); expect(circleReady([{}])).toBe(true); expect(circleReady(null)).toBe(false); });
  it('has cc.* text in all three languages', () => {
    const keys = (c) => Object.keys(lang(c)).filter((k) => k.startsWith('cc.')).sort();
    expect(keys('hi')).toEqual(keys('en')); expect(keys('gu')).toEqual(keys('en'));
  });
});
