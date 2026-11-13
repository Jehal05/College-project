// The four sharing switches, each with a plain-language explanation.
// consents = { location, history, vitals, reports }; onToggle(key) flips one switch.
import { useTranslation } from 'react-i18next';
import Switch from './Switch';

const KEYS = ['location', 'history', 'vitals', 'reports'];

export default function ConsentToggles({ consents, onToggle, disabled = false }) {
  const { t } = useTranslation();
  return (
    <ul>
      {KEYS.map((k) => (
        <li key={k} className="mb-3 rounded-xl border border-slate-200 p-4">
          <h2 id={'consent-' + k} className="text-lg font-bold">{t('consent.' + k + '.title')}</h2>
          <p className="mb-2 text-sm text-slate-700">{t('consent.' + k + '.text')}</p>
          <Switch checked={Boolean(consents[k])} onChange={() => onToggle(k)} labelId={'consent-' + k} disabled={disabled} />
        </li>
      ))}
    </ul>
  );
}
