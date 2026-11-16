// A small simulated map of one city: numbered hospital pins and the simulated start point. Drawn as SVG from the city's own
// centre and zoom (GET /cities), so it needs no map server and works offline. It is a picture of the list below it, which
// carries the same information as text, so the SVG is hidden from screen readers except for one summary.
import { useTranslation } from 'react-i18next';
import { mapPins } from '../../utils/cities';

const W = 600; const H = 360;

export default function CityMap({ city, hospitals, start, label }) {
  const { t } = useTranslation();
  const { pins, start: startPin, centre } = mapPins(city, hospitals, start, { width: W, height: H });
  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="h-auto w-full rounded-xl border border-ht-line bg-ht-bg2">
        <g className="stroke-ht-line" strokeWidth="1" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((i) => <line key={'v' + i} x1={(W / 6) * i} y1="0" x2={(W / 6) * i} y2={H} />)}
          {[1, 2, 3].map((i) => <line key={'h' + i} x1="0" y1={(H / 4) * i} x2={W} y2={(H / 4) * i} />)}
        </g>
        <g aria-hidden="true">
          <circle cx={centre.x} cy={centre.y} r="4" className="fill-ht-muted" />
          {startPin && <path d={`M${startPin.x} ${startPin.y - 11} l10 11 l-10 11 l-10 -11 z`} className="fill-ht-warning stroke-ht-bg" strokeWidth="2" />}
          {pins.map((p, i) => (
            <g key={p.id}>
              <circle cx={p.x} cy={p.y} r="13" className="fill-ht-accent stroke-ht-bg" strokeWidth="2" />
              <text x={p.x} y={p.y + 5} textAnchor="middle" className="fill-ht-onaccent" fontSize="14" fontWeight="700">{i + 1}</text>
            </g>
          ))}
          <text x="10" y={H - 10} className="fill-ht-muted" fontSize="13" fontWeight="700">{t('hosp.simulatedMap')}</text>
        </g>
      </svg>
    </figure>
  );
}
