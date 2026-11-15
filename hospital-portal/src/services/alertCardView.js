// Small pure helpers for the alert card (Phase 6A step 4). Tests: alertCardView.test.js.

/** A text symbol per severity, shown next to the severity WORD, so colour is never the only signal. */
export const SEVERITY_ICON = { EMERGENCY: '▲', URGENT: '◆', WATCH: '●', NONE: '○' };
export const severityIcon = (severity) => SEVERITY_ICON[severity] || SEVERITY_ICON.NONE;

/**
 * Distance from the alerted hospital to the patient, ONLY if the event really carried one
 * (backend `hospital.distance_km`). Never worked out or guessed here: otherwise null.
 */
export function cardDistanceKm(alert) {
  const v = alert?.alerted_distance_km;
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v * 10) / 10 : null;
}
