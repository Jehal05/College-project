// One labelled input (or select when "options" is given) with an error message.
import { useId } from 'react';

export default function FormField({ label, value, onChange, error, type = 'text', options, placeholder, ...rest }) {
  const id = useId();
  const base = 'mt-1 block min-h-[44px] w-full rounded-lg border px-3 text-base ' +
    (error ? 'border-amber-500' : 'border-slate-300');
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-800">{label}</label>
      {options ? (
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={base}
          aria-invalid={Boolean(error)} aria-describedby={error ? id + '-err' : undefined} {...rest}>
          <option value="">{placeholder}</option>
          {options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o)).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} className={base}
          aria-invalid={Boolean(error)} aria-describedby={error ? id + '-err' : undefined} {...rest} />
      )}
      {error && <p id={id + '-err'} className="mt-1 text-sm text-amber-800">{error}</p>}
    </div>
  );
}
