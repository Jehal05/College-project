// Profile setting for the safety check-in. OFF by default. Says plainly what this web app can and cannot do.
import { useTranslation } from 'react-i18next';
import useAuth from '../hooks/useAuth';
import usePreferences from '../hooks/usePreferences';
import useOnline from '../hooks/useOnline';
import Switch from './Switch';

export default function CheckInSetting() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const online = useOnline();
  const { prefs, saveState, save } = usePreferences(session.patient_id);
  const c = prefs.safety_checkin;
  return (
    <section aria-labelledby="checkin-setting" className="mb-5 rounded-card border border-slate-200 bg-white p-4 shadow-card">
      <h2 id="checkin-setting" className="text-lg font-bold">{t('checkinSetting.title')}</h2>
      <p className="mb-2 text-sm text-slate-700">{t('checkinSetting.help')}</p>
      <Switch checked={c.enabled} labelId="checkin-setting" disabled={!online} onChange={(enabled) => save({ safety_checkin: { ...c, enabled } })} />
      {c.enabled && (
        <label className="mt-2 block text-sm font-semibold">
          {t('checkinSetting.after')}
          <select value={c.minutes} onChange={(e) => save({ safety_checkin: { ...c, minutes: Number(e.target.value) } })}
            className="mt-1 block min-h-[44px] w-full rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-50 px-2">
            {[5, 15, 30].map((m) => <option key={m} value={m}>{t('checkinSetting.minutes', { count: m })}</option>)}
          </select>
        </label>
      )}
      <p className="mt-2 text-sm text-slate-700">{t('checkinSetting.limits')}</p>
      <p role="status" className="min-h-[20px] text-sm font-semibold">
        {saveState === 'saved' ? t('common.saved') : saveState === 'failed' ? t('checkinSetting.failed') : ''}
      </p>
    </section>
  );
}
