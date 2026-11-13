// Microphone button for the Symptoms screen. It LISTENS once, then SUGGESTS symptoms to tick.
// Nothing is ticked or sent until the person presses "Tick them" (and later "Get help now").
// Honest about failure: unsupported browser, blocked microphone, no speech and network errors each get a message.
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { speechSupported, startListening } from '../services/speech';
import { matchSymptoms } from '../utils/symptomMatcher';

export default function VoiceSymptoms({ currentType, onApply }) {
  const { t, i18n } = useTranslation();
  const [state, setState] = useState('idle'); // idle | listening | result | error
  const [heard, setHeard] = useState('');
  const [suggestion, setSuggestion] = useState({ category: null, ids: [] });
  const [problem, setProblem] = useState('');
  const stop = useRef(null);
  useEffect(() => () => stop.current && stop.current(), []); // stop listening when leaving the screen

  if (!speechSupported()) return <p className="mb-3 text-sm text-slate-700">{t('voice.unsupported')}</p>;

  function listen() {
    setProblem(''); setHeard('');
    setState('listening');
    stop.current = startListening(i18n.language, {
      onResult: (text) => { setHeard(text); setSuggestion(matchSymptoms(text, i18n.language, currentType)); setState('result'); },
      onError: (kind) => { setProblem(t('voice.error.' + kind)); setState('error'); },
      onEnd: () => setState((s) => (s === 'listening' ? 'error' : s)),
    });
  }
  function cancel() { if (stop.current) stop.current(); setState('idle'); }
  function apply() { onApply(suggestion); setState('idle'); }

  const small = 'min-h-[48px] rounded-lg px-4 font-semibold ';
  return (
    <section aria-label={t('voice.title')} className="mb-4">
      {state !== 'listening' && (
        <button type="button" onClick={listen} className={small + 'w-full border-2 border-blue-700 text-blue-800'}>🎤 {t('voice.start')}</button>
      )}
      {state === 'listening' && (
        <div role="status" className="rounded-lg border-2 border-blue-700 bg-blue-50 p-3">
          <p className="mb-2 font-bold">{t('voice.listening')}</p>
          <button type="button" onClick={cancel} className={small + 'bg-white border border-slate-400'}>{t('voice.stop')}</button>
        </div>
      )}
      {state === 'error' && <p role="alert" className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{problem || t('voice.error.nospeech')}</p>}
      {state === 'result' && (
        <div role="status" className="mt-2 rounded-lg border border-slate-300 p-3">
          <p className="text-sm text-slate-700">{t('voice.heard')}: <q>{heard}</q></p>
          {suggestion.ids.length === 0 ? <p className="mt-2 font-semibold">{t('voice.noMatch')}</p> : (
            <>
              <p className="mt-2 font-bold">{t('voice.tickThese')} ({t('category.' + suggestion.category)})</p>
              <ul className="mb-2 list-disc pl-5">{suggestion.ids.map((id) => <li key={id}>{t('symptom.' + id)}</li>)}</ul>
              <p className="mb-2 text-sm text-slate-700">{t('voice.check')}</p>
              <button type="button" onClick={apply} className={small + 'mr-2 bg-blue-700 text-white'}>{t('voice.apply')}</button>
            </>
          )}
          <button type="button" onClick={() => setState('idle')} className={small + 'border border-slate-400'}>{t('voice.dismiss')}</button>
        </div>
      )}
    </section>
  );
}
