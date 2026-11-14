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
