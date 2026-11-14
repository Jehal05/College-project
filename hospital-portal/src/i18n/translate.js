// Pure translation lookup (no browser, no storage). English is the fallback for any missing key.
import en from './en.js';
import hi from './hi.js';
import gu from './gu.js';

export const DICTS = { en, hi, gu };
export const LANGS = [
  { code: 'en', name: 'English', htmlLang: 'en' },
  { code: 'hi', name: 'हिन्दी', htmlLang: 'hi' },
  { code: 'gu', name: 'ગુજરાતી', htmlLang: 'gu' },
];
export const isLang = (c) => Object.prototype.hasOwnProperty.call(DICTS, c);

/** t('offline.back', { n: 3 }) → text in `lang`; falls back to English, then to the key itself. */
export function translate(lang, key, vars = {}) {
  const raw = DICTS[isLang(lang) ? lang : 'en'][key] ?? en[key] ?? key;
  return raw.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
}
