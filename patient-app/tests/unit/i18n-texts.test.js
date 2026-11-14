// Guards for the translation files: no Gujarati letters inside Hindi text (or the other way round) and the same {{placeholders}} as English.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';

const dir = new URL('../../src/i18n/', import.meta.url);
const json = (name) => JSON.parse(readFileSync(new URL(name, dir), 'utf8'));
const names = readdirSync(dir).filter((n) => n.endsWith('.json'));
const GUJARATI = /[઀-૿]/; const DEVANAGARI = /[ऀ-ॿ]/;
const MIXED_ON_PURPOSE = new Set(['rehearsal.language']); // names all three languages
const holes = (s) => (String(s).match(/\{\{\s*\w+\s*\}\}/g) || []).map((x) => x.replace(/\s/g, '')).sort().join(',');
const pairs = [['hi', GUJARATI], ['gu', DEVANAGARI]];

describe('translation files', () => {
  for (const [lang, foreign] of pairs) {
    for (const name of names.filter((n) => n === lang + '.json' || n.endsWith('.' + lang + '.json'))) {
      it(`${name}: no letters of the other script, same placeholders as English`, () => {
        const en = json(name.replace(lang + '.json', 'en.json'));
        const data = json(name);
        const mixed = Object.entries(data).filter(([k, v]) => !MIXED_ON_PURPOSE.has(k) && foreign.test(v)).map(([k]) => k);
        const placeholders = Object.keys(data).filter((k) => k in en && holes(data[k]) !== holes(en[k]));
        expect(mixed).toEqual([]);
        expect(placeholders).toEqual([]);
      });
    }
  }
});
