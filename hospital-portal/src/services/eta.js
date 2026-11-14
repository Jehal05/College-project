// Estimated time of arrival text for the tracking map and the fleet page. Pure (tests: eta.test.js).
/** @param t optional translate function (from useT). Without it the text is English ("1 min 05 s"). */
export function formatEta(seconds, t) {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const rest = String(s % 60).padStart(2, '0');
  if (!t) return s < 60 ? `${s} s` : `${m} min ${rest} s`;
  return s < 60 ? t('dur.sec', { s }) : t('dur.minSec', { m, s: rest });
}
