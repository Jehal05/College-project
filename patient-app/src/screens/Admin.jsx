// Admin: accounts (disable, verify volunteers), texts with approval, and the access log. Simulated data only.
// There is no "list texts" endpoint yet, so the known text types are listed here.
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getAdminUsers, getAudit, getContent, patchAdminUser, putContent } from '../services/api';
import useAuth from '../hooks/useAuth';
import useLazyStrings from '../hooks/useLazyStrings';
import ErrorMessage from '../components/ErrorMessage';
import LanguageSelect from '../components/LanguageSelect';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Chip, Skeleton } from '../components/ui/Feedback';

const BUNDLES = { en: () => import('../i18n/admin.en.json'), hi: () => import('../i18n/admin.hi.json'), gu: () => import('../i18n/admin.gu.json') };
const CONTENT_TYPES = ['emergency_numbers', 'first_aid_basics'];

function Users() {
  const { t } = useTranslation();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(() => getAdminUsers().then(setUsers).catch(() => setError(t('admin.loadError'))), [t]);
  useEffect(() => { load(); }, [load]);
  async function change(u, body) {
    setError('');
    try { await patchAdminUser({ id: u.id, ...body }); await load(); }
    catch (e) { setError(t(e.status === 409 ? 'admin.ownAccount' : 'admin.userError')); }
  }
  return (
    <section aria-labelledby="admin-users"><h2 id="admin-users" className="mb-2 text-lg font-bold">{t('admin.users')}</h2>
      {error && <div className="mb-2"><ErrorMessage>{error}</ErrorMessage></div>}
      {!users ? <Skeleton className="h-24 w-full" /> : (
        <ul className="space-y-2">
          {users.map((u) => (
            <li key={u.id} data-testid="admin-user" data-email={u.email}>
              <Card>
                <p className="break-all font-semibold">{u.email}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Chip>{t('admin.role.' + u.role, { defaultValue: u.role })}</Chip>
                  {u.disabled && <Chip tone="warning">{t('admin.disabled')}</Chip>}
                  {u.role === 'RESPONDER' && <Chip tone={u.verified ? 'success' : 'warning'}>{t(u.verified ? 'admin.verified' : 'admin.notVerified')}</Chip>}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {u.role === 'RESPONDER' && !u.verified && <Button variant="secondary" onClick={() => change(u, { verified: true })}>{t('admin.verify')}</Button>}
                  <Button variant="secondary" onClick={() => change(u, { disabled: !u.disabled })}>{t(u.disabled ? 'admin.enable' : 'admin.disable')}</Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TextEditor({ type }) {
  const { t } = useTranslation();
  const [c, setC] = useState(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [approve, setApprove] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(() => getContent(type).then((x) => { setC(x); setText(x.items.join('\n')); }).catch(() => setError(t('admin.loadError'))), [type, t]);
  useEffect(() => { load(); }, [load]);
  async function save() {
    setNote(''); setError('');
    try { await putContent(type, { items: text.split('\n').map((l) => l.trim()).filter(Boolean), approved: approve }); setNote(t('admin.saved')); setOpen(false); setApprove(false); await load(); }
    catch { setError(t('admin.saveError')); }
  }
  return (
    <li data-testid="admin-content" data-type={type}>
      <Card>
        <p className="font-semibold">{t('admin.content.' + type)}</p>
        {c && <div className="mt-1 flex flex-wrap gap-1"><Chip>{t('admin.version', { n: c.version })}</Chip><Chip tone={c.approved ? 'success' : 'warning'}>{t(c.approved ? 'admin.approved' : 'admin.notApproved')}</Chip></div>}
        {error && <div className="mt-2"><ErrorMessage>{error}</ErrorMessage></div>}
        {note && <p role="status" className="mt-2 font-semibold text-emerald-800">{note}</p>}
        {!open ? <div className="mt-2"><Button variant="secondary" onClick={() => setOpen(true)}>{t('admin.edit')}</Button></div> : (
          <div className="mt-2">
            <p className="mb-2 text-sm text-slate-700">{t('admin.editNote')}</p>
            <label htmlFor={'t-' + type} className="block text-sm font-semibold">{t('admin.itemsLabel')}</label>
            <textarea id={'t-' + type} rows={4} value={text} onChange={(e) => setText(e.target.value)} className="mt-1 block w-full rounded-xl border-2 border-slate-300 p-2 text-base" />
            <label className="mt-2 flex items-center gap-2"><input type="checkbox" checked={approve} onChange={(e) => setApprove(e.target.checked)} className="h-5 w-5" />{t('admin.approveBox')}</label>
            <div className="mt-2"><Button onClick={save}>{t('admin.save')}</Button></div>
          </div>
        )}
      </Card>
    </li>
  );
}

function AuditLog() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(() => getAudit().then(setData).catch(() => setError(t('admin.loadError'))), [t]);
  useEffect(() => { load(); }, [load]);
  return (
    <section aria-labelledby="admin-audit"><h2 id="admin-audit" className="mb-2 text-lg font-bold">{t('admin.audit')}</h2>
      {error && <div className="mb-2"><ErrorMessage>{error}</ErrorMessage></div>}
      <div className="mb-2"><Button variant="secondary" onClick={load}>{t('admin.refresh')}</Button></div>
      {!data ? <Skeleton className="h-24 w-full" /> : !data.rows.length ? <p className="text-slate-700">{t('admin.auditEmpty')}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" data-testid="admin-audit">
            <thead><tr><th scope="col" className="p-1">{t('admin.when')}</th><th scope="col" className="p-1">{t('admin.who')}</th><th scope="col" className="p-1">{t('admin.action')}</th><th scope="col" className="p-1">{t('admin.outcome')}</th></tr></thead>
            <tbody>{data.rows.map((r, i) => <tr key={i} className="border-t border-slate-200"><td className="p-1">{new Date(r.at).toLocaleTimeString()}</td><td className="break-all p-1">{r.user}</td><td className="p-1">{r.action}</td><td className="p-1">{r.outcome}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function Admin() {
  const { t } = useTranslation();
  const ready = useLazyStrings(BUNDLES);
  const { signOut } = useAuth();
  if (!ready) return <div role="status" aria-label={t('common.working')}><Skeleton className="h-32 w-full" /></div>;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">{t('admin.title')}</h1>
      <p className="text-slate-700">{t('admin.intro')}</p>
      <Users />
      <section aria-labelledby="admin-content-h"><h2 id="admin-content-h" className="mb-2 text-lg font-bold">{t('admin.content')}</h2><ul className="space-y-2">{CONTENT_TYPES.map((x) => <TextEditor key={x} type={x} />)}</ul></section>
      <AuditLog />
      <LanguageSelect />
      <Button variant="ghost" icon="logout" onClick={signOut}>{t('home.signOut')}</Button>
    </div>
  );
}
