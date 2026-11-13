// Bed and ICU availability form (feature #42). Staff update their own hospital;
// the ranking reads these values, so a change here re-ranks at once.
import { useEffect, useState } from 'react';
import { useHospitals } from './HospitalProvider.jsx';

const isWholeNumber = (v) => /^\d+$/.test(String(v).trim());

export default function AvailabilityForm({ hospital }) {
  const { saveAvailability } = useHospitals();
  const [form, setForm] = useState(null);
  const [status, setStatus] = useState({ kind: 'idle', text: '' }); // idle | saving | saved | error

  // Fill the form when the hospital loads or another hospital is shown.
  useEffect(() => {
    if (!hospital) return;
    const a = hospital.availability || {};
    setForm({
      beds_free: String(a.beds_free ?? 0),
      icu_free: String(a.icu_free ?? 0),
      cath_lab_ready: Boolean(a.cath_lab_ready),
      stroke_unit_ready: Boolean(a.stroke_unit_ready),
    });
  }, [hospital?.id]);

  if (!hospital || !form) return null;
  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setStatus({ kind: 'idle', text: '' });
  };
  const errors = {
    beds_free: isWholeNumber(form.beds_free) ? '' : 'Enter a whole number, 0 or more',
    icu_free: isWholeNumber(form.icu_free) ? '' : 'Enter a whole number, 0 or more',
  };
  const invalid = Boolean(errors.beds_free || errors.icu_free);

  async function submit(e) {
    e.preventDefault();
    if (invalid) return;
    setStatus({ kind: 'saving', text: 'Saving…' });
    try {
      await saveAvailability(hospital.id, {
        beds_free: Number(form.beds_free),
        icu_free: Number(form.icu_free),
        cath_lab_ready: form.cath_lab_ready,
        stroke_unit_ready: form.stroke_unit_ready,
      });
      setStatus({ kind: 'saved', text: `Saved at ${new Date().toLocaleTimeString()}. Rankings updated.` });
    } catch (err) {
      setStatus({ kind: 'error', text: `Not saved: ${err.message}` });
    }
  }

  const number = (key, label) => (
    <label className="block">
      <span className="font-semibold">{label}</span>
      <input
        name={key}
        inputMode="numeric"
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        className={`mt-1 w-32 rounded-lg border-2 px-3 py-2 text-xl font-bold ${errors[key] ? 'border-red-500' : 'border-slate-300'}`}
      />
      {errors[key] && <span className="mt-1 block text-sm font-semibold text-red-700">{errors[key]}</span>}
    </label>
  );
  const flag = (key, label, capability) => {
    const has = Boolean(hospital.capabilities?.[capability]);
    return (
      <label className={`flex items-center gap-3 ${has ? '' : 'opacity-50'}`} title={has ? '' : `This hospital has no ${label.toLowerCase().replace(' ready', '')}`}>
        <input
          type="checkbox"
          name={key}
          className="h-7 w-7 accent-emerald-600"
          checked={has && form[key]}
          disabled={!has}
          onChange={(e) => set(key, e.target.checked)}
        />
        <span className="font-semibold">{label}{has ? '' : ' (not available here)'}</span>
      </label>
    );
  };

  return (
    <form data-testid="availability-form" onSubmit={submit} className="flex flex-wrap items-end gap-x-8 gap-y-4">
      {number('beds_free', 'Beds free')}
      {number('icu_free', 'ICU beds free')}
      <div className="space-y-2">
        {flag('cath_lab_ready', 'Cath lab ready', 'cath_lab')}
        {flag('stroke_unit_ready', 'Stroke unit ready', 'stroke_unit')}
      </div>
      <div className="flex items-center gap-3">
        <button
          disabled={invalid || status.kind === 'saving'}
          className="rounded-lg bg-sky-600 px-5 py-2.5 text-lg font-bold text-white hover:bg-sky-700 disabled:opacity-50"
        >
          {status.kind === 'saving' ? 'Saving…' : 'Save availability'}
        </button>
        {status.text && status.kind !== 'saving' && (
          <span
            data-testid="availability-status"
            role={status.kind === 'error' ? 'alert' : 'status'}
            className={`font-semibold ${status.kind === 'error' ? 'text-red-700' : 'text-emerald-700'}`}
          >
            {status.text}
          </span>
        )}
      </div>
    </form>
  );
}
