// 2D body map, drawn by hand in SVG (no image file, no licence issue). Organs are shapes you can click; the same organs are
// always available in the list next to it, which is the accessible way to choose one (keyboard and screen reader).
// "Focus" zooms the map to the chosen organ by changing the visible box.
import { useTranslation } from 'react-i18next';
import { ORGANS } from '../../config/organs';

const WHOLE = [0, 0, 200, 420];

export default function BodyMap({ selected, onSelect, focus }) {
  const { t } = useTranslation();
  const chosen = ORGANS.find((o) => o.key === selected);
  const box = focus && chosen ? chosen.focus : WHOLE;
  return (
    <svg role="img" aria-label={t('dtwin.map.label', { organ: t('dtwin.organ.' + selected + '.name') })} viewBox={box.join(' ')}
      className="mx-auto h-[540px] w-full max-w-[330px]">
      <defs>
        <filter id="organ-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <g fill="rgb(var(--ht-card))" stroke="rgb(var(--ht-line))" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
        <circle cx="100" cy="34" r="26" />
        <rect x="90" y="58" width="20" height="18" rx="6" />
        <path d="M58 82 Q100 70 142 82 L152 200 Q100 214 48 200 Z" />
        <path d="M56 86 L30 196 L44 200 L62 130 Z" /><path d="M144 86 L170 196 L156 200 L138 130 Z" />
        <path d="M58 206 L72 400 L94 400 L100 250 L106 400 L128 400 L142 206 Z" />
      </g>
      <g>
        {ORGANS.map((o) => {
          const on = o.key === selected;
          return (
            <g key={o.key} aria-hidden="true" onClick={() => onSelect(o.key)} style={{ cursor: 'pointer' }} filter={on ? 'url(#organ-glow)' : undefined}>
              {o.shapes.map((s, i) => (
                <ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry}
                  fill={on ? 'rgb(var(--ht-accent) / 0.55)' : 'rgb(var(--ht-accent) / 0.14)'} stroke="rgb(var(--ht-accent))" strokeWidth={on ? 2.5 : 1.2} />
              ))}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
