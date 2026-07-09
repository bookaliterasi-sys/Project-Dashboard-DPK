import { useMemo, useState } from 'react';
import {
  CalendarRange, Wallet, PiggyBank, TrendingUp, Gauge, Users, CreditCard,
  BarChart3, Download, Trophy, AlertTriangle, Landmark, ReceiptText, Clock, UploadCloud,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
  AreaChart, Area, PieChart, Pie,
} from 'recharts';
import { eventService, uploadService, useServiceData } from '../services/eventDataService';
import { formatRupiahShort, formatNumber, formatDate, formatDateTime, timeAgo } from '../utils/formatters';
import {
  KpiCard, SectionCard, PageHeader, ChartSkeleton, KpiSkeleton, CHART_COLORS,
  ChartTooltip, EmptyState, ErrorState, StatusBadge, AnimatedNumber,
} from '../components/ui';
import HeroCube from '../components/HeroCube';
import FilterBar from '../components/FilterBar';
import {
  enrichAll, buildFilterOptions, applyFilters, aggregate, EMPTY_FILTERS,
  chartCostVsDpk, chartDpkPerMonth, chartNoaPerEvent, chartQrisVsEdc, chartSalesVolume, chartEfektivitas,
  JENIS_EVENT_LABEL,
} from '../utils/dashboard';
import { exportDashboardExcel } from '../utils/exportExcel';

const EF_COLOR = { sangat: CHART_COLORS.emerald, cukup: CHART_COLORS.teal, kurang: CHART_COLORS.gold, evaluasi: CHART_COLORS.red };
const EF_TONE_CLASS = {
  emerald: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  teal: 'bg-bsi-50 text-bsi-700 ring-1 ring-bsi-200',
  gold: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-1 ring-red-200',
};

/* Wrapper chart yang tidak pecah saat event banyak: scroll horizontal + lebar minimum per kategori. */
function ScrollChart({ count, per = 72, min = 480, height = 300, children }) {
  const width = Math.max(min, count * per);
  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: width, height }}>
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </div>
  );
}

function HeroStat({ icon: Icon, label, value, numeric, format, sub }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-bsi-100/70">
        <Icon size={14} strokeWidth={2.3} />
        <span className="truncate text-[11px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1 truncate text-lg font-extrabold text-white sm:text-xl">
        {typeof numeric === 'number' && isFinite(numeric)
          ? <AnimatedNumber value={numeric} format={format || ((n) => n)} />
          : value}
      </p>
      {sub && <p className="truncate text-[11px] text-bsi-100/60">{sub}</p>}
    </div>
  );
}

export default function Overview({ onNavigate }) {
  const { data, loading, error, reload } = useServiceData(eventService.getOverview);
  const { data: uploads } = useServiceData(uploadService.history);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [exporting, setExporting] = useState(false);

  const allRows = useMemo(() => enrichAll(data?.events), [data]);
  const options = useMemo(() => buildFilterOptions(allRows), [allRows]);
  const rows = useMemo(() => applyFilters(allRows, filters), [allRows, filters]);
  const agg = useMemo(() => aggregate(rows), [rows]);

  const hasAnyData = !loading && !error && allRows.length > 0;
  const hasFiltered = rows.length > 0;

  const lastUpdate = useMemo(() => {
    const dates = allRows.map((r) => r.raw?.createdAt).filter(Boolean).map((d) => new Date(d).getTime());
    const upl = (uploads || []).map((u) => new Date(u.upload_date).getTime()).filter((t) => !isNaN(t));
    const all = [...dates, ...upl].filter((t) => !isNaN(t));
    return all.length ? new Date(Math.max(...all)) : null;
  }, [allRows, uploads]);

  const filterSummary = useMemo(() => {
    const parts = [];
    if (filters.tahun) parts.push(`Tahun ${filters.tahun}`);
    if (filters.semester) parts.push(`Semester ${filters.semester}`);
    if (filters.bulan !== '') parts.push(options.bulan.find((b) => String(b.value) === String(filters.bulan))?.label);
    if (filters.jenisEvent) parts.push(JENIS_EVENT_LABEL[filters.jenisEvent] || filters.jenisEvent);
    if (filters.namaEvent) parts.push(filters.namaEvent);
    if (filters.provinsi) parts.push(filters.provinsi);
    if (filters.kota) parts.push(filters.kota);
    if (filters.statusDpk) parts.push(`DPK ${filters.statusDpk}`);
    if (filters.statusEfektivitas) parts.push(filters.statusEfektivitas);
    if (filters.jenisTabungan) parts.push(`Tabungan ${filters.jenisTabungan}`);
    return parts.filter(Boolean).join(' · ') || 'Semua data';
  }, [filters, options]);

  const handleExport = async () => {
    if (!hasFiltered) return;
    setExporting(true);
    try { await exportDashboardExcel(rows, { filterSummary }); }
    catch (e) { console.error('Export gagal:', e); }
    finally { setExporting(false); }
  };

  /* ---------- state: loading ---------- */
  if (loading) {
    return (
      <div>
        <PageHeader title="Dashboard Overview" microcopy="Memuat data event dari database…" />
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <KpiSkeleton key={i} />)}
        </div>
        <div className="mt-4"><SectionCard title="Memuat grafik"><ChartSkeleton height={320} /></SectionCard></div>
      </div>
    );
  }

  /* ---------- state: error ---------- */
  if (error) {
    return (
      <div>
        <PageHeader title="Dashboard Overview" />
        <SectionCard title="Gagal memuat data"><ErrorState error={error} onRetry={reload} /></SectionCard>
      </div>
    );
  }

  /* ---------- state: belum ada data sama sekali ---------- */
  if (!hasAnyData) {
    return (
      <div>
        <PageHeader title="Dashboard Overview" microcopy="Ringkasan efektivitas seluruh event ISE BSI — dihitung langsung dari database." />
        <div className="card animate-fade-in-up">
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="rounded-2xl bg-slate-100 p-4 text-slate-400"><BarChart3 size={30} /></div>
            <p className="text-base font-bold text-slate-700">Belum ada data event. Silakan upload Excel atau input event baru.</p>
            <p className="max-w-md text-sm text-slate-400">Semua angka pada dashboard dihitung dari data asli. Tidak ada angka contoh yang ditampilkan.</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <button onClick={() => onNavigate?.('input')} className="btn-primary !py-2.5 text-[13px]">Input Event Baru</button>
              <button onClick={() => onNavigate?.('upload')} className="btn-secondary !py-2.5 text-[13px]">Upload Excel</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- data siap ---------- */
  const costDpk = chartCostVsDpk(rows);
  const monthly = chartDpkPerMonth(rows);
  const noaData = chartNoaPerEvent(rows);
  const qrisEdc = chartQrisVsEdc(rows);
  const salesData = chartSalesVolume(rows);
  const efData = chartEfektivitas(rows);
  const rasioText = agg.rasioAgregat != null ? `Rp ${formatNumber(Math.round(agg.rasioAgregat))}` : 'Data belum cukup';

  return (
    <div>
      <PageHeader
        title="Dashboard Overview"
        microcopy="Ringkasan efektivitas event ISE BSI — membandingkan budget dengan hasil bisnis (DPK, akuisisi, transaksi). Semua angka diambil langsung dari database."
      >
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="badge bg-slate-100 text-slate-500 ring-1 ring-slate-200">
              <Clock size={11} /> Update {timeAgo(lastUpdate)}
            </span>
          )}
          <button onClick={handleExport} disabled={!hasFiltered || exporting} className="btn-primary !py-2.5 text-[13px] disabled:cursor-not-allowed disabled:opacity-50">
            <Download size={15} /> {exporting ? 'Menyiapkan…' : 'Export Hasil Filter'}
          </button>
        </div>
      </PageHeader>

      {/* ---------- HERO ---------- */}
      <div className="animate-fade-in-up relative mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-bsi-900 via-bsi-800 to-bsi-950 p-5 shadow-card sm:p-6">
        {/* gradient blob bergerak pelan + cube 3D (dekoratif, CSS-only) */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-bsi-400/15 blur-3xl animate-pulse-soft" />
        <div className="pointer-events-none absolute right-6 top-1/2 hidden -translate-y-1/2 opacity-90 xl:block">
          <HeroCube size={96} />
        </div>

        <div className="relative grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 xl:pr-40">
          <HeroStat icon={CalendarRange} label="Total Event" numeric={agg.totalEvents} format={formatNumber} sub="event terfilter" />
          <HeroStat icon={PiggyBank} label="Total DPK" numeric={agg.totalDpk} format={formatRupiahShort} sub={`Tenant ${formatRupiahShort(agg.totalDpkTenant)}`} />
          <HeroStat icon={TrendingUp} label="Pertumbuhan DPK" numeric={agg.totalGrowth} format={formatRupiahShort} sub="tenant + nasabah" />
          <HeroStat icon={Users} label="Akuisisi Rekening" numeric={agg.noaRekening} format={formatNumber} sub="tenant + nasabah" />
          <HeroStat icon={CreditCard} label="Total Transaksi" numeric={agg.trxTotal} format={formatNumber} sub="QRIS + EDC" />
          <HeroStat icon={Gauge} label="Rasio Efektivitas" value={rasioText} sub={agg.efektivitasAgregat.label} />
        </div>
      </div>

      {/* ---------- FILTER ---------- */}
      <FilterBar
        options={options}
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(EMPTY_FILTERS)}
        resultCount={rows.length}
        totalCount={allRows.length}
      />

      {!hasFiltered ? (
        <div className="card animate-fade-in">
          <EmptyState
            title="Tidak ada event yang cocok dengan filter"
            desc="Longgarkan atau reset filter untuk melihat data kembali."
          />
        </div>
      ) : (
        <>
          {/* ---------- KPI GRID ---------- */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard icon={Wallet} label="Total Budget Event" numeric={agg.totalCost} format={formatRupiahShort} caption="Akumulasi cost seluruh event" accent="gold" delay={0} />
            <KpiCard icon={PiggyBank} label="Total DPK Event" numeric={agg.totalDpk} format={formatRupiahShort} caption={`Nasabah ${formatRupiahShort(agg.totalDpkNasabah)} · Tenant ${formatRupiahShort(agg.totalDpkTenant)}`} accent="emerald" delay={50} />
            <KpiCard icon={TrendingUp} label="Total Pertumbuhan DPK" numeric={agg.totalGrowth} format={formatRupiahShort} trendPct={agg.totalDpk - agg.totalGrowth > 0 ? (agg.totalGrowth / (agg.totalDpk - agg.totalGrowth)) * 100 : null} caption={`Nasabah ${formatRupiahShort(agg.growthNasabah)} · Tenant ${formatRupiahShort(agg.growthTenant)}`} delay={100} />
            <KpiCard icon={Users} label="Total Akuisisi Rekening" numeric={agg.noaRekening} format={formatNumber} caption="NOA tenant + nasabah baru" accent="teal" delay={150} />
            <KpiCard icon={Landmark} label="Total Akuisisi Pembiayaan" numeric={agg.pembiayaanNoa} format={formatNumber} caption={`Nominal ${formatRupiahShort(agg.nominalPembiayaan)}`} accent="gold" delay={200} />
            <KpiCard icon={CreditCard} label="Total Transaksi QRIS + EDC" numeric={agg.trxTotal} format={formatNumber} caption={`QRIS ${formatNumber(agg.qrisTrx)} · EDC ${formatNumber(agg.edcTrx)}`} accent="teal" delay={250} />
            <KpiCard icon={ReceiptText} label="Sales Volume QRIS + EDC" numeric={agg.salesVolume} format={formatRupiahShort} caption={`QRIS ${formatRupiahShort(agg.qrisVol)} · EDC ${formatRupiahShort(agg.edcVol)}`} accent="emerald" delay={300} />
            <KpiCard icon={Gauge} label="Rasio Efektivitas" value={rasioText} caption="Cost per Rp 1 pertumbuhan DPK (kecil = efektif)" accent={agg.efektivitasAgregat.tone === 'red' ? 'red' : 'teal'} delay={350} />
          </div>

          {/* ---------- HIGHLIGHT ---------- */}
          <div className="mt-4 grid grid-cols-1 gap-3.5 lg:grid-cols-2">
            <SectionCard title="Top Event — Pertumbuhan DPK" subtitle="Event dengan kenaikan DPK terbesar" delay={0}
              action={<Trophy size={16} className="text-emerald-500" />}>
              {agg.topByGrowth.length === 0 ? <EmptyState title="Belum ada pertumbuhan DPK" desc="Update saldo rekening untuk melihat peringkat." /> : (
                <ol className="space-y-2">
                  {agg.topByGrowth.map((r, i) => (
                    <li key={r.id} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${i === 0 ? 'bg-gold-500/15 text-gold-600' : 'bg-slate-100 text-slate-500'}`}>{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-bold text-bsi-950">{r.nama}</p>
                        <p className="truncate text-[11px] text-slate-400">{r.jenisLabel} · {r.kota}</p>
                      </div>
                      <span className="shrink-0 text-[13px] font-bold text-emerald-600">{formatRupiahShort(r.growthDpk)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </SectionCard>

            <SectionCard title="Cost Tinggi, Hasil Rendah" subtitle="Budget keluar besar tetapi DPK tidak tumbuh — perlu evaluasi" delay={80}
              action={<AlertTriangle size={16} className="text-red-500" />}>
              {agg.boncos.length === 0 ? (
                <div className="flex flex-col items-center gap-1.5 py-8 text-center">
                  <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-500"><Trophy size={20} /></span>
                  <p className="text-[13px] font-bold text-slate-700">Tidak ada event boncos</p>
                  <p className="text-[11.5px] text-slate-400">Semua event dengan budget menghasilkan pertumbuhan DPK.</p>
                </div>
              ) : (
                <ol className="space-y-2">
                  {agg.boncos.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50/40 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-bold text-bsi-950">{r.nama}</p>
                        <p className="truncate text-[11px] text-slate-400">Budget {formatRupiahShort(r.cost)} · Δ DPK {formatRupiahShort(r.growthDpk)}</p>
                      </div>
                      <StatusBadge status="Turun" />
                    </li>
                  ))}
                </ol>
              )}
            </SectionCard>
          </div>

          {/* ---------- CHART: Cost vs DPK ---------- */}
          <div className="mt-4">
            <SectionCard title="Perbandingan Cost vs DPK per Event" subtitle="Budget yang dikeluarkan vs DPK yang dihasilkan (merah = DPK tidak tumbuh)" delay={0}>
              <ScrollChart count={costDpk.length} height={330}>
                <BarChart data={costDpk} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: CHART_COLORS.axis }} interval={0} angle={-12} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.axis }} tickFormatter={formatRupiahShort} width={70} />
                  <Tooltip content={<ChartTooltip formatter={formatRupiahShort} />} cursor={{ fill: 'rgba(0,163,157,0.05)' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="cost" name="Budget" radius={[6, 6, 0, 0]} fill={CHART_COLORS.gold} />
                  <Bar dataKey="dpk" name="DPK Event" radius={[6, 6, 0, 0]}>
                    {costDpk.map((d, i) => <Cell key={i} fill={d.boncos ? CHART_COLORS.red : CHART_COLORS.teal} />)}
                  </Bar>
                </BarChart>
              </ScrollChart>
            </SectionCard>
          </div>

          {/* ---------- CHART: Tren DPK per bulan + QRIS vs EDC ---------- */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SectionCard title="Tren Pertumbuhan DPK per Bulan" subtitle="Agregasi pertumbuhan DPK berdasarkan bulan tanggal mulai event" delay={0}>
                {monthly.length === 0 ? <EmptyState title="Belum ada data bertanggal" desc="Isi tanggal mulai event untuk melihat tren." /> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={monthly} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                      <defs>
                        <linearGradient id="gDpk" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CHART_COLORS.teal} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={CHART_COLORS.teal} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: CHART_COLORS.axis }} />
                      <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.axis }} tickFormatter={formatRupiahShort} width={70} />
                      <Tooltip content={<ChartTooltip formatter={formatRupiahShort} />} />
                      <Area type="monotone" dataKey="growth" name="Pertumbuhan DPK" stroke={CHART_COLORS.teal} strokeWidth={2.5} fill="url(#gDpk)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </SectionCard>
            </div>
            <SectionCard title="Transaksi QRIS vs EDC" subtitle="Proporsi jumlah transaksi" delay={80}>
              {qrisEdc.every((d) => d.value === 0) ? <EmptyState title="Belum ada transaksi" desc="Data QRIS/EDC belum tersedia." /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={qrisEdc} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3}>
                      <Cell fill={CHART_COLORS.teal} />
                      <Cell fill={CHART_COLORS.gold} />
                    </Pie>
                    <Tooltip content={<ChartTooltip formatter={formatNumber} />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </SectionCard>
          </div>

          {/* ---------- CHART: NOA per event + Sales Volume ---------- */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SectionCard title="Akuisisi Rekening per Event" subtitle="Jumlah rekening tenant vs nasabah" delay={0}>
              <ScrollChart count={noaData.length} per={64} min={360} height={300}>
                <BarChart data={noaData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: CHART_COLORS.axis }} interval={0} angle={-12} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.axis }} allowDecimals={false} width={40} />
                  <Tooltip content={<ChartTooltip formatter={formatNumber} />} cursor={{ fill: 'rgba(0,163,157,0.05)' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="tenant" name="Tenant" stackId="a" fill={CHART_COLORS.tealDark} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="nasabah" name="Nasabah" stackId="a" fill={CHART_COLORS.teal} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ScrollChart>
            </SectionCard>

            <SectionCard title="Sales Volume QRIS + EDC per Event" subtitle="Nominal transaksi per event" delay={80}>
              <ScrollChart count={salesData.length} per={64} min={360} height={300}>
                <BarChart data={salesData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: CHART_COLORS.axis }} interval={0} angle={-12} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.axis }} tickFormatter={formatRupiahShort} width={70} />
                  <Tooltip content={<ChartTooltip formatter={formatRupiahShort} />} cursor={{ fill: 'rgba(0,163,157,0.05)' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="qris" name="QRIS" stackId="s" fill={CHART_COLORS.teal} />
                  <Bar dataKey="edc" name="EDC" stackId="s" fill={CHART_COLORS.gold} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ScrollChart>
            </SectionCard>
          </div>

          {/* ---------- CHART: Efektivitas ---------- */}
          <div className="mt-4">
            <SectionCard title="Distribusi Status Efektivitas Event" subtitle="Jumlah event per kategori efektivitas (Cost / Pertumbuhan DPK)" delay={0}>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={efData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: CHART_COLORS.axis }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: CHART_COLORS.axis }} width={110} />
                  <Tooltip content={<ChartTooltip formatter={(v) => `${formatNumber(v)} event`} />} cursor={{ fill: 'rgba(0,163,157,0.05)' }} />
                  <Bar dataKey="value" name="Jumlah Event" radius={[0, 6, 6, 0]}>
                    {efData.map((d) => <Cell key={d.key} fill={EF_COLOR[d.key]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          </div>

          {/* ---------- TABEL DETAIL ---------- */}
          <div className="mt-4">
            <SectionCard title="Tabel Detail Event" subtitle={`${rows.length} event · sesuai filter aktif`} delay={0}
              action={<button onClick={handleExport} disabled={exporting} className="btn-secondary !px-3 !py-1.5 text-xs"><Download size={13} /> Export</button>}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px] text-[13px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      <th className="px-3 py-2.5">Event</th>
                      <th className="px-3 py-2.5">Lokasi</th>
                      <th className="px-3 py-2.5 text-right">Budget</th>
                      <th className="px-3 py-2.5 text-right">DPK Event</th>
                      <th className="px-3 py-2.5 text-right">Δ DPK</th>
                      <th className="px-3 py-2.5 text-right">NOA Rek</th>
                      <th className="px-3 py-2.5 text-right">Transaksi</th>
                      <th className="px-3 py-2.5 text-right">Rasio</th>
                      <th className="px-3 py-2.5">Status DPK</th>
                      <th className="px-3 py-2.5">Efektivitas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-b border-slate-50 hover:bg-bsi-50/40">
                        <td className="px-3 py-3">
                          <p className="font-semibold text-bsi-950">{r.nama}</p>
                          <p className="text-[11px] text-slate-400">{r.jenisLabel} · {formatDate(r.tanggal)}</p>
                        </td>
                        <td className="px-3 py-3 text-slate-600">{r.kota}<span className="text-slate-300">, </span>{r.provinsi}</td>
                        <td className="px-3 py-3 text-right text-gold-600">{formatRupiahShort(r.cost)}</td>
                        <td className="px-3 py-3 text-right text-bsi-700">{formatRupiahShort(r.dpkEvent)}</td>
                        <td className={`px-3 py-3 text-right font-semibold ${r.growthDpk >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatRupiahShort(r.growthDpk)}</td>
                        <td className="px-3 py-3 text-right text-slate-600">{formatNumber(r.noaRekening)}</td>
                        <td className="px-3 py-3 text-right text-slate-600">{formatNumber(r.trxTotal)}</td>
                        <td className="px-3 py-3 text-right text-slate-600">{r.rasio != null ? `Rp ${formatNumber(Math.round(r.rasio))}` : '—'}</td>
                        <td className="px-3 py-3"><StatusBadge status={r.dpkStatus} /></td>
                        <td className="px-3 py-3">
                          <span className={`badge ${EF_TONE_CLASS[r.efektivitas.tone]}`}>{r.efektivitas.label}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        </>
      )}

      {/* ---------- RIWAYAT UPLOAD ---------- */}
      <div className="mt-4">
        <SectionCard title="Riwayat Upload Terbaru" subtitle="Jejak unggahan data Excel ke database" delay={0}
          action={<UploadCloud size={16} className="text-bsi-500" />}>
          {!uploads || uploads.length === 0 ? (
            <EmptyState title="Belum ada riwayat upload" desc="Unggah data lewat menu Upload Excel untuk melihat jejaknya di sini." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {uploads.slice(0, 6).map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-bsi-950">{u.file_name || 'Tanpa nama'}</p>
                    <p className="text-[11px] text-slate-400">
                      {formatDateTime(u.upload_date)} · {formatNumber(u.success_rows || 0)}/{formatNumber(u.total_rows || 0)} baris
                    </p>
                  </div>
                  <StatusBadge status={u.status === 'Sukses' ? 'Sukses' : u.status === 'Gagal' ? 'Gagal' : 'Stagnan'} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {lastUpdate && (
        <p className="mt-4 text-center text-[11px] text-slate-400">
          Data terakhir diperbarui: {formatDateTime(lastUpdate)}
        </p>
      )}
    </div>
  );
}
