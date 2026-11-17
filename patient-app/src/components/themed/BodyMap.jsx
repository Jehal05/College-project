// 2D body map, drawn by hand in SVG (no image file, no licence issue). Organs are organ-shaped drawings (config/organArt.js) you can click; the same organs are
// always available in the list next to it, which is the accessible way to choose one (keyboard and screen reader).
// "Focus" zooms the map to the chosen organ by changing the visible box.
import { useTranslation } from 'react-i18next';
import { ORGANS } from '../../config/organs';
import { ORGAN_ORDER } from '../../config/organArt';
import { OrganShape, Windpipe } from './organShapes';

const WHOLE = [0, 0, 200, 420];
export default function BodyMap({ selected, onSelect, focus }) {
  const { t } = useTranslation();
  const chosen = ORGANS.find((o) => o.key === selected);
  const box = focus && chosen ? chosen.focus : WHOLE;
  return (
    <svg role="img" aria-label={t('dtwin.map.label', { organ: t('dtwin.organ.' + selected + '.name') })} viewBox={box.join(' ')}
      className="mx-auto h-[540px] w-full max-w-[330px]">
      <defs>
        <linearGradient id="body-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="rgb(var(--ht-card))" /><stop offset="1" stopColor="rgb(var(--ht-bg2))" /></linearGradient>
        <filter id="organ-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      {/* A friendly, simple figure (soft shapes, no face, no bones) with organs drawn as recognisable shapes. */}
      <g fill="url(#body-fill)" stroke="rgb(var(--ht-line))" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
        <path d="M91 50 H109 V74 H91 Z" />
        <path d="M54 84 Q40 86 38 104 L31 168 Q29 182 27 192 Q25 205 33 207 Q41 207 41 195 L51 150 L59 110 Z" />
        <path d="M54 84 Q40 86 38 104 L31 168 Q29 182 27 192 Q25 205 33 207 Q41 207 41 195 L51 150 L59 110 Z" transform="translate(200 0) scale(-1 1)" />
        <path d="M62 230 Q60 280 70 310 Q72 350 74 392 Q66 398 62 408 Q64 414 76 414 L92 414 Q98 410 96 396 Q98 350 98 310 L99 230 Z" />
        <path d="M62 230 Q60 280 70 310 Q72 350 74 392 Q66 398 62 408 Q64 414 76 414 L92 414 Q98 410 96 396 Q98 350 98 310 L99 230 Z" transform="translate(200 0) scale(-1 1)" />
        <path d="M62 80 Q100 66 138 80 Q147 85 145 100 L139 150 Q137 175 135 200 Q133 218 139 234 L61 234 Q67 218 65 200 Q63 175 61 150 L55 100 Q53 85 62 80 Z" />
        <ellipse cx="100" cy="30" rx="21" ry="25" />
      </g>
      <g>
        {[...ORGANS].sort((x, y) => ORGAN_ORDER.indexOf(x.key) - ORGAN_ORDER.indexOf(y.key)).map((o) => {
          const on = o.key === selected;
          return (
            <g key={o.key} data-organ={o.key} aria-hidden="true" onClick={() => onSelect(o.key)} style={{ cursor: 'pointer' }} filter={on ? 'url(#organ-glow)' : undefined}>
              <title>{t('dtwin.organ.' + o.key + '.name')}</title>
              {o.key === 'lungs' && <Windpipe selected={on} />}
              {o.shapes.map((sh, i) => (
                <OrganShape key={i} organKey={o.key} index={i} shape={sh} selected={on} flip={o.key === 'kidneys' && sh.cx > 100 ? -1 : 1} />
              ))}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
