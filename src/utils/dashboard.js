// ============================================================
// dashboard.js — mesin data Dashboard Overview (SESI 6)
//
// Semua perhitungan card/chart/tabel/export dijalankan di CLIENT dari
// event mentah yang dikirim /api/events?overview=1. Tidak ada angka dummy:
// bila events kosong, pemanggil menampilkan empty state.
//
// Catatan penting (jujur soal keterbatasan data):
// - Skema TIDAK menyimpan histori saldo bulanan. Snapshot yang ada hanya
//   "saldo terkini". Karena itu "Tren DPK per Bulan" DIBANGUN sebagai
//   agregasi PERTUMBUHAN DPK per bulan berdasarkan tanggal MULAI event,
//   bukan time-series saldo harian/bulanan yang sebenarnya.
// - DPK per sumber (tenant vs nasabah) memakai saldo_update bila terisi,
//   jika belum diupdate memakai saldo/ setoran awal — konsisten dengan
//   dpkCurrent di metrics server.
// ============================================================

import { classifyEfektivitas, dpkStatusOf } from '../services/metrics';

const BULAN_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const BULAN_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export const JENIS_EVENT_LABEL = { expo: 'Expo / Bazar', private: 'Event Private' };

// -------- current DPK per akun (update bila ada, else awal) --------
function tenantDpk(t) {
  const upd = Number(t.saldoUpdate) || 0;
  return upd > 0 ? upd : Number(t.saldoAwal) || 0;
}
function tenantGrowth(t) {
  const upd = Number(t.saldoUpdate) || 0;
  return upd > 0 ? upd - (Number(t.saldoAwal) || 0) : 0;
}
function nasabahDpk(n) {
  const upd = Number(n.saldoUpdate) || 0;
  return upd > 0 ? upd : Number(n.setoranAwal) || 0;
}
function nasabahGrowth(n) {
  const upd = Number(n.saldoUpdate) || 0;
  return upd > 0 ? upd - (Number(n.setoranAwal) || 0) : 0;
}

// -------- normalisasi 1 event -> baris dashboard --------
export function enrichEvent(ev) {
  const m = ev.metrics || {};
  const a = ev.akuisisi || {};
  const tenants = ev.tenants || [];
  const nasabah = ev.nasabah || [];

  const dpkTenant = tenants.reduce((s, t) => s + tenantDpk(t), 0);
  const dpkNasabah = nasabah.reduce((s, n) => s + nasabahDpk(n), 0);
  const growthTenant = tenants.reduce((s, t) => s + tenantGrowth(t), 0);
  const growthNasabah = nasabah.reduce((s, n) => s + nasabahGrowth(n), 0);

  const dpkEvent = dpkTenant + dpkNasabah;
  // pakai growthAmount server bila ada (agar konsisten), else jumlah per sumber
  const growthDpk = m.growthAmount != null ? m.growthAmount : growthTenant + growthNasabah;

  const noaTenant = tenants.length;
  const noaNasabah = nasabah.length;
  const noaRekening = noaTenant + noaNasabah;

  const qrisTrx = Number(a.qrisTrx) || 0;
  const edcTrx = Number(a.edcTrx) || 0;
  const qrisVol = Number(a.qrisSalesVolume) || 0;
  const edcVol = Number(a.edcSalesVolume) || 0;

  const cost = Number(ev.cost) || Number(m.cost) || 0;
  const rasio = growthDpk > 0 ? cost / growthDpk : null;
  const efektivitas = classifyEfektivitas(cost, growthDpk);
  const dpkStatus = dpkStatusOf(growthDpk);

  const d = ev.tanggal ? new Date(ev.tanggal) : null;
  const valid = d && !isNaN(d);
  const year = valid ? d.getFullYear() : null;
  const monthIdx = valid ? d.getMonth() : null; // 0-11
  const semester = valid ? (monthIdx < 6 ? 1 : 2) : null;
  const monthKey = valid ? `${year}-${String(monthIdx + 1).padStart(2, '0')}` : null;
  const monthLabel = valid ? `${BULAN_SHORT[monthIdx]} ${year}` : '—';

  const jenisTabunganSet = [...new Set(nasabah.map((n) => n.jenisTabungan).filter(Boolean))];

  return {
    id: ev.id,
    nama: ev.nama || 'Tanpa nama',
    jenis: ev.jenis || 'expo',
    jenisLabel: JENIS_EVENT_LABEL[ev.jenis] || ev.jenis || '—',
    provinsi: ev.provinsi || '—',
    kota: ev.kota || '—',
    tanggal: ev.tanggal,
    year, monthIdx, monthKey, monthLabel, semester,
    cost,
    dpkTenant, dpkNasabah, dpkEvent,
    growthTenant, growthNasabah, growthDpk,
    noaTenant, noaNasabah, noaRekening,
    pembiayaanNoa: Number(a.jumlahPembiayaan) || 0,
    nominalPembiayaan: Number(a.nominalPembiayaan) || 0,
    qrisTrx, edcTrx, trxTotal: qrisTrx + edcTrx,
    qrisVol, edcVol, salesVolume: qrisVol + edcVol,
    rasio,
    efektivitas,          // {key,label,tone}
    dpkStatus,            // Naik/Stagnan/Turun
    jenisTabunganSet,
    raw: ev,
  };
}

export function enrichAll(events) {
  return (events || []).map(enrichEvent);
}

// -------- opsi filter dari data nyata --------
export function buildFilterOptions(rows) {
  const uniq = (arr) => [...new Set(arr.filter((v) => v != null && v !== '' && v !== '—'))];
  const years = uniq(rows.map((r) => r.year)).sort((a, b) => b - a);
  const months = uniq(rows.map((r) => r.monthIdx)).sort((a, b) => a - b)
    .map((i) => ({ value: i, label: BULAN_FULL[i] }));
  return {
    tahun: years,
    semester: uniq(rows.map((r) => r.semester)).sort(),
    bulan: months,
    namaEvent: uniq(rows.map((r) => r.nama)).sort(),
    jenisEvent: uniq(rows.map((r) => r.jenis)),
    provinsi: uniq(rows.map((r) => r.provinsi)).sort(),
    kota: uniq(rows.map((r) => r.kota)).sort(),
    statusDpk: uniq(rows.map((r) => r.dpkStatus)),
    statusEfektivitas: uniq(rows.map((r) => r.efektivitas.label)),
    jenisTabungan: uniq(rows.flatMap((r) => r.jenisTabunganSet)).sort(),
  };
}

export const EMPTY_FILTERS = {
  tahun: '', semester: '', bulan: '', namaEvent: '', jenisEvent: '',
  provinsi: '', kota: '', statusDpk: '', statusEfektivitas: '', jenisTabungan: '',
};

export function countActiveFilters(f) {
  return Object.values(f).filter((v) => v !== '' && v != null).length;
}

// -------- terapkan filter --------
export function applyFilters(rows, f) {
  return rows.filter((r) => {
    if (f.tahun && String(r.year) !== String(f.tahun)) return false;
    if (f.semester && String(r.semester) !== String(f.semester)) return false;
    if (f.bulan !== '' && f.bulan != null && String(r.monthIdx) !== String(f.bulan)) return false;
    if (f.namaEvent && r.nama !== f.namaEvent) return false;
    if (f.jenisEvent && r.jenis !== f.jenisEvent) return false;
    if (f.provinsi && r.provinsi !== f.provinsi) return false;
    if (f.kota && r.kota !== f.kota) return false;
    if (f.statusDpk && r.dpkStatus !== f.statusDpk) return false;
    if (f.statusEfektivitas && r.efektivitas.label !== f.statusEfektivitas) return false;
    if (f.jenisTabungan && !r.jenisTabunganSet.includes(f.jenisTabungan)) return false;
    return true;
  });
}

// -------- agregasi KPI dari baris terfilter --------
export function aggregate(rows) {
  const sum = (fn) => rows.reduce((s, r) => s + fn(r), 0);

  const totalCost = sum((r) => r.cost);
  const totalDpkTenant = sum((r) => r.dpkTenant);
  const totalDpkNasabah = sum((r) => r.dpkNasabah);
  const totalDpk = totalDpkTenant + totalDpkNasabah;
  const growthTenant = sum((r) => r.growthTenant);
  const growthNasabah = sum((r) => r.growthNasabah);
  const totalGrowth = sum((r) => r.growthDpk);
  const noaRekening = sum((r) => r.noaRekening);
  const pembiayaanNoa = sum((r) => r.pembiayaanNoa);
  const nominalPembiayaan = sum((r) => r.nominalPembiayaan);
  const qrisTrx = sum((r) => r.qrisTrx);
  const edcTrx = sum((r) => r.edcTrx);
  const qrisVol = sum((r) => r.qrisVol);
  const edcVol = sum((r) => r.edcVol);

  const rasioAgregat = totalGrowth > 0 ? totalCost / totalGrowth : null;
  const efektivitasAgregat = classifyEfektivitas(totalCost, totalGrowth);

  // ranking berdasarkan pertumbuhan DPK (besar = terbaik)
  const byGrowth = [...rows].sort((a, b) => b.growthDpk - a.growthDpk);
  // cost tinggi hasil rendah: cost > 0 & pertumbuhan <= 0, urut cost terbesar
  const boncos = rows
    .filter((r) => r.cost > 0 && r.growthDpk <= 0)
    .sort((a, b) => b.cost - a.cost);

  return {
    totalEvents: rows.length,
    totalCost,
    totalDpkTenant, totalDpkNasabah, totalDpk,
    growthTenant, growthNasabah, totalGrowth,
    noaRekening,
    pembiayaanNoa, nominalPembiayaan,
    qrisTrx, edcTrx, trxTotal: qrisTrx + edcTrx,
    qrisVol, edcVol, salesVolume: qrisVol + edcVol,
    rasioAgregat, efektivitasAgregat,
    topByGrowth: byGrowth.slice(0, 5),
    boncos: boncos.slice(0, 5),
    boncosCount: boncos.length,
  };
}

// ============================================================
// Chart builders (semua dari baris terfilter)
// ============================================================

// 1. Cost vs DPK per event
export function chartCostVsDpk(rows) {
  return rows.map((r) => ({ name: r.nama, cost: r.cost, dpk: r.dpkEvent, growth: r.growthDpk, boncos: r.cost > 0 && r.growthDpk <= 0 }));
}

// 2. Tren pertumbuhan DPK per bulan (berdasar tanggal mulai event)
export function chartDpkPerMonth(rows) {
  const map = new Map();
  for (const r of rows) {
    if (!r.monthKey) continue;
    const cur = map.get(r.monthKey) || { key: r.monthKey, name: r.monthLabel, growth: 0, dpk: 0, events: 0 };
    cur.growth += r.growthDpk;
    cur.dpk += r.dpkEvent;
    cur.events += 1;
    map.set(r.monthKey, cur);
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

// 3. Akuisisi rekening per event (tenant vs nasabah)
export function chartNoaPerEvent(rows) {
  return rows.map((r) => ({ name: r.nama, tenant: r.noaTenant, nasabah: r.noaNasabah, total: r.noaRekening }));
}

// 4. QRIS vs EDC — total transaksi
export function chartQrisVsEdc(rows) {
  const qris = rows.reduce((s, r) => s + r.qrisTrx, 0);
  const edc = rows.reduce((s, r) => s + r.edcTrx, 0);
  return [
    { name: 'QRIS', value: qris },
    { name: 'EDC', value: edc },
  ];
}

// 5. Sales volume per event (QRIS + EDC)
export function chartSalesVolume(rows) {
  return rows.map((r) => ({ name: r.nama, qris: r.qrisVol, edc: r.edcVol, total: r.salesVolume }));
}

// 6. Distribusi status efektivitas
export function chartEfektivitas(rows) {
  const order = ['sangat', 'cukup', 'kurang', 'evaluasi'];
  const labelOf = { sangat: 'Sangat Efektif', cukup: 'Cukup Efektif', kurang: 'Kurang Efektif', evaluasi: 'Perlu Evaluasi' };
  const map = new Map(order.map((k) => [k, 0]));
  for (const r of rows) map.set(r.efektivitas.key, (map.get(r.efektivitas.key) || 0) + 1);
  return order.map((k) => ({ key: k, name: labelOf[k], value: map.get(k) || 0 }));
}
