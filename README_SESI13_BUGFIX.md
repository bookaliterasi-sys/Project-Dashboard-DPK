# Sesi 13 — Analisis Kualitas & Perbaikan Bug Kritis Upload

## Ringkasan temuan
Anda melaporkan: file yang sudah diisi data tetap "ditolak" saat diupload.
Root cause **ditemukan dan dibuktikan** (bukan dugaan) di `src/services/excelTemplates.js`.

## Bug kritis: formula phantom di baris kosong template
**Sebelum perbaikan:** Kolom "Pertumbuhan DPK (Rp)" pada Template DPK Tenant dan
Template Nasabah Event diisi rumus Excel (`=M{r}-L{r}`) di **ke-30 baris kosong**
template sejak awal dibuat — sebelum staf mengisi apa pun.

Dibuktikan langsung dari file:
```
Baris 3 (belum diisi user):
  Kolom lain: None (kosong, benar)
  Kolom Pertumbuhan DPK: '=M3-L3'   <- ADA RUMUS, padahal baris kosong
```

**Dampak:** `readSheet()` di `excelParser.js` mendeteksi baris "ada isinya" dari
keberadaan objek rumus tsb (bukan dari nilai nyata). Jadi kalau staf hanya isi
3 baris dari 30 baris template, sistem membaca 30 baris, 27 di antaranya
dianggap "berisi data" tapi kolom Nama Event-nya kosong -> 27 pesan error palsu
"Nama Event kosong" -> tombol Simpan ke Database dinonaktifkan -> **file terasa
ditolak**, padahal data yang diisi user sendiri sebenarnya valid.

**Setelah perbaikan (dua lapis):**
1. `excelTemplates.js` — baris kosong template TIDAK lagi diisi rumus/nilai apa
   pun; kolom Pertumbuhan DPK jadi murni referensi visual (dihitung ulang
   otomatis oleh sistem setelah data masuk database, seperti sebelumnya).
2. `excelParser.js` — `readSheet()` diperkuat untuk mengabaikan sel bertipe
   rumus saat mendeteksi "baris ada isi", sebagai lapis pertahanan kedua jika
   suatu saat ada kolom rumus lain ditambahkan.

**Dibuktikan dengan simulasi nyata:** isi 3 dari 30 baris pada template yang
sudah diperbaiki -> sistem membaca tepat 3 baris, 0 error palsu, tombol Simpan
aktif. (Sebelumnya: 30 baris terbaca, 27 error, tombol nonaktif.)

Template yang terdampak: **Template DPK Tenant** dan **Template Nasabah Event**.
Template Gabungan Event dan Template Akuisisi & Transaksi tidak pernah punya
kolom rumus ini, jadi tidak terdampak.

## Soal "kenapa template banyak"
Bukan bug — memang didesain modular:
- **Template Gabungan Event** = cukup ini saja untuk mulai (event + tenant + nasabah, 3 sheet dalam 1 file).
- Template DPK Tenant / Nasabah Event / Akuisisi & Transaksi = opsional, untuk
  input terpisah per bagian atau update data yang sudah ada.

Perbaikan UX yang ditambahkan:
- Card "Template Gabungan Event" kini ditandai badge **"Mulai di sini"**.
- Deskripsi tiap template diperjelas mana yang **opsional**.
- Dropdown "Excel DPK Update" di halaman upload diberi keterangan
  "(pakai file Template DPK Tenant / Nasabah)" karena memang tidak ada
  template terpisah untuknya — reuse template yang sudah ada.

## File yang diubah
- `src/services/excelTemplates.js` — hapus prefill rumus (SUMBER BUG).
- `src/services/excelParser.js` — perkuat deteksi baris kosong (defense in depth).
- `src/components/UploadPanel.jsx` — perjelas label dropdown DPK Update.
- `src/pages/UploadExcel.jsx` — badge rekomendasi + deskripsi opsional/wajib.
- `sample_templates/*.xlsx` — regenerasi ulang, diverifikasi bersih dari bug.

## Audit kualitas menyeluruh (area lain yang dicek)
| Area | Status |
|---|---|
| Konsistensi rumus efektivitas client vs server (`services/metrics.js` vs `api/_lib/metrics.js`) | ✅ Identik, sengaja dijaga sinkron |
| `utils/dashboard.js` (Overview) vs `services/metrics.js` | ✅ dashboard.js mengimpor `classifyEfektivitas` dari metrics.js — tidak duplikasi logika |
| Dependency vs import (package.json) | ✅ Semua import punya dependency yang sesuai |
| Sisa TODO/FIXME/console.log | ✅ Bersih |
| Auth (JWT + bcrypt) | ✅ Solid, terpisah client/server dengan benar |
| Struktur file (banyak README per sesi) | ⚠️ Minor — bisa digabung jadi 1 README nanti, tidak mempengaruhi fungsi |

## Cara testing perbaikan
1. `npm install && vercel dev`.
2. Download **Template DPK Tenant** dari halaman Upload Excel (versi baru).
3. Isi HANYA 2-3 baris data (jangan isi semua 30 baris).
4. Upload kembali -> seharusnya tidak ada lagi error "Nama Event kosong" untuk
   baris yang tidak Anda isi. Ringkasan "Baris terbaca" akan sesuai jumlah yang
   benar-benar Anda isi.
5. Tombol "Simpan ke Database" aktif dan data masuk ke dashboard.
