# Sesi 9 — Manajemen Data, Edit, Delete, Reset & Riwayat Upload

## File dibuat/diubah
Baru:
- `api/records/[id].js` — edit/hapus satu baris rekening (tenant/nasabah/financing).
- `api/reset.js` — reset seluruh data (butuh konfirmasi 'RESET').
- `schema_sesi9.sql` — migrasi kolom upload_history.uploaded_by (audit user).
- `src/components/Modal.jsx` — Modal & ConfirmModal bersama (reusable).
- `src/pages/DataManagement.jsx` — halaman manajemen: ringkasan, riwayat upload, zona reset.

Diubah:
- `api/upload.js` — catat uploaded_by (username dari JWT) di riwayat.
- `api/_lib/db.js` — sertakan id pada tenant & nasabah (agar bisa diedit/hapus).
- `src/services/eventDataService.js` — recordService (updateRecord/deleteRecord/resetAll).
- `src/pages/EventDetail.jsx` — edit/hapus baris tenant & nasabah + pakai Modal bersama.
- `src/App.jsx`, `src/components/Sidebar.jsx` — menu & route "Manajemen Data".

## Cara edit data
- Edit event: halaman Detail Event -> tombol Edit -> modal berisi data lama -> simpan (PUT /api/events/[id]) -> dashboard refresh.
- Edit rekening tenant/nasabah: Detail Event -> ikon pensil pada baris tabel -> modal terisi data lama -> simpan (PUT /api/records/[id]?kind=...). Status DPK tenant dihitung ulang otomatis.
- Validasi field tetap berjalan; CIF & rekening tetap teks (nol depan aman).

## Cara hapus data
- Hapus event: Detail Event -> Hapus -> konfirmasi "Apakah Anda yakin ingin menghapus data ini?..." -> DELETE /api/events/[id]. Data tenant/nasabah/transaksi ikut terhapus (cascade) sehingga tidak ada orphan.
- Hapus 1 rekening: ikon tempat sampah pada baris -> konfirmasi -> DELETE /api/records/[id]?kind=...
- Semua hapus memerlukan konfirmasi; tidak ada hapus langsung.

## Cara reset data
Menu Manajemen Data -> Zona Bahaya -> Reset Data -> modal serius: ketik RESET
untuk mengaktifkan tombol -> POST /api/reset { confirm: 'RESET' } menghapus semua
event, rekening, transaksi, dan riwayat. Akun login TIDAK terhapus.

## Cara riwayat upload bekerja
Setiap upload (Sesi 4) menulis 1 baris ke upload_history: nama file, jenis, tanggal,
total baris, berhasil, gagal, status (Sukses/Sebagian/Gagal/Diproses), catatan error,
dan user pengupload (uploaded_by dari JWT). Halaman Manajemen Data menampilkan tabel
riwayat lengkap + kartu "Update Terakhir".

## Cara testing
1. Jalankan migrasi: buka Supabase SQL Editor -> tempel schema_sesi9.sql -> Run.
2. `npm install && vercel dev` -> login.
3. Edit: Detail Event -> Edit event & edit baris tenant/nasabah -> cek dashboard update.
4. Hapus: hapus 1 baris rekening, lalu hapus 1 event -> cek konfirmasi & data hilang.
5. Riwayat: menu Manajemen Data -> lihat tabel riwayat + kolom User.
6. Reset: Zona Bahaya -> ketik RESET -> semua data terhapus, riwayat kosong.

## Catatan
- uploaded_by hanya terisi untuk upload SETELAH migrasi dijalankan.
- Reset tidak menghapus akun login (users), hanya data dashboard.
