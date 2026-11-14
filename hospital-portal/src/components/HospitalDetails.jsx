import CapabilityBadges from './CapabilityBadges.jsx';
import SimulatedBadge from './SimulatedBadge.jsx';
import { useT } from '../i18n/index.js';
import { typeText } from '../i18n/phrases.js';

/** Side panel shown when a hospital marker is clicked. */
export default function HospitalDetails({ hospital, type, onClose }) {
  const t = useT();
  if (!hospital) {
    return (
      <div className="rounded-2xl bg-white p-6 text-slate-500 shadow">
        {t('hd.hint')}
      </div>
    );
  }
  const a = hospital.availability || {};

  return (
    <div className="rounded-2xl bg-white p-6 shadow space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">{hospital.name}</h2>
          <p className="text-slate-600">{hospital.address}</p>
          <p className="text-slate-600">{hospital.phone}</p>
        </div>
        <button onClick={onClose} className="text-2xl text-slate-400 hover:text-slate-700" aria-label={t('common.close')}>
          ×
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-100 p-3">
          <div className="text-sm text-slate-500">{t('hd.distance')}</div>
          <div className="text-2xl font-bold">{t('u.km', { n: hospital.distance_km })}</div>
        </div>
        <div className="rounded-xl bg-slate-100 p-3">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            {t('hd.travel')} <SimulatedBadge text={t('hd.simEta')} className="!text-xs" />
          </div>
          <div className="text-2xl font-bold">{t('u.min', { n: hospital.eta_min })}</div>
        </div>
      </div>

      {type && (
        <div
          className={`rounded-xl p-3 font-semibold ${
            hospital.capability_match ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {hospital.capability_match
            ? t('hd.match', { type: typeText(t, type) })
            : t('hd.miss', { type: typeText(t, type) })}
        </div>
      )}

      <div>
        <h3 className="mb-2 font-semibold">{t('hd.capabilities')}</h3>
        <CapabilityBadges capabilities={hospital.capabilities} />
      </div>

      <div>
        <h3 className="mb-2 font-semibold">{t('hd.availability')}</h3>
        <ul className="grid grid-cols-2 gap-2 text-lg">
          <li>{t('hd.bedsFree')} <b>{a.beds_free ?? '–'}</b></li>
          <li>{t('hd.icuFree')} <b>{a.icu_free ?? '–'}</b></li>
          <li>{t('hd.cathReady')} <b>{a.cath_lab_ready ? t('common.yes') : t('common.no')}</b></li>
          <li>{t('hd.strokeReady')} <b>{a.stroke_unit_ready ? t('common.yes') : t('common.no')}</b></li>
        </ul>
      </div>
    </div>
  );
}
