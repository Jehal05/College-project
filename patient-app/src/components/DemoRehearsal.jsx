// Demo panel: a tick-box list of the rehearsal steps. In memory only, so a reload starts a fresh list.
import { useTranslation } from 'react-i18next';
import { REHEARSAL_STEPS } from '../config/rehearsal';

export default function DemoRehearsal({ done, onToggle }) {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="demo-rehearsal" className="mb-4 rounded-xl border border-slate-300 p-3">
      <h2 id="demo-rehearsal" className="mb-2 text-lg font-bold">{t('rehearsal.title')}</h2>
      <ul>
        {REHEARSAL_STEPS.map((id) => (
          <li key={id}>
            <label className="flex min-h-[44px] items-center gap-3">
              <input type="checkbox" checked={done.includes(id)} onChange={() => onToggle(id)} className="h-6 w-6" />
              <span className={done.includes(id) ? 'line-through' : ''}>{t('rehearsal.' + id)}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
