// ============================================================
// exportExcel.js — export hasil FILTER dashboard ke .xlsx (browser, ExcelJS)
// Dua sheet: "Ringkasan" (KPI agregat hasil filter) & "Detail Event".
// Angka rupiah disimpan sebagai NUMBER (format ribuan) agar bisa diolah lagi.
// ============================================================
import ExcelJS from 'exceljs';
import { aggregate } from './dashboard';

const GREEN = 'FF00A39D';
const WHITE = 'FFFFFFFF';
const BORDER = 'FFDDE3E8';
const RUPIAH = '#,##0';

function styleHeader(row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: WHITE }, name: 'Arial', size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = { bottom: { style: 'thin', color: { argb: BORDER } } };
  });
  row.height = 24;
}

function thinBorders(cell) {
  cell.border = {
    top: { style: 'hair', color: { argb: BORDER } },
    bottom: { style: 'hair', color: { argb: BORDER } },
    left: { style: 'hair', color: { argb: BORDER } },
    right: { style: 'hair', color: { argb: BORDER } },
  };
}

export async function exportDashboardExcel(rows, { filterSummary = 'Semua data' } = {}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ISE BSI Event Monitoring Dashboard';
  wb.created = new Date();

  const agg = aggregate(rows);

  // -------- Sheet 1: Ringkasan --------
  const s1 = wb.addWorksheet('Ringkasan', { views: [{ showGridLines: false }] });
  s1.columns = [{ width: 34 }, { width: 26 }];
  s1.addRow(['Ringkasan Dashboard ISE BSI']).font = { bold: true, size: 14, color: { argb: 'FF012A29' } };
  s1.addRow([`Filter: ${filterSummary}`]).font = { italic: true, color: { argb: 'FF64748B' } };
  s1.addRow([`Diekspor: ${new Date().toLocaleString('id-ID')}`]).font = { italic: true, color: { argb: 'FF64748B' } };
  s1.addRow([]);

  const kpiRows = [
    ['Metrik', 'Nilai'],
    ['Total Event', agg.totalEvents],
    ['Total Budget Event', agg.totalCost],
    ['Total DPK Tenant', agg.totalDpkTenant],
    ['Total DPK Nasabah', agg.totalDpkNasabah],
    ['Total DPK Event', agg.totalDpk],
    ['Pertumbuhan DPK Tenant', agg.growthTenant],
    ['Pertumbuhan DPK Nasabah', agg.growthNasabah],
    ['Total Pertumbuhan DPK', agg.totalGrowth],
    ['Total Akuisisi Rekening', agg.noaRekening],
    ['Total Akuisisi Pembiayaan (NOA)', agg.pembiayaanNoa],
    ['Total Nominal Pembiayaan', agg.nominalPembiayaan],
    ['Total Transaksi QRIS + EDC', agg.trxTotal],
    ['Total Sales Volume QRIS + EDC', agg.salesVolume],
    ['Rasio Efektivitas (Cost / Δ DPK)', agg.rasioAgregat != null ? Number(agg.rasioAgregat.toFixed(4)) : 'Data belum cukup'],
    ['Status Efektivitas', agg.efektivitasAgregat.label],
  ];
  const headerRow = s1.addRow(kpiRows[0]);
  styleHeader(headerRow);
  const rupiahMetrics = new Set(['Total Budget Event', 'Total DPK Tenant', 'Total DPK Nasabah', 'Total DPK Event', 'Pertumbuhan DPK Tenant', 'Pertumbuhan DPK Nasabah', 'Total Pertumbuhan DPK', 'Total Nominal Pembiayaan', 'Total Sales Volume QRIS + EDC']);
  kpiRows.slice(1).forEach(([label, val]) => {
    const r = s1.addRow([label, val]);
    r.getCell(1).font = { name: 'Arial', size: 11 };
    const c2 = r.getCell(2);
    c2.font = { name: 'Arial', size: 11, bold: true };
    if (rupiahMetrics.has(label) && typeof val === 'number') c2.numFmt = RUPIAH;
    c2.alignment = { horizontal: 'right' };
    r.eachCell(thinBorders);
  });

  // -------- Sheet 2: Detail Event --------
  const s2 = wb.addWorksheet('Detail Event', { views: [{ state: 'frozen', ySplit: 1, showGridLines: false }] });
  const cols = [
    ['Nama Event', 'nama', 30],
    ['Jenis', 'jenisLabel', 14],
    ['Tanggal', 'tanggal', 14],
    ['Provinsi', 'provinsi', 16],
    ['Kota', 'kota', 16],
    ['Budget (Rp)', 'cost', 16, 'rp'],
    ['DPK Tenant (Rp)', 'dpkTenant', 16, 'rp'],
    ['DPK Nasabah (Rp)', 'dpkNasabah', 16, 'rp'],
    ['DPK Event (Rp)', 'dpkEvent', 16, 'rp'],
    ['Pertumbuhan DPK (Rp)', 'growthDpk', 18, 'rp'],
    ['NOA Rekening', 'noaRekening', 12],
    ['NOA Pembiayaan', 'pembiayaanNoa', 13],
    ['Nominal Pembiayaan (Rp)', 'nominalPembiayaan', 18, 'rp'],
    ['Trx QRIS', 'qrisTrx', 10],
    ['Trx EDC', 'edcTrx', 10],
    ['Sales Volume (Rp)', 'salesVolume', 16, 'rp'],
    ['Rasio Efektivitas', 'rasio', 15],
    ['Status DPK', 'dpkStatus', 12],
    ['Status Efektivitas', 'efLabel', 16],
  ];
  s2.columns = cols.map(([, , w]) => ({ width: w }));
  const head2 = s2.addRow(cols.map(([h]) => h));
  styleHeader(head2);

  rows.forEach((r) => {
    const vals = cols.map(([, key]) => {
      if (key === 'efLabel') return r.efektivitas.label;
      if (key === 'rasio') return r.rasio != null ? Number(r.rasio.toFixed(4)) : 'Data belum cukup';
      return r[key];
    });
    const row = s2.addRow(vals);
    row.eachCell((cell, col) => {
      cell.font = { name: 'Arial', size: 10 };
      thinBorders(cell);
      const meta = cols[col - 1];
      if (meta && meta[3] === 'rp' && typeof cell.value === 'number') {
        cell.numFmt = RUPIAH;
        cell.alignment = { horizontal: 'right' };
      }
    });
  });
  s2.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };

  // -------- trigger download --------
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Dashboard_ISE_BSI_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
