// Simple bar chart drawn with SVG (feature #30). No chart library needed, so it works offline.
// Built for a jury: large text, a title, a labelled axis, the value printed on every bar, and
// colour-blind-safe colours (the numbers and labels carry the meaning, not only the colour).
export const PALETTE = ['#0072B2', '#E69F00', '#009E73', '#CC79A7', '#D55E00', '#56B4E9']; // Okabe-Ito

/**
 * rows: [{ label, value, text? }]   text is what is printed on the bar (defaults to value)
 * axisLabel: what the bar length means, e.g. "Number of emergencies"
 */
export default function BarChart({ title, rows, axisLabel, color = PALETTE[0], testId, emptyText = 'Not enough data yet' }) {
  const max = Math.max(0, ...rows.map((r) => r.value ?? 0));
  const hasData = rows.some((r) => (r.value ?? 0) > 0);
  const rowH = 46;
  // Room for the longest label and the longest value text, so nothing is cut off.
  const longest = (f) => Math.max(0, ...rows.map((r) => String(f(r)).length));
  const labelW = Math.max(210, longest((r) => r.label) * 11 + 24);
  const valueW = Math.max(110, longest((r) => r.text ?? r.value) * 13 + 20);
  const chartW = 300;
  const height = rows.length * rowH + 44;

  return (
    <section data-testid={testId} data-has-data={hasData} className="rounded-2xl bg-white p-5 shadow">
      <h2 className="mb-3 text-2xl font-bold">{title}</h2>
      {!hasData ? (
        <p data-testid="no-data" className="rounded-xl bg-slate-100 p-6 text-xl text-slate-600">{emptyText}</p>
      ) : (
        <svg role="img" aria-label={`${title}. ${rows.map((r) => `${r.label}: ${r.text ?? r.value}`).join('. ')}`} viewBox={`0 0 ${labelW + chartW + valueW} ${height}`} className="w-full" style={{ maxHeight: height * 1.6 }}>
          {rows.map((r, i) => {
            const w = max ? Math.max(r.value > 0 ? 6 : 0, (r.value / max) * chartW) : 0;
            const y = i * rowH + 6;
            return (
              <g key={r.label} data-testid="bar" data-label={r.label} data-value={r.value}>
                <text x={labelW - 12} y={y + 22} textAnchor="end" fontSize="20" fill="#0f172a">{r.label}</text>
                <rect x={labelW} y={y} width={w} height={32} rx="5" fill={r.color || color} />
                <text x={labelW + w + 10} y={y + 24} fontSize="22" fontWeight="700" fill="#0f172a">{r.text ?? r.value}</text>
              </g>
            );
          })}
          <line x1={labelW} x2={labelW} y1="0" y2={rows.length * rowH + 6} stroke="#64748b" strokeWidth="2" />
          <text x={labelW} y={height - 8} fontSize="18" fill="#475569">{axisLabel}</text>
        </svg>
      )}
    </section>
  );
}
