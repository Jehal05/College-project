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
      {/* Silhouette: head with jaw and neck, sloped shoulders, torso that narrows at the waist, arms with hands, legs with feet. */}
      <g fill="rgb(var(--ht-card))" stroke="rgb(var(--ht-line))" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
        <path d="M100 8 C119 8 128 22 127 38 C126 52 116 62 109 64 L109 74 C122 77 140 78 152 86 C160 91 162 100 160 112 L170 178 C172 190 176 198 178 206 C180 214 172 220 166 214 C160 208 156 196 152 184 L146 140 L150 200 C150 214 146 224 142 236 L130 392 C130 400 134 408 140 414 C144 418 138 420 126 420 L108 420 C103 420 102 412 102 404 L100 262 L98 404 C98 412 97 420 92 420 L74 420 C62 420 56 418 60 414 C66 408 70 400 70 392 L58 236 C54 224 50 214 50 200 L54 140 L48 184 C44 196 40 208 34 214 C28 220 20 214 22 206 C24 198 28 190 30 178 L40 112 C38 100 40 91 48 86 C60 78 78 77 91 74 L91 64 C84 62 74 52 73 38 C72 22 81 8 100 8 Z" />
      </g>
      {/* Faint bones (ribs, spine, collarbones) so the map reads as a body and not a blob. */}
      <g fill="none" stroke="rgb(var(--ht-line))" strokeWidth="1.2" strokeOpacity="0.7" strokeLinecap="round" aria-hidden="true">
        <path d="M100 80 L100 232" strokeDasharray="3 3" />
        <path d="M100 84 Q74 82 58 92 M100 84 Q126 82 142 92" />
        <path d="M100 100 Q72 102 62 124 M100 100 Q128 102 138 124 M100 116 Q76 118 66 142 M100 116 Q124 118 134 142 M100 132 Q80 134 72 156 M100 132 Q120 134 128 156" />
        <path d="M70 212 Q100 232 130 212" />
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
