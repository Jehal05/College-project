// One block of the responder page: a heading and a plain list, or a short note when the patient did not share it.
import { useTranslation } from 'react-i18next';

export default function PassportSection({ title, items, shared = true }) {
  const { t } = useTranslation();
  return (
    <section aria-label={title} className="mb-4 rounded-xl border border-slate-300 p-4">
      <h2 className="mb-1 text-lg font-bold">{title}</h2>
      {!shared ? <p className="text-lg text-slate-700">{t('view.notShared')}</p>
        : items.length === 0 ? <p className="text-lg text-slate-700">{t('view.none')}</p>
          : <ul className="list-disc pl-6 text-xl">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>}
    </section>
  );
}
