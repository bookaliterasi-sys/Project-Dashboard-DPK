import { useMemo, useState } from 'react';
import {
  FileSpreadsheet, Download, Database, Store, Users, CreditCard,
  LayoutDashboard, FileText, FileDown, Loader2, CheckCircle2, Info,
} from 'lucide-react';
import { PageHeader, SectionCard, EmptyState, ErrorState, BrandLogo } from '../components/ui';
import { eventService, useServiceData } from '../services/eventDataService';
import { buildOverview } from '../services/metrics';
import {
  exportRecords, exportTenants, exportNasabah, exportFinancing,
  exportDashboardSummary, exportFullDashboard, exportEventReport,
} from '../services/excelExport';
import { downloadTemplate, TEMPLATE_LIST } from '../services/excelTemplates';
import { formatRupiahShort, formatNumber } from '../utils/formatters';

export default function Report() {
  const { data: events, loading, error, reload } = useServiceData(eventService.getEvents);
  const { data: records } = useServiceData(eventService.getRecords);
  const [busy, setBusy] = useState(null);
  const [done, setDone] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState('');

  const ov = useMemo(() => buildOverview(events || []), [events]);
  const k = ov.kpis;
  const hasData = !loading && !error && (events || []).length > 0;

  const run = async (key, fn) => {
    setBusy(key); setDone(null);
    try {
      await fn();
      setDone(key);
      setTimeout(() => setDone(null), 2500);
    } finally {
      setBusy(null);
    }
  };

  const EXPORTS = [
    { key: 'full', icon: FileDown, label: 'Laporan Dashboard Lengkap', desc: '7 sheet: ringkasan, event, tenant, nasabah, transaksi, pembiayaan, insight.', primary: true, fn: () => exportFullDashboard(events, records) },
    { key: 'summary', icon: LayoutDashboard, label: 'Ringkasan Dashboard', desc: 'Total event, DPK, transaksi, rasio efektivitas.', fn: () => exportDashboardSummary(events) },
    { key: 'database', icon: Database, label: 'Seluruh Database', desc: 'Semua baris rekening tenant & nasabah.', fn: () => exportRecords(records) },
    { key: 'tenant', icon: Store, label: 'Data Tenant', desc: 'Rekening tenant seluruh event.', fn: () => exportTenants(records) },
    { key: 'nasabah', icon: Users, label: 'Data Nasabah', desc: 'Rekening nasabah/pengunjung seluruh event.', fn: () => exportNasabah(records) },
    { key: 'financing', icon: CreditCard, label: 'Pembiayaan & Transaksi', desc: 'Pembiayaan, QRIS, EDC per event.', fn: () => exportFinancing(records) },
  ];

  return (
    <div>
      <PageHeader title="Report & Export" microcopy="Unduh data dan laporan event dalam format Excel rapi yang bisa diedit staf." />

      {/* Banner berlogo — identitas laporan resmi ISE BSI */}
      <div className="animate-fade-in-up mb-4 flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl bg-gradient-to-r from-bsi-900 via-bsi-800 to-bsi-950 px-5 py-4 shadow-card">
        <div className="flex items-center gap-3.5">
          <div className="rounded-2xl bg-white/95 p-2.5 shadow-lg shadow-black/20">
            <BrandLogo variant="ise" size={34} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-extrabold tracking-tight text-white">Laporan Resmi ISE BSI</p>
            <p className="truncate text-[11px] text-bsi-100/70">Event Monitoring &amp; Efektivitas DPK — Bank Syariah Indonesia</p>
          </div>
        </div>
        <BrandLogo variant="bsi" size={26} light />
      </div>

      {/* KPI ringkas */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total Event" value={loading ? '…' : formatNumber(k.totalEvents)} />
        <Stat label="Total Budget" value={loading ? '…' : formatRupiahShort(k.totalCost)} />
        <Stat label="Total DPK" value={loading ? '…' : formatRupiahShort(k.totalDpkCurrent)} />
        <Stat label="Rasio Efektivitas" value={loading ? '…' : (k.rasioAgregat != null ? `${k.rasioAgregat.toFixed(2)}×` : '—')} />
      </div>

      {error ? (
        <SectionCard title=""><ErrorState error={error} onRetry={reload} /></SectionCard>
      ) : (
        <>
          {/* Export data & laporan */}
          <SectionCard title="Export Data & Laporan" subtitle="Semua file mengikuti data terbaru di database" action={<FileSpreadsheet size={16} className="text-emerald-500" />}>
            {!hasData ? (
              <EmptyState title="Belum ada data untuk diekspor" desc="Input event dan upload data terlebih dahulu." />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {EXPORTS.map((x) => (
                  <ExportCard key={x.key} {...x} busy={busy === x.key} done={done === x.key} onClick={() => run(x.key, x.fn)} />
                ))}
              </div>
            )}
          </SectionCard>

          {/* Export per event */}
          <div className="mt-4">
            <SectionCard title="Export Per Event" subtitle="Laporan lengkap satu event (ringkasan + tenant + nasabah + transaksi)" action={<FileText size={16} className="text-bsi-500" />}>
              {!hasData ? (
                <EmptyState title="Belum ada event" desc="Buat event terlebih dahulu." />
              ) : (
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[240px] flex-1">
                    <label className="mb-1.5 block text-[12px] font-bold text-slate-600">Pilih Event</label>
                    <select
                      value={selectedEvent}
                      onChange={(e) => setSelectedEvent(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13.5px] outline-none transition focus:border-bsi-400 focus:ring-4 focus:ring-bsi-100"
                    >
                      <option value="">— Pilih event —</option>
                      {(events || []).map((e) => <option key={e.id} value={e.id}>{e.nama}</option>)}
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      const ev = (events || []).find((e) => String(e.id) === String(selectedEvent));
                      if (ev) run('event', () => eventService.getEvent(ev.id).then(exportEventReport));
                    }}
                    disabled={!selectedEvent || busy === 'event'}
                    className="btn-primary !py-2.5 text-[13px] disabled:opacity-50"
                  >
                    {busy === 'event' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                    Download Laporan Event
                  </button>
                </div>
              )}
            </SectionCard>
          </div>

          {/* Template kosong */}
          <div className="mt-4">
            <SectionCard title="Download Template Kosong" subtitle="Template Excel resmi untuk diisi staf" action={<Download size={16} className="text-bsi-500" />}>
              <div className="flex flex-wrap gap-2">
                {TEMPLATE_LIST.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => run(`tpl-${t.key}`, () => downloadTemplate(t.key))}
                    disabled={busy === `tpl-${t.key}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-[12.5px] font-semibold text-slate-600 transition hover:bg-bsi-50 hover:text-bsi-700 disabled:opacity-50"
                  >
                    {busy === `tpl-${t.key}` ? <Loader2 size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />}
                    {t.label}
                  </button>
                ))}
              </div>
            </SectionCard>
          </div>

          <p className="mt-4 flex items-start gap-2 rounded-xl bg-bsi-50/70 px-3.5 py-3 text-[12px] leading-relaxed text-bsi-800 ring-1 ring-bsi-100">
            <Info size={15} className="mt-0.5 shrink-0 text-bsi-500" />
            <span>Untuk export mengikuti filter yang sedang aktif, gunakan tombol <span className="font-semibold">Download Excel</span> di halaman Overview (mengikuti filter dashboard) atau Database Event (mengikuti pencarian/filter tabel).</span>
          </p>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-lg font-extrabold text-slate-800">{value}</p>
    </div>
  );
}

function ExportCard({ icon: Icon, label, desc, primary, busy, done, onClick }) {
  return (
    <div className={`flex items-center gap-3.5 rounded-xl border p-3.5 transition-all duration-300 ${primary ? 'border-bsi-200 bg-bsi-50/40' : 'border-slate-200 bg-white hover:border-bsi-300 hover:shadow-md hover:shadow-bsi-900/5'}`}>
      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-sm ${primary ? 'bg-gradient-to-br from-bsi-700 to-bsi-500' : 'bg-gradient-to-br from-bsi-600 to-bsi-500'}`}>
        <Icon size={20} strokeWidth={2.1} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-bold text-bsi-950">{label}</p>
        <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-slate-400">{desc}</p>
      </div>
      <button
        onClick={onClick}
        disabled={busy}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-semibold transition-all duration-300 active:scale-95 ${done ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200' : 'bg-bsi-50 text-bsi-700 hover:bg-bsi-100'} disabled:opacity-60`}
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : done ? <CheckCircle2 size={14} /> : <Download size={14} />}
        {busy ? 'Membuat…' : done ? 'Terunduh' : 'Download'}
      </button>
    </div>
  );
}
