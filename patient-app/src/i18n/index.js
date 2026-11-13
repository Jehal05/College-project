// i18next setup: English, Hindi and Gujarati.
// IMPORTANT: the Hindi and Gujarati safety text has NOT been reviewed by a native speaker yet.
// Do not present it as final: see docs/TRANSLATION_REVIEW.md. English is the fallback for any missing key.
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import hi from './hi.json';
import gu from './gu.json';

// Each language is always written in its own script, whatever language is active.
export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'gu', label: 'ગુજરાતી' },
];
const CODES = LANGUAGES.map((l) => l.code);
const STORAGE_KEY = 'ht.lang'; // only the language code is stored here, never health data

function savedLanguage() {
  try {
    const code = localStorage.getItem(STORAGE_KEY);
    return CODES.includes(code) ? code : 'en';
  } catch {
    return 'en';
  }
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, hi: { translation: hi }, gu: { translation: gu } },
  lng: savedLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

// Keep <html lang> and the saved choice in step with the active language.
const apply = (code) => {
  document.documentElement.lang = code;
  try { localStorage.setItem(STORAGE_KEY, code); } catch { /* storage blocked: the app still works */ }
};
apply(i18n.language);
i18n.on('languageChanged', apply);

// Change the language (ignores codes we do not support).
export const setLanguage = (code) => (CODES.includes(code) ? i18n.changeLanguage(code) : Promise.resolve());
export const isSupportedLanguage = (code) => CODES.includes(code);

export default i18n;
