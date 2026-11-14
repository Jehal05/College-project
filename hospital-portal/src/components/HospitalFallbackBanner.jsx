import { useEffect, useState } from 'react';
import { useHospitals } from './HospitalProvider.jsx';
import { useT } from '../i18n/index.js';
import { isHospitalFallback, onHospitalFallback } from '../services/hospitalSource.js';

/** Shown when the backend could not give the hospital list and the saved sample list is used instead. */
export default function HospitalFallbackBanner() {
  const t = useT();
  const { reload, loading } = useHospitals();
  const [on, setOn] = useState(isHospitalFallback());
  useEffect(() => onHospitalFallback(setOn), []);
  if (!on) return null;
  return (
    <div role="alert" data-testid="hospital-fallback-banner" className="flex flex-wrap items-center gap-3 border-b-2 border-amber-600 bg-amber-50 px-6 py-2 text-lg font-semibold text-amber-900">
      <span>{t('hospitals.fallback')}</span>
      <button data-testid="hospital-fallback-retry" onClick={() => reload()} disabled={loading} className="rounded-lg border-2 border-amber-700 bg-white px-4 py-1 font-semibold hover:bg-amber-100 disabled:opacity-60">
        {loading ? t('offline.reloading') : t('offline.reload')}
      </button>
    </div>
  );
}
