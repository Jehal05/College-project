// Command view, top strip of the detail panel (Phase 4): who has acknowledged, what the patient shared,
// and the ambulance status. Facts come from services/commandView.js; nothing is invented here.
import { useEffect, useState } from 'react';
import SimulatedBadge from './SimulatedBadge.jsx';
import { ackStatus, sharedFields, ambulanceBrief } from '../services/commandView.js';
import { formatEta } from '../services/eta.js';
import { durationText } from '../i18n/phrases.js';
import { formatTime } from './AlertCard.jsx';
import { useT } from '../i18n/index.js';

export default function CommandSummary({ emergency }) {
  const t = useT();
  const [now, setNow] = useState(Date.now());
  const ack = ackStatus(emergency, now);
  const ticking = ack.kind === 'waiting' || ack.kind === 'escalated';
  useEffect(() => {
    if (!ticking) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [ticking]);
  const fields = sharedFields(emergency);
  const notShared = fields.filter((f) => f.shared !== true);
  const amb = ambulanceBrief(emergency);

  let ackText;
  if (ack.kind === 'acknowledged') {
    ackText = ack.by
      ? t('cmd.ack.by', { who: ack.by, time: formatTime(ack.at), wait: durationText(t, ack.waited ?? 0) })
      : t('cmd.ack.noName', { time: formatTime(ack.at), wait: durationText(t, ack.waited ?? 0) });
  } else if (ack.kind === 'waiting') ackText = t('cmd.ack.waiting', { wait: durationText(t, ack.waited ?? 0) });
  else if (ack.kind === 'escalated') ackText = t('cmd.ack.escalated', { wait: durationText(t, ack.waited ?? 0) });
  else if (ack.kind === 'cancelled') ackText = t('cmd.ack.cancelled');
  else ackText = t('cmd.ack.early');

  let ambText;
  if (!amb.assigned) ambText = t('cmd.amb.none');
  else {
    const status = t(`cmd.amb.${amb.status || 'assigned'}`);
    ambText = amb.etaSeconds !== null && amb.status !== 'at_hospital' ? t('cmd.amb.withEta', { status, eta: formatEta(amb.etaSeconds, t) }) : status;
  }

  return (
    <section aria-labelledby="cmd-title" data-testid="command-summary" className="grid gap-4 rounded-xl border border-slate-300 bg-slate-50 p-4 md:grid-cols-3">
      <h3 id="cmd-title" className="sr-only">{t('cmd.title')}</h3>

      <div>
        <h4 className="font-semibold">{t('cmd.ack.heading')}</h4>
        <p data-testid="cmd-ack" className={ack.kind === 'waiting' || ack.kind === 'escalated' ? 'font-semibold text-red-800' : ''} role="status">{ackText}</p>
      </div>

      <div>
        <h4 className="font-semibold">{t('cmd.shared.heading')}</h4>
        <ul data-testid="cmd-shared" className="text-sm">
          {fields.map((f) => (
            <li key={f.key}>
              {t(`cmd.field.${f.key}`)}: <b>{f.shared === true ? t('cmd.shared.yes') : f.shared === false ? t('cmd.shared.no') : t('cmd.shared.unknown')}</b>
            </li>
          ))}
        </ul>
        {notShared.length > 0 && (
          <p data-testid="cmd-not-shared" className="mt-1 text-sm text-slate-700">
            {t('cmd.shared.notList', { list: notShared.map((f) => t(`cmd.field.${f.key}`)).join(', ') })}
          </p>
        )}
      </div>

      <div>
        <h4 className="font-semibold">{t('cmd.amb.heading')} <SimulatedBadge /></h4>
        <p data-testid="cmd-amb">{amb.id ? `${amb.id} · ` : ''}{ambText}</p>
        <p className="text-sm text-slate-600">{t('cmd.amb.note')}</p>
      </div>
    </section>
  );
}
