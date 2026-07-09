# Sesi 8 — Export Excel, Download Data & Laporan Event

## File dibuat/diubah
- `src/services/excelExport.js` — DIPERLUAS jadi pusat export: 9 jenis download +
  workbook dashboard 7 sheet. Mandiri (hitung metrik dari objek event) & anti [object Object].
- `src/pages/Report.jsx` — DIUBAH jadi Export Center dengan semua tombol download nyata.
- Tetap dipakai: EventDatabase (export hasil filter tabel) & EventDetail (export per event)
  sudah memanggil excelExport; Overview export filter dashboard via utils/exportExcel.js.

## Cara export bekerja
Semua export dibuat di browser dengan ExcelJS: data diambil dari database (eventService.
getEvents / getRecords / getEvent), disusun jadi workbook berstyle BSI (header hijau, border,
freeze pane, filter aktif, format rupiah #,##0, tanggal dd-mmm-yyyy, auto width), lalu
di-download sebagai Blob .xlsx. Nilai dibersihkan: null/undefined -> kosong, objek -> string
(anti [object Object]), CIF & rekening ditulis sebagai teks (numFmt '@') agar nol depan aman.

## Jenis export yang aktif
1. Download seluruh database — exportRecords(records)
2. Download per event — exportEventReport (di Report & tombol Export Detail di halaman Detail)
3. Download data tenant — exportTenants
4. Download data nasabah — exportNasabah
5. Download data pembiayaan & transaksi — exportFinancing
6. Download ringkasan dashboard — exportDashboardSummary
7. Download hasil filter aktif — tombol di Overview (filter dashboard) & Database Event (filter tabel)
8. Download template kosong — downloadTemplate (4 template)
9. Download laporan event lengkap / dashboard lengkap — exportFullDashboard (7 sheet)

## Workbook dashboard lengkap (7 sheet)
Ringkasan Dashboard · Data Event · Data DPK Tenant · Data Nasabah Event ·
Transaksi QRIS & EDC · Pembiayaan · Insight Efektivitas Event.
Sheet Ringkasan: total event, budget, DPK, pertumbuhan, akuisisi rekening & pembiayaan,
transaksi QRIS+EDC, sales volume, rasio & status efektivitas, tanggal export.
Sheet Insight: nama event, budget, total DPK, pertumbuhan, rasio, status, catatan insight.

## Cara testing export
1. `npm install && vercel dev` -> login -> upload/input beberapa event + data.
2. Menu Report & Export:
   - Klik "Laporan Dashboard Lengkap" -> file 7 sheet terunduh.
   - Klik Ringkasan / Database / Tenant / Nasabah / Pembiayaan -> masing-masing file.
   - Pilih event di "Export Per Event" -> laporan 1 event.
   - Klik template kosong -> template resmi.
3. Filter-aware: buka Overview, aktifkan filter, klik Export -> hanya data terfilter.
   Buka Database Event, cari/ filter, klik Download Excel -> hanya baris terfilter.
4. Buka file di Excel: cek header hijau, freeze, filter, rupiah, CIF nol depan utuh,
   tidak ada [object Object] / undefined.
