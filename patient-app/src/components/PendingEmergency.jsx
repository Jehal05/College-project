// "Not sent yet" screen (red flow). Shown when an emergency could not be created because the network is down.
// It never claims anything was sent. The call button comes first.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useOnline from '../hooks/useOnline';
import { clearPending, isStale, sendPending } from '../hooks/usePendingEmergency';
import CallButton from './CallButton';
import SmsFallback from './SmsFallback';

export default function PendingEmergency({ patientId, pending }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const online = useOnline();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const stale = isStale(pending);

  async function retry() {
    setBusy(true); setFailed(false);
    try { const e = await sendPending(patientId); navigate('/emergency/' + e.id, { state: { backOnline: true } }); } catch { setFailed(true); setBusy(false); }
  }
  const button = 'mt-3 min-h-[56px] w-full rounded-xl text-lg font-bold disabled:opacity-60 ';
  return (
    <div className="relative -m-4 min-h-screen bg-red-700 p-4 pt-8 text-white">
      <CallButton onRed />
      <h1 className="mt-4 text-3xl font-extrabold">{t('pending.title')}</h1>
      <p className="mt-2 text-lg font-semibold">{t('pending.text')}</p>
      <p role="status" className="mt-2">{failed ? t('pending.failed') : online ? t('pending.online') : t('pending.waiting')}</p>
      {(!online || failed) && <SmsFallback />}
      {stale && <p className="mt-3 rounded-xl bg-white p-3 font-semibold text-slate-900">{t('pending.stale')}</p>}
      <button type="button" onClick={retry} disabled={busy} className={button + 'bg-white text-red-800'}>
        {busy ? t('emergency.sending') : stale ? t('pending.sendAnyway') : t('emergency.retry')}
      </button>
      <button type="button" onClick={clearPending} className={button + 'border-2 border-white'}>{t('pending.discard')}</button>
    </div>
  );
}
