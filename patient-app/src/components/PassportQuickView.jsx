// The anonymous quick view of a passport. Used by the public page (/p/:token) and by the patient's own preview,
// so what the patient previews is exactly what a scanner sees.
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '../utils/time';
import PassportSection from './PassportSection';
import { Avatar } from './ui/Card';
import { InlineNotice } from './ui/Feedback';

export default function PassportQuickView({ data, children }) {
  const { t } = useTranslation();
  return (
    <div data-testid="passport-content">
      <InlineNotice tone="warning" className="mb-3 !text-base font-semibold">{t('view.preparedBy')}</InlineNotice>
      <section aria-label={t('view.patient')} className="mb-4 rounded-card border border-slate-200 bg-white p-4 shadow-card">
        <div className="flex items-center gap-3">
          <Avatar name={data.name} size={56} />
          <div className="min-w-0">
            <h2 className="break-words text-2xl font-bold text-slate-900">{data.name}</h2>
            <p className="text-slate-700">{t('view.code')}: {data.patient_code}</p>
            {data.age_band && <p className="text-slate-700">{t('view.ageBand', { band: data.age_band })}</p>}
          </div>
        </div>
        {data.blood_group && <p className="mt-3 flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2">{t('view.bloodGroup')}: <strong className="text-2xl text-slate-900">{data.blood_group}</strong></p>}
      </section>
      {data.medical_alert && <PassportSection title={t('view.alert')} items={[data.medical_alert]} />}
      {'allergies' in data
        ? <PassportSection title={t('view.allergies')} items={data.allergies} />
        : <PassportSection title={t('view.allergies')} items={[]} shared={false} />}
      {'contact' in data
        ? <PassportSection title={t('view.contacts')} items={[<span key="c">{data.contact.name} ({t('relation.' + data.contact.relation, { defaultValue: data.contact.relation })}) <span className="font-semibold">{data.contact.phone_masked}</span> <span className="text-base text-slate-700">{t('view.callOff')}</span></span>]} />
        : <PassportSection title={t('view.contacts')} items={[]} shared={false} />}
      <p className="text-sm text-slate-700">{t('view.source')}</p>
      <p className="text-sm text-slate-700">{t('view.updated', { time: formatDateTime(data.last_updated) })}</p>
      <p className="text-sm font-semibold text-slate-800">{t('view.linkValid')} · {t('view.expires', { time: formatDateTime(data.expires_at) })}</p>
      {children}
    </div>
  );
}
