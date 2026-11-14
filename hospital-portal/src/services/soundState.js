// Pure rules for the alert-sound control (tests: soundState.test.js).
//   enabled   = the desk wants alert sounds (saved choice, default on)
//   ctxState  = Web Audio state: 'running' | 'suspended' | 'closed' | null (not created yet)
// Browsers keep sound blocked until the user clicks something on the page, so a fresh page is "needs-click".

export const SOUND_KEY = 'ht_sound';

/** off | needs-click | on */
export function soundStatus(enabled, ctxState) {
  if (!enabled) return 'off';
  return ctxState === 'running' ? 'on' : 'needs-click';
}

/** Read the saved choice: only the text "off" turns sound off. Anything else (or nothing) means on. */
export const parseEnabled = (raw) => raw !== 'off';
export const serializeEnabled = (enabled) => (enabled ? 'on' : 'off');

/** Should an alert make a sound right now? Only when it is switched on AND the browser allows it. */
export const shouldPlay = (enabled, ctxState) => soundStatus(enabled, ctxState) === 'on';

/** The red/amber "sound is blocked" banner shows only when sound is switched on but the browser still blocks it. */
export const showSoundBanner = (status) => status === 'needs-click';

/** Result of the "Test sound" button, so a silent test never looks like a pass: played | blocked | unsupported. */
export function testOutcome(ctxState, supported = true) {
  if (!supported) return 'unsupported';
  return ctxState === 'running' ? 'played' : 'blocked';
}

// Non-sound cue: the browser tab title blinks when a new alert arrives, so it is noticed even when sound fails.
/** A new alert arrived when the unread count went up. */
export const isNewAlert = (prevUnread, unread) => Number(unread) > Number(prevUnread);

/** Tab title for one blink frame: with the cue on, "(2) NEW ALERT · <base>"; otherwise the normal title. */
export function titleFrame(base, unread, cueOn, label = 'NEW ALERT') {
  const n = Number(unread) > 0 ? `(${unread}) ` : '';
  return cueOn ? `${n}${label} · ${base}` : `${n}${base}`;
}
