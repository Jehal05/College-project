// Small pure helpers that turn the portal's English labels into the chosen language (t = the function from useT()).
// Anything without a key stays in English, so nothing is ever blank.
import { STATE_LABELS, TYPE_LABELS } from '../services/contract.js';

const withFallback = (t, key, fallback) => {
  const v = t(key);
  return v === key ? fallback : v;
};

/** Long state label for cards and the detail header. */
export const stateText = (t, state) => withFallback(t, `state.${state}`, STATE_LABELS[state] || state);

/** Timeline step label. `english` is what the Timeline would show on its own. */
export const stepText = (t, state, english) => withFallback(t, `tl.${state}`, english);

/** Action button label (Acknowledge, Dispatch, ...). */
export const actionText = (t, target, english) => withFallback(t, `action.${target}`, english);

const CAP = { Ready: 'cap.ready', 'Not ready': 'cap.notReady', 'Not shared': 'common.notShared', 'No cath lab': 'cap.noCath', 'No stroke unit': 'cap.noStroke', 'No ICU': 'cap.noIcu', 'No emergency department': 'cap.noEmergency' };
/** Words the capacity strip gets from services/capacity.js. Numbers and unknown words pass through. */
export const capText = (t, text) => (CAP[text] ? t(CAP[text]) : text);

const DATE_LOCALES = { hi: 'hi-IN', gu: 'gu-IN' };
/** Date and time for the Activity page in the chosen language. English uses the browser default, as before. */
export const formatWhen = (iso, lang) => new Date(iso).toLocaleString(DATE_LOCALES[lang] || [], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });

/** "Nov 12, 2026, 6:30 PM" in the chosen language (History table). English keeps the browser default, as before. */
export const formatCreated = (iso, lang) => new Date(iso).toLocaleString(DATE_LOCALES[lang] || [], { dateStyle: 'medium', timeStyle: 'short' });

/** Why a hospital was ruled out ("Not verified", "No cath lab, No ICU"). Unknown words stay as they are. */
export const ruledOutText = (t, reason) =>
  String(reason ?? '').split(', ').map((part) => (part === 'Not verified' ? withFallback(t, 'rk.notVerified', part) : capText(t, part))).join(', ');

/** Severity word (EMERGENCY, URGENT, WATCH). An unknown word stays as it is. */
export const severityText = (t, severity) => withFallback(t, `sev.${severity}`, severity);

/** Emergency type name (Heart attack, Stroke, ...). An unknown type stays as it is. */
export const typeText = (t, type) => withFallback(t, `type.${type}`, TYPE_LABELS[type] || type);

/** Duration in the chosen language ("55 s" in English). Same rounding as formatSeconds in services/report.js. */
export function durationText(t, totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return t('dur.sec', { s });
  const m = Math.floor(s / 60);
  return m < 60 ? t('dur.minSec', { m, s: s % 60 }) : t('dur.hourMin', { h: Math.floor(m / 60), m: m % 60 });
}
