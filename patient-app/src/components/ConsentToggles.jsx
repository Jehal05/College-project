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
        <li key={k} className="mb-3 rounded-card border border-slate-200 bg-white p-4 shadow-card">
          <h2 id={'consent-' + k} className="text-lg font-bold text-slate-900">{t('consent.' + k + '.title')}</h2>
          <p className="mb-3 text-sm text-slate-600">{t('consent.' + k + '.text')}</p>
          <Switch checked={Boolean(consents[k])} onChange={() => onToggle(k)} labelId={'consent-' + k} disabled={disabled} />
        </li>
      ))}
    </ul>
  );
}
