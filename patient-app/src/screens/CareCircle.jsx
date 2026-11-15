// Care Circle: the people who would be told about an alert, what they could see, and when family last looked.
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuth from '../hooks/useAuth';
import useContacts from '../hooks/useContacts';
import useConsents from '../hooks/useConsents';
import useAccessLog from '../hooks/useAccessLog';
import { orderMembers, sharedKeys, hiddenKeys, familyActivity, circleReady } from '../utils/careCircle';
import { describeEntry } from '../utils/accessLog';
import { formatDateTime } from '../utils/time';
import Panel from '../components/ui/Panel';
import StatusChip from '../components/ui/StatusChip';
import { DataSourceBadge } from '../components/ui/Badge';
import Icon from '../components/icons';

const link = 'inline-flex min-h-[44px] items-center justify-center rounded-xl border border-ht-line px-4 text-sm font-semibold text-ht-accent hover:border-ht-accent';

export default function CareCircle() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const pid = session.patient_id;
  const { contacts, status, load } = useContacts(pid);
  const { consents } = useConsents(pid);
  const log = useAccessLog(pid);
  const members = orderMembers(contacts);
  const seen = familyActivity(log.entries);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold">{t('nav.care')}</h1><p className="text-ht-muted">{t('cc.intro')}</p></div>
        <DataSourceBadge source="simulated" />
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel glow aria-labelledby="cc-members">
          <h2 id="cc-members" className="mb-2 text-lg font-bold">{t('cc.members')}</h2>
          {status === 'loading' && <p role="status" className="text-sm text-ht-muted">{t('cc.loading')}</p>}
          {status === 'error' && <p role="alert" className="text-sm text-ht-emergencytext">{t('cc.loadError')} <button type="button" onClick={load} className="font-semibold underline">{t('common.retry')}</button></p>}
          {status === 'ready' && !circleReady(contacts) && <p role="status" className="mb-3 rounded-xl border border-ht-warning/60 bg-ht-warning/10 p-3 text-sm">{t('cc.empty')}</p>}
          {members.length > 0 && (
            <ul className="mb-3 space-y-3">
              {members.map((c) => (
                <li key={c.id} data-testid="cc-member" className="rounded-xl border border-ht-line bg-ht-bg p-3 text-sm">
                  <p className="flex flex-wrap items-center gap-2"><Icon name="user" size={16} /><span className="font-semibold">{c.name}</span>
                    <span className="text-ht-muted">({t('relation.' + c.relation, { defaultValue: c.relation })})</span>
                    {c.is_primary && <StatusChip tone="info">{t('contacts.primary')}</StatusChip>}</p>
                  <p className="num mt-1 text-ht-muted">{c.phone}</p>
                  <p className="mt-1">{t('cc.told')}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="mb-3 text-xs text-ht-muted">{t('cc.ackNote')}</p>
          <Link to="/contacts" className={link}>{t('cc.manage')}</Link>
        </Panel>

        <Panel aria-labelledby="cc-see">
          <h2 id="cc-see" className="mb-2 text-lg font-bold">{t('cc.see')}</h2>
          <p className="mb-3 text-sm text-ht-muted">{t('cc.seeHelp')}</p>
          {consents ? (
            <ul className="mb-3 space-y-1 text-sm">
              {sharedKeys(consents).map((k) => <li key={k} className="flex items-center justify-between gap-2"><span>{t('consent.' + k + '.title')}</span><StatusChip tone="ok" icon="check">{t('cc.canSee')}</StatusChip></li>)}
              {hiddenKeys(consents).map((k) => <li key={k} className="flex items-center justify-between gap-2"><span>{t('consent.' + k + '.title')}</span><StatusChip tone="neutral" icon="lock">{t('cc.cannotSee')}</StatusChip></li>)}
            </ul>
          ) : <p role="status" className="mb-3 text-sm text-ht-muted">{t('cc.loading')}</p>}
          <p className="mb-3 text-xs text-ht-muted">{t('cc.sameForAll')}</p>
          <Link to="/consent" className={link}>{t('emc.changeShare')}</Link>
        </Panel>
      </div>

      <Panel aria-labelledby="cc-seen">
        <h2 id="cc-seen" className="mb-2 text-lg font-bold">{t('cc.seen')}</h2>
        {log.status === 'ready' && seen.length === 0 && <p className="text-sm text-ht-muted">{t('cc.seenNone')}</p>}
        {seen.length > 0 && (
          <ul className="space-y-2 text-sm">
            {seen.map((e) => { const d = describeEntry(t, e); return (
              <li key={e.id}><span className="font-semibold">{d.who} {d.what}</span> · <time dateTime={e.at} className="text-ht-muted">{formatDateTime(e.at)}</time><br /><span className={d.blocked ? 'text-ht-emergencytext' : 'text-ht-muted'}>{d.result}</span></li>
            ); })}
          </ul>
        )}
        <Link to="/access" className={link + ' mt-3'}>{t('cc.fullLog')}</Link>
      </Panel>
      <p className="text-xs font-semibold text-ht-muted">{t('emc.notService')}</p>
    </div>
  );
}
