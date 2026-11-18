// Connect or disconnect a Bluetooth heart-rate strap. Needs the vitals consent. The reading stays on this phone.
import { useTranslation } from 'react-i18next';
import Card from './ui/Card';

export default function StrapConnect({ strap, consentOn }) {
  const { t } = useTranslation();
  const { status, fresh, connect, disconnect, supported } = strap;
  let line;
  if (!consentOn) line = t('strap.consentOff');
  else if (!supported) line = t('strap.unsupported');
  else if (status === 'connected') line = fresh ? t('strap.connected') : t('strap.waiting');
  else line = t('strap.' + status); // idle | connecting | reconnecting | lost | error | cancelled
  const on = status === 'connected' || status === 'reconnecting' || status === 'connecting';
  return (
    <Card aria-label={t('strap.title')} className="mt-3">
      <p role="status" className="text-slate-800">{line}</p>
      {consentOn && supported && (
        <button type="button" onClick={on ? disconnect : connect} className="mt-2 min-h-[48px] rounded-xl border-2 border-brand-700 px-4 font-bold text-brand-800">
          {on ? t('strap.disconnect') : t('strap.connect')}
        </button>
      )}
    </Card>
  );
}
