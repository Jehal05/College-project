// Admin page (feature #47): onboard and verify hospitals, plus the backend connection list.
// Only the admin role can open this page (see the route in App.jsx).
import { useState } from 'react';
import { useHospitals } from '../components/HospitalProvider.jsx';
import CapabilityBadges from '../components/CapabilityBadges.jsx';
import SimulatedBadge from '../components/SimulatedBadge.jsx';
import integration from '../data/integration.json';
import { USE_MOCK, API_BASE_URL } from '../services/config.js';
import { useT } from '../i18n/index.js';
import { CAPABILITY_KEYS, emptyHospitalForm, formFromHospital, validateHospital } from '../services/hospitalForm.js';

const input = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-lg';
const Err = ({ msg, name }) => (msg ? <p data-testid={`err-${name}`} className="mt-1 text-sm font-semibold text-red-700">{msg}</p> : null);

function HospitalForm({ editing, onDone }) {
  const t = useT();
  const { addHospital, editHospital } = useHospitals();
  const [form, setForm] = useState(editing ? formFromHospital(editing) : emptyHospitalForm());
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const { errors, errorKeys } = validateHospital(form);
  const show = (k) => (touched && errorKeys?.[k] ? t(errorKeys[k]) : '');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setCap = (k) => (e) => setForm((f) => ({ ...f, capabilities: { ...f.capabilities, [k]: e.target.checked } }));
  const setAv = (k, v) => setForm((f) => ({ ...f, availability: { ...f.availability, [k]: v } }));

  async function submit(ev) {
    ev.preventDefault();
    setTouched(true);
    const result = validateHospital(form);
    if (!result.ok) return;
    setBusy(true);
    setStatus('');
    try {
      if (editing) await editHospital(editing.id, result.value);
      else await addHospital(result.value);
      setStatus(editing ? t('admin.f.saved') : t('admin.f.added'));
      if (!editing) {
        setForm(emptyHospitalForm());
        setTouched(false);
      }
      onDone?.();
    } catch (err) {
      setStatus(t('admin.f.notSaved', { msg: err.message }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form data-testid="hospital-form" onSubmit={submit} noValidate className="space-y-4 rounded-2xl bg-white p-5 shadow">
      <h2 className="text-2xl font-bold">{editing ? t('admin.f.editTitle', { name: editing.name }) : t('admin.f.addTitle')}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block md:col-span-2"><span className="font-medium">{t('admin.f.name')}</span><input name="name" className={input} value={form.name} onChange={set('name')} /><Err name="name" msg={show('name')} /></label>
        <label className="block md:col-span-2"><span className="font-medium">{t('admin.f.address')}</span><input name="address" className={input} value={form.address} onChange={set('address')} /><Err name="address" msg={show('address')} /></label>
        <label className="block"><span className="font-medium">{t('admin.f.phone')}</span><input name="phone" className={input} value={form.phone} onChange={set('phone')} placeholder="+91-79-0000-0000" /><Err name="phone" msg={show('phone')} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="font-medium">{t('admin.f.lat')}</span><input name="lat" inputMode="decimal" className={input} value={form.lat} onChange={set('lat')} /><Err name="lat" msg={show('lat')} /></label>
          <label className="block"><span className="font-medium">{t('admin.f.lng')}</span><input name="lng" inputMode="decimal" className={input} value={form.lng} onChange={set('lng')} /><Err name="lng" msg={show('lng')} /></label>
        </div>
      </div>

      <fieldset>
        <legend className="font-medium">{t('admin.f.caps')}</legend>
        <div className="mt-1 flex flex-wrap gap-4 text-lg">
          {CAPABILITY_KEYS.map((k) => (
            <label key={k} className="flex items-center gap-2"><input type="checkbox" name={`cap_${k}`} className="h-6 w-6" checked={form.capabilities[k]} onChange={setCap(k)} />{t(`admin.cap.${k}`)}</label>
          ))}
        </div>
        <Err name="capabilities" msg={show('capabilities')} />
      </fieldset>

      <fieldset>
        <legend className="font-medium">{t('admin.f.avail')}</legend>
        <div className="mt-1 grid gap-4 md:grid-cols-2">
          <label className="block"><span>{t('avail.beds')}</span><input name="beds_free" inputMode="numeric" className={input} value={form.availability.beds_free} onChange={(e) => setAv('beds_free', e.target.value)} /><Err name="beds_free" msg={show('beds_free')} /></label>
          <label className="block"><span>{t('avail.icu')}</span><input name="icu_free" inputMode="numeric" className={input} value={form.availability.icu_free} onChange={(e) => setAv('icu_free', e.target.value)} /><Err name="icu_free" msg={show('icu_free')} /></label>
          <div><label className="flex items-center gap-2 text-lg"><input type="checkbox" name="cath_lab_ready" className="h-6 w-6" checked={form.availability.cath_lab_ready} onChange={(e) => setAv('cath_lab_ready', e.target.checked)} />{t('avail.cath')}</label><Err name="cath_lab_ready" msg={show('cath_lab_ready')} /></div>
          <div><label className="flex items-center gap-2 text-lg"><input type="checkbox" name="stroke_unit_ready" className="h-6 w-6" checked={form.availability.stroke_unit_ready} onChange={(e) => setAv('stroke_unit_ready', e.target.checked)} />{t('avail.stroke')}</label><Err name="stroke_unit_ready" msg={show('stroke_unit_ready')} /></div>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button data-testid="hospital-save" disabled={busy} className="rounded-lg bg-sky-600 px-6 py-3 text-lg font-bold text-white hover:bg-sky-700 disabled:opacity-60">{busy ? t('admin.f.saving') : editing ? t('admin.f.saveChanges') : t('admin.f.add')}</button>
        {editing && <button type="button" onClick={() => onDone?.('cancel')} className="rounded-lg bg-slate-200 px-5 py-3 text-lg font-semibold">{t('admin.f.cancel')}</button>}
        {touched && Object.keys(errors).length > 0 && <span data-testid="form-errors" className="font-semibold text-red-700">{Object.keys(errors).length === 1 ? t('admin.f.fixOne') : t('admin.f.fixMany', { n: Object.keys(errors).length })}</span>}
        {status && <span data-testid="hospital-status" role="status" className="font-semibold text-slate-700">{status}</span>}
      </div>
    </form>
  );
}

function Integration() {
  const t = useT();
  const Row = ({ a, b, fallback, status }) => (
    <tr className="border-t border-slate-200" data-status={status}>
      <td className="px-3 py-2 font-mono text-base">{a}</td><td className="px-3 py-2 text-base">{b}</td>
      <td className="px-3 py-2"><span className={`rounded-full px-3 py-0.5 text-sm font-bold ${status === 'agreed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>{status === 'agreed' ? t('admin.int.agreed') : t('admin.int.proposed')}</span></td>
      <td className="px-3 py-2 text-sm text-slate-600">{status === 'agreed' && !fallback ? '' : fallback || ''}</td>
    </tr>
  );
  return (
    <section data-testid="integration" className="space-y-3 rounded-2xl bg-white p-5 shadow">
      <h2 className="text-2xl font-bold">{t('admin.int.title')}</h2>
      <p data-testid="connection-mode" className="text-lg">
        {t('admin.int.mode')} <b>{USE_MOCK ? t('admin.int.mock') : t('admin.int.real', { url: API_BASE_URL })}</b>
      </p>
      <p className="text-slate-600">To switch, set <code className="rounded bg-slate-100 px-1">VITE_USE_MOCK=false</code> in <code className="rounded bg-slate-100 px-1">.env</code> (and the two address settings), then restart <code className="rounded bg-slate-100 px-1">npm run dev</code>.</p>
      <div className="overflow-x-auto"><table className="w-full text-left"><thead className="text-sm uppercase text-slate-500"><tr><th className="px-3 py-2">{t('admin.int.endpoint')}</th><th className="px-3 py-2">{t('admin.int.usedFor')}</th><th className="px-3 py-2">{t('admin.int.status')}</th><th className="px-3 py-2">{t('admin.int.fallback')}</th></tr></thead>
        <tbody>
          {integration.rest.map((r) => <Row key={r.method + r.path} a={`${r.method} ${r.path}`} b={r.used_for} fallback={r.fallback} status={r.status} />)}
          {integration.events.map((r) => <Row key={r.name} a={r.name} b={r.used_for} fallback={r.fallback} status={r.status} />)}
          {integration.other.map((r) => <Row key={r.name} a={r.name} b={r.used_for} fallback={r.fallback} status={r.status} />)}
        </tbody></table></div>
    </section>
  );
}

export default function Admin() {
  const t = useT();
  const { hospitals, setVerified, loading, error } = useHospitals();
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState('');

  async function toggle(h) {
    setMessage('');
    try {
      await setVerified(h.id, !h.verified);
    } catch (err) {
      setMessage(t('admin.verFail', { msg: err.message }));
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">{t('admin.title')}</h1>
        <SimulatedBadge text={t('admin.badge')} />
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-100 p-3 font-semibold text-red-800">{error}</p>}
      {message && <p role="alert" className="rounded-lg bg-red-100 p-3 font-semibold text-red-800">{message}</p>}

      <section className="rounded-2xl bg-white p-5 shadow">
        <h2 className="mb-1 text-2xl font-bold">{t('admin.hospitals')}</h2>
        <p className="mb-3 text-slate-600">{t('admin.hospNote')}</p>
        {loading && <p>{t('common.loading')}</p>}
        <ul className="space-y-2">
          {hospitals.map((h) => (
            <li key={h.id} data-testid="admin-hospital" data-id={h.id} data-verified={Boolean(h.verified)} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3">
              <div className="min-w-0 flex-1">
                <div className="text-lg font-bold">{h.name} <span className="font-normal text-slate-500">({h.id})</span></div>
                <CapabilityBadges capabilities={h.capabilities} size="sm" />
              </div>
              <span data-testid="verified-chip" className={`rounded-full px-3 py-1 font-bold ${h.verified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>{h.verified ? t('admin.verified') : t('admin.unverified')}</span>
              <button data-testid="toggle-verified" onClick={() => toggle(h)} className={`rounded-lg px-4 py-2 font-bold text-white ${h.verified ? 'bg-slate-600 hover:bg-slate-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>{h.verified ? t('admin.removeVer') : t('admin.markVer')}</button>
              <button data-testid="edit-hospital" onClick={() => setEditing(h)} className="rounded-lg bg-slate-200 px-4 py-2 font-semibold">{t('admin.edit')}</button>
            </li>
          ))}
        </ul>
      </section>

      <HospitalForm key={editing?.id || 'new'} editing={editing} onDone={(what) => (what === 'cancel' ? setEditing(null) : editing && setEditing(null))} />
      <Integration />
    </div>
  );
}
