# Sesi 4 — Upload Excel, Validasi, Parsing, Simpan ke Database

## File dibuat/diubah
Baru:
- `src/services/excelParser.js` — baca+deteksi+validasi+parse Excel di browser (5 jenis).
- `src/components/UploadPanel.jsx` — UI upload: drag-drop, pilih jenis, preview, ringkasan, simpan.
- `api/upload.js` — simpan data terparse ke Supabase (find-or-create event, append/overwrite) + upload_history.
- `api/upload-history.js` — GET riwayat upload.

Diubah:
- `src/pages/UploadExcel.jsx` — pasang UploadPanel (ganti placeholder).
- `src/services/eventDataService.js` — tambah uploadService (save + history).
- `src/App.jsx` — refresh dashboard otomatis setelah upload (dataVersion).

## 5 jenis upload
1. DPK Tenant (sheet DATA_DPK_TENANT)
2. Nasabah Event (sheet DATA_NASABAH_EVENT)
3. Gabungan Event (3 sheet → events + tenant + nasabah)
4. Akuisisi & Transaksi (sheet DATA_AKUISISI_TRANSAKSI)
5. DPK Update (cocokkan No Rekening/CIF → update Saldo Update)

## Alur upload
File dipilih → parseExcel() di browser membaca workbook (ExcelJS), deteksi jenis via
nama sheet (atau dipilih manual), validasi sheet & kolom wajib, bersihkan angka rupiah,
jaga CIF/rekening sebagai string (nol depan aman), baca tanggal, hitung Pertumbuhan DPK
& Status DPK → tampilkan preview + ringkasan (baris terbaca/valid/gagal/peringatan) →
klik "Simpan ke Database" → POST /api/upload → Supabase (server, service role) →
catat upload_history → dashboard refresh otomatis.

## Validasi
- Ekstensi .xlsx/.xls; file rusak ditolak.
- Nama sheet & kolom wajib dicek → pesan: "Kolom X tidak ditemukan. Pastikan file
  menggunakan template resmi dashboard."
- Nama Event kosong = baris gagal; rekening kosong/duplikat = peringatan.
- CIF & rekening tidak kehilangan nol depan (dibaca sebagai string).
- Saldo diparse ke angka; tanggal divalidasi.

## Data masuk database
- Event dicocokkan by nama_event (case-insensitive). Belum ada → dibuat; sudah ada →
  dipakai (mode append) atau data lama event dihapus dulu (mode overwrite).
- DPK Update tidak menghapus data; hanya update saldo_update lalu status_dpk dihitung ulang.
- Semua tulis via server Supabase (bukan localStorage).

## Testing dengan template
1. `npm install && vercel dev` (agar /api aktif).
2. Login → menu Upload Excel → Download "Template Gabungan Event".
3. Isi data (atau pakai contoh `test_gabungan_filled.xlsx`).
4. Drag file ke area upload → cek preview & ringkasan → "Simpan ke Database".
5. Buka Overview/Events → data muncul, rasio efektivitas terhitung.

## Batasan
- Preview menampilkan maks 5 baris per kelompok (ringkas).
- DPK Update mencocokkan berdasarkan rekening/CIF global (bukan per-event).
- Insert baris dilakukan satu per satu (aman untuk ratusan baris; ribuan baris akan
  lebih lambat — bisa dioptimasi batch di sesi mendatang).
