// The QR code image for the passport link, with Download (PNG) and Print. The QR holds ONLY the link.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

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
      <div className="print-area flex justify-center rounded-xl border border-slate-300 bg-white p-3">
        {image ? <img src={image} width="280" height="280" alt={t('passport.qrLabel')} /> : <p role="status">{t('common.working')}</p>}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <a href={image || undefined} download="healthtwin-passport.png" aria-disabled={!image}
          className="flex min-h-[48px] items-center justify-center rounded-lg bg-blue-700 px-2 text-center font-bold text-white">{t('passport.download')}</a>
        <button type="button" onClick={() => window.print()} className="min-h-[48px] rounded-lg border-2 border-slate-400 px-2 font-semibold">{t('passport.print')}</button>
      </div>
    </div>
  );
}
