// Small line chart for themed screens. Hand-drawn SVG: the usual range is a soft band, the line uses the accent colour.
// Accessible: a text summary names the latest, lowest and highest values, and a hidden table lists every point.
import { useTranslation } from 'react-i18next';
import Panel from '../ui/Panel';
import { DataSourceBadge } from '../ui/Badge';
import { stats } from '../../utils/overview';

const W = 300; const H = 90;

export default function TrendChart({ name, unit, values, band, source = 'simulated' }) {
  const { t } = useTranslation();
  const s = stats(values);
  if (!s) {
    return (
      <Panel as="figure"><figcaption className="mb-1 font-semibold">{name}</figcaption>
        <p className="text-sm text-ht-muted">{t('overview.trend.empty')}</p></Panel>
    );
  }
  const all = [...values, ...(band ? [band.min, band.max] : [])];
  const lo = Math.min(...all) - 1; const hi = Math.max(...all) + 1;
  const y = (v) => H - ((v - lo) / (hi - lo || 1)) * H;
  const step = values.length > 1 ? W / (values.length - 1) : 0;
  const pts = values.map((v, i) => (i * step).toFixed(1) + ',' + y(v).toFixed(1)).join(' ');
  const summary = t('overview.trend.summary', { name, latest: s.latest, min: s.min, max: s.max, unit });
  return (
    <Panel as="figure">
      <figcaption className="mb-1 flex items-center justify-between gap-2">
        <span className="font-semibold">{name}</span><DataSourceBadge source={source} short />
      </figcaption>
      <svg role="img" aria-label={summary} viewBox={'0 -2 ' + W + ' ' + (H + 4)} preserveAspectRatio="none" className="h-24 w-full">
        {band && <rect x="0" y={y(band.max)} width={W} height={Math.max(1, y(band.min) - y(band.max))} fill="rgb(var(--ht-accent2) / 0.18)" />}
        <polyline points={pts} fill="none" stroke="rgb(var(--ht-accent))" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <p className="mt-1 text-sm text-ht-muted">{summary}</p>
      <div className="sr-only"><table><caption>{t('overview.trend.table', { name })}</caption>
        <tbody>{values.map((v, i) => <tr key={i}><th scope="row">{i + 1}</th><td>{v} {unit}</td></tr>)}</tbody></table></div>
    </Panel>
  );
}
