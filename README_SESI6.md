# Sesi 6 — Dashboard Overview, Card Metric, Chart & Filter

Dashboard utama sekarang mengambil data **langsung dari database** (`/api/events?overview=1`
→ Supabase). Tidak ada angka dummy. Bila belum ada event, tampil empty state:
> "Belum ada data event. Silakan upload Excel atau input event baru."

## File dibuat / diubah

Baru:
- `src/utils/dashboard.js` — mesin data client: `enrichEvent`, `buildFilterOptions`,
  `applyFilters`, `aggregate`, dan 6 builder chart. Semua perhitungan dari event mentah.
- `src/utils/exportExcel.js` — export **hasil filter** ke `.xlsx` (ExcelJS di browser):
  sheet Ringkasan (KPI) + Detail Event.
- `src/components/FilterBar.jsx` — filter global (10 dimensi) yang bisa dilipat.

Diubah:
- `src/pages/Overview.jsx` — ditulis ulang jadi dashboard penuh (hero, 8 KPI, highlight,
  6 chart, tabel detail, riwayat upload, last update, export). Versi lama disimpan konsep-nya.
- `src/services/metrics.js` & `api/_lib/metrics.js` — tambah **single source of truth**
  klasifikasi: `classifyEfektivitas()`, `dpkStatusOf()`, `EFEKTIVITAS`, `EFEKTIVITAS_THRESHOLDS`.

## Sumber data tiap CARD

| Card | Sumber |
|---|---|
| Total Event | jumlah baris event terfilter |
| Total Budget Event | Σ `events.budget_event` (`event.cost`) |
| Total DPK Event | Σ DPK Tenant + Σ DPK Nasabah (per akun: `saldo_update` bila terisi, else `saldo_awal`/`setoran_awal`) |
| Total Pertumbuhan DPK | Σ `metrics.growthAmount` = Σ (update−awal) tenant + nasabah |
| Total Akuisisi Rekening | Σ (jumlah baris `tenant_accounts` + `nasabah_event_accounts`) |
| Total Akuisisi Pembiayaan | Σ `financing_transactions.jumlah_pembiayaan`; caption: Σ `nominal_pembiayaan` |
| Total Transaksi QRIS + EDC | Σ `jumlah_transaksi_qris` + `jumlah_transaksi_edc` |
| Sales Volume QRIS + EDC | Σ `sales_volume_qris` + `sales_volume_edc` |
| Rasio Efektivitas | Σ Cost ÷ Σ Pertumbuhan DPK. Jika Δ DPK ≤ 0 → "Data belum cukup" |

Hero band menampilkan: Total Event · Total DPK · Pertumbuhan DPK · Akuisisi Rekening ·
Total Transaksi · Rasio Efektivitas.

**Status Efektivitas** (`classifyEfektivitas`, ambang dapat disetel di `metrics.js`):
- `rasio < 0.3` → Sangat Efektif · `0.3 ≤ rasio ≤ 1.0` → Cukup Efektif ·
  `rasio > 1.0` → Kurang Efektif · `Δ DPK ≤ 0` → Perlu Evaluasi.

## Sumber data tiap CHART

1. **Cost vs DPK** — bar per event: `cost` vs `dpkEvent` (merah bila Δ DPK ≤ 0).
2. **Tren Pertumbuhan DPK per Bulan** — area, agregasi Δ DPK per bulan `tanggal_mulai`.
3. **Akuisisi Rekening per Event** — bar bertumpuk: NOA tenant vs nasabah.
4. **QRIS vs EDC** — pie: total `jumlah_transaksi_qris` vs `edc`.
5. **Sales Volume** — bar bertumpuk per event: `sales_volume_qris` vs `edc`.
6. **Distribusi Efektivitas** — bar horizontal: jumlah event per kategori efektivitas.

Semua chart (Recharts): tooltip kustom, legend, format rupiah, animasi load, ikut filter.
Chart per-event dibungkus scroll horizontal (`ScrollChart`) → **tidak pecah saat event banyak**.

## Cara filter bekerja

Filter global (`FilterBar`): Tahun · Semester · Bulan · Nama Event · Jenis Event ·
Provinsi · Kota · Status DPK · Status Efektivitas · Jenis Tabungan.
Opsi filter dibangun dari data nyata (`buildFilterOptions`). Saat filter berubah,
`applyFilters` menyaring baris → `aggregate` menghitung ulang → **card, chart, tabel, dan
export semuanya memakai hasil filter yang sama**. Semester/Bulan/Tahun diturunkan dari
`tanggal_mulai`; Status DPK & Efektivitas diturunkan per event; Jenis Tabungan mencocokkan
event yang punya minimal satu nasabah dengan tabungan tsb.

## Cara testing dengan data upload

1. `npm install && vercel dev` (butuh `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`; jalankan
   `schema.sql` di Supabase lebih dulu).
2. Login → dashabord kosong menampilkan empty state (bukan angka palsu).
3. **Input Event Baru** untuk 1–2 event, atau **Upload Excel** (`sample_templates/*.xlsx`,
   kolom Nama Event harus sama agar data menempel).
4. Kembali ke **Overview**: card/chart/tabel terisi dari data asli; "Riwayat Upload Terbaru"
   dan "Last update data" muncul.
5. Buka **Filter Global**, ubah beberapa filter → semua angka & grafik ikut berubah.
6. Klik **Export Hasil Filter** → unduh `.xlsx` berisi ringkasan + detail sesuai filter.

## Keterbatasan (jujur)

- **Tren DPK per Bulan bukan time-series saldo.** Skema tidak menyimpan histori saldo
  bulanan (`buildSnapshotFromUpdates` hanya membuat 1 snapshot "terkini"). Chart ini adalah
  agregasi *pertumbuhan* DPK per bulan berdasarkan tanggal mulai event. Untuk tren saldo
  sesungguhnya perlu tabel histori snapshot (mis. `dpk_snapshots(event_id, tanggal, saldo)`).
- **Ambang efektivitas (0.3 / 1.0) adalah asumsi bisnis**, bukan aturan resmi — sesuaikan di
  `EFEKTIVITAS_THRESHOLDS` bila tim menetapkan angka lain.
- Export berjalan penuh di browser (ExcelJS sudah ada di bundle sejak Sesi 4); belum ada
  endpoint export server-side.
