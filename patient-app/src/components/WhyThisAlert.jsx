// "Why this alert": what the person told us, what the shared readings showed, and which checklist matched, in plain words.
// Collapsed until opened. It never diagnoses, never shows a score, and never blocks the emergency flow if it cannot load.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useReasons from '../hooks/useReasons';
import { reasonsView } from '../utils/reasons';
import { formatTime } from '../utils/time';

export default function WhyThisAlert({ emergencyId, source }) {
  const { t } = useTranslation();
  const { data, status, load } = useReasons(emergencyId);
  const [open, setOpen] = useState(false);
  const toggle = () => { if (!open && status === 'idle') load(); setOpen(!open); };
  const view = status === 'ready' ? reasonsView(data) : null;
  const fromCheckIn = source === 'FALL_CHECK' || source === 'INACTIVITY_CHECK';

  return (
    <section aria-label={t('why.title')} className="mt-4 rounded-xl bg-white p-4 text-slate-900">
      <button type="button" aria-expanded={open} aria-controls={'why-' + emergencyId} onClick={toggle}
        className="flex min-h-[48px] w-full items-center justify-between text-left text-lg font-bold">
        {t('why.title')}<span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div id={'why-' + emergencyId} className="mt-2 text-sm">
          {status === 'loading' && <p role="status">{t('why.loading')}</p>}
          {status === 'error' && <p role="status">{t('why.unavailable')}</p>}
          {view && (
            <>
              <h3 className="font-bold">{t('why.told')}</h3>
              {view.symptoms.length
                ? <ul className="mb-3 list-disc pl-5">{view.symptoms.map((id) => <li key={id}>{t('symptom.' + id)}</li>)}</ul>
                : <p className="mb-3">{fromCheckIn ? t('why.noneCheckIn') : t('why.noneReported')}</p>}
              <h3 className="font-bold">{t('why.readings')}</h3>
              {view.readings.length ? (
                <>
                  <ul className="list-disc pl-5">
                    {view.readings.map((r) => <li key={r.key}>{t('twin.' + r.key)}: {r.value} {t(r.unit)}</li>)}
                  </ul>
                  {view.readingsAt && <p className="mb-3 text-xs text-slate-700">{t('why.readingsAt', { time: formatTime(view.readingsAt) })}</p>}
                </>
              ) : <p className="mb-3">{t('why.noReadings')}</p>}
              <h3 className="font-bold">{t('why.checklist')}</h3>
              {!view.matched && <p>{t('why.noMatch')}</p>}
              {view.reviewedLines.length > 0 && <ul className="list-disc pl-5">{view.reviewedLines.map((l) => <li key={l.id}>{l.text}</li>)}</ul>}
              {view.hasUnreviewed && <p>{t('why.neutral')}</p>}
              <p className="mt-3 text-slate-700">{t('why.draft')}</p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
