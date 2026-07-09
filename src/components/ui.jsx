import { TrendingUp, TrendingDown, Minus, AlertTriangle, Inbox } from 'lucide-react';
import { formatPercent } from '../utils/formatters';
import { useCountUp } from '../hooks/useCountUp';

/* ---------------- Angka animasi (counter 0 -> nilai) ---------------- */
export function AnimatedNumber({ value, format = (n) => n, className }) {
  const isNum = typeof value === 'number' && isFinite(value);
  const animated = useCountUp(isNum ? value : NaN);
  if (!isNum) return <span className={className}>{value}</span>;
  return <span className={className}>{format(Math.round(animated))}</span>;
}

/* ---------------- Logo ---------------- */
export function BrandLogo({ variant = 'duo', size = 40, animated = false, light = false }) {
  const anim = animated ? 'animate-float-soft' : '';
  if (variant === 'ise')
    return <img src="/logos/ise-logo.png" alt="Logo ISE" style={{ height: size }} className={`w-auto ${anim}`} draggable={false} />;
  if (variant === 'bsi')
    return <img src="/logos/bsi-logo.png" alt="Logo BSI" style={{ height: size }} className={`w-auto ${anim}`} draggable={false} />;
  if (variant === 'bsi-square')
    return <img src="/logos/bsi-square.png" alt="Logo BSI" style={{ height: size }} className={`w-auto rounded-xl ${anim}`} draggable={false} />;
  // duo: ISE + BSI side by side
  return (
    <div className={`flex items-center gap-2.5 ${anim}`}>
      <img src="/logos/ise-logo.png" alt="Logo ISE" style={{ height: size }} className="w-auto" draggable={false} />
      <span className={`h-6 w-px ${light ? 'bg-white/30' : 'bg-slate-300'}`} />
      <img src="/logos/bsi-logo.png" alt="Logo BSI" style={{ height: size * 0.82 }} className="w-auto" draggable={false} />
    </div>
  );
}

/* ---------------- Status badge ---------------- */
const STATUS_STYLES = {
  Naik: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  Turun: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  Stagnan: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  Tumbuh: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  Tetap: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  'Belum Update': 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
  'Sangat Efektif': 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  'Cukup Efektif': 'bg-bsi-50 text-bsi-700 ring-1 ring-bsi-200',
  'Kurang Efektif': 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  'Perlu Evaluasi': 'bg-red-50 text-red-700 ring-1 ring-red-200',
  'Follow Up': 'bg-red-50 text-red-700 ring-1 ring-red-200 animate-pulse-soft',
  Sukses: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  Gagal: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  Sinkron: 'bg-bsi-50 text-bsi-700 ring-1 ring-bsi-200',
  High: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  Medium: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  Low: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  'Quick Win': 'bg-bsi-50 text-bsi-700 ring-1 ring-bsi-200',
  'Belum Dihubungi': 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  'Waiting CO/CI': 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  Done: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  Aktif: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  'Perlu Koordinasi': 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  'Menunggu Respon': 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  Selesai: 'bg-bsi-50 text-bsi-700 ring-1 ring-bsi-200',
};

export function StatusBadge({ status, className = '' }) {
  const icon =
    status === 'Naik' ? <TrendingUp size={11} /> : status === 'Turun' ? <TrendingDown size={11} /> : status === 'Stagnan' ? <Minus size={11} /> : status === 'Follow Up' ? <AlertTriangle size={11} /> : null;
  return (
    <span className={`badge ${STATUS_STYLES[status] || 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'} ${className}`}>
      {icon}
      {status}
    </span>
  );
}

/* ---------------- KPI Card ---------------- */
export function KpiCard({ icon: Icon, label, value, numeric, format, caption, trendPct, accent = 'teal', delay = 0, loading }) {
  if (loading) return <KpiSkeleton />;
  const accents = {
    teal: 'bg-bsi-50 text-bsi-600',
    gold: 'bg-gold-500/10 text-gold-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
    slate: 'bg-slate-100 text-slate-600',
  };
  const up = trendPct != null && trendPct >= 0;
  return (
    <div
      className="card card-hover metric-hover p-4 sm:p-5 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`rounded-xl p-2.5 ${accents[accent]}`}>
          <Icon size={19} strokeWidth={2.2} />
        </div>
        {trendPct != null && (
          <span className={`badge ${up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {formatPercent(trendPct)}
          </span>
        )}
      </div>
      <p className="mt-3.5 text-[22px] sm:text-2xl font-extrabold tracking-tight text-bsi-950">
        {typeof numeric === 'number' && isFinite(numeric)
          ? <AnimatedNumber value={numeric} format={format || ((n) => n)} />
          : value}
      </p>
      <p className="mt-0.5 text-[13px] font-semibold text-slate-600">{label}</p>
      {caption && <p className="mt-1 text-[11.5px] leading-snug text-slate-400">{caption}</p>}
    </div>
  );
}

export function KpiSkeleton() {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between">
        <div className="skeleton h-10 w-10 rounded-xl" />
        <div className="skeleton h-5 w-14 rounded-full" />
      </div>
      <div className="skeleton mt-4 h-7 w-28" />
      <div className="skeleton mt-2 h-4 w-36" />
    </div>
  );
}

export function ChartSkeleton({ height = 280 }) {
  return (
    <div className="flex flex-col gap-3 p-1" style={{ height }}>
      <div className="skeleton h-4 w-40" />
      <div className="skeleton flex-1 rounded-xl" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-2.5 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-10 w-full rounded-lg" style={{ opacity: 1 - i * 0.12 }} />
      ))}
    </div>
  );
}

/* ---------------- Empty state ---------------- */
export function EmptyState({ title = 'Data tidak ditemukan', desc = 'Coba ubah kata kunci pencarian atau filter yang digunakan.' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center animate-fade-in">
      <div className="rounded-2xl bg-slate-100 p-3.5 text-slate-400">
        <Inbox size={26} />
      </div>
      <p className="text-sm font-bold text-slate-700">{title}</p>
      <p className="max-w-xs text-xs text-slate-400">{desc}</p>
    </div>
  );
}

/* ---------------- Error state ---------------- */
export function ErrorState({ error, onRetry }) {
  const msg = error?.message || 'Terjadi kesalahan saat memuat data.';
  const isAuth = error?.status === 401;
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center animate-fade-in">
      <div className="rounded-2xl bg-red-50 p-3.5 text-red-500">
        <AlertTriangle size={26} />
      </div>
      <p className="text-sm font-bold text-slate-700">
        {isAuth ? 'Sesi berakhir' : 'Gagal memuat data'}
      </p>
      <p className="max-w-sm text-xs text-slate-400">
        {isAuth ? 'Silakan login ulang untuk melanjutkan.' : msg}
      </p>
      {onRetry && !isAuth && (
        <button onClick={onRetry} className="btn-secondary mt-2 !px-3 !py-1.5 text-xs">
          Coba lagi
        </button>
      )}
    </div>
  );
}

/* ---------------- Card with title (charts / sections) ---------------- */
export function SectionCard({ title, subtitle, action, children, className = '', delay = 0 }) {
  return (
    <div className={`card animate-fade-in-up ${className}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 px-4 py-3.5 sm:px-5">
        <div>
          <h3 className="text-[15px] font-bold text-bsi-950">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

/* ---------------- Page header (title + microcopy) ---------------- */
export function PageHeader({ title, microcopy, children }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 animate-fade-in-up">
      <div className="max-w-2xl">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-bsi-950">{title}</h1>
        {microcopy && <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{microcopy}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/* ---------------- Chart brand colors ---------------- */
export const CHART_COLORS = {
  teal: '#00A39D',
  tealDark: '#00706C',
  emerald: '#10B981',
  gold: '#F5B335',
  red: '#EF4444',
  amber: '#F59E0B',
  grid: '#E8EEF0',
  axis: '#94A3B8',
};

export function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3.5 py-2.5 shadow-lg backdrop-blur">
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2 text-[13px] font-semibold text-bsi-950">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          {p.name}: {formatter ? formatter(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}
