// Small time helpers for the "Time since alert" clock.

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
