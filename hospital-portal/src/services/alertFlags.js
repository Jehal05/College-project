// When does an alert card flash or show the NEW badge? Pure functions (tests: alertFlags.test.js).
import { isEarly, isFinal } from './stateMachine.js';

export const FLASH_MS = 5000;

/**
 * The moment the flash window starts, in ms: when the alert became a real SOS here (reducer sets flash_from
 * with the LOCAL receive time, so a wrong clock on the backend cannot hide the flash).
 */
export const flashStart = (alert) => (Number.isFinite(alert?.flash_from) ? alert.flash_from : alert?.sos_sent_at ? new Date(alert.sos_sent_at).getTime() : NaN);

/** Flash only a real, open, new alert for a few seconds after it reached this desk. Never early, cancelled or finished. */
export function shouldFlash(alert, nowMs = Date.now()) {
  if (!alert || !alert._new || isEarly(alert.state) || isFinal(alert.state)) return false;
  const start = flashStart(alert);
  return Number.isFinite(start) && nowMs - start >= 0 && nowMs - start < FLASH_MS;
}

/** Text badge "NEW": the non-motion signal that stays until the alert is opened. */
export const showNewBadge = (alert) => Boolean(alert?._new && !alert?._read && !isEarly(alert.state) && !isFinal(alert.state));
