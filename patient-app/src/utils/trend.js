// Vitals trend: the last 60 readings of each vital, kept in memory only (a ring buffer), plus the plain-words helpers.
// Nothing here judges the numbers. The label comes from twin.js (inside or outside the person's own usual range).
export const WINDOW = 60; // readings, one per second, so "the last minute"
export const SERIES = ['heart_rate', 'spo2', 'bp_sys', 'bp_dia', 'glucose'];

export const emptyHistory = () => Object.fromEntries(SERIES.map((k) => [k, []]));

// Add one reading and keep only the newest WINDOW values of each series. Returns a new object.
export function pushReading(history, reading, size = WINDOW) {
  const next = {};
  SERIES.forEach((k) => {
    const old = history[k] || [];
    next[k] = typeof reading[k] === 'number' ? [...old, reading[k]].slice(-size) : old;
  });
  return next;
}

// The usual range for one series, taken from the baseline (bp_sys / bp_dia are called bp_systolic / bp_diastolic there).
export function bandFor(key, baseline) {
  if (!baseline) return null;
  return baseline[{ bp_sys: 'bp_systolic', bp_dia: 'bp_diastolic' }[key] || key] || null;
}

// Smallest and largest value of a series, or null when it is empty.
export const spread = (values) => (values.length ? { min: Math.min(...values), max: Math.max(...values) } : null);
