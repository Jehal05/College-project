// The QR code image for the passport link, with Download (PNG) and Print. The QR holds ONLY the link.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from './ui/Button';
import Icon from './icons';

export default function PassportQr({ link }) {
  const { t } = useTranslation();
  const [image, setImage] = useState('');
  useEffect(() => {
    let cancelled = false;
    import('qrcode').then((QR) => QR.toDataURL(link, { width: 280, margin: 2, errorCorrectionLevel: 'M' }))
      .then((url) => { if (!cancelled) setImage(url); }).catch(() => { if (!cancelled) setImage(''); });
    return () => { cancelled = true; };
  }, [link]);
  return (
    <div>
      <div className="print-area flex justify-center rounded-card border border-slate-200 bg-white p-4 shadow-card">
        {image ? <img src={image} width="280" height="280" alt={t('passport.qrLabel')} /> : <p role="status">{t('common.working')}</p>}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <a href={image || undefined} download="healthtwin-passport.png" aria-disabled={!image}
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-brand-700 px-2 text-center font-semibold text-white hover:bg-brand-800"><Icon name="qr" size={20} />{t('passport.download')}</a>
        <Button variant="secondary" onClick={() => window.print()}>{t('passport.print')}</Button>
      </div>
    </div>
  );
}
