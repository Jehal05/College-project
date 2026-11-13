// Feature 3: choose a category, tick symptoms, press "Get help now".
// The emergency is created immediately; the location is sent later with the SOS.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuth from '../hooks/useAuth';
import { getPatient } from '../services/api';
import { CATEGORIES } from '../config/symptoms';
import { unlock } from '../utils/alarm';
import { beginEmergency, usePending } from '../hooks/usePendingEmergency';
import useOnline from '../hooks/useOnline';
import CallButton from '../components/CallButton';
import SymptomGroup from '../components/SymptomGroup';
import DemoLocationToggle from '../components/DemoLocationToggle';
import VoiceSymptoms from '../components/VoiceSymptoms';
import PendingEmergency from '../components/PendingEmergency';
import ErrorMessage from '../components/ErrorMessage';

export default function Symptoms() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [type, setType] = useState(null);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const consents = useRef(null); // a promise, loaded early so the button responds fast
  const online = useOnline();
  const pending = usePending(); // an emergency that could not be sent yet

  useEffect(() => {
    consents.current = getPatient(session.patient_id).then((p) => p.consents).catch(() => null);
  }, [session.patient_id]);

  const category = CATEGORIES.find((c) => c.type === type);
  const toggle = (id) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const pick = (next) => { setType(next); setSelected([]); };

  // Voice suggestions are applied only after the person confirmed them.
  const applyVoice = ({ category, ids }) => {
    setType(category);
    setSelected((cur) => (category === type ? [...new Set([...cur, ...ids])] : ids));
  };

  async function getHelp() {
    unlock(); // allows the countdown beep later (browsers need a tap first)
    setBusy(true);
    setError('');
    try {
      const saved = online && consents.current ? await consents.current : null;
      const result = await beginEmergency(session.patient_id, type, selected, { online, savedConsents: saved });
      if (result.emergency) navigate('/emergency/' + result.emergency.id);
      else setBusy(false); // kept as "not sent yet": the pending screen takes over
    } catch {
      setError(t('symptoms.error'));
      setBusy(false);
    }
  }

  const ready = selected.length > 0 && !busy;
  if (pending) return <PendingEmergency patientId={session.patient_id} pending={pending} />;
  return (
    <div>
      <CallButton />
      <h1 className="mb-1 mt-4 text-2xl font-bold">{t('symptoms.title')}</h1>
      <VoiceSymptoms currentType={type} onApply={applyVoice} />
      <p className="mb-3 text-slate-700">{t('symptoms.pickCategory')}</p>
      <div role="radiogroup" aria-label={t('symptoms.pickCategory')} className="grid grid-cols-1 gap-3 min-[260px]:grid-cols-2">
        {CATEGORIES.map((c) => (
          <button key={c.type} type="button" role="radio" aria-checked={type === c.type} onClick={() => pick(c.type)}
            className={'min-h-[64px] rounded-xl border-2 px-2 text-lg font-bold ' +
              (type === c.type ? 'border-blue-700 bg-blue-50 text-blue-900' : 'border-slate-300 bg-white')}>
            {t('category.' + c.type)}
          </button>
        ))}
      </div>
      {category && <SymptomGroup symptoms={category.symptoms} selected={selected} onToggle={toggle} />}
      <div className="mt-4"><ErrorMessage>{error}</ErrorMessage></div>
      <div className="sticky bottom-16 z-10 mt-4 bg-white pb-2 pt-2">
        <button type="button" onClick={getHelp} disabled={!ready} aria-describedby="need-one"
          className="min-h-[64px] w-full rounded-xl bg-red-700 text-xl font-extrabold text-white disabled:bg-slate-300 disabled:text-slate-600">
          {busy ? t('emergency.sending') : t('symptoms.getHelp')}
        </button>
        {selected.length === 0 && <p id="need-one" className="mt-1 text-center text-sm text-slate-700">{t('symptoms.needOne')}</p>}
      </div>
      <div className="mt-2"><DemoLocationToggle /></div>
    </div>
  );
}
