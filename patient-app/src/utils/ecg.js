// A made-up ECG-like wave for the monitoring screen. It is drawn from the heart rate only: one beat = a small P bump, a sharp
// R spike with a dip either side, then a T bump (sum of narrow bell curves). It is NOT a recording and NOT medical data.
const WAVES = [[0.18, 0.12, 0.025], [0.36, -0.12, 0.008], [0.39, 1.0, 0.010], [0.42, -0.25, 0.010], [0.62, 0.3, 0.05]]; // [position in the beat, height, width]

export function ecgAt(seconds, bpm) {
  const period = 60 / Math.max(30, Math.min(220, bpm || 70));
  const phase = (((seconds % period) + period) % period) / period;
  return WAVES.reduce((sum, [c, h, w]) => sum + h * Math.exp(-((phase - c) ** 2) / (2 * w * w)), 0);
}
