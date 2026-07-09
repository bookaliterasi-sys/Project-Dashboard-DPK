// ============================================================
// Formatters — Indonesian banking number & date formatting
// ============================================================

const idComma = (n, digits = 1) =>
  n.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: digits });

/** Rp 24,5 M · Rp 850 Jt · Rp 1,2 M — short Indonesian rupiah */
export function formatRupiahShort(value) {
  if (value == null || isNaN(value)) return '—';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000_000_000) return `${sign}Rp ${idComma(abs / 1_000_000_000_000)} T`;
  if (abs >= 1_000_000_000) return `${sign}Rp ${idComma(abs / 1_000_000_000)} M`;
  if (abs >= 1_000_000) return `${sign}Rp ${idComma(abs / 1_000_000, 0)} Jt`;
  return `${sign}Rp ${abs.toLocaleString('id-ID')}`;
}

/** Full rupiah with thousand separators */
export function formatRupiahFull(value) {
  if (value == null || isNaN(value)) return '—';
  return `Rp ${Math.round(value).toLocaleString('id-ID')}`;
}

/** +12,4% / -3,1% */
export function formatPercent(value, { signed = true } = {}) {
  if (value == null || isNaN(value)) return '—';
  const sign = signed && value > 0 ? '+' : '';
  return `${sign}${idComma(value, 1)}%`;
}

export function formatNumber(value) {
  if (value == null || isNaN(value)) return '—';
  return value.toLocaleString('id-ID');
}

export function formatDate(dateLike) {
  const d = new Date(dateLike);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(dateLike) {
  const d = new Date(dateLike);
  if (isNaN(d)) return '—';
  return `${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
}

export function timeAgo(dateLike) {
  const d = new Date(dateLike);
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'baru saja';
  if (mins < 60) return `${mins} mnt lalu`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  return `${Math.round(hrs / 24)} hari lalu`;
}
