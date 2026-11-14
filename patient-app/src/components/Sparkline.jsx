// A tiny hand-drawn SVG line of the last minute. The person's usual range is a light band behind it.
// It has no animation and no colour meaning; the words next to it say what it shows (the label prop is its text alternative).
const W = 100;
const H = 28;

function points(values, lo, hi) {
  const step = values.length > 1 ? W / (values.length - 1) : 0;
  return values.map((v, i) => (i * step).toFixed(1) + ',' + (H - ((v - lo) / (hi - lo || 1)) * H).toFixed(1)).join(' ');
}

export default function Sparkline({ values, second, band, label }) {
  const all = [...values, ...(second || []), ...(band ? [band.min, band.max] : [])];
  const lo = Math.min(...all) - 1;
  const hi = Math.max(...all) + 1;
  const y = (v) => H - ((v - lo) / (hi - lo)) * H;
  return (
    <svg role="img" aria-label={label} viewBox={'0 -1 ' + W + ' ' + (H + 2)} preserveAspectRatio="none" className="mt-1 h-8 w-full">
      {band && <rect x="0" y={y(band.max)} width={W} height={Math.max(1, y(band.min) - y(band.max))} fill="#cbd5e1" />}
      <polyline points={points(values, lo, hi)} fill="none" stroke="#0f172a" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      {second && <polyline points={points(second, lo, hi)} fill="none" stroke="#0f172a" strokeWidth="1.2" strokeDasharray="3 2" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}
