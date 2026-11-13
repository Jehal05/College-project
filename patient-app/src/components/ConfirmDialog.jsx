// A small in-page "are you sure?" box (we never use window.confirm). Focus starts on the safe button.
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export default function ConfirmDialog({ title, confirmLabel, onConfirm, onCancel, busy = false }) {
  const { t } = useTranslation();
  const safeButton = useRef(null);
  useEffect(() => { safeButton.current?.focus(); }, []);
  return (
    <div role="alertdialog" aria-labelledby="confirm-dialog-title" className="my-3 rounded-xl border-2 border-slate-400 bg-slate-50 p-4">
      <p id="confirm-dialog-title" className="mb-3 font-semibold">{title}</p>
      <button type="button" onClick={onConfirm} disabled={busy} className="mb-2 min-h-[48px] w-full rounded-lg bg-blue-700 font-bold text-white disabled:opacity-60">
        {busy ? t('common.working') : confirmLabel}
      </button>
      <button type="button" ref={safeButton} onClick={onCancel} className="min-h-[48px] w-full rounded-lg border-2 border-slate-400 font-semibold">
        {t('common.cancel')}
      </button>
    </div>
  );
}
