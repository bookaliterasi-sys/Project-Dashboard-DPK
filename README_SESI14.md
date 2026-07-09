# Sesi 14 — Parser Toleran + Fitur Batalkan Upload

Dua perbaikan sesuai keluhan: (A) file sudah pakai template tapi tetap ditolak
"Kolom Nama Event tidak ditemukan"; (B) belum ada cara membatalkan 1 upload.

## A. Parser dibuat TOLERAN (tidak kaku lagi)
Akar masalah: pencocokan nama kolom terlalu ketat (`.includes` sama-persis),
plus deteksi baris header yang mudah salah. Akibatnya perbedaan sepele bikin
file ditolak: spasi ekstra ("Nama Event "), spasi ganda ("Nama  Event"),
HURUF beda, non-breaking space, newline dalam header, atau baris catatan/kosong
di atas header.

Perbaikan di `src/services/excelParser.js`:
- `normalizeHeader()` — samakan spasi/kapital/karakter tak terlihat sebelum
  mencocokkan. "Nama Event ", "NAMA EVENT", "Nama\nEvent" -> dianggap sama.
- `readSheet()` menyediakan akses data lewat header ASLI maupun ternormalisasi,
  jadi walau header di file agak beda, `pick(row, 'Nama Event')` tetap ketemu.
- `findHeaderRow()` kini memilih baris header dengan skor kecocokan tertinggi
  (tahan terhadap baris catatan / baris kosong di atas header).
- `checkRequired()` memakai normalisasi; pesan error baru menyebut kolom yang
  BENAR-BENAR terbaca sistem, jadi kalau ada yang salah pun user tahu apa.
- `getSheet()` — nama sheet juga dicocokkan toleran (spasi/kapital).
- CIF & No Rekening tetap dijaga sebagai teks (nol depan tidak hilang).

Sudah diuji (mirror Python): semua variasi header yang dulu ditolak kini LOLOS,
data terbaca benar, dan file dengan baris catatan+kosong di atas header pun
terbaca dari baris header yang tepat.

## B. Fitur "Batalkan Upload"
Sekarang tiap baris data ditandai `upload_id` sehingga satu sesi upload bisa
dihapus utuh tanpa mengganggu data lain.

WAJIB dijalankan lebih dulu di Supabase SQL Editor:
  schema_sesi14_undo_upload.sql
(menambah kolom upload_id di tenant/nasabah/financing + created_by_upload_id di
events, semua idempotent & aman diulang.)

Perubahan:
- `api/upload.js` — buat baris riwayat DULU untuk dapat uploadId, lalu setiap
  insert ditandai upload_id. Event yang baru lahir dari upload ini ditandai
  `created_by_upload_id`. Ada fallback aman bila migrasi belum dijalankan
  (upload tetap berhasil, hanya penanda dilewati).
- `api/uploads/[id].js` (BARU) — DELETE membatalkan upload: hapus semua baris
  bertanda upload_id itu, bersihkan event yang jadi kosong & memang lahir dari
  upload tsb, lalu tandai riwayat "Dibatalkan". Kalau migrasi belum dijalankan,
  mengembalikan pesan jelas (bukan error mentah).
- `src/services/eventDataService.js` — `uploadService.cancel(id)`.
- `src/pages/DataManagement.jsx` — kolom "Aksi" + tombol "Batalkan" di tabel
  Riwayat Upload (muncul hanya untuk upload yang menambah data & berstatus
  Sukses/Sebagian), dengan modal konfirmasi. Status baru "Dibatalkan".

Catatan: upload jenis "DPK Update" tidak bisa dibatalkan lewat fitur ini karena
hanya memperbarui saldo, tidak menambah baris. (Riwayatnya tetap tercatat.)

## File berubah / baru
- src/services/excelParser.js        (parser toleran)
- api/upload.js                      (stamp upload_id)
- api/uploads/[id].js                (BARU: batalkan upload)
- src/services/eventDataService.js   (uploadService.cancel)
- src/pages/DataManagement.jsx       (tombol Batalkan + modal)
- schema_sesi14_undo_upload.sql      (BARU: migrasi, WAJIB dijalankan)

## Cara pakai fitur batalkan
1. Jalankan schema_sesi14_undo_upload.sql di Supabase (sekali saja).
2. Menu Manajemen Data -> tabel Riwayat Upload -> klik "Batalkan" pada baris
   upload yang salah -> konfirmasi. Data dari file itu terhapus, sisanya aman.
