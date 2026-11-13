// SHELL. Phase 3 connects this to the consent API. It already works as a simple controlled list.
// consents = { location, history, vitals, reports } (true/false); onChange(key, value).
import { useTranslation } from 'react-i18next';

const KEYS = ['location', 'history', 'vitals', 'reports'];

export default function ConsentToggles({ consents = {}, onChange = () => {} }) {
  const { t } = useTranslation();
  return (
    <ul>
      {KEYS.map((k) => (
        <li key={k} className="mb-2">
          <label className="flex min-h-[44px] items-center gap-3">
            <input type="checkbox" className="h-6 w-6" checked={Boolean(consents[k])} onChange={(e) => onChange(k, e.target.checked)} />
            <span>{t('consent.' + k)}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}
