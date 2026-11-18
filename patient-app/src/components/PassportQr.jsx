// The QR code image for the passport link, with a Download (PNG) link. The QR holds ONLY the link.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from './icons';

export default function PassportQr({ link, size = 280, onImage }) {
  const { t } = useTranslation();
  const [image, setImage] = useState('');
  useEffect(() => {
    let cancelled = false;
    import('qrcode').then((QR) => QR.toDataURL(link, { width: size, margin: 2, errorCorrectionLevel: 'M' }))
      .then((url) => { if (!cancelled) { setImage(url); onImage && onImage(url); } }).catch(() => { if (!cancelled) setImage(''); });
    return () => { cancelled = true; };
  }, [link, size]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="flex flex-col items-center">
      {image ? <img src={image} width={size} height={size} alt={t('passport.qrLabel')} /> : <p role="status">{t('common.working')}</p>}
      <a href={image || undefined} download="healthtwin-passport.png" aria-disabled={!image}
        className="print:hidden mt-3 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-2 text-center font-semibold text-white hover:bg-brand-800"><Icon name="qr" size={20} />{t('passport.download')}</a>
    </div>
  );
}
