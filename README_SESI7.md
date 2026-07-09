# Sesi 7 — Database Event, Detail Event & Tabel Interaktif

## File dibuat/diubah
Baru:
- `api/records.js` — data ter-flatten (1 baris = 1 rekening + info event + akuisisi).
- `src/pages/EventDatabase.jsx` — tabel database interaktif (search, filter, sort, pagination, export).
- `src/pages/EventDetail.jsx` — halaman detail event + edit/hapus/export/update Excel.
- `src/services/excelExport.js` — export tabel database & detail event ke Excel berstyle BSI.

Diubah:
- `src/App.jsx` — route 'database' & 'detail' + state selectedEventId (navigate(id, eventId)).
- `src/components/Sidebar.jsx` — menu "Database Event".
- `src/services/eventDataService.js` — eventService.getRecords().
- `src/pages/Events.jsx` — baris klik membuka detail.
- `src/components/ui.jsx` — warna StatusBadge untuk status DPK & efektivitas.

## Cara database event bekerja
GET /api/records menggabungkan tabel events + tenant_accounts + nasabah_event_accounts +
financing_transactions menjadi baris datar. Tiap baris berisi info event, data rekening
(tenant/nasabah), pertumbuhan DPK, status DPK, serta akuisisi (QRIS/EDC/pembiayaan) event.
Semua dari database — tanpa dummy.

## Cara detail event bekerja
GET /api/events/[id] (assembleEvent) mengembalikan 1 event lengkap + metrics. Halaman
menampilkan info umum, 12+ metrik ringkas (DPK tenant/nasabah/total, pertumbuhan, akuisisi
rekening/pembiayaan, QRIS/EDC, rasio & status efektivitas), tabel rekening tenant, tabel
rekening nasabah, dan pembiayaan/transaksi. Tombol: Export Detail (Excel 3 sheet), Edit
(modal → PUT /api/events/[id]), Update Excel (ke halaman Upload), Hapus (konfirmasi →
DELETE /api/events/[id], cascade).

## Cara table mengambil data
useServiceData(eventService.getRecords) memuat sekali, lalu search/filter/sort/pagination
diproses di client (instan, responsif). Sort kolom (klik header) & sort dropdown (DPK/
pertumbuhan/budget). Export memakai hasil filter terkini (bukan seluruh data).

## Cara testing search/filter/sort/pagination
1. `npm install && vercel dev` → login → menu Database Event.
2. Search: ketik nama/CIF/rekening/kota → tabel menyaring seketika.
3. Filter: pilih Event/Jenis/Provinsi/Kota/Status DPK/Tabungan/Tanggal.
4. Sort: klik header "Nama Event/Saldo Update/Pertumbuhan" atau dropdown "Urut".
5. Pagination: 12 baris/halaman, navigasi angka & panah.
6. Download Excel → file hasil filter.
7. Klik baris → halaman Detail Event → coba Edit/Hapus/Export.

## Catatan
- Semua interaksi tabel client-side agar cepat; untuk data sangat besar (puluhan ribu
  baris) bisa dipindah ke server-side pagination di masa depan.
- Kolom lengkap sesuai spesifikasi tersedia di export Excel; tampilan tabel menampilkan
  kolom utama agar tetap terbaca, sisanya ada di detail & export.
