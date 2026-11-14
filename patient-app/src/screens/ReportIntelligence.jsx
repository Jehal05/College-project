// Report Intelligence: the person reads values off a report and types them in; nothing reaches the Twin until they confirm.
// The prototype cannot read files by itself, and says so. Every value is marked "not reviewed by a clinician".
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuth from '../hooks/useAuth';
import useReports from '../hooks/useReports';
import useConsents from '../hooks/useConsents';
import useLabValues from '../hooks/useLabValues';
import { LABS } from '../config/labs';
import { validateDraft } from '../utils/labs';
import Panel from '../components/ui/Panel';
import StatusChip from '../components/ui/StatusChip';
import { DataSourceBadge } from '../components/ui/Badge';
import LabValueList from '../components/themed/LabValueList';
import Icon from '../components/icons';

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY = () => ({ lab: LABS[0].key, value: '', low: '', high: '', date: today(), reportId: '' });
const field = 'min-h-[44px] w-full rounded-xl border border-ht-line bg-ht-bg px-3 text-ht-text';
const btn = 'min-h-[44px] rounded-xl border px-4 text-sm font-semibold ';

export default function ReportIntelligence() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const pid = session.patient_id;
  const { reports, status } = useReports(pid);
  const { consents } = useConsents(pid);
  const { labs, add, remove } = useLabValues(pid);
  const [draft, setDraft] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [pending, setPending] = useState(null); // validated entry waiting for the person to confirm
  const [notice, setNotice] = useState('');
  const set = (k) => (e) => setDraft({ ...draft, [k]: e.target.value });

  function review(e) {
    e.preventDefault(); setNotice('');
    const r = validateDraft(draft);
    setErrors(r.ok ? {} : r.errors);
    setPending(r.ok ? r.entry : null);
  }
  function confirm() {
    const ok = add(pending);
    setNotice(ok ? t('ri.added') : t('ri.saveError'));
    if (ok) { setPending(null); setDraft(EMPTY()); }
  }
  const err = (k) => errors[k] && <p id={'err-' + k} role="alert" className="mt-1 text-sm text-ht-emergencytext">{t('ri.err.' + errors[k])}</p>;
  const bad = (k) => ({ 'aria-invalid': !!errors[k], 'aria-describedby': errors[k] ? 'err-' + k : undefined });
  const shareOn = consents ? consents.reports !== false : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold">{t('nav.reports')}</h1><p className="text-ht-muted">{t('ri.intro')}</p></div>
        <DataSourceBadge source="simulated" />
      </header>
      <p role="note" className="flex items-start gap-2 rounded-xl border border-ht-line bg-ht-card p-3 text-sm"><Icon name="info" size={18} />{t('ri.honest')}</p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel aria-labelledby="ri-files">
          <h2 id="ri-files" className="mb-2 text-lg font-bold">{t('ri.files')}</h2>
          {status === 'loading' && <p role="status" className="text-sm text-ht-muted">{t('ri.loading')}</p>}
          {status === 'error' && <p role="alert" className="text-sm text-ht-emergencytext">{t('ri.loadError')}</p>}
          {status === 'ready' && reports.length === 0 && <p className="text-sm text-ht-muted">{t('ri.noFiles')}</p>}
          {reports.length > 0 && (
            <ul className="space-y-2 text-sm">
              {reports.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2"><Icon name="file" size={16} /><span className="font-semibold break-all">{r.name}</span>
                  {shareOn !== null && <StatusChip tone={shareOn ? 'ok' : 'neutral'} icon={shareOn ? 'check' : 'lock'}>{t(shareOn ? 'reports.shared' : 'reports.notShared')}</StatusChip>}
                  <StatusChip tone="neutral" icon="info">{t('ri.notReviewed')}</StatusChip></li>
              ))}
            </ul>
          )}
          <Link to="/reports" className={btn + 'mt-3 inline-flex items-center border-ht-line text-ht-accent hover:border-ht-accent'}>{t('ri.manageFiles')}</Link>
        </Panel>

        <Panel glow aria-labelledby="ri-add">
          <h2 id="ri-add" className="mb-2 text-lg font-bold">{t('ri.add')}</h2>
          {!pending ? (
            <form onSubmit={review} noValidate className="space-y-3">
              <label className="block text-sm font-semibold">{t('ri.test')}
                <select value={draft.lab} onChange={set('lab')} className={field}>{LABS.map((l) => <option key={l.key} value={l.key}>{t('lab.' + l.key)} ({l.unit})</option>)}</select></label>
              <div><label className="block text-sm font-semibold">{t('ri.value')}
                <input inputMode="decimal" value={draft.value} onChange={set('value')} {...bad('value')} className={field} /></label>{err('value')}</div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-semibold">{t('ri.low')}<input inputMode="decimal" value={draft.low} onChange={set('low')} {...bad('low')} className={field} /></label>{err('low')}</div>
                <div><label className="block text-sm font-semibold">{t('ri.high')}<input inputMode="decimal" value={draft.high} onChange={set('high')} {...bad('high')} className={field} /></label>{err('high')}</div>
              </div>
              <p className="text-xs text-ht-muted">{t('ri.rangeHelp')}</p>
              <div><label className="block text-sm font-semibold">{t('ri.date')}<input type="date" value={draft.date} max={today()} onChange={set('date')} {...bad('date')} className={field} /></label>{err('date')}</div>
              <label className="block text-sm font-semibold">{t('ri.fromReport')}
                <select value={draft.reportId} onChange={set('reportId')} className={field}><option value="">{t('ri.noneReport')}</option>{reports.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
              <button type="submit" className={btn + 'border-ht-accent bg-ht-accent/15 text-ht-accent'}>{t('ri.review')}</button>
            </form>
          ) : (
            <div role="group" aria-label={t('ri.confirmTitle')}>
              <p className="mb-2 font-semibold">{t('ri.confirmTitle')}</p>
              <p className="num text-2xl font-extrabold">{t('lab.' + pending.lab)}: {pending.value} {pending.unit}</p>
              <p className="mb-2 text-sm text-ht-muted">{t('ri.measured', { date: pending.date })}</p>
              <p className="mb-3 text-sm">{t('ri.confirmText')}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={confirm} className={btn + 'border-ht-accent bg-ht-accent/15 text-ht-accent'}>{t('ri.confirm')}</button>
                <button type="button" onClick={() => setPending(null)} className={btn + 'border-ht-line'}>{t('ri.edit')}</button>
              </div>
            </div>
          )}
          {notice && <p role="status" className="mt-3 text-sm font-semibold">{notice}</p>}
        </Panel>
      </div>

      <Panel aria-labelledby="ri-done">
        <h2 id="ri-done" className="mb-2 text-lg font-bold">{t('ri.confirmed')}</h2>
        {labs.length === 0 ? <p className="text-sm text-ht-muted">{t('ri.noneConfirmed')}</p> : <LabValueList entries={labs} onRemove={remove} />}
        <p className="mt-3 text-xs text-ht-muted">{t('ri.deviceOnly')}</p>
      </Panel>
      <p className="text-xs font-semibold text-ht-muted">{t('twin.notDiagnosis')}</p>
    </div>
  );
}
