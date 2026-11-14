import i18n from '../i18n';

// Time helpers: the "Time since alert" clock and date/number formatting in the active language.

// 75 -> "01:15", and 3725 -> "1:02:05" once an hour has passed.
export function formatElapsed(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const two = (n) => String(n).padStart(2, '0');
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? h + ':' + two(m) + ':' + two(s % 60) : two(m) + ':' + two(s % 60);
}

// Whole seconds between two ISO timestamps (never negative).
export const secondsBetween = (fromIso, toIso) => Math.max(0, Math.floor((Date.parse(toIso) - Date.parse(fromIso)) / 1000));

// Dates and numbers follow the active language (Intl). Fixed tokens such as 112, SpO2 and phone numbers are never formatted.
const LOCALES = { en: 'en-IN', hi: 'hi-IN', gu: 'gu-IN' };
export const currentLocale = () => LOCALES[i18n.language] || 'en-IN';
export const formatTime = (iso) => new Date(iso).toLocaleTimeString(currentLocale());
export const formatDate = (iso) => new Date(iso).toLocaleDateString(currentLocale());
export const formatDateTime = (iso) => new Date(iso).toLocaleString(currentLocale());
export const formatNumber = (n, options) => new Intl.NumberFormat(currentLocale(), options).format(n);
