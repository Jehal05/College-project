// Hospital ranking table (feature #15), also used as the fallback list (feature #43).
//   ranking        – result of rankHospitals()
//   statuses       – optional { [hospital_id]: 'alerted' | 'next' | ... } from fallbackStatuses()
//   ownHospitalId  – optional, tags the logged-in hospital's row
//   onSelect       – optional, called with the hospital when a row is clicked
import rankingConfig from '../data/ranking-config.json';
import SimulatedBadge from './SimulatedBadge.jsx';
import { useT } from '../i18n/index.js';

const PARTS = [
  ['capability', 'Capability', 'bg-emerald-500'],
  ['travel_time', 'Travel time', 'bg-sky-500'],
  ['availability', 'Availability', 'bg-violet-500'],
];
const STATUS = {
  alerted: ['Alerted now', 'bg-red-600 text-white'],
  next: ['Next if no answer', 'bg-amber-200 text-amber-900'],
  later: ['After that', 'bg-slate-200 text-slate-700'],
  no_answer: ['Alerted · no answer', 'bg-slate-700 text-white'],
  responding: ['Responding', 'bg-emerald-600 text-white'],
  not_needed: ['Not needed', 'bg-slate-100 text-slate-500'],
};
const ORDINAL = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];

export default function RankingTable({ ranking, statuses, ownHospitalId, onSelect }) {
  const t = useT();
  if (!ranking) return null;
  const { ranked, ruledOut } = ranking;
  const w = rankingConfig.weights;

  return (
    <div data-testid="ranking">
      <p className="mb-3 text-sm text-slate-500">
        {t('rk.intro', { c: w.capability * 100, tt: w.travel_time * 100, a: w.availability * 100 })}{' '}
        <SimulatedBadge text={t('rk.simTravel')} className="!text-xs" />
      </p>

      {ranked.length === 0 && (
        <p className="rounded-xl bg-red-100 p-4 text-lg font-semibold text-red-800">
          {t('rk.none')}
        </p>
      )}

      <ol className="space-y-3">
        {ranked.map((row) => {
          const status = statuses?.[row.hospital.id];
          const [statusLabel, statusStyle] = STATUS[status] || [];
          const statusText = statusLabel ? t(`rk.s.${status}`) : null;
          const Tag = onSelect ? 'button' : 'div';
          return (
            <li key={row.hospital.id}>
              <Tag
                data-testid="ranking-row"
                data-id={row.hospital.id}
                data-rank={row.rank}
                data-total={row.total}
                data-status={status || ''}
                onClick={onSelect ? () => onSelect(row.hospital) : undefined}
                className={`block w-full rounded-xl border-2 p-4 text-left ${
                  row.rank === 1 ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'
                } ${onSelect ? 'hover:shadow' : ''}`}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-2xl font-bold text-slate-500">{ORDINAL[row.rank - 1] || `${row.rank}th`}</span>
                  <span className="text-xl font-bold">{row.hospital.name}</span>
                  {row.hospital.id === ownHospitalId && (
                    <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-sm font-semibold text-sky-800">{t('rk.thisHospital')}</span>
                  )}
                  {statusText && <span className={`rounded-full px-3 py-0.5 text-sm font-bold ${statusStyle}`}>{statusText}</span>}
                  <span className="ml-auto text-3xl font-bold tabular-nums">
                    {row.total.toFixed(1)}
                    <span className="text-base font-normal text-slate-500"> / 100</span>
                  </span>
                </div>

                <div className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-3">
                  {PARTS.map(([key, , color]) => (
                    <div key={key} data-part={key} data-points={row.points[key]}>
                      <div className="text-sm font-semibold">{t(`rk.${key}`)}</div>
                      <div className="text-sm tabular-nums text-slate-600">
                        {row.parts[key].toFixed(0)}/100 → <b className="text-slate-900">{row.points[key].toFixed(1)} pts</b>
                      </div>
                      <div className="mt-1 h-3 overflow-hidden rounded-full bg-slate-200">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${row.parts[key]}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <p className="mt-3 text-slate-700">
                  <b>{t('rk.why')}</b> {row.why}
                  {row.distance_km !== null && <span className="text-slate-500"> · {row.distance_km} km</span>}
                </p>
              </Tag>
            </li>
          );
        })}
      </ol>

      {ruledOut.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-2 font-semibold text-slate-600">{t('rk.ruledOut', { n: ruledOut.length })}</h4>
          <ul className="space-y-1.5">
            {ruledOut.map(({ hospital, reason }) => (
              <li
                key={hospital.id}
                data-testid="ruled-out"
                data-id={hospital.id}
                className="flex flex-wrap justify-between gap-2 rounded-lg bg-slate-100 px-3 py-2 text-slate-500"
              >
                <span>{hospital.name}</span>
                <span className="font-semibold">{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
