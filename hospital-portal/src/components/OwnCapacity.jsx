// Capacity strip for THIS desk's hospital (C2): beds, ICU, cath lab, stroke unit. Missing numbers read "Not shared".
import { useAuth } from './AuthProvider.jsx';
import { useHospitals } from './HospitalProvider.jsx';
import { capacityView } from '../services/capacity.js';
import { useT } from '../i18n/index.js';
import { capText } from '../i18n/phrases.js';

const UNIT_STYLE = {
  ready: 'bg-emerald-100 text-emerald-900',
  not_ready: 'bg-red-100 text-red-900',
  absent: 'bg-slate-100 text-slate-600',
  unknown: 'bg-slate-100 text-slate-600',
};

function Item({ id, label, text, state }) {
  return (
    <div data-testid={`cap-${id}`} data-state={state || 'count'} className={`rounded-lg px-3 py-1.5 ${state ? UNIT_STYLE[state] : 'bg-slate-100 text-slate-900'}`}>
      <dt className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</dt>
      <dd className="text-lg font-bold">{text}</dd>
    </div>
  );
}

export default function OwnCapacity() {
  const { session } = useAuth();
  const { hospitals } = useHospitals();
  const t = useT();
  const view = capacityView(hospitals.find((h) => h.id === String(session?.hospital_id)));
  if (!view) return null;
  return (
    <section aria-label={t('cap.aria')} data-testid="own-capacity" className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-slate-300 bg-white px-6 py-3">
      <div>
        <div className="text-sm text-slate-500">{t('cap.yourHospital')}</div>
        <div data-testid="own-capacity-name" className="text-lg font-bold">{view.name}</div>
      </div>
      <dl className="flex flex-wrap gap-3">
        <Item id="beds" label={t('cap.beds')} text={capText(t, view.beds.text)} />
        <Item id="icu" label={t('cap.icu')} text={capText(t, view.icu.text)} />
        <Item id="cath" label={t('cap.cath')} text={capText(t, view.cath.text)} state={view.cath.state} />
        <Item id="stroke" label={t('cap.stroke')} text={capText(t, view.stroke.text)} state={view.stroke.state} />
      </dl>
      {!view.accepting && <span data-testid="cap-not-accepting" className="rounded-lg bg-red-600 px-3 py-1.5 font-bold text-white">{t('cap.notAccepting')}</span>}
      <span className="text-sm text-slate-500">{t('cap.sample')}</span>
    </section>
  );
}
