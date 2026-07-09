// src/services/excelTemplates.js
// Generator template Excel resmi ISE BSI memakai ExcelJS (berjalan di browser).
// Semua template memakai gaya seragam: header hijau BSI, border halus, freeze
// pane, filter aktif, auto-width, format rupiah & tanggal, dan baris catatan.
import ExcelJS from 'exceljs';

// -------- palet & konstanta gaya BSI --------
const BSI_GREEN = 'FF00A39D';       // hijau tosca BSI (header)
const BSI_GREEN_DARK = 'FF007A75';
const NOTE_BG = 'FFFFF7E6';         // krem lembut untuk baris catatan
const NOTE_TEXT = 'FF8A6D3B';
const HEADER_TEXT = 'FFFFFFFF';
const BORDER = 'FFDDE3E8';
const FONT = 'Arial';

const NOTE =
  'Isi data sesuai format. Jangan mengubah nama kolom agar upload ke dashboard berhasil.';

const RUPIAH_FMT = '#,##0';         // ditampilkan sebagai angka ribuan (Rp di header)
const DATE_FMT = 'dd-mmm-yyyy';

const thin = { style: 'thin', color: { argb: BORDER } };
const allBorders = { top: thin, left: thin, bottom: thin, right: thin };

// tipe kolom: 'text' | 'money' | 'date' | 'int'
// opsi kolom: { header, key, width, type, list?, note? }
// (kolom "formula" TIDAK dipakai lagi — lihat catatan di buildSheet())

function buildSheet(ws, { columns, note = NOTE, startRow = 1, sampleRows = 30 }) {
  // ---- baris catatan (merged) ----
  const lastColLetter = colLetter(columns.length);
  ws.mergeCells(`A${startRow}:${lastColLetter}${startRow}`);
  const noteCell = ws.getCell(`A${startRow}`);
  noteCell.value = note;
  noteCell.font = { name: FONT, size: 10, italic: true, color: { argb: NOTE_TEXT } };
  noteCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NOTE_BG } };
  noteCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(startRow).height = 22;

  // ---- baris header ----
  const headerRowIdx = startRow + 1;
  const headerRow = ws.getRow(headerRowIdx);
  columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: HEADER_TEXT } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BSI_GREEN } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: BSI_GREEN_DARK } },
      left: { style: 'thin', color: { argb: BSI_GREEN_DARK } },
      bottom: { style: 'medium', color: { argb: BSI_GREEN_DARK } },
      right: { style: 'thin', color: { argb: BSI_GREEN_DARK } },
    };
  });
  headerRow.height = 30;

  // ---- baris data (kosong, hanya format + border, TANPA nilai/rumus) ----
  const firstDataRow = headerRowIdx + 1;
  for (let r = firstDataRow; r < firstDataRow + sampleRows; r++) {
    const row = ws.getRow(r);
    columns.forEach((col, i) => {
      const cell = row.getCell(i + 1);
      cell.font = { name: FONT, size: 10 };
      cell.border = allBorders;
      cell.alignment = { vertical: 'middle', wrapText: false };
      if (col.type === 'money') {
        cell.numFmt = RUPIAH_FMT;
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else if (col.type === 'date') {
        cell.numFmt = DATE_FMT;
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (col.type === 'int') {
        cell.numFmt = '#,##0';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else {
        // Kolom teks (termasuk No CIF & No Rekening): paksa format teks '@'
        // agar nol depan tidak hilang saat user mengetik langsung di template.
        cell.numFmt = '@';
      }
      // CATATAN PENTING: kolom "formula" (mis. Pertumbuhan DPK) SENGAJA TIDAK
      // diisi rumus di baris kosong. Menulis rumus ke 30 baris kosong membuat
      // Excel/parser menganggap baris itu "berisi data" walau user belum
      // mengisi apa pun -> upload ditolak dengan error palsu "Nama Event
      // kosong" pada baris yang sebenarnya kosong. Kolom ini murni referensi
      // visual (dihitung ulang otomatis oleh sistem setelah data diupload).
    });
  }

  // ---- lebar kolom (auto berdasarkan header + tipe) ----
  columns.forEach((col, i) => {
    ws.getColumn(i + 1).width = col.width || guessWidth(col);
  });

  // ---- freeze pane (header tetap terlihat) ----
  ws.views = [{ state: 'frozen', ySplit: headerRowIdx, xSplit: 0 }];

  // ---- filter aktif pada header ----
  ws.autoFilter = {
    from: { row: headerRowIdx, column: 1 },
    to: { row: headerRowIdx, column: columns.length },
  };

  // ---- dropdown (data validation) ----
  columns.forEach((col, i) => {
    if (col.list && col.list.length) {
      const letter = colLetter(i + 1);
      for (let r = firstDataRow; r < firstDataRow + sampleRows; r++) {
        ws.getCell(`${letter}${r}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`"${col.list.join(',')}"`],
          showErrorMessage: true,
          errorStyle: 'warning',
          error: 'Pilih salah satu dari daftar.',
        };
      }
    }
  });

  return { headerRowIdx, firstDataRow };
}

function guessWidth(col) {
  const base = Math.max(col.header.length + 2, 10);
  if (col.type === 'money') return Math.max(base, 16);
  if (col.type === 'date') return 16;
  if (col.header.toLowerCase().includes('catatan')) return 28;
  if (col.header.toLowerCase().includes('nama')) return 26;
  return Math.min(base, 30);
}

function colLetter(n) {
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function styleWorkbook(wb) {
  wb.creator = 'ISE BSI Event Monitoring Dashboard';
  wb.created = new Date();
  wb.company = 'Bank Syariah Indonesia';
}

// ============================================================
// Definisi kolom tiap template
// ============================================================
const JENIS_EVENT = ['Expo/Bazar', 'Private'];
const STATUS_DPK = ['Tumbuh', 'Tetap', 'Turun', 'Belum Update'];
const JENIS_TABUNGAN = [
  'Easy Wadiah', 'Easy Mudharabah', 'Tabungan Haji', 'Tabis',
  'Tabungan Bisnis', 'Tabungan Payroll', 'Prioritas', 'Lainnya',
];
const STATUS_REKENING = ['Aktif', 'Belum Aktif', 'Perlu Verifikasi', 'Closed'];
const JENIS_PEMBIAYAAN = [
  'Pembiayaan Konsumer', 'Pembiayaan Mikro', 'Pembiayaan SME',
  'OTO', 'Hasanah Card', 'Lainnya',
];

// -- Template 1: DPK Tenant --
function columnsDpkTenant() {
  return [
    { header: 'No', type: 'int', width: 6 },
    { header: 'Nama Event', type: 'text' },
    { header: 'Jenis Event', type: 'text', list: JENIS_EVENT },
    { header: 'Tanggal Event', type: 'date' },
    { header: 'Lokasi Event', type: 'text' },
    { header: 'Provinsi', type: 'text' },
    { header: 'Kota', type: 'text' },
    { header: 'Nama Tenant / Brand / Instansi', type: 'text' },
    { header: 'Jenis Usaha', type: 'text' },
    { header: 'No CIF Tenant', type: 'text' },
    { header: 'No Rekening Tenant', type: 'text' },
    { header: 'Saldo Awal (Rp)', type: 'money' },
    { header: 'Saldo Update (Rp)', type: 'money' },
    // Kolom informasi saja — dihitung ulang otomatis oleh sistem setelah
    // upload (Saldo Update - Saldo Awal). Boleh dikosongkan, tidak dibaca sistem.
    { header: 'Pertumbuhan DPK (Rp)', type: 'money' },
    { header: 'Tanggal Update Saldo', type: 'date' },
    { header: 'Status DPK', type: 'text', list: STATUS_DPK },
    { header: 'Catatan', type: 'text' },
  ];
}

// -- Template 2: Nasabah Event --
function columnsNasabah() {
  return [
    { header: 'No', type: 'int', width: 6 },
    { header: 'Nama Event', type: 'text' },
    { header: 'Jenis Event', type: 'text', list: JENIS_EVENT },
    { header: 'Tanggal Event', type: 'date' },
    { header: 'Lokasi Event', type: 'text' },
    { header: 'Provinsi', type: 'text' },
    { header: 'Kota', type: 'text' },
    { header: 'Nama Nasabah', type: 'text' },
    { header: 'No CIF Nasabah', type: 'text' },
    { header: 'No Rekening Nasabah', type: 'text' },
    { header: 'Jenis Tabungan', type: 'text', list: JENIS_TABUNGAN },
    { header: 'Setoran Awal (Rp)', type: 'money' },
    { header: 'Saldo Update (Rp)', type: 'money' },
    // Kolom informasi saja — dihitung ulang otomatis oleh sistem setelah
    // upload (Saldo Update - Setoran Awal). Boleh dikosongkan, tidak dibaca sistem.
    { header: 'Pertumbuhan DPK (Rp)', type: 'money' },
    { header: 'Tanggal Pembukaan Rekening', type: 'date' },
    { header: 'Tanggal Update Saldo', type: 'date' },
    { header: 'Sumber Pembukaan', type: 'text' },
    { header: 'Nama Staf / Cabang Input', type: 'text' },
    { header: 'Status Rekening', type: 'text', list: STATUS_REKENING },
    { header: 'Catatan', type: 'text' },
  ];
}

// -- Template 3 (gabungan) — 3 sheet --
function columnsEventInfo() {
  return [
    { header: 'Nama Event', type: 'text' },
    { header: 'Jenis Event', type: 'text', list: JENIS_EVENT },
    { header: 'Tanggal Mulai', type: 'date' },
    { header: 'Tanggal Selesai', type: 'date' },
    { header: 'Lokasi Event', type: 'text' },
    { header: 'Provinsi', type: 'text' },
    { header: 'Kota', type: 'text' },
    { header: 'Nama Instansi / Organisasi', type: 'text' },
    { header: 'Tag / Tema Event', type: 'text' },
    { header: 'Jumlah Tenant', type: 'int' },
    { header: 'Budget Event (Rp)', type: 'money' },
    { header: 'Catatan Event', type: 'text' },
  ];
}
function columnsTenantSimple() {
  return [
    { header: 'No', type: 'int', width: 6 },
    { header: 'Nama Event', type: 'text' },
    { header: 'Nama Tenant / Brand / Instansi', type: 'text' },
    { header: 'Jenis Usaha', type: 'text' },
    { header: 'No CIF Tenant', type: 'text' },
    { header: 'No Rekening Tenant', type: 'text' },
    { header: 'Saldo Awal (Rp)', type: 'money' },
    { header: 'Saldo Update (Rp)', type: 'money' },
    { header: 'Tanggal Update Saldo', type: 'date' },
    { header: 'Catatan', type: 'text' },
  ];
}
function columnsNasabahSimple() {
  return [
    { header: 'No', type: 'int', width: 6 },
    { header: 'Nama Event', type: 'text' },
    { header: 'Nama Nasabah', type: 'text' },
    { header: 'No CIF Nasabah', type: 'text' },
    { header: 'No Rekening Nasabah', type: 'text' },
    { header: 'Jenis Tabungan', type: 'text', list: JENIS_TABUNGAN },
    { header: 'Setoran Awal (Rp)', type: 'money' },
    { header: 'Saldo Update (Rp)', type: 'money' },
    { header: 'Tanggal Pembukaan Rekening', type: 'date' },
    { header: 'Tanggal Update Saldo', type: 'date' },
    { header: 'Sumber Pembukaan', type: 'text' },
    { header: 'Catatan', type: 'text' },
  ];
}

// -- Template 4: Akuisisi & Transaksi --
function columnsAkuisisi() {
  return [
    { header: 'No', type: 'int', width: 6 },
    { header: 'Nama Event', type: 'text' },
    { header: 'Jenis Pembiayaan', type: 'text', list: JENIS_PEMBIAYAAN },
    { header: 'Jumlah Pembiayaan', type: 'int' },
    { header: 'Nominal Pembiayaan (Rp)', type: 'money' },
    { header: 'Jumlah Transaksi QRIS', type: 'int' },
    { header: 'Sales Volume QRIS (Rp)', type: 'money' },
    { header: 'Jumlah Transaksi EDC', type: 'int' },
    { header: 'Sales Volume EDC (Rp)', type: 'money' },
    { header: 'OTO', type: 'int' },
    { header: 'Hasanah Card', type: 'int' },
    { header: 'Catatan', type: 'text' },
  ];
}

// ============================================================
// Builder tiap template -> ExcelJS Workbook
// ============================================================
export const TEMPLATES = {
  dpkTenant: {
    fileName: 'Template_DPK_Tenant_Event_BSI.xlsx',
    label: 'Template DPK Tenant',
    build: () => {
      const wb = new ExcelJS.Workbook();
      styleWorkbook(wb);
      const ws = wb.addWorksheet('DATA_DPK_TENANT', {
        views: [{ state: 'frozen', ySplit: 2 }],
      });
      buildSheet(ws, { columns: columnsDpkTenant() });
      return wb;
    },
  },
  nasabah: {
    fileName: 'Template_Nasabah_Event_BSI.xlsx',
    label: 'Template Nasabah Event',
    build: () => {
      const wb = new ExcelJS.Workbook();
      styleWorkbook(wb);
      const ws = wb.addWorksheet('DATA_NASABAH_EVENT');
      buildSheet(ws, { columns: columnsNasabah() });
      return wb;
    },
  },
  gabungan: {
    fileName: 'Template_Upload_Event_BSI.xlsx',
    label: 'Template Gabungan Event',
    build: () => {
      const wb = new ExcelJS.Workbook();
      styleWorkbook(wb);
      buildSheet(wb.addWorksheet('DATA_EVENT'), { columns: columnsEventInfo() });
      buildSheet(wb.addWorksheet('DATA_DPK_TENANT'), { columns: columnsTenantSimple() });
      buildSheet(wb.addWorksheet('DATA_NASABAH_EVENT'), { columns: columnsNasabahSimple() });
      return wb;
    },
  },
  akuisisi: {
    fileName: 'Template_Akuisisi_Transaksi_Event_BSI.xlsx',
    label: 'Template Akuisisi & Transaksi',
    build: () => {
      const wb = new ExcelJS.Workbook();
      styleWorkbook(wb);
      buildSheet(wb.addWorksheet('DATA_AKUISISI_TRANSAKSI'), { columns: columnsAkuisisi() });
      return wb;
    },
  },
};

// -------- picu download di browser --------
export async function downloadTemplate(key) {
  const tpl = TEMPLATES[key];
  if (!tpl) throw new Error(`Template '${key}' tidak dikenal`);
  const wb = tpl.build();
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = tpl.fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return tpl.fileName;
}

export const TEMPLATE_LIST = [
  { key: 'dpkTenant', ...TEMPLATES.dpkTenant },
  { key: 'nasabah', ...TEMPLATES.nasabah },
  { key: 'gabungan', ...TEMPLATES.gabungan },
  { key: 'akuisisi', ...TEMPLATES.akuisisi },
];
