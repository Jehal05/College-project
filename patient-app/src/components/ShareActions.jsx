// Share / Copy / Download / Print for the summary. Every one is started by the person; nothing is uploaded or sent by the app.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function ShareActions({ text, fileName }) {
  const { t } = useTranslation();
  const [note, setNote] = useState('');
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const btn = 'min-h-[48px] rounded-lg border-2 border-blue-700 px-3 font-bold text-blue-800';

  async function share() {
    try { await navigator.share({ title: t('summary.docTitle'), text }); } catch (err) { if (err?.name !== 'AbortError') setNote(t('summary.shareFailed')); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(text); setNote(t('summary.copied')); } catch { setNote(t('summary.copyFailed')); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNote(t('summary.downloaded'));
  }
  return (
    <div className="mt-4 print:hidden">
      <div className="grid grid-cols-2 gap-2">
        {canShare && <button type="button" onClick={share} className={btn}>{t('summary.share')}</button>}
        <button type="button" onClick={copy} className={btn}>{t('summary.copy')}</button>
        <button type="button" onClick={download} className={btn}>{t('summary.download')}</button>
        <button type="button" onClick={() => window.print()} className={btn}>{t('summary.print')}</button>
      </div>
      <p role="status" className="mt-2 min-h-[20px] text-sm font-semibold">{note}</p>
      <p className="text-xs text-slate-700">{t('summary.shareNote')}</p>
    </div>
  );
}
