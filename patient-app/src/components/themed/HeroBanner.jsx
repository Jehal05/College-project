// Page banner like a hospital site's home page: a navy band with a calm line-drawn hospital and a short reassurance.
// The drawing is decorative (hidden from screen readers). The heading is the page's h1.
import { useTranslation } from 'react-i18next';

function Scene() {
  const line = { fill: 'none', stroke: 'rgb(255 255 255 / 0.55)', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const soft = { fill: 'rgb(255 255 255 / 0.08)', stroke: 'rgb(255 255 255 / 0.55)', strokeWidth: 2 };
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 360 150" className="h-full w-full">
      <path d="M0 132h360" style={line} />
      <rect x="120" y="36" width="120" height="96" rx="3" style={soft} />
      <rect x="58" y="70" width="62" height="62" rx="3" style={soft} />
      <rect x="240" y="62" width="62" height="70" rx="3" style={soft} />
      <path d="M180 48v32M164 64h32" style={{ ...line, stroke: 'rgb(255 255 255 / 0.95)', strokeWidth: 5 }} />
      {[136, 156, 196, 216].map((x) => [92, 112].map((y) => <rect key={x + '-' + y} x={x} y={y} width="12" height="10" rx="1.5" style={line} />))}
      {[70, 90].map((x) => <rect key={x} x={x} y="88" width="12" height="10" rx="1.5" style={line} />)}
      {[256, 276].map((x) => <rect key={x} x={x} y="82" width="12" height="10" rx="1.5" style={line} />)}
      <path d="M170 132v-12h20v12" style={line} />
      <circle cx="30" cy="112" r="14" style={soft} /><path d="M30 126v6" style={line} />
      <circle cx="334" cy="112" r="14" style={soft} /><path d="M334 126v6" style={line} />
      <path d="M0 28c40-14 80-14 120 0s80 14 120 0 80-14 120 0" style={{ ...line, stroke: 'rgb(255 255 255 / 0.25)' }} />
    </svg>
  );
}

export default function HeroBanner({ title, subtitle }) {
  const { t } = useTranslation();
  return (
    <section aria-label={t('hero.label')} className="relative overflow-hidden rounded-2xl bg-ht-navy text-white shadow-card"
      style={{ backgroundImage: 'linear-gradient(110deg, rgb(var(--ht-navy)) 35%, rgb(var(--ht-accent) / 0.85) 130%)' }}>
      <div className="grid items-center gap-2 p-5 md:grid-cols-[1fr_320px] md:p-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-white/90">{t('hero.kicker')}</p>
          <h1 className="mt-1 text-2xl font-extrabold md:text-3xl">{title}</h1>
          <p className="mt-2 max-w-xl text-white/90">{subtitle}</p>
        </div>
        <div className="hidden h-36 md:block"><Scene /></div>
      </div>
    </section>
  );
}
