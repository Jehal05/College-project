// General instructions (always) and condition-specific lines (only after a doctor has reviewed them).
// To add reviewed text later: edit config/instructions.json and set "reviewed": true.
import { useTranslation } from 'react-i18next';
import instructions from '../config/instructions.json';
import Icon from './icons';

export default function InstructionsCard({ type }) {
  const { t } = useTranslation();
  const condition = instructions[type];
  return (
    <section aria-labelledby="instructions-title" className="mt-4 rounded-card bg-white p-4 text-slate-900 shadow-lift">
      <h2 id="instructions-title" className="mb-2 flex items-center gap-2 text-lg font-bold"><Icon name="shield" className="text-brand-700" />{t('emergency.instructionsTitle')}</h2>
      <ul className="list-disc space-y-1 pl-5">
        {instructions.GENERAL.map((key) => <li key={key}>{t(key)}</li>)}
      </ul>
      {condition && condition.reviewed ? (
        <ul className="mt-2 list-disc pl-5">
          {condition.lines.map((key) => <li key={key}>{t(key)}</li>)}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-700">{t('emergency.pendingReview')}</p>
      )}
    </section>
  );
}
