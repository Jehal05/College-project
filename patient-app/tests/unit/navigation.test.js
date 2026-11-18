import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { BOTTOM, NAV, isThemed } from '../../src/config/navigation';

const lang = (c) => JSON.parse(readFileSync(new URL(`../../src/i18n/${c}.json`, import.meta.url), 'utf8'));
const routes = readFileSync(new URL('../../src/routes.jsx', import.meta.url), 'utf8');

describe('navigation', () => {
  it('the phone bar is Home, Hospitals, Passport, Profile and uses real pages', () => {
    expect(BOTTOM).toEqual(['home', 'hospitals', 'passport', 'settings']);
    for (const k of BOTTOM) expect(NAV.find((n) => n.key === k)).toBeTruthy();
  });
  it('every sidebar page has a label in English, Hindi and Gujarati', () => {
    for (const c of ['en', 'hi', 'gu']) { const t = lang(c); expect(NAV.filter((n) => !t['nav.' + n.key]).map((n) => n.key), c).toEqual([]); }
  });
  it('every sidebar page has a route', () => {
    for (const n of NAV) if (n.to !== '/') expect(routes.includes(`'${n.to}'`) || routes.includes(`"${n.to}"`), n.to).toBe(true);
  });
  it('knows which pages use the themed look', () => {
    expect(isThemed('/hospitals')).toBe(true);
    expect(isThemed('/')).toBe(false); expect(isThemed('/emergency/EM-1')).toBe(false); expect(isThemed('/hospitals-x')).toBe(false);
  });
});
