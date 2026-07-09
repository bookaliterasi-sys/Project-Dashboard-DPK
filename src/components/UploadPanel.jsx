import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Database,
  RotateCcw,
  ChevronDown,
} from 'lucide-react';
import { parseExcel, UPLOAD_TYPES } from '../services/excelParser';
import { uploadService } from '../services/eventDataService';
import { formatRupiahFull as formatRupiah, formatNumber } from '../utils/formatters';

const TYPE_OPTIONS = [
  { key: 'auto', label: 'Deteksi otomatis' },
  { key: 'dpkTenant', label: UPLOAD_TYPES.dpkTenant.label },
  { key: 'nasabah', label: UPLOAD_TYPES.nasabah.label },
  { key: 'gabungan', label: UPLOAD_TYPES.gabungan.label },
  { key: 'akuisisi', label: UPLOAD_TYPES.akuisisi.label },
  { key: 'dpkUpdate', label: `${UPLOAD_TYPES.dpkUpdate.label} (pakai file Template DPK Tenant / Nasabah)` },
];

export default function UploadPanel({ onSaved }) {
  const [forcedType, setForcedType] = useState('auto');
  const [mode, setMode] = useState('append');
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [saveResult, setSaveResult] = useState(null);
  const [fatalError, setFatalError] = useState(null);
  const inputRef = useRef(null);

  const reset = () => {
    setParsed(null); setSaveResult(null); setFatalError(null);
  };

  const handleFile = useCallback(async (file) => {
    reset();
    setParsing(true);
    try {
      const type = forcedType === 'auto' ? null : forcedType;
      const result = await parseExcel(file, type);
      if (!result.ok && (!result.summary || result.summary.successRows === 0)) {
        setFatalError(result.errors?.[0] || 'File tidak dapat diproses.');
        setParsed(result.summary ? result : null);
      } else {
        setParsed(result);
      }
    } catch (e) {
      setFatalError(e.message || 'Gagal membaca file.');
    } finally {
      setParsing(false);
    }
  }, [forcedType]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const onSave = async () => {
    if (!parsed?.ok) return;
    setSaving(true);
    setFatalError(null);
    try {
      const res = await uploadService.save({
        type: parsed.type,
        data: parsed.data,
        fileName: parsed.fileName,
        summary: parsed.summary,
        mode,
      });
      setSaveResult(res);
      onSaved?.();
    } catch (e) {
      setFatalError(e.message || 'Gagal menyimpan ke database.');
    } finally {
      setSaving(false);
    }
  };

  // ---------- SUCCESS STATE ----------
  if (saveResult) {
    const r = saveResult.result || {};
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-center animate-fade-in">
        <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-500 animate-scale-in ring-4 ring-emerald-100">
          <CheckCircle2 size={32} />
        </div>
        <p className="text-base font-bold text-slate-800">
          Upload berhasil. Data telah tersimpan dan dashboard sudah diperbarui.
        </p>
        <div className="flex flex-wrap justify-center gap-2 text-[12px]">
          {r.events > 0 && <Stat label="Event baru" value={r.events} />}
          {r.inserted > 0 && <Stat label="Baris tersimpan" value={r.inserted} />}
          {r.updated > 0 && <Stat label="Saldo diperbarui" value={r.updated} />}
          {r.notMatched?.length > 0 && <Stat label="Tidak cocok" value={r.notMatched.length} warn />}
        </div>
        <button onClick={reset} className="btn-secondary mt-2 !py-2 text-xs">
          <RotateCcw size={14} /> Upload file lain
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* pilihan jenis + mode */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <select
            value={forcedType}
            onChange={(e) => { setForcedType(e.target.value); reset(); }}
            className="appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-[13px] font-medium outline-none transition focus:border-bsi-400"
          >
            {TYPE_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        <div className="relative">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-[13px] font-medium outline-none transition focus:border-bsi-400"
          >
            <option value="append">Tambah data (append)</option>
            <option value="overwrite">Timpa data event (overwrite)</option>
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {/* drag & drop */}
      {!parsed && !parsing && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-12 text-center transition-all duration-300 ${
            dragging ? 'drop-glow bg-bsi-50/60 scale-[1.015]' : 'border-slate-200 hover:border-bsi-300 hover:bg-slate-50/50'
          }`}
        >
          <div className={`rounded-2xl p-4 transition-all duration-300 ${dragging ? 'bg-bsi-100 text-bsi-600 animate-float-soft' : 'bg-slate-100 text-slate-400'}`}>
            <Upload size={28} className={dragging ? 'animate-pulse-soft' : ''} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700">
              Tarik file Excel ke sini, atau klik untuk memilih
            </p>
            <p className="mt-1 text-xs text-slate-400">Format .xlsx atau .xls — gunakan template resmi dashboard</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>
      )}

      {/* loading parse — animasi dokumen Excel */}
      {parsing && (
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
          <div className="ring-loader">
            <div className="rounded-2xl bg-bsi-50 p-4 text-bsi-600 animate-float-soft">
              <FileSpreadsheet size={28} />
            </div>
          </div>
          <p className="text-sm font-semibold text-slate-600">Membaca &amp; memvalidasi file…</p>
        </div>
      )}

      {/* fatal error (file ditolak) */}
      {fatalError && !parsed && (
        <div className="mt-3 flex items-start gap-3 rounded-xl bg-red-50 p-4 ring-1 ring-red-100 animate-fade-in">
          <XCircle size={20} className="mt-0.5 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-bold text-red-700">File ditolak</p>
            <p className="mt-0.5 text-[13px] text-red-600">{fatalError}</p>
            <button onClick={reset} className="btn-secondary mt-3 !py-1.5 text-xs">
              <RotateCcw size={13} /> Coba file lain
            </button>
          </div>
        </div>
      )}

      {/* preview + summary */}
      {parsed && (
        <div className="animate-fade-in">
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-bsi-50/60 px-3.5 py-3">
            <FileSpreadsheet size={18} className="text-bsi-600" />
            <span className="text-[13px] font-bold text-bsi-950">{parsed.fileName}</span>
            <span className="badge bg-bsi-100 text-bsi-700">{parsed.label}</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <SummaryCard label="Baris terbaca" value={parsed.summary.totalRows} tone="slate" />
            <SummaryCard label="Data valid" value={parsed.summary.successRows} tone="emerald" />
            <SummaryCard label="Gagal" value={parsed.summary.failedRows} tone={parsed.summary.failedRows ? 'red' : 'slate'} />
            <SummaryCard label="Peringatan" value={parsed.summary.warningCount} tone={parsed.summary.warningCount ? 'amber' : 'slate'} />
          </div>

          {/* preview tabel */}
          <PreviewTable parsed={parsed} />

          {/* daftar error & warning */}
          {parsed.errors?.length > 0 && (
            <IssueList title="Kesalahan" items={parsed.errors} icon={XCircle} tone="red" />
          )}
          {parsed.warnings?.length > 0 && (
            <IssueList title="Peringatan" items={parsed.warnings} icon={AlertTriangle} tone="amber" />
          )}

          {fatalError && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] font-medium text-red-600 ring-1 ring-red-100">
              {fatalError}
            </p>
          )}

          {/* aksi */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={onSave}
              disabled={!parsed.ok || saving}
              className="btn-primary !py-2.5 text-[13px] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Database size={15} />}
              {saving ? 'Menyimpan…' : 'Simpan ke Database'}
            </button>
            <button onClick={reset} className="btn-secondary !py-2.5 text-[13px]">
              <RotateCcw size={14} /> Batal
            </button>
          </div>
          {!parsed.ok && (
            <p className="mt-2 text-[12px] text-slate-400">
              Perbaiki kesalahan di atas sebelum menyimpan.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, warn }) {
  return (
    <span className={`rounded-lg px-2.5 py-1 font-semibold ring-1 ${warn ? 'bg-amber-50 text-amber-700 ring-amber-100' : 'bg-emerald-50 text-emerald-700 ring-emerald-100'}`}>
      {label}: {formatNumber(value)}
    </span>
  );
}

function SummaryCard({ label, value, tone }) {
  const tones = {
    slate: 'bg-slate-50 text-slate-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-700',
  };
  return (
    <div className={`rounded-xl px-3 py-2.5 ${tones[tone]}`}>
      <p className="text-lg font-extrabold leading-none">{formatNumber(value)}</p>
      <p className="mt-1 text-[11px] font-medium opacity-70">{label}</p>
    </div>
  );
}

function IssueList({ title, items, icon: Icon, tone }) {
  const [open, setOpen] = useState(tone === 'red');
  const tones = { red: 'text-red-600', amber: 'text-amber-600' };
  const shown = open ? items : items.slice(0, 3);
  return (
    <div className="mt-3 rounded-xl border border-slate-100 p-3">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 text-left">
        <Icon size={15} className={tones[tone]} />
        <span className="text-[13px] font-bold text-slate-700">{title} ({items.length})</span>
        <ChevronDown size={14} className={`ml-auto text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <ul className="mt-2 space-y-1">
        {shown.map((it, i) => (
          <li key={i} className="text-[12px] text-slate-500">• {it}</li>
        ))}
        {!open && items.length > 3 && (
          <li className="text-[12px] font-medium text-bsi-600">+{items.length - 3} lainnya…</li>
        )}
      </ul>
    </div>
  );
}

function PreviewTable({ parsed }) {
  // ambil daftar baris pertama dari kelompok data yang ada
  const groups = [];
  const d = parsed.data || {};
  if (d.events?.length) groups.push(['Event', d.events, ['nama_event', 'jenis_event', 'budget_event']]);
  if (d.tenant?.length) groups.push(['Tenant', d.tenant, ['namaEvent', 'nama_tenant', 'no_rekening_tenant', 'saldo_awal', 'status_dpk']]);
  if (d.nasabah?.length) groups.push(['Nasabah', d.nasabah, ['namaEvent', 'nama_nasabah', 'no_rekening_nasabah', 'setoran_awal']]);
  if (d.akuisisi?.length) groups.push(['Akuisisi', d.akuisisi, ['namaEvent', 'jenis_pembiayaan', 'sales_volume_qris', 'sales_volume_edc']]);
  if (d.updates?.length) groups.push(['Update Saldo', d.updates, ['target', 'no_rekening', 'no_cif', 'saldo_update']]);

  if (!groups.length) return null;

  const moneyKeys = new Set(['budget_event', 'saldo_awal', 'setoran_awal', 'saldo_update', 'sales_volume_qris', 'sales_volume_edc']);

  return (
    <div className="mt-3 space-y-3">
      {groups.map(([name, rows, cols]) => (
        <div key={name}>
          <p className="mb-1.5 text-[12px] font-bold text-slate-500">Preview {name} <span className="font-normal text-slate-400">({rows.length} baris, tampil maks 5)</span></p>
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full min-w-[520px] text-[12px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-[10.5px] font-bold uppercase tracking-wide text-slate-400">
                  {cols.map((c) => <th key={c} className="px-2.5 py-2">{c.replace(/_/g, ' ')}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {cols.map((c) => (
                      <td key={c} className="px-2.5 py-1.5 text-slate-600">
                        {moneyKeys.has(c) && row[c] != null ? formatRupiah(row[c]) : String(row[c] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
