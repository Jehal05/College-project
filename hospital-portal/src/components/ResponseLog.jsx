// Command view: one list of everything the desk did, in time order (state changes, notes, checklist ticks).
import { useMemo } from 'react';
import checklists from '../data/checklists.json';
import { responseLog } from '../services/commandView.js';
import { stateText } from '../i18n/phrases.js';
import { formatTime } from './AlertCard.jsx';
import { useT } from '../i18n/index.js';

export default function ResponseLog({ emergency }) {
  const t = useT();
  const rows = useMemo(() => responseLog(emergency, checklists[emergency.type] || []), [emergency]);
  return (
    <section aria-labelledby="rlog-title" data-testid="response-log">
      <h3 id="rlog-title" className="mb-2 font-semibold">{t('cmd.log.title')}</h3>
      {rows.length === 0 ? (
        <p className="text-slate-600">{t('cmd.log.empty')}</p>
      ) : (
        <ol className="space-y-1 text-sm">
          {rows.map((r, i) => (
            <li key={`${r.at}-${i}`} data-testid="response-log-row" className="flex flex-wrap gap-x-2">
              <time dateTime={r.at} className="font-mono text-slate-600">{formatTime(r.at)}</time>
              <span>
                {r.kind === 'state' && stateText(t, r.state)}
                {r.kind === 'note' && `${t('cmd.log.note')}: ${r.text}`}
                {r.kind === 'check' && t(r.done ? 'cmd.log.ticked' : 'cmd.log.unticked', { item: r.label })}
                {r.by ? ` · ${r.by}` : ''}
                {r.local ? ` · ${t('cmd.log.local')}` : ''}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
