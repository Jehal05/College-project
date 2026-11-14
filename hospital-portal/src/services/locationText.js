/** " (±15 m)" only when the phone reported a real accuracy; nothing for 0, missing or bad values. */
export function accuracyText(location) {
  const m = Number(location?.accuracy_m ?? location?.accuracy);
  return Number.isFinite(m) && m > 0 ? ` (±${Math.round(m)} m)` : '';
}
