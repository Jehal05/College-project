// Language choice: saved in localStorage, applied to <html lang>, shared with React through useT().
import { useSyncExternalStore } from 'react';
import { translate, isLang, LANGS } from './translate.js';

const KEY = 'ht_lang';
const listeners = new Set();
let lang = null;

function read() {
  try {
    const v = localStorage.getItem(KEY);
    if (isLang(v)) return v;
  } catch {
    /* storage blocked: English */
  }
  return 'en';
}
function applyHtmlLang(code) {
  if (typeof document !== 'undefined') document.documentElement.lang = (LANGS.find((l) => l.code === code) || LANGS[0]).htmlLang;
}
export const getLang = () => {
  if (lang === null) {
    lang = read();
    applyHtmlLang(lang);
  }
  return lang;
};
export const subscribeLang = (cb) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
export function setLang(code) {
  if (!isLang(code) || code === getLang()) return;
  lang = code;
  try {
    localStorage.setItem(KEY, code);
  } catch {
    /* not saved, still applied */
  }
  applyHtmlLang(code);
  listeners.forEach((cb) => cb());
}

/** const t = useT(); t('nav.map') */
export function useT() {
  const current = useSyncExternalStore(subscribeLang, getLang);
  return (key, vars) => translate(current, key, vars);
}
export { LANGS };
