// General instructions (always) and condition-specific lines. Lines that no doctor has reviewed yet are shown under a clear DRAFT label.
// After a doctor has reviewed a condition: edit config/instructions.json and set "reviewed": true (the draft label goes away).
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
      {condition && condition.lines.length > 0 ? (
        <>
          {!condition.reviewed && <p className="mt-3 rounded-lg bg-amber-100 p-2 text-sm font-semibold text-amber-900" data-testid="draft-tips">{t('emergency.draftTips')}</p>}
          <ul className="mt-2 list-disc pl-5">
            {condition.lines.map((key) => <li key={key}>{t(key)}</li>)}
          </ul>
        </>
      ) : (
        <p className="mt-3 text-sm text-slate-700">{t('emergency.pendingReview')}</p>
      )}
    </section>
  );
}
