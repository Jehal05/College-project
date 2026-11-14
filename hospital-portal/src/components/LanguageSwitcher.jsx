import { LANGS, getLang, setLang, subscribeLang, useT } from '../i18n/index.js';
import { useSyncExternalStore } from 'react';
import { usePresenting } from './usePresenting.js';

/** Language picker (English, Hindi, Gujarati). A native select works with the keyboard and screen readers. */
export default function LanguageSwitcher() {
  const t = useT();
  const lang = useSyncExternalStore(subscribeLang, getLang);
  const locked = usePresenting(); // presentation mode: nobody changes the language by accident in front of the jury
  return (
    <label className="flex items-center gap-2 text-sm text-slate-600 [header_&]:text-slate-300">
      <span>{t('nav.language')}</span>
      <select
        data-testid="lang-switch"
        value={lang}
        disabled={locked}
        title={locked ? t('present.langLocked') : undefined}
        onChange={(e) => setLang(e.target.value)}
        className="rounded border border-slate-400 bg-white px-2 py-1 text-slate-900"
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code} lang={l.htmlLang}>{l.name}</option>
        ))}
      </select>
    </label>
  );
}
