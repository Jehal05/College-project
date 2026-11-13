// Language picker (English, Hindi, Gujarati). Changes the app at once, remembers it on this device,
// and saves it on the patient record when signed in.
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, setLanguage } from '../i18n';
import { updatePatient } from '../services/api';
import { markPickedBeforeLogin } from '../hooks/useLanguageSync';
import useAuth from '../hooks/useAuth';

export default function LanguageSelect({ saveToRecord = true }) {
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const id = useId();
  const [deviceOnly, setDeviceOnly] = useState(false);

  async function change(event) {
    const code = event.target.value;
    setDeviceOnly(false);
    await setLanguage(code);
    if (!saveToRecord) return; // e.g. a responder reading a passport: only this device changes
    if (!session) { markPickedBeforeLogin(); return; } // saved after sign in
    updatePatient(session.patient_id, { language: code }).catch(() => setDeviceOnly(true));
  }
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-800">{t('language.label')}</label>
      <select id={id} value={i18n.language} onChange={change} className="mt-1 block min-h-[48px] w-full rounded-xl border-2 border-slate-300 bg-white px-3 text-base">
        {LANGUAGES.map((l) => <option key={l.code} value={l.code} lang={l.code}>{l.label}</option>)}
      </select>
      {deviceOnly && <p role="status" className="mt-1 text-sm text-amber-900">{t('language.deviceOnly')}</p>}
    </div>
  );
}
