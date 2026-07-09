# Sesi 5 — Input Event Baru & Form Dinamis

## File dibuat/diubah
Baru:
- `src/components/FormFields.jsx` — field reusable: TextField, TextArea, SelectField,
  DateField, RupiahField (format ribuan otomatis), NumberField.
- `src/pages/InputEvent.jsx` — form input event dinamis (ganti placeholder).

Sudah tersedia dari sesi sebelumnya (dipakai, tidak diubah):
- `eventService.createEvent()` -> POST /api/events -> Supabase.
- App.jsx sudah mem-pass onNavigate & onSaved ke halaman.

## Cara input event baru
1. Menu "Input Event Baru".
2. Isi Informasi Event: Nama (wajib), Jenis (dropdown), Budget (format Rupiah),
   Tanggal Mulai (wajib) & Selesai, Lokasi, Tag/Tema, Provinsi, Kota.
3. Field dinamis muncul otomatis:
   - Expo/Bazar -> Jumlah Tenant, Keterangan Tenant/Booth/Lokasi Tenant.
   - Private Event -> Nama Tenant/Brand Utama (wajib), Keterangan Brand/Event.
4. Catatan Event (keterangan dinamis otomatis digabung ke sini).
5. Tombol: Simpan Event · Simpan & Upload Excel · Reset Form · Batal.

## Validasi
- Nama Event, Jenis, Tanggal Mulai wajib.
- Tanggal selesai tidak boleh sebelum tanggal mulai.
- Private Event wajib punya Nama Tenant/Brand Utama.
- Budget diformat rupiah (disimpan sebagai angka murni).

## Cara data masuk database
Submit -> buildPayload() memetakan field form ke kolom events (nama_event,
jenis_event, tanggal_mulai/selesai, lokasi, provinsi, kota, instansi, tag_tema,
budget_event, jumlah_tenant, catatan) -> POST /api/events -> tabel events (Supabase).
Private Event: jumlah_tenant=1, brand utama disimpan ke kolom instansi.
Setelah sukses: notifikasi + event langsung muncul di dashboard (auto-refresh).

## Cara menghubungkan event dengan upload Excel
Event & data Excel dicocokkan berdasar Nama Event. Alur yang disarankan:
1. Buat event di sini -> klik "Simpan & Upload Excel" (diarahkan ke menu Upload).
2. Di Upload Excel, unggah file dengan kolom Nama Event yang SAMA -> data tenant/
   nasabah/akuisisi otomatis menempel ke event tsb (find-or-create by nama_event).

## Cara testing
1. `npm install && vercel dev`.
2. Login -> Input Event Baru -> isi form -> ganti Jenis Event, perhatikan field berubah.
3. Simpan Event -> muncul success -> cek menu Events/Overview, event baru tampil.
4. Coba "Simpan & Upload Excel" -> diarahkan ke Upload, unggah Excel dgn Nama Event sama.

## Batasan
- Provinsi/kota masih teks manual (belum master data), sesuai permintaan.
- Upload Excel per-field (rekening tenant/pengunjung/DPK update) memakai halaman
  Upload terpusat, bukan input file langsung di form — agar validasi & preview
  konsisten dengan Sesi 4.
