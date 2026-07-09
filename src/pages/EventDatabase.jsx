import { useMemo, useState } from 'react';
import {
  Search, Download, ChevronDown, ChevronUp, ChevronsUpDown,
  ChevronLeft, ChevronRight, Loader2,
} from 'lucide-react';
import { PageHeader, SectionCard, TableSkeleton, EmptyState, ErrorState, StatusBadge } from '../components/ui';
import { eventService, useServiceData } from '../services/eventDataService';
import { exportRecords } from '../services/excelExport';
import { formatRupiahShort, formatNumber, formatDate } from '../utils/formatters';

const PAGE_SIZE = 12;

const SORTS = {
  none: { label: 'Default', fn: null },
  dpk: { label: 'DPK terbesar', fn: (a, b) => (b.saldo_update ?? 0) - (a.saldo_update ?? 0) },
  growth: { label: 'Pertumbuhan terbesar', fn: (a, b) => (b.pertumbuhan_dpk ?? 0) - (a.pertumbuhan_dpk ?? 0) },
  budget: { label: 'Budget terbesar', fn: (a, b) => (b.budget_event ?? 0) - (a.budget_event ?? 0) },
};

export default function EventDatabase({ onNavigate }) {
  const { data: records, loading, error, reload } = useServiceData(eventService.getRecords);
  const [q, setQ] = useState('');
  const [fEvent, setFEvent] = useState('');
  const [fJenis, setFJenis] = useState('');
  const [fProvinsi, setFProvinsi] = useState('');
  const [fKota, setFKota] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fTabungan, setFTabungan] = useState('');
  const [fTanggal, setFTanggal] = useState('');
  const [sortKey, setSortKey] = useState('none');
  const [colSort, setColSort] = useState(null); // { key, dir }
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const rows = records || [];

  // opsi dinamis
  const opts = useMemo(() => {
    const u = (key) => [...new Set(rows.map((r) => r[key]).filter(Boolean))].sort();
    return { event: u('nama_event'), provinsi: u('provinsi'), kota: u('kota'), tabungan: u('jenis_tabungan') };
  }, [rows]);

  // filter + search
  const filtered = useMemo(() => {
    let out = rows.filter((r) => {
      if (q) {
        const hay = `${r.nama_event} ${r.nama} ${r.no_cif} ${r.no_rekening} ${r.kota} ${r.provinsi}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      if (fEvent && r.nama_event !== fEvent) return false;
      if (fJenis && r.jenis_event !== fJenis) return false;
      if (fProvinsi && r.provinsi !== fProvinsi) return false;
      if (fKota && r.kota !== fKota) return false;
      if (fStatus && r.status_dpk !== fStatus) return false;
      if (fTabungan && r.jenis_tabungan !== fTabungan) return false;
      if (fTanggal && r.tanggal_event !== fTanggal) return false;
      return true;
    });
    // sort: kolom klik diprioritaskan, lalu dropdown sort
    if (colSort) {
      const { key, dir } = colSort;
      out = [...out].sort((a, b) => {
        const va = a[key], vb = b[key];
        if (typeof va === 'number' || typeof vb === 'number') return dir === 'asc' ? (va ?? 0) - (vb ?? 0) : (vb ?? 0) - (va ?? 0);
        return dir === 'asc' ? String(va ?? '').localeCompare(String(vb ?? '')) : String(vb ?? '').localeCompare(String(va ?? ''));
      });
    } else if (SORTS[sortKey]?.fn) {
      out = [...out].sort(SORTS[sortKey].fn);
    }
    return out;
  }, [rows, q, fEvent, fJenis, fProvinsi, fKota, fStatus, fTabungan, fTanggal, sortKey, colSort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);

  const resetPage = () => setPage(1);

  const toggleColSort = (key) => {
    setColSort((c) => c?.key === key ? (c.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' });
    setSortKey('none');
    resetPage();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportRecords(filtered);
    } finally {
      setExporting(false);
    }
  };

  const SEL = 'w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-2.5 pr-7 text-[12.5px] outline-none transition focus:border-bsi-400 focus:ring-2 focus:ring-bsi-100';

  return (
    <div>
      <PageHeader title="Database Event" microcopy="Seluruh data rekening tenant & nasabah dari database. Klik baris untuk membuka detail event." />

      <SectionCard
        title="Data Rekening"
        subtitle={records ? `${filtered.length} dari ${rows.length} baris` : ''}
        action={
          <button onClick={handleExport} disabled={exporting || !filtered.length} className="btn-secondary !px-3 !py-2 text-xs disabled:opacity-50">
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Download Excel
          </button>
        }
      >
        {/* toolbar: search (baris penuh) + filter grid rapi di semua layar */}
        <div className="mb-3 space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); resetPage(); }}
              placeholder="Cari nama, CIF, rekening, kota…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] outline-none transition focus:border-bsi-400 focus:ring-2 focus:ring-bsi-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
            <Sel value={fEvent} onChange={(v) => { setFEvent(v); resetPage(); }} cls={SEL} all="Semua Event" options={opts.event} />
            <Sel value={fJenis} onChange={(v) => { setFJenis(v); resetPage(); }} cls={SEL} all="Semua Jenis" options={[['expo', 'Expo/Bazar'], ['private', 'Private']]} pairs />
            <Sel value={fProvinsi} onChange={(v) => { setFProvinsi(v); resetPage(); }} cls={SEL} all="Provinsi" options={opts.provinsi} />
            <Sel value={fKota} onChange={(v) => { setFKota(v); resetPage(); }} cls={SEL} all="Kota" options={opts.kota} />
            <Sel value={fStatus} onChange={(v) => { setFStatus(v); resetPage(); }} cls={SEL} all="Status DPK" options={['Tumbuh', 'Tetap', 'Turun', 'Belum Update']} />
            <Sel value={fTabungan} onChange={(v) => { setFTabungan(v); resetPage(); }} cls={SEL} all="Tabungan" options={opts.tabungan} />
            <input type="date" value={fTanggal} onChange={(e) => { setFTanggal(e.target.value); resetPage(); }} className={SEL} />
            <select value={sortKey} onChange={(e) => { setSortKey(e.target.value); setColSort(null); resetPage(); }} className={SEL}>
              {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>Urut: {v.label}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={8} />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : filtered.length === 0 ? (
          <EmptyState title="Tidak ada data" desc={rows.length ? 'Sesuaikan pencarian atau filter.' : 'Belum ada data. Upload Excel atau input event terlebih dahulu.'} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-[12.5px]">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[10.5px] font-bold uppercase tracking-wide text-slate-400">
                    <Th>No</Th>
                    <Th sortable onSort={() => toggleColSort('nama_event')} sort={colSort} k="nama_event">Nama Event</Th>
                    <Th>Jenis</Th>
                    <Th>Tanggal</Th>
                    <Th>Prov/Kota</Th>
                    <Th>No CIF</Th>
                    <Th>No Rekening</Th>
                    <Th>Nama</Th>
                    <Th>Tabungan</Th>
                    <Th sortable onSort={() => toggleColSort('saldo_update')} sort={colSort} k="saldo_update" right>Saldo Update</Th>
                    <Th sortable onSort={() => toggleColSort('pertumbuhan_dpk')} sort={colSort} k="pertumbuhan_dpk" right>Pertumbuhan</Th>
                    <Th center>Status</Th>
                    <Th right>Transaksi</Th>
                    <Th right>Sales Vol.</Th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r, i) => (
                    <tr
                      key={`${r.kind}-${r.event_id}-${r.no_rekening}-${i}`}
                      onClick={() => onNavigate?.('detail', r.event_id)}
                      className="group cursor-pointer border-b border-slate-50 transition-all duration-200 hover:bg-bsi-50/50 hover:shadow-[0_1px_0_0_rgba(0,163,157,0.2)]"
                    >
                      <td className="px-2.5 py-2.5 text-slate-400">{(curPage - 1) * PAGE_SIZE + i + 1}</td>
                      <td className="max-w-[180px] truncate px-2.5 py-2.5 font-bold text-bsi-950 group-hover:text-bsi-700" title={r.nama_event}>{r.nama_event}</td>
                      <td className="px-2.5 py-2.5 text-slate-500">{r.jenis_event === 'expo' ? 'Expo' : 'Private'}</td>
                      <td className="px-2.5 py-2.5 text-slate-500">{r.tanggal_event ? formatDate(r.tanggal_event) : '—'}</td>
                      <td className="max-w-[120px] truncate px-2.5 py-2.5 text-slate-500" title={`${r.provinsi || ''} ${r.kota || ''}`}>{r.kota || r.provinsi || '—'}</td>
                      <td className="px-2.5 py-2.5 font-mono text-slate-600">{r.no_cif || '—'}</td>
                      <td className="px-2.5 py-2.5 font-mono text-slate-600">{r.no_rekening || '—'}</td>
                      <td className="max-w-[150px] truncate px-2.5 py-2.5 text-slate-700" title={r.nama}>{r.nama || '—'}</td>
                      <td className="px-2.5 py-2.5 text-slate-500">{r.jenis_tabungan || '—'}</td>
                      <td className="px-2.5 py-2.5 text-right font-semibold text-bsi-700">{r.saldo_update != null ? formatRupiahShort(r.saldo_update) : '—'}</td>
                      <td className={`px-2.5 py-2.5 text-right font-semibold ${r.pertumbuhan_dpk >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatRupiahShort(r.pertumbuhan_dpk)}</td>
                      <td className="px-2.5 py-2.5 text-center"><StatusBadge status={mapStatus(r.status_dpk)} /></td>
                      <td className="px-2.5 py-2.5 text-right text-slate-500">{formatNumber(r.jumlah_transaksi)}</td>
                      <td className="px-2.5 py-2.5 text-right text-slate-500">{formatRupiahShort(r.sales_volume)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* pagination */}
            <div className="mt-3 flex items-center justify-between">
              <p className="text-[12px] text-slate-400">Halaman {curPage} dari {totalPages}</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={curPage === 1} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40">
                  <ChevronLeft size={16} />
                </button>
                {pageNumbers(curPage, totalPages).map((n, i) => n === '…' ? (
                  <span key={i} className="px-2 text-slate-400">…</span>
                ) : (
                  <button key={i} onClick={() => setPage(n)} className={`min-w-[32px] rounded-lg px-2 py-1.5 text-[12.5px] font-semibold transition ${n === curPage ? 'bg-bsi-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{n}</button>
                ))}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={curPage === totalPages} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}

function Sel({ value, onChange, options, all, cls, pairs }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className={cls}>
        <option value="">{all}</option>
        {options.map((o) => pairs
          ? <option key={o[0]} value={o[0]}>{o[1]}</option>
          : <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Th({ children, sortable, onSort, sort, k, right, center }) {
  const active = sort?.key === k;
  return (
    <th className={`px-2.5 py-2.5 ${right ? 'text-right' : center ? 'text-center' : 'text-left'}`}>
      {sortable ? (
        <button onClick={onSort} className={`inline-flex items-center gap-1 transition hover:text-bsi-600 ${active ? 'text-bsi-600' : ''} ${right ? 'flex-row-reverse' : ''}`}>
          {children}
          {active ? (sort.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ChevronsUpDown size={12} className="opacity-40" />}
        </button>
      ) : children}
    </th>
  );
}

function mapStatus(s) {
  if (s === 'Tumbuh') return 'Naik';
  if (s === 'Turun') return 'Turun';
  if (s === 'Tetap') return 'Stagnan';
  return s;
}

function pageNumbers(cur, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (cur <= 4) return [1, 2, 3, 4, 5, '…', total];
  if (cur >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '…', cur - 1, cur, cur + 1, '…', total];
}
