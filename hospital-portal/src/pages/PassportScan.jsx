// Staff page for the QR passport: paste or scan a patient's QR link, choose a purpose, see the clinical details the patient released.
// Signed-out staff are sent to the login first (ProtectedRoute) and come back here. Every open is written to the server audit log.
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as api from '../services/api.js';
import { useT, useLang } from '../i18n/index.js';
import { formatWhen } from '../i18n/phrases.js';
import { PURPOSES, PURPOSE_KEY, parseToken, scanErrorKey } from '../services/passportScan.js';

const field = 'min-h-11 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-lg';
const hasCamera = () => typeof window !== 'undefined' && 'BarcodeDetector' in window && Boolean(navigator.mediaDevices?.getUserMedia);

function List({ title, items, shared = true }) {
  const t = useT();
  return (
    <section aria-label={title} className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-1 text-lg font-bold">{title}</h3>
      {!shared ? <p>{t('ps.notShared')}</p> : items.length === 0 ? <p>{t('ps.none')}</p>
        : <ul className="list-disc pl-6 text-lg">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>}
    </section>
  );
}

export default function PassportScan() {
  const t = useT();
  const lang = useLang();
  const [params] = useSearchParams();
  const [text, setText] = useState(params.get('t') || '');
  const [purpose, setPurpose] = useState('');
  const [state, setState] = useState({ status: 'idle', data: null, key: null });
  const [camera, setCamera] = useState(false);
  const video = useRef(null);
  const stream = useRef(null);

  const stop = () => { stream.current?.getTracks().forEach((x) => x.stop()); stream.current = null; setCamera(false); };
  useEffect(() => stop, []);

  async function open(rawText = text) {
    const token = parseToken(rawText);
    if (!token) return setState({ status: 'error', data: null, key: 'ps.badLink' });
    if (!purpose) return setState({ status: 'error', data: null, key: 'ps.needPurpose' });
    setState({ status: 'loading', data: null, key: null });
    try {
      setState({ status: 'ok', data: await api.resolvePassport(token, purpose), key: null });
    } catch (err) {
      setState({ status: 'error', data: null, key: err.missing && api.USE_MOCK ? 'ps.mock' : scanErrorKey(err) });
    }
  }

  async function startCamera() {
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      stream.current = media; setCamera(true);
      await new Promise((r) => setTimeout(r, 0));
      video.current.srcObject = media; await video.current.play();
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const tick = async () => {
        if (!stream.current) return;
        try {
          const found = await detector.detect(video.current);
          if (found[0] && parseToken(found[0].rawValue)) { setText(found[0].rawValue); stop(); return; }
        } catch { /* keep looking */ }
        setTimeout(tick, 400);
      };
      tick();
    } catch { stop(); setState({ status: 'error', data: null, key: 'ps.noCamera' }); }
  }

  const { status, data, key } = state;
  return (
    <main id="main" className="mx-auto max-w-3xl space-y-4 p-4">
      <div role="note" className="rounded-xl bg-amber-100 px-3 py-2 font-bold text-amber-950">{t('ps.banner')}</div>
      <h1 className="text-3xl font-bold">{t('ps.title')}</h1>
      <p>{t('ps.intro')}</p>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); open(); }}>
        <label className="block font-semibold">{t('ps.link')}
          <input data-testid="ps-link" className={field + ' mt-1 font-normal'} value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" spellCheck={false} />
        </label>
        <label className="block font-semibold">{t('ps.purpose')}
          <select data-testid="ps-purpose" className={field + ' mt-1 font-normal'} value={purpose} onChange={(e) => setPurpose(e.target.value)}>
            <option value="">{t('ps.choose')}</option>
            {PURPOSES.map((p) => <option key={p} value={p}>{t(PURPOSE_KEY[p])}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap gap-3">
          <button data-testid="ps-open" type="submit" className="min-h-11 rounded-lg bg-sky-700 px-5 py-2 text-lg font-bold text-white hover:bg-sky-800">{t('ps.open')}</button>
          {hasCamera()
            ? <button type="button" onClick={camera ? stop : startCamera} className="min-h-11 rounded-lg border-2 border-slate-400 px-5 py-2 text-lg font-semibold">{camera ? t('ps.scanStop') : t('ps.scan')}</button>
            : <p className="self-center text-base text-slate-700">{t('ps.noCamera')}</p>}
        </div>
        {camera && <video ref={video} muted playsInline className="w-full max-w-sm rounded-lg bg-black" aria-label={t('ps.scan')} />}
      </form>
      {status === 'loading' && <p role="status">…</p>}
      {status === 'error' && <p data-testid="ps-error" role="alert" className="rounded-lg border-2 border-slate-400 bg-white p-3 text-lg font-semibold">{t(key)}</p>}
      {status === 'ok' && (
        <div data-testid="ps-result" className="space-y-3">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-2xl font-bold">{data.name}</h2>
            <p>{t('ps.age', { age: data.age })} · {t('ps.blood')}: <strong>{data.blood_group || t('ps.none')}</strong></p>
            <p className="text-base text-slate-700">{t('ps.audit', { ref: data.audit_ref })} · {t('ps.purposeUsed', { purpose: t(PURPOSE_KEY[data.purpose] || 'ps.none') })}</p>
            <p className="text-base text-slate-700">{data.passport_expires_at ? t('ps.expires', { time: formatWhen(data.passport_expires_at, lang) }) : t('ps.noLink')}</p>
          </section>
          <List title={t('ps.allergies')} items={data.allergies || []} shared={data.shared.history} />
          <List title={t('ps.conditions')} items={data.conditions || []} shared={data.shared.history} />
          <List title={t('ps.medicines')} items={data.medications || []} shared={data.shared.history} />
          <List title={t('ps.contacts')} shared={data.shared.history} items={(data.contacts || []).map((c) => `${c.name} (${c.relation}) ${c.phone}`)} />
          {data.shared.reports && <List title={t('ps.reports')} items={(data.reports || []).map((r) => r.name)} />}
          <p className="text-sm text-slate-700">{t('ps.source')}</p>
        </div>
      )}
    </main>
  );
}
