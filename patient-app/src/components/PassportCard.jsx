// The printable passport card: logo, demo badge, name, code, a large QR, expiry, status and the demo disclaimer. No photo.
import { useTranslation } from 'react-i18next';
import PassportQr from './PassportQr';
import { LogoMark } from './icons';
import { formatDateTime } from '../utils/time';

export default function PassportCard({ name, code, link, expiresAt }) {
  const { t } = useTranslation();
  return (
    <section data-testid="passport-card" aria-label={t('card.title')} className="print-area rounded-card border-2 border-slate-400 bg-white p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-lg font-bold"><LogoMark size={24} />HealthTwin</span>
        <span className="rounded-full border-2 border-amber-700 bg-amber-100 px-3 py-0.5 text-sm font-bold text-amber-950">{t('card.badge')}</span>
      </div>
      <h2 className="mt-3 break-words text-2xl font-bold text-slate-900">{name}</h2>
      <p className="text-slate-800">{t('view.code')}: <strong>{code}</strong></p>
      <div className="my-3"><PassportQr link={link} size={320} /></div>
      <p className="text-center text-base font-semibold text-slate-900">{t('card.scan')}</p>
      <p className="text-center text-slate-800">{t('card.status')} · {t('view.expires', { time: formatDateTime(expiresAt) })}</p>
      <p className="mt-2 text-center text-sm text-slate-800">{t('view.banner')}</p>
    </section>
  );
}
