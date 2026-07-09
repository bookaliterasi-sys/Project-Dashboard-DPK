// src/services/excelExport.js
// Sistem export Excel ISE BSI — semua data nyata dari database, berstyle BSI.
// Menjaga No CIF & No Rekening sebagai string, format rupiah/tanggal rapi,
// dan membersihkan null/undefined/objek agar tidak muncul [object Object].
import ExcelJS from 'exceljs';
import { buildOverview, classifyEfektivitas } from './metrics';

// ekstrak metrik per-event yang dibutuhkan export dari objek event mentah,
// agar tidak bergantung pada field kpis yang mungkin berbeda antar versi metrics.
function eventMetrics(e) {
  const m = e.metrics || {};
  const a = e.akuisisi || {};
  const tenants = e.tenants || [];
  const nasabah = e.nasabah || [];
  const qrisTrx = Number(a.qrisTrx) || 0;
  const edcTrx = Number(a.edcTrx) || 0;
  const qrisSales = Number(a.qrisSalesVolume) || 0;
  const edcSales = Number(a.edcSalesVolume) || 0;
  const dpkTenant = tenants.reduce((s, t) => s + (Number(t.saldoUpdate) || Number(t.saldoAwal) || 0), 0);
  const dpkNasabah = nasabah.reduce((s, n) => s + (Number(n.saldoUpdate) || Number(n.setoranAwal) || 0), 0);
  const cost = Number(m.cost) || 0;
  const growth = Number(m.growthAmount) || 0;
  return {
    cost,
    dpkCurrent: Number(m.dpkCurrent) || (dpkTenant + dpkNasabah),
    dpkTenant, dpkNasabah,
    growthAmount: growth,
    noaRekening: Number(m.noaRekening) || (tenants.length + nasabah.length),
    jumlahPembiayaan: Number(a.jumlahPembiayaan) || 0,
    nominalPembiayaan: Number(a.nominalPembiayaan) || 0,
    qrisTrx, edcTrx, qrisSales, edcSales,
    jumlahTransaksi: qrisTrx + edcTrx,
    salesVolume: qrisSales + edcSales,
    rasioEfektivitas: growth > 0 ? cost / growth : null,
    statusEfektivitas: classifyEfektivitas(cost, growth)?.label || 'Perlu Evaluasi',
  };
}

const BSI_GREEN = 'FF00A39D';
const BSI_GREEN_DARK = 'FF007A75';
const NOTE_BG = 'FFF1FAF9';
const BORDER = 'FFDDE3E8';
const FONT = 'Arial';
const thin = { style: 'thin', color: { argb: BORDER } };
const allBorders = { top: thin, left: thin, bottom: thin, right: thin };

function cellValue(val, type) {
  if (val == null) return '';
  if (typeof val === 'object') {
    if (val instanceof Date) return val;
    if (Array.isArray(val)) return val.join(', ');
    if ('text' in val) return String(val.text);
    if ('result' in val) return val.result ?? '';
    return '';
  }
  if ((type === 'money' || type === 'int') && typeof val === 'string') {
    const n = Number(val.replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  return val;
}

function isTextKey(key) {
  return /cif|rekening/i.test(key);
}

function writeSheet(ws, columns, rows, { note } = {}) {
  let startRow = 1;
  if (note) {
    const last = colLetter(columns.length);
    ws.mergeCells(`A1:${last}1`);
    const c = ws.getCell('A1');
    c.value = note;
    c.font = { name: FONT, size: 10, italic: true, color: { argb: BSI_GREEN_DARK } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NOTE_BG } };
    c.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    ws.getRow(1).height = 20;
    startRow = 2;
  }

  const headerRow = ws.getRow(startRow);
  columns.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = c.header;
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BSI_GREEN } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: BSI_GREEN_DARK } },
      left: { style: 'thin', color: { argb: BSI_GREEN_DARK } },
      bottom: { style: 'medium', color: { argb: BSI_GREEN_DARK } },
      right: { style: 'thin', color: { argb: BSI_GREEN_DARK } },
    };
  });
  headerRow.height = 26;

  rows.forEach((row, r) => {
    const xlRow = ws.getRow(startRow + 1 + r);
    columns.forEach((c, i) => {
      const cell = xlRow.getCell(i + 1);
      const raw = cellValue(row[c.key], c.type);
      if (isTextKey(c.key)) {
        cell.value = raw === '' ? '' : String(raw);
        cell.numFmt = '@';
      } else {
        cell.value = raw;
      }
      cell.font = { name: FONT, size: 10 };
      cell.border = allBorders;
      if (c.type === 'money' || c.type === 'int') { cell.numFmt = '#,##0'; cell.alignment = { horizontal: 'right' }; }
      else if (c.type === 'date') { cell.numFmt = 'dd-mmm-yyyy'; cell.alignment = { horizontal: 'center' }; }
    });
  });

  columns.forEach((c, i) => {
    ws.getColumn(i + 1).width = c.width || Math.max(c.header.length + 2, 12);
  });
  ws.views = [{ state: 'frozen', ySplit: startRow }];
  ws.autoFilter = {
    from: { row: startRow, column: 1 },
    to: { row: startRow, column: columns.length },
  };
}

function writeSummarySheet(ws, title, pairs) {
  ws.mergeCells('A1:B1');
  const t = ws.getCell('A1');
  t.value = title;
  t.font = { name: FONT, size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BSI_GREEN } };
  t.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(1).height = 30;

  pairs.forEach(([label, value, type], i) => {
    const row = ws.getRow(i + 3);
    const lc = row.getCell(1);
    lc.value = label;
    lc.font = { name: FONT, size: 10, bold: true, color: { argb: 'FF3A4A55' } };
    lc.border = allBorders;
    lc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NOTE_BG } };
    const vc = row.getCell(2);
    vc.value = value == null ? '' : value;
    vc.font = { name: FONT, size: 10 };
    vc.border = allBorders;
    if (type === 'money' || type === 'int') { vc.numFmt = '#,##0'; vc.alignment = { horizontal: 'right' }; }
  });
  ws.getColumn(1).width = 32;
  ws.getColumn(2).width = 26;
}

async function saveBook(wb, fileName) {
  wb.creator = 'ISE BSI Event Monitoring Dashboard';
  wb.company = 'Bank Syariah Indonesia';
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fileName;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function colLetter(n) {
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

const NOTE = 'Data diekspor dari dashboard ISE BSI. Kolom CIF & Rekening berformat teks.';

const RECORD_COLS = [
  { header: 'Nama Event', key: 'nama_event', width: 24 },
  { header: 'Jenis Event', key: 'jenis_event', width: 12 },
  { header: 'Tanggal', key: 'tanggal_event', type: 'date' },
  { header: 'Provinsi', key: 'provinsi' },
  { header: 'Kota', key: 'kota' },
  { header: 'No CIF', key: 'no_cif' },
  { header: 'No Rekening', key: 'no_rekening' },
  { header: 'Nama', key: 'nama', width: 22 },
  { header: 'Jenis Tabungan', key: 'jenis_tabungan' },
  { header: 'Saldo Awal', key: 'saldo_awal', type: 'money' },
  { header: 'Setoran Awal', key: 'setoran_awal', type: 'money' },
  { header: 'Saldo Update', key: 'saldo_update', type: 'money' },
  { header: 'Pertumbuhan DPK', key: 'pertumbuhan_dpk', type: 'money' },
  { header: 'Status DPK', key: 'status_dpk' },
  { header: 'QRIS', key: 'qris_trx', type: 'int' },
  { header: 'EDC', key: 'edc_trx', type: 'int' },
  { header: 'Sales Volume', key: 'sales_volume', type: 'money' },
  { header: 'Jumlah Transaksi', key: 'jumlah_transaksi', type: 'int' },
  { header: 'Jenis Pembiayaan', key: 'jenis_pembiayaan' },
  { header: 'Nominal Pembiayaan', key: 'nominal_pembiayaan', type: 'money' },
  { header: 'Catatan', key: 'catatan', width: 24 },
];

const TENANT_COLS = [
  { header: 'Nama Event', key: 'nama_event', width: 24 },
  { header: 'No CIF', key: 'no_cif' },
  { header: 'No Rekening', key: 'no_rekening' },
  { header: 'Nama Tenant', key: 'nama', width: 22 },
  { header: 'Saldo Awal', key: 'saldo_awal', type: 'money' },
  { header: 'Saldo Update', key: 'saldo_update', type: 'money' },
  { header: 'Pertumbuhan DPK', key: 'pertumbuhan_dpk', type: 'money' },
  { header: 'Status DPK', key: 'status_dpk' },
  { header: 'Catatan', key: 'catatan', width: 24 },
];

const NASABAH_COLS = [
  { header: 'Nama Event', key: 'nama_event', width: 24 },
  { header: 'No CIF', key: 'no_cif' },
  { header: 'No Rekening', key: 'no_rekening' },
  { header: 'Nama Nasabah', key: 'nama', width: 22 },
  { header: 'Jenis Tabungan', key: 'jenis_tabungan' },
  { header: 'Setoran Awal', key: 'setoran_awal', type: 'money' },
  { header: 'Saldo Update', key: 'saldo_update', type: 'money' },
  { header: 'Pertumbuhan DPK', key: 'pertumbuhan_dpk', type: 'money' },
  { header: 'Status DPK', key: 'status_dpk' },
  { header: 'Catatan', key: 'catatan', width: 24 },
];

const FINANCING_COLS = [
  { header: 'Nama Event', key: 'nama_event', width: 24 },
  { header: 'Jenis Pembiayaan', key: 'jenis_pembiayaan' },
  { header: 'Nominal Pembiayaan', key: 'nominal_pembiayaan', type: 'money' },
  { header: 'Transaksi QRIS', key: 'qris_trx', type: 'int' },
  { header: 'Sales Volume QRIS', key: 'qris_sales', type: 'money' },
  { header: 'Transaksi EDC', key: 'edc_trx', type: 'int' },
  { header: 'Sales Volume EDC', key: 'edc_sales', type: 'money' },
];

export async function exportRecords(rows, fileName = `Database_Event_BSI_${today()}.xlsx`) {
  const wb = new ExcelJS.Workbook();
  writeSheet(wb.addWorksheet('DATABASE_EVENT'), RECORD_COLS, rows || [], { note: NOTE });
  await saveBook(wb, fileName);
}

export async function exportTenants(records, fileName = `Data_Tenant_BSI_${today()}.xlsx`) {
  const rows = (records || []).filter((r) => r.kind === 'tenant');
  const wb = new ExcelJS.Workbook();
  writeSheet(wb.addWorksheet('DATA_DPK_TENANT'), TENANT_COLS, rows, { note: NOTE });
  await saveBook(wb, fileName);
}

export async function exportNasabah(records, fileName = `Data_Nasabah_BSI_${today()}.xlsx`) {
  const rows = (records || []).filter((r) => r.kind === 'nasabah');
  const wb = new ExcelJS.Workbook();
  writeSheet(wb.addWorksheet('DATA_NASABAH_EVENT'), NASABAH_COLS, rows, { note: NOTE });
  await saveBook(wb, fileName);
}

export async function exportFinancing(records, fileName = `Pembiayaan_Transaksi_BSI_${today()}.xlsx`) {
  const seen = new Set();
  const rows = [];
  for (const r of records || []) {
    if (seen.has(r.event_id)) continue;
    seen.add(r.event_id);
    rows.push(r);
  }
  const wb = new ExcelJS.Workbook();
  writeSheet(wb.addWorksheet('TRANSAKSI_PEMBIAYAAN'), FINANCING_COLS, rows, { note: NOTE });
  await saveBook(wb, fileName);
}

export async function exportDashboardSummary(events, fileName = `Ringkasan_Dashboard_BSI_${today()}.xlsx`) {
  const ov = buildOverview(events || []);
  const wb = new ExcelJS.Workbook();
  writeSummarySheet(wb.addWorksheet('RINGKASAN_DASHBOARD'), 'Ringkasan Dashboard ISE BSI', summaryPairs(ov, events));
  await saveBook(wb, fileName);
}

export async function exportFullDashboard(events, records, fileName = `Laporan_Dashboard_ISE_BSI_${today()}.xlsx`) {
  const ov = buildOverview(events || []);
  const wb = new ExcelJS.Workbook();

  writeSummarySheet(wb.addWorksheet('Ringkasan Dashboard'), 'Ringkasan Dashboard ISE BSI', summaryPairs(ov, events));

  const eventCols = [
    { header: 'Nama Event', key: 'nama', width: 26 },
    { header: 'Jenis Event', key: 'jenis', width: 12 },
    { header: 'Tanggal Mulai', key: 'tanggal', type: 'date' },
    { header: 'Tanggal Selesai', key: 'tanggalSelesai', type: 'date' },
    { header: 'Lokasi', key: 'lokasi' },
    { header: 'Provinsi', key: 'provinsi' },
    { header: 'Kota', key: 'kota' },
    { header: 'Instansi', key: 'instansi' },
    { header: 'Tag / Tema', key: 'tagTema' },
    { header: 'Jumlah Tenant', key: 'jumlahTenant', type: 'int' },
    { header: 'Budget Event', key: 'cost', type: 'money' },
    { header: 'Total DPK', key: 'dpk', type: 'money' },
    { header: 'Pertumbuhan DPK', key: 'growth', type: 'money' },
    { header: 'Catatan', key: 'catatan', width: 24 },
  ];
  const eventRows = (events || []).map((e) => {
    const m = eventMetrics(e);
    return {
      nama: e.nama, jenis: e.jenis === 'private' ? 'Private' : 'Expo/Bazar',
      tanggal: e.tanggal, tanggalSelesai: e.tanggalSelesai, lokasi: e.lokasi,
      provinsi: e.provinsi, kota: e.kota, instansi: e.instansi, tagTema: e.tagTema,
      jumlahTenant: e.jumlahTenant, cost: m.cost,
      dpk: m.dpkCurrent, growth: m.growthAmount, catatan: e.catatan,
    };
  });
  writeSheet(wb.addWorksheet('Data Event'), eventCols, eventRows, { note: NOTE });

  writeSheet(wb.addWorksheet('Data DPK Tenant'), TENANT_COLS, (records || []).filter((r) => r.kind === 'tenant'), { note: NOTE });
  writeSheet(wb.addWorksheet('Data Nasabah Event'), NASABAH_COLS, (records || []).filter((r) => r.kind === 'nasabah'), { note: NOTE });

  const trxCols = [
    { header: 'Nama Event', key: 'nama', width: 26 },
    { header: 'Transaksi QRIS', key: 'qrisTrx', type: 'int' },
    { header: 'Sales Volume QRIS', key: 'qrisSales', type: 'money' },
    { header: 'Transaksi EDC', key: 'edcTrx', type: 'int' },
    { header: 'Sales Volume EDC', key: 'edcSales', type: 'money' },
    { header: 'Total Transaksi', key: 'totalTrx', type: 'int' },
    { header: 'Total Sales Volume', key: 'totalSales', type: 'money' },
  ];
  const trxRows = (events || []).map((e) => {
    const m = eventMetrics(e);
    return {
      nama: e.nama, qrisTrx: m.qrisTrx, qrisSales: m.qrisSales,
      edcTrx: m.edcTrx, edcSales: m.edcSales,
      totalTrx: m.jumlahTransaksi, totalSales: m.salesVolume,
    };
  });
  writeSheet(wb.addWorksheet('Transaksi QRIS & EDC'), trxCols, trxRows, { note: NOTE });

  const pembCols = [
    { header: 'Nama Event', key: 'nama', width: 26 },
    { header: 'Jumlah Pembiayaan', key: 'jml', type: 'int' },
    { header: 'Nominal Pembiayaan', key: 'nominal', type: 'money' },
  ];
  const pembRows = (events || []).map((e) => {
    const m = eventMetrics(e);
    return { nama: e.nama, jml: m.jumlahPembiayaan, nominal: m.nominalPembiayaan };
  });
  writeSheet(wb.addWorksheet('Pembiayaan'), pembCols, pembRows, { note: NOTE });

  writeSheet(wb.addWorksheet('Insight Efektivitas Event'), INSIGHT_COLS, insightRows(events), { note: NOTE });

  await saveBook(wb, fileName);
}

export async function exportEventReport(ev, fileName) {
  const wb = new ExcelJS.Workbook();
  const safe = (ev.nama || 'event').replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
  const m = eventMetrics(ev);

  writeSummarySheet(wb.addWorksheet('Ringkasan Event'), `Ringkasan: ${ev.nama}`, [
    ['Nama Event', ev.nama],
    ['Jenis Event', ev.jenis === 'private' ? 'Private' : 'Expo/Bazar'],
    ['Tanggal Mulai', ev.tanggal || '-'],
    ['Tanggal Selesai', ev.tanggalSelesai || '-'],
    ['Lokasi', ev.lokasi || '-'],
    ['Provinsi / Kota', [ev.provinsi, ev.kota].filter(Boolean).join(' / ') || '-'],
    ['Instansi / Brand', ev.instansi || '-'],
    ['Total Budget', m.cost || 0, 'money'],
    ['Total DPK Tenant', m.dpkTenant || 0, 'money'],
    ['Total DPK Nasabah', m.dpkNasabah || 0, 'money'],
    ['Total DPK Event', m.dpkCurrent || 0, 'money'],
    ['Pertumbuhan DPK', m.growthAmount || 0, 'money'],
    ['Akuisisi Rekening', m.noaRekening || 0, 'int'],
    ['Akuisisi Pembiayaan', m.jumlahPembiayaan || 0, 'int'],
    ['Sales Volume QRIS', m.qrisSales || 0, 'money'],
    ['Sales Volume EDC', m.edcSales || 0, 'money'],
    ['Rasio Efektivitas', m.rasioEfektivitas != null ? Number(m.rasioEfektivitas.toFixed(2)) : 'Data belum cukup'],
    ['Status Efektivitas', m.statusEfektivitas || 'Perlu Evaluasi'],
    ['Tanggal Export', today()],
  ]);

  const tCols = [
    { header: 'No CIF', key: 'cif' }, { header: 'No Rekening', key: 'rekening' },
    { header: 'Nama Tenant', key: 'nama', width: 22 }, { header: 'Jenis Usaha', key: 'jenisUsaha' },
    { header: 'Saldo Awal', key: 'saldoAwal', type: 'money' }, { header: 'Saldo Update', key: 'saldoUpdate', type: 'money' },
  ];
  writeSheet(wb.addWorksheet('Rekening Tenant'), tCols, ev.tenants || [], { note: NOTE });

  const nCols = [
    { header: 'No CIF', key: 'cif' }, { header: 'No Rekening', key: 'rekening' },
    { header: 'Nama Nasabah', key: 'nama', width: 22 }, { header: 'Jenis Tabungan', key: 'jenisTabungan' },
    { header: 'Setoran Awal', key: 'setoranAwal', type: 'money' }, { header: 'Saldo Update', key: 'saldoUpdate', type: 'money' },
  ];
  writeSheet(wb.addWorksheet('Rekening Nasabah'), nCols, ev.nasabah || [], { note: NOTE });

  const a = ev.akuisisi || {};
  const aCols = [
    { header: 'Transaksi QRIS', key: 'qrisTrx', type: 'int' }, { header: 'Sales QRIS', key: 'qrisSales', type: 'money' },
    { header: 'Transaksi EDC', key: 'edcTrx', type: 'int' }, { header: 'Sales EDC', key: 'edcSales', type: 'money' },
    { header: 'Jumlah Pembiayaan', key: 'jml', type: 'int' }, { header: 'Nominal Pembiayaan', key: 'nominal', type: 'money' },
  ];
  writeSheet(wb.addWorksheet('Pembiayaan & Transaksi'), aCols, [{
    qrisTrx: a.qrisTrx, qrisSales: a.qrisSalesVolume, edcTrx: a.edcTrx, edcSales: a.edcSalesVolume,
    jml: a.jumlahPembiayaan, nominal: a.nominalPembiayaan,
  }], { note: NOTE });

  await saveBook(wb, fileName || `Laporan_${safe}_BSI_${today()}.xlsx`);
}

export const exportEventDetail = exportEventReport;

const INSIGHT_COLS = [
  { header: 'Nama Event', key: 'nama', width: 26 },
  { header: 'Budget Event', key: 'budget', type: 'money' },
  { header: 'Total DPK Event', key: 'dpk', type: 'money' },
  { header: 'Pertumbuhan DPK', key: 'growth', type: 'money' },
  { header: 'Rasio Efektivitas', key: 'rasio' },
  { header: 'Status Efektivitas', key: 'status' },
  { header: 'Catatan Insight', key: 'insight', width: 40 },
];

function insightRows(events) {
  return (events || []).map((e) => {
    const m = eventMetrics(e);
    const rasio = m.rasioEfektivitas;
    return {
      nama: e.nama, budget: m.cost || 0, dpk: m.dpkCurrent || 0, growth: m.growthAmount || 0,
      rasio: rasio != null ? Number(rasio.toFixed(2)) : 'Data belum cukup',
      status: m.statusEfektivitas || 'Perlu Evaluasi',
      insight: buildInsight(m),
    };
  });
}

function buildInsight(m) {
  if (!m.growthAmount || m.growthAmount <= 0) {
    return m.cost > 0 ? 'Budget dikeluarkan namun DPK belum tumbuh - perlu evaluasi strategi.' : 'Belum ada pertumbuhan DPK tercatat.';
  }
  const rasio = m.rasioEfektivitas;
  if (rasio == null) return 'Data belum cukup untuk menilai efektivitas.';
  if (rasio <= 0.5) return 'Sangat efektif: pertumbuhan DPK jauh melebihi biaya event.';
  if (rasio <= 1.5) return 'Cukup efektif: biaya dan pertumbuhan DPK relatif seimbang.';
  return 'Kurang efektif: biaya tinggi dibanding pertumbuhan DPK yang dihasilkan.';
}

function summaryPairs(ov, events) {
  const list = events || ov.events || [];
  const agg = (list).reduce((a, e) => {
    const m = eventMetrics(e);
    a.cost += m.cost; a.dpk += m.dpkCurrent; a.growth += m.growthAmount;
    a.noa += m.noaRekening; a.pemb += m.jumlahPembiayaan;
    a.trx += m.jumlahTransaksi; a.sales += m.salesVolume;
    return a;
  }, { cost: 0, dpk: 0, growth: 0, noa: 0, pemb: 0, trx: 0, sales: 0 });
  const rasio = agg.growth > 0 ? agg.cost / agg.growth : null;
  return [
    ['Total Event', list.length, 'int'],
    ['Total Budget Event', agg.cost, 'money'],
    ['Total DPK', agg.dpk, 'money'],
    ['Total Pertumbuhan DPK', agg.growth, 'money'],
    ['Total Akuisisi Rekening', agg.noa, 'int'],
    ['Total Akuisisi Pembiayaan', agg.pemb, 'int'],
    ['Total Transaksi QRIS + EDC', agg.trx, 'int'],
    ['Total Sales Volume QRIS + EDC', agg.sales, 'money'],
    ['Rasio Efektivitas', rasio != null ? Number(rasio.toFixed(2)) : 'Data belum cukup'],
    ['Status Efektivitas', classifyEfektivitas(agg.cost, agg.growth)?.label || 'Perlu Evaluasi'],
    ['Tanggal Export', today()],
  ];
}
