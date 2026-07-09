# ISE BSI — Event Monitoring Dashboard

Dashboard internal untuk memonitor hasil event ISE BSI (efektivitas DPK, akuisisi
rekening, transaksi QRIS/EDC, pembiayaan). **Semua angka dihitung dari data asli
yang di-upload/di-input — tidak ada data dummy.**

Stack: React 18 + Vite + Tailwind (frontend) · Vercel Serverless Functions (`/api`) ·
Supabase/PostgreSQL (database) · ExcelJS (parse & export) · JWT + bcrypt (auth).

> Arsitektur penting: **browser tidak pernah mengakses Supabase langsung.** Semua
> baca/tulis lewat `/api/*`. Kredensial database & JWT hanya ada di server.

---

## 1. Menjalankan aplikasi secara lokal

```bash
npm install
cp .env.example .env        # lalu isi nilainya (lihat bagian 2)
npm run dev                 # http://localhost:5173
```

Catatan: `npm run dev` menjalankan **frontend saja**. Endpoint `/api/*` adalah
Vercel Functions dan tidak berjalan di bawah Vite. Untuk menguji alur penuh
(login, upload, dsb.) secara lokal, gunakan Vercel CLI:

```bash
npm i -g vercel
vercel dev                  # menjalankan frontend + /api sekaligus
```

Build produksi & preview:

```bash
npm run build               # output ke dist/
npm run preview
```

---

## 2. Environment variable

Prefix `VITE_` = di-expose ke browser. Tanpa prefix = **server-only** (hanya `/api`).

| Variable | Wajib | Keterangan |
|---|---|---|
| `SUPABASE_URL` | ✅ | URL project Supabase (server-only). |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | **Service role key — RAHASIA.** Jangan pakai prefix `VITE_`. |
| `JWT_SECRET` | ✅ | String acak ≥32 karakter untuk menandatangani sesi login. **Jika kosong, kode memakai fallback publik dan token bisa dipalsukan — WAJIB diisi.** |
| `SEED_TOKEN` | ✅* | Token sekali-pakai untuk membuat akun admin via `/api/auth/seed`. Tidak wajib jika Anda seed via SQL. |
| `VITE_APP_NAME` | ➖ | Opsional; nama app di header/login. |

ANON key Supabase **tidak diperlukan** (browser tidak akses Supabase langsung).

---

## 3. Setup database (Supabase)

1. Buat project di https://supabase.com.
2. Ambil `SUPABASE_URL` dan `service_role key` dari **Project Settings → API**.
3. Isi ke `.env` (lokal) dan ke Environment Variables Vercel (produksi).

## 4. Membuat tabel

Buka **Supabase → SQL Editor → New query**, jalankan berurutan:

1. Isi seluruh `schema.sql` → **Run**. (Idempotent, aman diulang, tanpa dummy.)
2. Isi `schema_sesi9.sql` → **Run**. (Migrasi kolom audit `uploaded_by` + index.)

Tabel yang dibuat: `users`, `events`, `tenant_accounts`, `nasabah_event_accounts`,
`financing_transactions`, `upload_history` (nama sesuai `schema.sql`).

## 5. Login

Buat akun admin dulu (tidak ada akun default):

**Cara A — script hash + SQL (disarankan):**
```bash
npm run hash <username> <password_kuat>
# tempel output INSERT ... ke Supabase SQL Editor → Run
```

**Cara B — endpoint seed (butuh `SEED_TOKEN`):**
```bash
curl -X POST https://<domain>/api/auth/seed \
  -H "Content-Type: application/json" \
  -d '{"token":"<SEED_TOKEN>","username":"<user>","password":"<pass>"}'
```

Lalu login di halaman `/` memakai username + password tersebut. Sesi berlaku 8 jam
(JWT). Logout menghapus token dari browser.

## 6. Upload Excel

Menu **Manajemen Data → Upload Excel**. Tarik/drop file `.xlsx`/`.xls` (pakai
template resmi). Sistem mendeteksi jenis file otomatis (atau pilih manual),
memvalidasi, menampilkan ringkasan, lalu simpan ke database. File salah format
ditolak dengan pesan jelas. Mode: **append** (tambah) atau update saldo DPK.

## 7. Download template

Menu **Report & Export** → daftar template. Template sudah berformat rapi
(header hijau BSI, dropdown, kolom **No CIF & No Rekening dipaksa format teks**
agar nol depan tidak hilang).

## 8. Export data

Menu **Report & Export**: ekspor laporan lengkap (multi-sheet), ringkasan,
database, tenant, nasabah, atau pembiayaan. Di **Overview** ada "Export Hasil
Filter" yang mengekspor tepat sesuai filter aktif. Semua output `.xlsx` bisa
diedit manual di Excel.

## 9. Deploy ke Vercel

1. Push repo ke GitHub.
2. Vercel → **New Project** → import repo. Framework: **Vite** (auto).
   Build command `npm run build`, output `dist` (default terbaca).
3. **Project Settings → Environment Variables:** isi `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `SEED_TOKEN` (+ `VITE_APP_NAME` opsional).
4. Deploy. `vercel.json` sudah mengatur rewrite: `/api/*` → functions, selain itu
   → `index.html` (SPA routing).
5. Setelah deploy pertama, buat akun admin (bagian 5), lalu login.

> Jika deploy "berhasil" tapi login/data error → hampir selalu **env belum diisi**
> atau **tabel belum dibuat**. Cek Environment Variables & jalankan `schema.sql`.

## 10. Catatan teknis

- **Uang** disimpan `NUMERIC` di DB; format tampilan `id-ID` (Rp, ribuan titik,
  desimal koma). Nilai kosong tampil `—`, bukan `NaN`/`undefined`.
- **CIF/Rekening** selalu `TEXT` (DB), dibaca sebagai string (parser), diekspor
  dengan format teks `@` (export) — nol depan aman di seluruh alur.
- `tenant_accounts.pertumbuhan_dpk` adalah kolom **GENERATED** (`saldo_update -
  saldo_awal`), tidak diisi manual.
- Motion/animasi: **CSS + requestAnimationFrame saja**, tanpa Three.js/Lottie/
  Framer/ECharts. Hormati `prefers-reduced-motion`.
- Semua endpoint `/api` (kecuali `/auth/login` & `/auth/seed`) dilindungi
  `requireAuth` (JWT). Reset data butuh konfirmasi ketik `RESET` + verifikasi server.
- **Peringatan keamanan:** set `JWT_SECRET` yang kuat di produksi. Tanpa itu, kode
  memakai secret fallback publik dan token sesi dapat dipalsukan.
