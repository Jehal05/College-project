// Emergency Response Center: a calm, themed overview of the alert flow. It is a SIMULATION. It never says an ambulance was
// dispatched unless that exact status event exists, and "notification sent" and "acknowledged" are shown separately.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuth from '../hooks/useAuth';
import useEmergency from '../hooks/useEmergency';
import useContacts from '../hooks/useContacts';
import useConsents from '../hooks/useConsents';
import { getEmergencies } from '../services/api';
import { getActive } from '../utils/activeEmergency';
import { stages, endedAs, pickActive, showEta, hasEvent } from '../utils/emergencyCenter';
import Panel from '../components/ui/Panel';
import StatusChip from '../components/ui/StatusChip';
import { DataSourceBadge } from '../components/ui/Badge';
import Icon from '../components/icons';

const time = (iso) => new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const link = 'inline-flex min-h-[44px] items-center justify-center rounded-xl border border-ht-line px-4 text-sm font-semibold text-ht-accent hover:border-ht-accent';

function Running({ id }) {
  const { t } = useTranslation();
  const { emergency, events, connected, error } = useEmergency(id);
  if (error) return <p role="status" className="text-sm text-ht-muted">{t('emc.loadError')}</p>;
  if (!emergency) return <p role="status" className="text-sm text-ht-muted">{t('emc.loading')}</p>;
  const rows = stages(events);
  const ended = endedAs(events);
  const contacts = emergency.contacts_notified;
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StatusChip tone={ended === 'CANCELLED' ? 'neutral' : 'emergency'}>{t('state.' + emergency.state)}</StatusChip>
        <StatusChip tone={connected ? 'ok' : 'caution'} icon={connected ? 'check' : 'alert'}>{t(connected ? 'emc.live' : 'emc.offline')}</StatusChip>
      </div>
      <ol className="space-y-2" aria-label={t('emc.stages')}>
        {rows.map((r) => (
          <li key={r.key} className="flex flex-wrap items-center gap-2 text-sm">
            <Icon name={r.done ? 'check' : 'clock'} size={16} />
            <span className={r.done ? 'font-semibold' : 'text-ht-muted'}>{t('emc.stage.' + r.key)}</span>
            <span className="num text-ht-muted">{r.done ? time(r.at) : t('emc.notYet')}</span>
          </li>
        ))}
        {ended && <li className="flex items-center gap-2 text-sm font-semibold"><Icon name="alert" size={16} />{t('state.' + ended)}</li>}
      </ol>
      <div className="mt-4 space-y-1 text-sm">
        {emergency.hospital && <p>{emergency.hospital.city_name ? t('emc.hospitalIn', { name: emergency.hospital.name, city: emergency.hospital.city_name }) : t('emc.hospital', { name: emergency.hospital.name })}</p>}
        {emergency.hospital && emergency.hospital.other_city && <p className="font-semibold">{t('emc.otherCity', { own: emergency.city_name, name: emergency.hospital.name, city: emergency.hospital.city_name })}</p>}
        {emergency.location && emergency.location.source === 'simulated' && emergency.city_name && <p className="text-ht-muted">{t('emc.simLocation', { name: emergency.city_name })}</p>}
        {showEta(events, emergency.eta_seconds) && <p>{t('emc.eta', { min: Math.max(1, Math.round(emergency.eta_seconds / 60)) })}</p>}
        <p>{hasEvent(events, 'SOS_SENT') ? t('emc.sentHospital') : t('emc.notSentHospital')}</p>
        <p>{hasEvent(events, 'HOSPITAL_ACKNOWLEDGED') ? t('emc.ackHospital') : t('emc.notAckHospital')}</p>
        <p>{contacts && contacts.length ? t('emc.sentContacts', { names: contacts.map((c) => c.name).join(', ') }) : t('emc.notSentContacts')}</p>
        <p className="text-ht-muted">{t('emc.ackContacts')}</p>
      </div>
      <Link to={'/emergency/' + id} className={link + ' mt-4'}>{t('emc.open')}</Link>
    </>
  );
}

export default function EmergencyCenter() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const pid = session.patient_id;
  const { contacts, status: cStatus } = useContacts(pid);
  const { consents } = useConsents(pid);
  const [list, setList] = useState(null);
  useEffect(() => { getEmergencies(pid).then(setList).catch(() => setList([])); }, [pid]);
  const activeId = list === null ? getActive() : pickActive(getActive(), list);
  const past = (list || []).filter((e) => e.id !== activeId).slice(0, 5);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold">{t('nav.emergency')}</h1><p className="text-ht-muted">{t('emc.intro')}</p></div>
        <DataSourceBadge source="simulated" />
      </header>

      <p role="note" className="flex items-start gap-2 rounded-xl border border-ht-emergency/60 bg-ht-emergency/10 p-3 text-sm font-semibold text-ht-emergencytext">
        <Icon name="alert" size={18} />{t('emc.sim')}
      </p>
      <a href="tel:112" className="flex min-h-[56px] items-center justify-center gap-3 rounded-xl bg-red-700 text-lg font-bold text-white hover:bg-red-800"><Icon name="phone" size={24} />{t('emergency.call')}</a>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel glow aria-labelledby="emc-status">
          <h2 id="emc-status" className="mb-3 text-lg font-bold">{t('emc.status')}</h2>
          {activeId ? <Running id={activeId} /> : (
            <>
              <p className="mb-3 text-sm text-ht-muted">{t('emc.none')}</p>
              <Link to="/symptoms" className={link}>{t('emc.start')}</Link>
            </>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel aria-labelledby="emc-share">
            <h2 id="emc-share" className="mb-2 text-lg font-bold">{t('emc.share')}</h2>
            <p className="mb-2 text-sm text-ht-muted">{t('emc.shareHelp')}</p>
            {consents ? (
              <ul className="mb-3 space-y-1 text-sm">
                {['location', 'history', 'vitals', 'reports'].map((k) => (
                  <li key={k} className="flex items-center justify-between gap-2"><span>{t('consent.' + k + '.title')}</span>
                    <StatusChip tone={consents[k] === false ? 'neutral' : 'ok'} icon={consents[k] === false ? 'lock' : 'check'}>{t(consents[k] === false ? 'emc.off' : 'emc.on')}</StatusChip></li>
                ))}
              </ul>
            ) : <p className="mb-3 text-sm text-ht-muted">{t('emc.loading')}</p>}
            <Link to="/consent" className={link}>{t('emc.changeShare')}</Link>
          </Panel>

          <Panel aria-labelledby="emc-contacts">
            <h2 id="emc-contacts" className="mb-2 text-lg font-bold">{t('emc.contacts')}</h2>
            {cStatus === 'ready' && contacts.length === 0 && <p className="mb-3 text-sm text-ht-muted">{t('emc.noContacts')}</p>}
            {contacts.length > 0 && <ul className="mb-3 space-y-1 text-sm">{contacts.map((c) => <li key={c.id} className="flex items-center gap-2"><Icon name="user" size={16} />{c.name}<span className="text-ht-muted">({t('relation.' + c.relation, { defaultValue: c.relation })})</span></li>)}</ul>}
            <Link to="/contacts" className={link}>{t('emc.manageContacts')}</Link>
          </Panel>
        </div>
      </div>

      <Panel aria-labelledby="emc-history">
        <h2 id="emc-history" className="mb-2 text-lg font-bold">{t('emc.history')}</h2>
        {past.length === 0 ? <p className="text-sm text-ht-muted">{t('emc.noHistory')}</p> : (
          <ul className="space-y-2 text-sm">
            {past.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-2">
                <span className="num text-ht-muted">{new Date(e.started_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                <StatusChip tone="neutral" icon="info">{t('state.' + e.final_state)}</StatusChip>
                <Link to={'/summary/' + e.id} className="font-semibold text-ht-accent underline">{t('emc.record')}</Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <p className="text-xs font-semibold text-ht-muted">{t('emc.notService')}</p>
    </div>
  );
}
