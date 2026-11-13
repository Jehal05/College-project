import { formatTime } from '../AlertCard.jsx';
import { accuracyText } from '../../services/locationText.js';
import { useT } from '../../i18n/index.js';

/** Patient ID, emergency ID, alert time and location. Missing data reads "Not shared". */
export default function PatientFacts({ emergency: e }) {
  const t = useT();
  return (
    <dl className="grid grid-cols-2 gap-4 text-lg">
      <div><dt className="text-sm text-slate-500">{t('detail.patientId')}</dt><dd className="font-semibold">{e.patient_id ?? t('common.notShared')}</dd></div>
      <div><dt className="text-sm text-slate-500">{t('detail.emergencyId')}</dt><dd className="font-semibold">{e.emergency_id}</dd></div>
      <div><dt className="text-sm text-slate-500">{t('detail.alertTime')}</dt><dd className="font-semibold">{formatTime(e.created_at)}</dd></div>
      <div>
        <dt className="text-sm text-slate-500">{t('detail.location')}</dt>
        <dd className="font-semibold">
          {e.location ? `${e.location.lat.toFixed(4)}, ${e.location.lng.toFixed(4)}${accuracyText(e.location)}` : t('common.notShared')}
        </dd>
      </div>
    </dl>
  );
}
