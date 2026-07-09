import { useState } from 'react';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { JENIS_EVENT_LABEL, countActiveFilters } from '../utils/dashboard';

function Select({ label, value, onChange, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`input-base !py-2 appearance-none pr-8 text-[13px] ${value ? 'border-bsi-300 bg-bsi-50/40 font-semibold text-bsi-800' : ''}`}
        >
          {children}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
      </div>
    </label>
  );
}

export default function FilterBar({ options, filters, onChange, onReset, resultCount, totalCount }) {
  const [open, setOpen] = useState(false);
  const active = countActiveFilters(filters);
  const set = (key) => (val) => onChange({ ...filters, [key]: val });

  return (
    <div className="card animate-fade-in-up mb-4 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left sm:px-5"
      >
        <div className="flex items-center gap-2.5">
          <span className="rounded-xl bg-bsi-50 p-2 text-bsi-600">
            <SlidersHorizontal size={17} strokeWidth={2.2} />
          </span>
          <div>
            <p className="text-[14px] font-bold text-bsi-950">Filter Global</p>
            <p className="text-[11.5px] text-slate-400">
              Menampilkan <span className="font-semibold text-bsi-700">{resultCount}</span> dari {totalCount} event
              {active > 0 && <> · <span className="font-semibold text-gold-600">{active} filter aktif</span></>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {active > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); onReset(); }}
              className="badge bg-red-50 text-red-600 ring-1 ring-red-200 hover:bg-red-100"
            >
              <X size={11} /> Reset
            </button>
          )}
          <ChevronDown size={18} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="grid grid-cols-2 gap-3 border-t border-slate-100 p-4 sm:grid-cols-3 sm:p-5 lg:grid-cols-5">
          <Select label="Tahun" value={filters.tahun} onChange={set('tahun')}>
            <option value="">Semua</option>
            {options.tahun.map((y) => <option key={y} value={y}>{y}</option>)}
          </Select>

          <Select label="Semester" value={filters.semester} onChange={set('semester')}>
            <option value="">Semua</option>
            {options.semester.map((s) => <option key={s} value={s}>Semester {s}</option>)}
          </Select>

          <Select label="Bulan" value={filters.bulan} onChange={set('bulan')}>
            <option value="">Semua</option>
            {options.bulan.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </Select>

          <Select label="Jenis Event" value={filters.jenisEvent} onChange={set('jenisEvent')}>
            <option value="">Semua</option>
            {options.jenisEvent.map((j) => <option key={j} value={j}>{JENIS_EVENT_LABEL[j] || j}</option>)}
          </Select>

          <Select label="Nama Event" value={filters.namaEvent} onChange={set('namaEvent')}>
            <option value="">Semua</option>
            {options.namaEvent.map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>

          <Select label="Provinsi" value={filters.provinsi} onChange={set('provinsi')}>
            <option value="">Semua</option>
            {options.provinsi.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>

          <Select label="Kota" value={filters.kota} onChange={set('kota')}>
            <option value="">Semua</option>
            {options.kota.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>

          <Select label="Status DPK" value={filters.statusDpk} onChange={set('statusDpk')}>
            <option value="">Semua</option>
            {options.statusDpk.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>

          <Select label="Status Efektivitas" value={filters.statusEfektivitas} onChange={set('statusEfektivitas')}>
            <option value="">Semua</option>
            {options.statusEfektivitas.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>

          <Select label="Jenis Tabungan" value={filters.jenisTabungan} onChange={set('jenisTabungan')}>
            <option value="">Semua</option>
            {options.jenisTabungan.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </div>
      )}
    </div>
  );
}
