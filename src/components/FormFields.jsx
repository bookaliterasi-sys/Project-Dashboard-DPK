// src/components/FormFields.jsx — komponen field form reusable, gaya ISE BSI
import { useId } from 'react';
import { ChevronDown } from 'lucide-react';

function Label({ htmlFor, children, required, helper }) {
  return (
    <div className="mb-1.5">
      <label htmlFor={htmlFor} className="text-[12px] font-bold text-slate-600">
        {children}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {helper && <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{helper}</p>}
    </div>
  );
}

const baseInput =
  'w-full rounded-xl border bg-white px-3 py-2.5 text-[13.5px] outline-none transition placeholder:text-slate-300 focus:ring-4';
const okBorder = 'border-slate-200 focus:border-bsi-400 focus:ring-bsi-100';
const errBorder = 'border-red-300 focus:border-red-400 focus:ring-red-100';

export function TextField({ label, value, onChange, placeholder, required, helper, error, type = 'text' }) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id} required={required} helper={helper}>{label}</Label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${baseInput} ${error ? errBorder : okBorder}`}
      />
      {error && <p className="mt-1 text-[11px] font-medium text-red-500">{error}</p>}
    </div>
  );
}

export function TextArea({ label, value, onChange, placeholder, required, helper, error, rows = 3 }) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id} required={required} helper={helper}>{label}</Label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${baseInput} resize-none ${error ? errBorder : okBorder}`}
      />
      {error && <p className="mt-1 text-[11px] font-medium text-red-500">{error}</p>}
    </div>
  );
}

export function SelectField({ label, value, onChange, options, required, helper, error }) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id} required={required} helper={helper}>{label}</Label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${baseInput} appearance-none pr-9 ${error ? errBorder : okBorder}`}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
      </div>
      {error && <p className="mt-1 text-[11px] font-medium text-red-500">{error}</p>}
    </div>
  );
}

export function DateField({ label, value, onChange, required, helper, error }) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id} required={required} helper={helper}>{label}</Label>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${baseInput} ${error ? errBorder : okBorder}`}
      />
      {error && <p className="mt-1 text-[11px] font-medium text-red-500">{error}</p>}
    </div>
  );
}

// input rupiah: tampilkan berformat ribuan, simpan angka murni
export function RupiahField({ label, value, onChange, required, helper, error, placeholder = '0' }) {
  const id = useId();
  const display = value === '' || value == null ? '' : Number(value).toLocaleString('id-ID');
  const handle = (raw) => {
    const digits = raw.replace(/[^\d]/g, '');
    onChange(digits === '' ? '' : Number(digits));
  };
  return (
    <div>
      <Label htmlFor={id} required={required} helper={helper}>{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-slate-400">Rp</span>
        <input
          id={id}
          inputMode="numeric"
          value={display}
          onChange={(e) => handle(e.target.value)}
          placeholder={placeholder}
          className={`${baseInput} pl-9 text-right ${error ? errBorder : okBorder}`}
        />
      </div>
      {error && <p className="mt-1 text-[11px] font-medium text-red-500">{error}</p>}
    </div>
  );
}

export function NumberField({ label, value, onChange, required, helper, error, placeholder = '0' }) {
  const id = useId();
  const handle = (raw) => {
    const digits = raw.replace(/[^\d]/g, '');
    onChange(digits === '' ? '' : Number(digits));
  };
  return (
    <div>
      <Label htmlFor={id} required={required} helper={helper}>{label}</Label>
      <input
        id={id}
        inputMode="numeric"
        value={value === '' || value == null ? '' : value}
        onChange={(e) => handle(e.target.value)}
        placeholder={placeholder}
        className={`${baseInput} ${error ? errBorder : okBorder}`}
      />
      {error && <p className="mt-1 text-[11px] font-medium text-red-500">{error}</p>}
    </div>
  );
}
