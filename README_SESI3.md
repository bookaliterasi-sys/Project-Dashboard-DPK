# Sesi 3 — Template Excel Resmi (Download)

## Library Excel
- **ExcelJS 4.4** — dipilih karena berjalan di browser DAN mendukung styling penuh
  (warna header, border, freeze pane, filter, data validation/dropdown, format
  angka & tanggal). SheetJS versi gratis tidak mendukung styling ini.

## File yang dibuat/diubah
- `src/services/excelTemplates.js` — generator 4 template (baru).
- `src/pages/UploadExcel.jsx` — section "Download Template Excel" dengan 4 tombol
  download nyata (diubah dari placeholder).
- `vite.config.js` — define global agar ExcelJS jalan di browser (diubah).
- `package.json` — tambah dependency `exceljs` (diubah).

## Template yang dihasilkan
1. `Template_DPK_Tenant_Event_BSI.xlsx` — sheet DATA_DPK_TENANT (17 kolom).
   Rumus: Pertumbuhan DPK = Saldo Update − Saldo Awal. Dropdown Jenis Event & Status DPK.
2. `Template_Nasabah_Event_BSI.xlsx` — sheet DATA_NASABAH_EVENT (20 kolom).
   Rumus: Pertumbuhan DPK = Saldo Update − Setoran Awal. Dropdown Jenis Tabungan & Status Rekening.
3. `Template_Upload_Event_BSI.xlsx` — 3 sheet: DATA_EVENT, DATA_DPK_TENANT, DATA_NASABAH_EVENT.
4. `Template_Akuisisi_Transaksi_Event_BSI.xlsx` — sheet DATA_AKUISISI_TRANSAKSI (12 kolom).

## Desain seragam tiap template
Header hijau BSI (#00A39D) teks putih, font Arial, freeze pane header, filter aktif,
border halus, auto-width, format rupiah (#,##0) untuk saldo/setoran/nominal/sales,
format tanggal (dd-mmm-yyyy), dropdown data-validation, dan baris catatan di atas tabel:
"Isi data sesuai format. Jangan mengubah nama kolom agar upload ke dashboard berhasil."

## Cara kerja generate
`downloadTemplate(key)` memanggil `TEMPLATES[key].build()` yang membangun workbook
ExcelJS di memori browser, lalu `wb.xlsx.writeBuffer()` → Blob → link `<a download>`
diklik otomatis. Tidak ada file statis di server; file dibuat on-demand di klien.

## Cara testing download
1. `npm install` (menarik exceljs).
2. `npm run dev` → login → menu "Upload Excel".
3. Klik salah satu tombol Download. Tombol berubah "Membuat…" lalu "Terunduh",
   dan file .xlsx tersimpan di folder download browser.
4. Buka file: cek header hijau, dropdown, kolom Pertumbuhan DPK berisi rumus.
