// Class helpers for the shared UI parts (components/ui). Pure: no React. Tests: uiClasses.test.js.
// Built on the Tailwind classes the portal already uses, so no new tokens or packages.
import { isEarly, isFinal } from './stateMachine.js';

/** Join class names, skipping empty values: cx('a', false, 'b') -> 'a b'. */
export const cx = (...parts) => parts.filter(Boolean).join(' ');

// 44px minimum touch target (min-h-11 / min-w-11) on every button.
const BUTTON_BASE = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-50';
export const BUTTON_VARIANTS = {
  primary: 'bg-slate-800 text-white hover:bg-slate-700',
  secondary: 'border-2 border-slate-300 bg-white text-slate-900 hover:bg-slate-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'text-sky-800 underline hover:bg-slate-100',
};
export const buttonClass = (variant = 'primary', extra = '') => cx(BUTTON_BASE, BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary, extra);

export const BADGE_TONES = {
  neutral: 'border-slate-400 bg-slate-100 text-slate-800',
  info: 'border-sky-500 bg-sky-100 text-sky-900',
  success: 'border-emerald-500 bg-emerald-100 text-emerald-900',
  warning: 'border-amber-500 bg-amber-100 text-amber-900',
  danger: 'border-red-600 bg-red-100 text-red-900',
};
export const badgeClass = (tone = 'neutral', extra = '') => cx('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm font-semibold', BADGE_TONES[tone] || BADGE_TONES.neutral, extra);

/** Which tone a case state gets. The words and the symbol (not only the colour) carry the meaning. */
export function stateTone(state) {
  if (state === 'CANCELLED') return 'neutral';
  if (state === 'HANDOVER_DONE') return 'success';
  if (isEarly(state)) return 'neutral';
  if (state === 'SOS_SENT' || state === 'ESCALATED') return 'danger';
  if (isFinal(state)) return 'neutral';
  return 'info';
}

/** A short text symbol per tone, so the status never depends on colour alone. */
export const TONE_SYMBOL = { neutral: '○', info: '▶', success: '✓', warning: '!', danger: '●' };
export const toneSymbol = (tone) => TONE_SYMBOL[tone] || TONE_SYMBOL.neutral;
