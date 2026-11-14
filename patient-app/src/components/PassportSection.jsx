// One block of the responder page: a heading and a plain list, or a short note when the patient did not share it.
import { useTranslation } from 'react-i18next';

export default function PassportSection({ title, items, shared = true }) {
  const { t } = useTranslation();
  return (
    <section aria-label={title} className="mb-4 rounded-card border border-slate-200 bg-white p-4 shadow-card">
      <h2 className="mb-2 text-lg font-bold text-slate-900">{title}</h2>
      {!shared ? <p className="text-lg text-slate-700">{t('view.notShared')}</p>
        : items.length === 0 ? <p className="text-lg text-slate-700">{t('view.none')}</p>
          : <ul className="list-disc space-y-1 pl-6 text-xl text-slate-900">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>}
    </section>
  );
}
