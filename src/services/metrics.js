// api/_lib/metrics.js — logika metrik & rasio efektivitas (dipakai server & client)
// Satu sumber kebenaran agar angka di API dan di UI selalu konsisten.

export function deriveEventMetrics(ev) {
  const tenants = ev.tenants || [];
  const nasabah = ev.nasabah || [];
  const snapshots = ev.snapshots || [];

  const dpkAwal =
    tenants.reduce((a, t) => a + (Number(t.saldoAwal) || 0), 0) +
    nasabah.reduce((a, n) => a + (Number(n.setoranAwal) || 0), 0);

  const lastSnap = snapshots.length ? snapshots[snapshots.length - 1] : null;
  const dpkCurrent = lastSnap
    ? Object.values(lastSnap.saldoPerRekening || {}).reduce((a, v) => a + (Number(v) || 0), 0)
    : dpkAwal;

  const growthAmount = dpkCurrent - dpkAwal;
  const growthPct = dpkAwal ? (growthAmount / dpkAwal) * 100 : 0;

  const noaRekening = tenants.length + nasabah.length;
  const noaPembiayaan = nasabah.filter((n) => n.jenisPembiayaan).length;

  const a = ev.akuisisi || {};
  const salesVolume = (Number(a.edcSalesVolume) || 0) + (Number(a.qrisSalesVolume) || 0);
  const jumlahTransaksi = (Number(a.edcTrx) || 0) + (Number(a.qrisTrx) || 0);

  const cost = Number(ev.cost) || 0;
  // Rasio Efektivitas (konsep Pak Adi) = Cost / Δ DPK  (kecil = efektif)
  const rasioEfektivitas = growthAmount > 0 ? cost / growthAmount : null;

  return {
    dpkAwal,
    dpkCurrent,
    growthAmount,
    growthPct,
    noaRekening,
    noaPembiayaan,
    salesVolume,
    jumlahTransaksi,
    cost,
    rasioEfektivitas,
    boncos: cost > 0 && growthAmount <= 0,
    snapshotCount: snapshots.length,
  };
}

// ============================================================
// Klasifikasi Status Efektivitas & Status DPK (single source of truth)
// Rasio = Cost / Pertumbuhan DPK  (Rp cost untuk tiap Rp 1 pertumbuhan DPK).
// Semakin KECIL rasio => semakin efektif.
// Ambang batas di bawah bersifat asumsi bisnis & dapat disesuaikan.
// ============================================================
export const EFEKTIVITAS_THRESHOLDS = {
  sangat: 0.3, // cost < 30% dari pertumbuhan DPK => sangat efektif
  cukup: 1.0,  // cost <= pertumbuhan DPK => cukup efektif
};

export const EFEKTIVITAS = {
  sangat: { key: 'sangat', label: 'Sangat Efektif', tone: 'emerald' },
  cukup: { key: 'cukup', label: 'Cukup Efektif', tone: 'teal' },
  kurang: { key: 'kurang', label: 'Kurang Efektif', tone: 'gold' },
  evaluasi: { key: 'evaluasi', label: 'Perlu Evaluasi', tone: 'red' },
};

/** Tentukan status efektivitas dari cost & pertumbuhan DPK sebuah event. */
export function classifyEfektivitas(cost, growthAmount) {
  const c = Number(cost) || 0;
  const g = Number(growthAmount) || 0;
  // tidak ada pertumbuhan DPK / data belum lengkap
  if (g <= 0) return EFEKTIVITAS.evaluasi;
  // ada pertumbuhan tapi tanpa cost tercatat => tetap dihitung sangat efektif
  const rasio = c / g;
  if (rasio < EFEKTIVITAS_THRESHOLDS.sangat) return EFEKTIVITAS.sangat;
  if (rasio <= EFEKTIVITAS_THRESHOLDS.cukup) return EFEKTIVITAS.cukup;
  return EFEKTIVITAS.kurang;
}

/** Status DPK level-event dari nilai pertumbuhan. */
export function dpkStatusOf(growthAmount) {
  const g = Number(growthAmount) || 0;
  if (g > 0) return 'Naik';
  if (g < 0) return 'Turun';
  return 'Stagnan';
}

export function buildOverview(eventsWithMetrics) {
  const events = eventsWithMetrics.map((ev) =>
    ev.metrics ? ev : { ...ev, metrics: deriveEventMetrics(ev) },
  );

  const totalCost = events.reduce((a, e) => a + e.metrics.cost, 0);
  const totalDpkCurrent = events.reduce((a, e) => a + e.metrics.dpkCurrent, 0);
  const totalDpkAwal = events.reduce((a, e) => a + e.metrics.dpkAwal, 0);
  const totalGrowth = totalDpkCurrent - totalDpkAwal;

  const ranked = [...events]
    .filter((e) => e.metrics.rasioEfektivitas != null)
    .sort((a, b) => a.metrics.rasioEfektivitas - b.metrics.rasioEfektivitas);

  return {
    kpis: {
      totalEvents: events.length,
      totalCost,
      totalDpkAwal,
      totalDpkCurrent,
      totalGrowth,
      rasioAgregat: totalGrowth > 0 ? totalCost / totalGrowth : null,
      eventBoncos: events.filter((e) => e.metrics.boncos).length,
    },
    events,
    bestEvent: ranked[0] || null,
    worstEvent: ranked.length ? ranked[ranked.length - 1] : null,
  };
}
