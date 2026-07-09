import { useState } from 'react';
import {
  PlusCircle,
  Store,
  Building2,
  CheckCircle2,
  Loader2,
  Save,
  Upload,
  RotateCcw,
  X,
  Info,
} from 'lucide-react';
import { PageHeader, SectionCard } from '../components/ui';
import {
  TextField, TextArea, SelectField, DateField, RupiahField, NumberField,
} from '../components/FormFields';
import { eventService } from '../services/eventDataService';
import { formatRupiahFull } from '../utils/formatters';

const JENIS_OPTIONS = [
  { value: 'expo', label: 'Expo / Bazar' },
  { value: 'private', label: 'Private Event' },
];

const EMPTY = {
  nama: '', jenis: 'expo', tanggal: '', tanggalSelesai: '',
  lokasi: '', provinsi: '', kota: '', instansi: '', tagTema: '',
  cost: '', jumlahTenant: '', catatan: '',
  // field khusus
  namaTenantUtama: '',
  ketTenant: '', ketBooth: '', ketLokasiTenant: '',
  ketBrand: '', ketPrivate: '',
};

export default function InputEvent({ onNavigate, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);
  const [fatal, setFatal] = useState(null);

  const set = (key) => (val) => {
    setForm((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.nama.trim()) e.nama = 'Nama Event wajib diisi.';
    if (!form.jenis) e.jenis = 'Pilih jenis event.';
    if (!form.tanggal) e.tanggal = 'Tanggal mulai wajib diisi.';
    if (form.tanggal && form.tanggalSelesai && form.tanggalSelesai < form.tanggal) {
      e.tanggalSelesai = 'Tanggal selesai tidak boleh sebelum tanggal mulai.';
    }
    if (form.jenis === 'private' && !form.namaTenantUtama.trim()) {
      e.namaTenantUtama = 'Nama tenant/brand utama wajib diisi untuk Private Event.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildPayload = () => ({
    nama: form.nama.trim(),
    jenis: form.jenis,
    tanggal: form.tanggal || null,
    tanggalSelesai: form.tanggalSelesai || null,
    lokasi: form.lokasi.trim() || null,
    provinsi: form.provinsi.trim() || null,
    kota: form.kota.trim() || null,
    instansi: (form.jenis === 'private' ? form.namaTenantUtama : form.instansi).trim() || null,
    tagTema: form.tagTema.trim() || null,
    cost: form.cost || 0,
    jumlahTenant: form.jenis === 'expo' ? (form.jumlahTenant || 0) : 1,
    catatan: buildCatatan(),
  });

  // gabungkan keterangan dinamis ke dalam catatan agar tidak hilang
  const buildCatatan = () => {
    const extra = [];
    if (form.jenis === 'expo') {
      if (form.ketTenant) extra.push(`Tenant: ${form.ketTenant}`);
      if (form.ketBooth) extra.push(`Booth: ${form.ketBooth}`);
      if (form.ketLokasiTenant) extra.push(`Lokasi tenant: ${form.ketLokasiTenant}`);
    } else {
      if (form.ketBrand) extra.push(`Brand: ${form.ketBrand}`);
      if (form.ketPrivate) extra.push(`Private: ${form.ketPrivate}`);
    }
    const base = form.catatan.trim();
    return [base, ...extra].filter(Boolean).join(' | ') || null;
  };

  const submit = async (thenUpload) => {
    setFatal(null);
    if (!validate()) return;
    setSaving(true);
    try {
      const ev = await eventService.createEvent(buildPayload());
      setSaved(ev);
      onSaved?.();
      if (thenUpload) {
        onNavigate?.('upload');
      }
    } catch (err) {
      setFatal(err.message || 'Gagal menyimpan event.');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => { setForm(EMPTY); setErrors({}); setFatal(null); };

  // ---------- SUCCESS STATE ----------
  if (saved) {
    return (
      <div>
        <PageHeader title="Input Event Baru" microcopy="Event berhasil dibuat." />
        <SectionCard title="Event Tersimpan">
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center animate-fade-in">
            <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-500">
              <CheckCircle2 size={32} />
            </div>
            <p className="text-base font-bold text-slate-800">
              Event "{saved.nama}" berhasil disimpan dan sudah muncul di dashboard.
            </p>
            <p className="text-[13px] text-slate-500">
              {saved.jenis === 'expo' ? 'Expo / Bazar' : 'Private Event'}
              {saved.cost ? ` · Budget ${formatRupiahFull(saved.cost)}` : ''}
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <button onClick={() => onNavigate?.('upload')} className="btn-primary !py-2.5 text-[13px]">
                <Upload size={15} /> Upload Excel untuk event ini
              </button>
              <button onClick={() => onNavigate?.('events')} className="btn-secondary !py-2.5 text-[13px]">
                Lihat daftar event
              </button>
              <button onClick={() => { setSaved(null); reset(); }} className="btn-secondary !py-2.5 text-[13px]">
                <PlusCircle size={15} /> Buat event lagi
              </button>
            </div>
          </div>
        </SectionCard>
      </div>
    );
  }

  const isExpo = form.jenis === 'expo';

  return (
    <div>
      <PageHeader
        title="Input Event Baru"
        microcopy="Isi detail event. Field tambahan muncul otomatis sesuai jenis event yang dipilih."
      />

      {/* Informasi Utama */}
      <SectionCard title="Informasi Event" subtitle="Data dasar event" action={<PlusCircle size={16} className="text-bsi-500" />}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <TextField label="Nama Event" value={form.nama} onChange={set('nama')} required
              placeholder="mis. Expo UMKM Depok 2026" error={errors.nama} />
          </div>
          <SelectField label="Jenis Event" value={form.jenis} onChange={set('jenis')} required
            options={JENIS_OPTIONS} helper="Menentukan field tambahan di bawah." error={errors.jenis} />
          <RupiahField label="Cost / Budget Event" value={form.cost} onChange={set('cost')}
            helper="Dipakai menghitung rasio efektivitas." error={errors.cost} />
          <DateField label="Tanggal Mulai" value={form.tanggal} onChange={set('tanggal')} required error={errors.tanggal} />
          <DateField label="Tanggal Selesai" value={form.tanggalSelesai} onChange={set('tanggalSelesai')} error={errors.tanggalSelesai} />
          <TextField label="Lokasi Event" value={form.lokasi} onChange={set('lokasi')} placeholder="mis. Balai Kota" />
          <TextField label="Tag / Tema Event" value={form.tagTema} onChange={set('tagTema')} placeholder="mis. UMKM, Ramadhan" />
          <TextField label="Provinsi" value={form.provinsi} onChange={set('provinsi')} placeholder="mis. Jawa Barat" helper="Teks manual." />
          <TextField label="Kota" value={form.kota} onChange={set('kota')} placeholder="mis. Depok" helper="Teks manual." />
          {isExpo && (
            <TextField label="Nama Instansi / Organisasi / Brand" value={form.instansi} onChange={set('instansi')} placeholder="mis. Pemkot Depok" />
          )}
        </div>
      </SectionCard>

      {/* Field dinamis */}
      <div className="mt-4 animate-fade-in-up">
        {isExpo ? (
          <SectionCard
            title="Detail Expo / Bazar"
            subtitle="Event dengan banyak tenant/booth"
            action={<Store size={16} className="text-bsi-500" />}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <NumberField label="Jumlah Tenant" value={form.jumlahTenant} onChange={set('jumlahTenant')}
                placeholder="mis. 20" helper="Perkiraan jumlah tenant/booth." />
              <TextField label="Keterangan Tenant" value={form.ketTenant} onChange={set('ketTenant')} placeholder="mis. UMKM kuliner & fashion" />
              <TextField label="Keterangan Booth" value={form.ketBooth} onChange={set('ketBooth')} placeholder="mis. 3x3 m, listrik tersedia" />
              <TextField label="Keterangan Lokasi Tenant" value={form.ketLokasiTenant} onChange={set('ketLokasiTenant')} placeholder="mis. Zona A lantai 1" />
            </div>
            <UploadHint />
          </SectionCard>
        ) : (
          <SectionCard
            title="Detail Private Event"
            subtitle="Event dengan satu tenant/brand utama, pengunjung tetap bisa banyak"
            action={<Building2 size={16} className="text-bsi-500" />}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <TextField label="Nama Tenant / Brand Utama" value={form.namaTenantUtama} onChange={set('namaTenantUtama')} required
                  placeholder="mis. Brand Fashion X" error={errors.namaTenantUtama} />
              </div>
              <TextField label="Keterangan Brand" value={form.ketBrand} onChange={set('ketBrand')} placeholder="mis. brand lokal fashion muslim" />
              <TextField label="Keterangan Event Private" value={form.ketPrivate} onChange={set('ketPrivate')} placeholder="mis. gathering komunitas" />
            </div>
            <UploadHint />
          </SectionCard>
        )}
      </div>

      {/* Catatan */}
      <div className="mt-4">
        <SectionCard title="Catatan Event">
          <TextArea label="Catatan" value={form.catatan} onChange={set('catatan')}
            placeholder="Catatan tambahan tentang event…" helper="Keterangan di atas otomatis digabung ke catatan." />
        </SectionCard>
      </div>

      {fatal && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-[13px] font-medium text-red-600 ring-1 ring-red-100">
          <X size={16} /> {fatal}
        </div>
      )}

      {/* Aksi */}
      <div className="sticky bottom-0 mt-5 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white/90 p-3 backdrop-blur">
        <button onClick={() => submit(false)} disabled={saving} className="btn-primary !py-2.5 text-[13px] disabled:opacity-60">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Simpan Event
        </button>
        <button onClick={() => submit(true)} disabled={saving} className="btn-secondary !py-2.5 text-[13px] disabled:opacity-60">
          <Upload size={15} /> Simpan &amp; Upload Excel
        </button>
        <button onClick={reset} disabled={saving} className="btn-secondary !py-2.5 text-[13px] disabled:opacity-60">
          <RotateCcw size={14} /> Reset Form
        </button>
        <button onClick={() => onNavigate?.('overview')} disabled={saving} className="ml-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-slate-500 transition hover:bg-slate-100">
          Batal
        </button>
      </div>
    </div>
  );
}

function UploadHint() {
  return (
    <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-bsi-50/70 px-3.5 py-3 text-[12px] leading-relaxed text-bsi-800 ring-1 ring-bsi-100">
      <Info size={15} className="mt-0.5 shrink-0 text-bsi-500" />
      <span>
        Upload rekening tenant, hasil event/pengunjung, dan DPK update dilakukan di menu
        <span className="font-semibold"> Upload Excel</span> setelah event disimpan. Gunakan tombol
        <span className="font-semibold"> "Simpan &amp; Upload Excel"</span> agar langsung diarahkan ke sana.
      </span>
    </div>
  );
}
