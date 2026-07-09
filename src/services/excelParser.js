// src/services/excelParser.js
// Membaca file Excel di browser (ExcelJS), mendeteksi jenis template,
// memvalidasi sheet & kolom wajib, membersihkan angka/tanggal, menjaga
// No CIF & No Rekening sebagai string, lalu menghasilkan data terstruktur
// + ringkasan validasi untuk preview sebelum disimpan ke database.
import ExcelJS from 'exceljs';

// ---------- definisi tiap jenis upload ----------
// header disamakan dengan template Sesi 3 (excelTemplates.js)
export const UPLOAD_TYPES = {
  dpkTenant: {
    label: 'Excel DPK Tenant',
    sheet: 'DATA_DPK_TENANT',
    required: [
      'Nama Event', 'Nama Tenant / Brand / Instansi', 'No CIF Tenant',
      'No Rekening Tenant', 'Saldo Awal (Rp)',
    ],
  },
  nasabah: {
    label: 'Excel Nasabah Event',
    sheet: 'DATA_NASABAH_EVENT',
    required: [
      'Nama Event', 'Nama Nasabah', 'No CIF Nasabah',
      'No Rekening Nasabah', 'Setoran Awal (Rp)',
    ],
  },
  gabungan: {
    label: 'Excel Gabungan Event',
    sheets: {
      DATA_EVENT: { required: ['Nama Event'] },
      DATA_DPK_TENANT: { required: ['Nama Event', 'No Rekening Tenant'] },
      DATA_NASABAH_EVENT: { required: ['Nama Event', 'No Rekening Nasabah'] },
    },
  },
  akuisisi: {
    label: 'Excel Akuisisi & Transaksi',
    sheet: 'DATA_AKUISISI_TRANSAKSI',
    required: ['Nama Event'],
  },
  dpkUpdate: {
    label: 'Excel DPK Update',
    // menerima sheet tenant ATAU nasabah (deteksi otomatis)
    anySheet: ['DATA_DPK_TENANT', 'DATA_NASABAH_EVENT'],
  },
};

// ---------- util pembersih ----------
// jaga string apa adanya (untuk CIF & rekening: nol depan tidak hilang)
function cleanString(v) {
  if (v == null) return '';
  if (typeof v === 'object' && v.richText) {
    // rich text ExcelJS: gabungkan seluruh potongan teks
    return v.richText.map((p) => p.text || '').join('').trim();
  }
  if (typeof v === 'object' && v.text) return String(v.text).trim(); // hyperlink/rich text
  if (typeof v === 'object' && v.result != null) return String(v.result).trim();
  if (typeof v === 'object' && 'formula' in v) return ''; // sel rumus tanpa hasil
  return String(v).trim();
}

// normalisasi teks header agar pencocokan TOLERAN terhadap:
// - spasi ekstra / spasi ganda / spasi tak terlihat (non-breaking space)
// - perbedaan huruf besar-kecil
// - variasi tanda hubung / newline di dalam header
// Contoh: "Nama  Event ", "NAMA EVENT", "Nama\nEvent" -> semua jadi "nama event"
function normalizeHeader(v) {
  return cleanString(v)
    .replace(/\u00a0/g, ' ')       // non-breaking space -> spasi biasa
    .replace(/[\r\n\t]+/g, ' ')    // newline/tab -> spasi
    .replace(/\s+/g, ' ')          // spasi ganda -> tunggal
    .trim()
    .toLowerCase();
}

// bersihkan format rupiah -> number ("Rp 1.500.000" / "1,500,000" / 1500000)
function cleanMoney(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && v.result != null) return cleanMoney(v.result);
  let s = String(v).replace(/[^\d,.-]/g, '').trim();
  if (!s) return null;
  // buang pemisah ribuan titik/koma; ambil angka bulat (rupiah tak berdesimal)
  s = s.replace(/[.,]/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function cleanInt(v) {
  const n = cleanMoney(v);
  return n == null ? null : Math.round(n);
}

// baca tanggal: Date, serial Excel, atau string
function cleanDate(v) {
  if (v == null || v === '') return null;
  if (v instanceof Date) return toISO(v);
  if (typeof v === 'object' && v.result) return cleanDate(v.result);
  if (typeof v === 'number') {
    // serial Excel (hari sejak 1899-12-30)
    const ms = Math.round((v - 25569) * 86400 * 1000);
    return toISO(new Date(ms));
  }
  const s = String(v).trim();
  // dd-mmm-yyyy / dd/mm/yyyy / yyyy-mm-dd
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return toISO(d);
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    const [, dd, mm, yy] = m;
    const year = yy.length === 2 ? `20${yy}` : yy;
    const dt = new Date(Number(year), Number(mm) - 1, Number(dd));
    if (!Number.isNaN(dt.getTime())) return toISO(dt);
  }
  return null;
}

function toISO(d) {
  return d.toISOString().slice(0, 10);
}

// ---------- baca satu sheet jadi array-of-object (key = header) ----------
// Setiap baris hasil bisa diakses dengan:
//   - nama header ASLI di file (mis. r['Nama Event'])
//   - nama header ternormalisasi (mis. r['nama event']) via proxy pencocokan
// Sehingga variasi spasi/kapital pada header tidak lagi bikin data "hilang".
function readSheet(ws, expectedHeaders = []) {
  if (!ws) return { headers: [], normHeaders: [], rows: [] };
  const headerRowIdx = findHeaderRow(ws, expectedHeaders);
  const hRow = ws.getRow(headerRowIdx);

  // peta kolom -> { raw, norm }
  const colMeta = [];
  hRow.eachCell({ includeEmpty: false }, (cell, col) => {
    const raw = cleanString(cell.value);
    if (raw) colMeta[col] = { raw, norm: normalizeHeader(cell.value) };
  });

  const headers = colMeta.filter(Boolean).map((m) => m.raw);
  const normHeaders = colMeta.filter(Boolean).map((m) => m.norm);

  const rows = [];
  for (let r = headerRowIdx + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const obj = {};
    const normMap = {}; // norm header -> value
    let hasAny = false;
    colMeta.forEach((meta, col) => {
      if (!meta) return;
      const val = row.getCell(col).value;
      obj[meta.raw] = val;
      normMap[meta.norm] = val;
      // sel rumus TANPA hasil tidak dihitung sebagai "baris berisi data"
      const isEmptyFormula =
        val != null && typeof val === 'object' && 'formula' in val && val.result == null;
      if (!isEmptyFormula && cleanString(val) !== '') hasAny = true;
    });
    if (hasAny) rows.push({ __row: r, __norm: normMap, ...obj });
  }
  return { headers, normHeaders, rows };
}

// Ambil nilai sel dari sebuah baris secara TOLERAN:
// coba nama header asli dulu, lalu cocokkan versi ternormalisasi.
function pick(row, headerName) {
  if (row == null) return undefined;
  if (headerName in row) return row[headerName];
  const norm = normalizeHeader(headerName);
  if (row.__norm && norm in row.__norm) return row.__norm[norm];
  return undefined;
}

// Cari baris header: baris dengan jumlah sel terisi terbanyak dalam 8 baris
// pertama. Kalau daftar header yang diharapkan diberikan, prioritaskan baris
// yang paling banyak mengandung header tersebut (lebih tahan terhadap baris
// catatan/kosong di atas header).
function findHeaderRow(ws, expectedHeaders = []) {
  const wantNorm = expectedHeaders.map(normalizeHeader);
  let best = { row: 2, score: -1 };
  const maxScan = Math.min(8, ws.rowCount);
  for (let r = 1; r <= maxScan; r++) {
    const row = ws.getRow(r);
    let filled = 0;
    let matched = 0;
    row.eachCell({ includeEmpty: false }, (cell) => {
      const norm = normalizeHeader(cell.value);
      if (norm) filled += 1;
      if (wantNorm.includes(norm)) matched += 1;
    });
    // skor: kecocokan header diharapkan jauh lebih berbobot daripada sekadar terisi
    const score = matched * 10 + filled;
    if (filled >= 2 && score > best.score) best = { row: r, score };
  }
  return best.score >= 0 ? best.row : 2;
}

// normalisasi nama sheet (abaikan spasi & huruf besar-kecil)
function normSheet(name) {
  return String(name || '').replace(/\s+/g, '').toUpperCase();
}

// ambil worksheet secara TOLERAN terhadap spasi/kapital pada nama sheet
function getSheet(wb, wantedName) {
  const want = normSheet(wantedName);
  return wb.worksheets.find((w) => normSheet(w.name) === want) || null;
}

// ---------- deteksi jenis template dari nama sheet (toleran) ----------
export function detectType(workbook) {
  const names = workbook.worksheets.map((w) => normSheet(w.name));
  const has = (n) => names.includes(normSheet(n));
  if (has('DATA_EVENT') && has('DATA_DPK_TENANT') && has('DATA_NASABAH_EVENT'))
    return 'gabungan';
  if (has('DATA_AKUISISI_TRANSAKSI')) return 'akuisisi';
  if (has('DATA_DPK_TENANT') && !has('DATA_NASABAH_EVENT')) return 'dpkTenant';
  if (has('DATA_NASABAH_EVENT') && !has('DATA_DPK_TENANT')) return 'nasabah';
  return null;
}

// ---------- validasi kolom wajib (TOLERAN) ----------
// Cocokkan berdasarkan versi ternormalisasi, jadi "Nama Event ", "NAMA EVENT",
// atau "Nama  Event" tetap dianggap ada.
function checkRequired(headers, required) {
  const have = new Set(headers.map(normalizeHeader));
  return required.filter((r) => !have.has(normalizeHeader(r)));
}

// Bangun pesan error ramah yang menyebutkan kolom yang benar-benar terbaca,
// supaya user tahu apa yang salah (bukan sekadar "tidak ditemukan").
function missingColumnMessage(missing, foundHeaders) {
  const found = foundHeaders.filter(Boolean);
  const daftar = found.length
    ? ` Kolom yang terbaca di file: ${found.join(', ')}.`
    : ' Sistem tidak menemukan baris header sama sekali.';
  const kolom = missing.join(', ');
  return (
    `Kolom wajib berikut tidak ditemukan: ${kolom}.` +
    daftar +
    ' Periksa apakah nama kolom sama persis dengan template (spasi & ejaan), ' +
    'dan pastikan baris header tidak terhapus.'
  );
}

// ---------- status DPK ----------
export function statusDpk(saldoAwal, saldoUpdate) {
  if (saldoUpdate == null) return 'Belum Update';
  if (saldoUpdate > saldoAwal) return 'Tumbuh';
  if (saldoUpdate === saldoAwal) return 'Tetap';
  return 'Turun';
}

// ============================================================
// PARSER UTAMA — kembalikan { ok, type, sheets, summary, errors, warnings, data }
// ============================================================
export async function parseExcel(file, forcedType = null) {
  // 1. validasi ekstensi
  const ext = file.name.toLowerCase().split('.').pop();
  if (!['xlsx', 'xls'].includes(ext)) {
    return fail(`Format file harus .xlsx atau .xls (file Anda: .${ext}).`);
  }

  // 2. baca workbook
  const wb = new ExcelJS.Workbook();
  try {
    const buf = await file.arrayBuffer();
    await wb.xlsx.load(buf);
  } catch {
    return fail('File tidak dapat dibaca. Pastikan file Excel tidak rusak.');
  }

  // 3. deteksi / tentukan jenis
  let type = forcedType || detectType(wb);
  // dpkUpdate tidak terdeteksi otomatis (sheet sama dgn tenant/nasabah) -> harus dipilih user
  if (forcedType === 'dpkUpdate') type = 'dpkUpdate';
  if (!type) {
    return fail(
      'Jenis template tidak dikenali. Pastikan file menggunakan template resmi dashboard (nama sheet sesuai).',
    );
  }

  const errors = [];
  const warnings = [];

  // 4-11. parsing per jenis
  if (type === 'gabungan') return parseGabungan(wb, file, errors, warnings);
  if (type === 'dpkTenant') return parseTenant(wb, file, errors, warnings, 'dpkTenant');
  if (type === 'nasabah') return parseNasabah(wb, file, errors, warnings, 'nasabah');
  if (type === 'akuisisi') return parseAkuisisi(wb, file, errors, warnings);
  if (type === 'dpkUpdate') return parseDpkUpdate(wb, file, errors, warnings);

  return fail('Jenis upload tidak didukung.');
}

function fail(msg) {
  return { ok: false, errors: [msg], warnings: [], summary: null, data: null };
}

// ---------- TENANT ----------
function parseTenant(wb, file, errors, warnings, type) {
  const ws = getSheet(wb, 'DATA_DPK_TENANT');
  if (!ws) return fail('Sheet DATA_DPK_TENANT tidak ditemukan. Pastikan nama sheet di Excel adalah DATA_DPK_TENANT.');
  const req = UPLOAD_TYPES.dpkTenant.required;
  const { headers, rows } = readSheet(ws, req);

  const missing = checkRequired(headers, req);
  if (missing.length) return fail(missingColumnMessage(missing, headers));

  const seen = new Set();
  const data = [];
  rows.forEach((r) => {
    const rek = cleanString(pick(r, 'No Rekening Tenant'));
    const namaEvent = cleanString(pick(r, 'Nama Event'));
    const saldoAwal = cleanMoney(pick(r, 'Saldo Awal (Rp)')) ?? 0;
    const saldoUpdate = cleanMoney(pick(r, 'Saldo Update (Rp)'));

    if (!namaEvent) { errors.push(`Baris ${r.__row}: Nama Event kosong.`); return; }
    if (!rek) { warnings.push(`Baris ${r.__row}: No Rekening Tenant kosong.`); }
    if (rek && seen.has(rek)) warnings.push(`Baris ${r.__row}: No Rekening ${rek} duplikat.`);
    if (rek) seen.add(rek);

    data.push({
      namaEvent,
      nama_tenant: cleanString(pick(r, 'Nama Tenant / Brand / Instansi')),
      jenis_usaha: cleanString(pick(r, 'Jenis Usaha')),
      no_cif_tenant: cleanString(pick(r, 'No CIF Tenant')),
      no_rekening_tenant: rek,
      saldo_awal: saldoAwal,
      saldo_update: saldoUpdate,
      tanggal_update_saldo: cleanDate(pick(r, 'Tanggal Update Saldo')),
      status_dpk: statusDpk(saldoAwal, saldoUpdate),
      catatan: cleanString(pick(r, 'Catatan')),
    });
  });

  return done(type, file, { tenant: data }, rows.length, data.length, errors, warnings);
}

// ---------- NASABAH ----------
function parseNasabah(wb, file, errors, warnings, type) {
  const ws = getSheet(wb, 'DATA_NASABAH_EVENT');
  if (!ws) return fail('Sheet DATA_NASABAH_EVENT tidak ditemukan. Pastikan nama sheet di Excel adalah DATA_NASABAH_EVENT.');
  const req = UPLOAD_TYPES.nasabah.required;
  const { headers, rows } = readSheet(ws, req);

  const missing = checkRequired(headers, req);
  if (missing.length) return fail(missingColumnMessage(missing, headers));

  const seen = new Set();
  const data = [];
  rows.forEach((r) => {
    const rek = cleanString(pick(r, 'No Rekening Nasabah'));
    const namaEvent = cleanString(pick(r, 'Nama Event'));
    const setoran = cleanMoney(pick(r, 'Setoran Awal (Rp)')) ?? 0;
    const saldoUpdate = cleanMoney(pick(r, 'Saldo Update (Rp)'));

    if (!namaEvent) { errors.push(`Baris ${r.__row}: Nama Event kosong.`); return; }
    if (!rek) warnings.push(`Baris ${r.__row}: No Rekening Nasabah kosong.`);
    if (rek && seen.has(rek)) warnings.push(`Baris ${r.__row}: No Rekening ${rek} duplikat.`);
    if (rek) seen.add(rek);

    data.push({
      namaEvent,
      nama_nasabah: cleanString(pick(r, 'Nama Nasabah')),
      no_cif_nasabah: cleanString(pick(r, 'No CIF Nasabah')),
      no_rekening_nasabah: rek,
      jenis_tabungan: cleanString(pick(r, 'Jenis Tabungan')),
      setoran_awal: setoran,
      saldo_update: saldoUpdate,
      tanggal_pembukaan: cleanDate(pick(r, 'Tanggal Pembukaan Rekening')),
      tanggal_update_saldo: cleanDate(pick(r, 'Tanggal Update Saldo')),
      sumber_pembukaan: cleanString(pick(r, 'Sumber Pembukaan')),
      nama_staf_cabang_input: cleanString(pick(r, 'Nama Staf / Cabang Input')),
      status_rekening: cleanString(pick(r, 'Status Rekening')) || 'Aktif',
      catatan: cleanString(pick(r, 'Catatan')),
    });
  });

  return done(type, file, { nasabah: data }, rows.length, data.length, errors, warnings);
}

// ---------- GABUNGAN ----------
function parseGabungan(wb, file, errors, warnings) {
  const evWs = getSheet(wb, 'DATA_EVENT');
  const tnWs = getSheet(wb, 'DATA_DPK_TENANT');
  const nsWs = getSheet(wb, 'DATA_NASABAH_EVENT');
  if (!evWs || !tnWs || !nsWs) {
    return fail('Template gabungan harus punya 3 sheet: DATA_EVENT, DATA_DPK_TENANT, DATA_NASABAH_EVENT.');
  }

  const ev = readSheet(evWs, ['Nama Event']);
  if (checkRequired(ev.headers, ['Nama Event']).length) {
    return fail(missingColumnMessage(['Nama Event'], ev.headers));
  }

  const events = ev.rows.map((r) => ({
    nama_event: cleanString(pick(r, 'Nama Event')),
    jenis_event: mapJenis(cleanString(pick(r, 'Jenis Event'))),
    tanggal_mulai: cleanDate(pick(r, 'Tanggal Mulai')),
    tanggal_selesai: cleanDate(pick(r, 'Tanggal Selesai')),
    lokasi: cleanString(pick(r, 'Lokasi Event')),
    provinsi: cleanString(pick(r, 'Provinsi')),
    kota: cleanString(pick(r, 'Kota')),
    instansi: cleanString(pick(r, 'Nama Instansi / Organisasi')),
    tag_tema: cleanString(pick(r, 'Tag / Tema Event')),
    jumlah_tenant: cleanInt(pick(r, 'Jumlah Tenant')) ?? 0,
    budget_event: cleanMoney(pick(r, 'Budget Event (Rp)')) ?? 0,
    catatan: cleanString(pick(r, 'Catatan Event')),
  })).filter((e) => e.nama_event);

  const tn = readSheet(tnWs, ['Nama Event', 'No Rekening Tenant']);
  const tenant = tn.rows.map((r) => {
    const saldoAwal = cleanMoney(pick(r, 'Saldo Awal (Rp)')) ?? 0;
    const saldoUpdate = cleanMoney(pick(r, 'Saldo Update (Rp)'));
    return {
      namaEvent: cleanString(pick(r, 'Nama Event')),
      nama_tenant: cleanString(pick(r, 'Nama Tenant / Brand / Instansi')),
      jenis_usaha: cleanString(pick(r, 'Jenis Usaha')),
      no_cif_tenant: cleanString(pick(r, 'No CIF Tenant')),
      no_rekening_tenant: cleanString(pick(r, 'No Rekening Tenant')),
      saldo_awal: saldoAwal,
      saldo_update: saldoUpdate,
      tanggal_update_saldo: cleanDate(pick(r, 'Tanggal Update Saldo')),
      status_dpk: statusDpk(saldoAwal, saldoUpdate),
      catatan: cleanString(pick(r, 'Catatan')),
    };
  }).filter((t) => t.namaEvent);

  const ns = readSheet(nsWs, ['Nama Event', 'No Rekening Nasabah']);
  const nasabah = ns.rows.map((r) => {
    const setoran = cleanMoney(pick(r, 'Setoran Awal (Rp)')) ?? 0;
    const saldoUpdate = cleanMoney(pick(r, 'Saldo Update (Rp)'));
    return {
      namaEvent: cleanString(pick(r, 'Nama Event')),
      nama_nasabah: cleanString(pick(r, 'Nama Nasabah')),
      no_cif_nasabah: cleanString(pick(r, 'No CIF Nasabah')),
      no_rekening_nasabah: cleanString(pick(r, 'No Rekening Nasabah')),
      jenis_tabungan: cleanString(pick(r, 'Jenis Tabungan')),
      setoran_awal: setoran,
      saldo_update: saldoUpdate,
      tanggal_pembukaan: cleanDate(pick(r, 'Tanggal Pembukaan Rekening')),
      tanggal_update_saldo: cleanDate(pick(r, 'Tanggal Update Saldo')),
      sumber_pembukaan: cleanString(pick(r, 'Sumber Pembukaan')),
      status_rekening: 'Aktif',
      catatan: cleanString(pick(r, 'Catatan')),
    };
  }).filter((n) => n.namaEvent);

  if (!events.length) errors.push('Sheet DATA_EVENT tidak berisi data event.');

  const totalRows = ev.rows.length + tn.rows.length + ns.rows.length;
  const okRows = events.length + tenant.length + nasabah.length;
  return done('gabungan', file, { events, tenant, nasabah }, totalRows, okRows, errors, warnings);
}

// ---------- AKUISISI ----------
function parseAkuisisi(wb, file, errors, warnings) {
  const ws = getSheet(wb, 'DATA_AKUISISI_TRANSAKSI');
  if (!ws) return fail('Sheet DATA_AKUISISI_TRANSAKSI tidak ditemukan. Pastikan nama sheet di Excel adalah DATA_AKUISISI_TRANSAKSI.');
  const { headers, rows } = readSheet(ws, ['Nama Event']);
  if (checkRequired(headers, ['Nama Event']).length) {
    return fail(missingColumnMessage(['Nama Event'], headers));
  }

  const data = rows.map((r) => ({
    namaEvent: cleanString(pick(r, 'Nama Event')),
    jenis_pembiayaan: cleanString(pick(r, 'Jenis Pembiayaan')),
    jumlah_pembiayaan: cleanInt(pick(r, 'Jumlah Pembiayaan')) ?? 0,
    nominal_pembiayaan: cleanMoney(pick(r, 'Nominal Pembiayaan (Rp)')) ?? 0,
    jumlah_transaksi_qris: cleanInt(pick(r, 'Jumlah Transaksi QRIS')) ?? 0,
    sales_volume_qris: cleanMoney(pick(r, 'Sales Volume QRIS (Rp)')) ?? 0,
    jumlah_transaksi_edc: cleanInt(pick(r, 'Jumlah Transaksi EDC')) ?? 0,
    sales_volume_edc: cleanMoney(pick(r, 'Sales Volume EDC (Rp)')) ?? 0,
    oto: cleanInt(pick(r, 'OTO')) ?? 0,
    hasanah_card: cleanInt(pick(r, 'Hasanah Card')) ?? 0,
    catatan: cleanString(pick(r, 'Catatan')),
  })).filter((a) => a.namaEvent);

  return done('akuisisi', file, { akuisisi: data }, rows.length, data.length, errors, warnings);
}

// ---------- DPK UPDATE ----------
function parseDpkUpdate(wb, file, errors, warnings) {
  const tnWs = getSheet(wb, 'DATA_DPK_TENANT');
  const nsWs = getSheet(wb, 'DATA_NASABAH_EVENT');
  if (!tnWs && !nsWs) {
    return fail('File DPK Update harus berisi sheet DATA_DPK_TENANT atau DATA_NASABAH_EVENT.');
  }

  const updates = [];
  let totalRows = 0;

  if (tnWs) {
    const { rows } = readSheet(tnWs, ['No Rekening Tenant', 'Saldo Update (Rp)']);
    totalRows += rows.length;
    rows.forEach((r) => {
      const rek = cleanString(pick(r, 'No Rekening Tenant'));
      const cif = cleanString(pick(r, 'No CIF Tenant'));
      const saldoUpdate = cleanMoney(pick(r, 'Saldo Update (Rp)'));
      if ((!rek && !cif) || saldoUpdate == null) return;
      updates.push({
        target: 'tenant', no_rekening: rek, no_cif: cif,
        saldo_update: saldoUpdate,
        tanggal_update_saldo: cleanDate(pick(r, 'Tanggal Update Saldo')),
      });
    });
  }
  if (nsWs) {
    const { rows } = readSheet(nsWs, ['No Rekening Nasabah', 'Saldo Update (Rp)']);
    totalRows += rows.length;
    rows.forEach((r) => {
      const rek = cleanString(pick(r, 'No Rekening Nasabah'));
      const cif = cleanString(pick(r, 'No CIF Nasabah'));
      const saldoUpdate = cleanMoney(pick(r, 'Saldo Update (Rp)'));
      if ((!rek && !cif) || saldoUpdate == null) return;
      updates.push({
        target: 'nasabah', no_rekening: rek, no_cif: cif,
        saldo_update: saldoUpdate,
        tanggal_update_saldo: cleanDate(pick(r, 'Tanggal Update Saldo')),
      });
    });
  }

  if (!updates.length) errors.push('Tidak ada baris dengan Saldo Update yang valid untuk diperbarui.');
  return done('dpkUpdate', file, { updates }, totalRows, updates.length, errors, warnings);
}

// ---------- helper mapping ----------
function mapJenis(v) {
  const s = (v || '').toLowerCase();
  if (s.includes('private')) return 'private';
  return 'expo';
}

function done(type, file, data, totalRows, successRows, errors, warnings) {
  return {
    ok: errors.length === 0 && successRows > 0,
    type,
    label: UPLOAD_TYPES[type]?.label || type,
    fileName: file.name,
    data,
    summary: {
      totalRows,
      successRows,
      failedRows: Math.max(0, totalRows - successRows),
      errorCount: errors.length,
      warningCount: warnings.length,
    },
    errors,
    warnings,
  };
}
