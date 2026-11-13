// The screen version of the post-incident summary. A plain record: times, steps, what was shared. No interpretation.
import { useTranslation } from 'react-i18next';
import { formatDateTime, formatTime } from '../utils/time';
import { summaryFacts } from '../utils/summaryText';

const H = 'mt-4 text-base font-bold';

export default function SummaryView({ summary }) {
  const { t } = useTranslation();
  const f = summaryFacts(summary, t);
  const none = <p>{t('summary.none')}</p>;
  return (
    <div>
      <p className="font-semibold">{t('summary.record')}</p>
      <p className="mt-2">{t('summary.started', { time: formatDateTime(summary.started_at) })}</p>
      <p>{t('summary.startedBy', { who: f.startedBy })}</p>
      <h2 className={H}>{t('summary.timeline')}</h2>
      <ol className="list-decimal pl-5">
        {summary.timeline.map((e, i) => <li key={i}>{formatTime(e.timestamp)}: {t('state.' + e.state)}</li>)}
      </ol>
      {f.durations.length > 0 && <ul className="mt-2 list-disc pl-5">{f.durations.map((d) => <li key={d}>{d}</li>)}</ul>}
      <h2 className={H}>{t('summary.sharedTitle')}</h2>
      {f.shared.length ? <p>{f.shared.join(', ')}</p> : <p>{t('summary.nothingShared')}</p>}
      <h2 className={H}>{t('summary.hospital')}</h2>
      {summary.hospital ? <p>{summary.hospital.name}</p> : none}
      <h2 className={H}>{t('summary.contactsTitle')}</h2>
      {summary.contacts_notified.length ? <p>{summary.contacts_notified.map((c) => c.name).join(', ')}</p> : none}
      <h2 className={H}>{t('summary.symptomsTitle')}</h2>
      {summary.symptoms.length ? <ul className="list-disc pl-5">{summary.symptoms.map((id) => <li key={id}>{t('symptom.' + id)}</li>)}</ul> : none}
      {f.readings.length > 0 && (
        <>
          <h2 className={H}>{t('summary.readingsTitle')}</h2>
          <ul className="list-disc pl-5">{f.readings.map((r) => <li key={r.key}>{t('twin.' + r.key)}: {r.value} {t(r.unit)}</li>)}</ul>
        </>
      )}
    </div>
  );
}
