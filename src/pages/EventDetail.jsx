import { useState } from 'react';
import {
  ArrowLeft, MapPin, CalendarDays, Building2, Tag, Wallet, PiggyBank,
  TrendingUp, CreditCard, Landmark, Receipt, Gauge, Download, Pencil,
  Trash2, Upload, Loader2, X, Save,
} from 'lucide-react';
import { PageHeader, SectionCard, EmptyState, ErrorState, StatusBadge, ChartSkeleton } from '../components/ui';
import { TextField, RupiahField, DateField, TextArea } from '../components/FormFields';
import { Modal, ConfirmModal } from '../components/Modal';
import { eventService, recordService, useServiceData } from '../services/eventDataService';
import { exportEventDetail } from '../services/excelExport';
import { formatRupiahShort, formatRupiahFull, formatNumber, formatDate } from '../utils/formatters';

export default function EventDetail({ eventId, onNavigate, onSaved }) {
  const { data: ev, loading, error, reload } = useServiceData(
    () => (eventId ? eventService.getEvent(eventId) : Promise.resolve(null)),
    [eventId],
  );
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [recEdit, setRecEdit] = useState(null);   // { record, kind }
  const [recDel, setRecDel] = useState(null);      // { record, kind }

  if (!eventId) {
    return (
      <div>
        <PageHeader title="Detail Event" />
        <SectionCard title=""><EmptyState title="Tidak ada event dipilih" desc="Kembali ke Database Event dan pilih salah satu baris." /></SectionCard>
      </div>
    );
  }
  if (loading) return <div><PageHeader title="Detail Event" /><SectionCard title=""><ChartSkeleton height={200} /></SectionCard></div>;
  if (error) return <div><PageHeader title="Detail Event" /><SectionCard title=""><ErrorState error={error} onRetry={reload} /></SectionCard></div>;
  if (!ev) return <div><PageHeader title="Detail Event" /><SectionCard title=""><EmptyState title="Event tidak ditemukan" /></SectionCard></div>;

  const m = ev.metrics || {};

  const handleExport = async () => {
    setBusy('export');
    try { await exportEventDetail(ev); } finally { setBusy(null); }
  };

  const handleDelete = async () => {
    setBusy('delete');
    try {
      await eventService.deleteEvent(ev.id);
      onSaved?.();
      onNavigate?.('database');
    } finally { setBusy(null); }
  };

  const handleDeleteRecord = async () => {
    if (!recDel) return;
    setBusy('recdel');
    try {
      await recordService.deleteRecord(recDel.record.id, recDel.kind);
      setRecDel(null);
      reload();
      onSaved?.();
    } finally { setBusy(null); }
  };

  return (
    <div>
      <button onClick={() => onNavigate?.('database')} className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 transition hover:text-bsi-600">
        <ArrowLeft size={15} /> Kembali ke Database Event
      </button>

      <PageHeader title={ev.nama} microcopy={`${ev.jenis === 'expo' ? 'Expo / Bazar' : 'Private Event'}${ev.instansi ? ` · ${ev.instansi}` : ''}`}>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExport} disabled={busy} className="btn-secondary !py-2 text-xs">
            {busy === 'export' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Export Detail
          </button>
          <button onClick={() => setEditing(true)} className="btn-secondary !py-2 text-xs"><Pencil size={14} /> Edit</button>
          <button onClick={() => onNavigate?.('upload')} className="btn-secondary !py-2 text-xs"><Upload size={14} /> Update Excel</button>
          <button onClick={() => setConfirmDel(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100"><Trash2 size={14} /> Hapus</button>
        </div>
      </PageHeader>

      {/* info umum */}
      <SectionCard title="Informasi Event">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
          <Info icon={CalendarDays} label="Tanggal Mulai" value={ev.tanggal ? formatDate(ev.tanggal) : '—'} />
          <Info icon={CalendarDays} label="Tanggal Selesai" value={ev.tanggalSelesai ? formatDate(ev.tanggalSelesai) : '—'} />
          <Info icon={MapPin} label="Lokasi" value={ev.lokasi || '—'} />
          <Info icon={MapPin} label="Provinsi / Kota" value={[ev.provinsi, ev.kota].filter(Boolean).join(' / ') || '—'} />
          <Info icon={Building2} label="Instansi / Brand" value={ev.instansi || '—'} />
          <Info icon={Tag} label="Tag / Tema" value={ev.tagTema || '—'} />
          <Info icon={CreditCard} label="Jumlah Tenant" value={formatNumber(ev.jumlahTenant || 0)} />
          <Info icon={Wallet} label="Total Budget" value={formatRupiahFull(m.cost || 0)} />
        </div>
        {ev.catatan && <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-[12.5px] text-slate-500">{ev.catatan}</p>}
      </SectionCard>

      {/* metrik ringkas */}
      <div className="mt-4 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
        <Metric icon={PiggyBank} label="DPK Tenant" value={formatRupiahShort(m.dpkTenant || 0)} accent="teal" />
        <Metric icon={PiggyBank} label="DPK Nasabah" value={formatRupiahShort(m.dpkNasabah || 0)} accent="teal" />
        <Metric icon={PiggyBank} label="Total DPK Event" value={formatRupiahShort(m.dpkCurrent || 0)} accent="emerald" />
        <Metric icon={TrendingUp} label="Pertumbuhan DPK" value={formatRupiahShort(m.growthAmount || 0)} accent={m.growthAmount >= 0 ? 'emerald' : 'red'} />
        <Metric icon={CreditCard} label="Akuisisi Rekening" value={formatNumber(m.noaRekening || 0)} accent="teal" />
        <Metric icon={Landmark} label="Akuisisi Pembiayaan" value={formatNumber(m.jumlahPembiayaan || 0)} accent="gold" />
        <Metric icon={Receipt} label="QRIS Sales Volume" value={formatRupiahShort(m.qrisSales || 0)} accent="teal" />
        <Metric icon={Receipt} label="EDC Sales Volume" value={formatRupiahShort(m.edcSales || 0)} accent="teal" />
        <Metric icon={Receipt} label="Transaksi QRIS" value={formatNumber(m.qrisTrx || 0)} accent="teal" />
        <Metric icon={Receipt} label="Transaksi EDC" value={formatNumber(m.edcTrx || 0)} accent="teal" />
        <Metric icon={Gauge} label="Rasio Efektivitas" value={m.rasioEfektivitas != null ? `${m.rasioEfektivitas.toFixed(2)}×` : 'Data belum cukup'} accent="gold" />
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status Efektivitas</p>
          <div className="mt-2"><StatusBadge status={m.statusEfektivitas || 'Perlu Evaluasi'} /></div>
        </div>
      </div>

      {/* tabel tenant */}
      <div className="mt-4">
        <SectionCard title={`Rekening Tenant (${ev.tenants?.length || 0})`}>
          <DataTable
            rows={ev.tenants}
            cols={[
              ['No CIF', 'cif', 'mono'], ['No Rekening', 'rekening', 'mono'], ['Nama Tenant', 'nama'],
              ['Jenis Usaha', 'jenisUsaha'], ['Saldo Awal', 'saldoAwal', 'money'], ['Saldo Update', 'saldoUpdate', 'money'],
            ]}
            emptyText="Belum ada rekening tenant. Upload Excel DPK Tenant untuk mengisi."
            onEdit={(r) => setRecEdit({ record: r, kind: 'tenant' })}
            onDelete={(r) => setRecDel({ record: r, kind: 'tenant' })}
          />
        </SectionCard>
      </div>

      {/* tabel nasabah */}
      <div className="mt-4">
        <SectionCard title={`Rekening Nasabah (${ev.nasabah?.length || 0})`}>
          <DataTable
            rows={ev.nasabah}
            cols={[
              ['No CIF', 'cif', 'mono'], ['No Rekening', 'rekening', 'mono'], ['Nama Nasabah', 'nama'],
              ['Jenis Tabungan', 'jenisTabungan'], ['Setoran Awal', 'setoranAwal', 'money'], ['Saldo Update', 'saldoUpdate', 'money'],
            ]}
            emptyText="Belum ada rekening nasabah. Upload Excel Nasabah Event untuk mengisi."
            onEdit={(r) => setRecEdit({ record: r, kind: 'nasabah' })}
            onDelete={(r) => setRecDel({ record: r, kind: 'nasabah' })}
          />
        </SectionCard>
      </div>

      {/* pembiayaan & transaksi */}
      <div className="mt-4">
        <SectionCard title="Pembiayaan & Transaksi">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Mini label="Transaksi QRIS" value={formatNumber(m.qrisTrx || 0)} />
            <Mini label="Sales QRIS" value={formatRupiahShort(m.qrisSales || 0)} />
            <Mini label="Transaksi EDC" value={formatNumber(m.edcTrx || 0)} />
            <Mini label="Sales EDC" value={formatRupiahShort(m.edcSales || 0)} />
            <Mini label="Jumlah Pembiayaan" value={formatNumber(m.jumlahPembiayaan || 0)} />
            <Mini label="Nominal Pembiayaan" value={formatRupiahShort(m.nominalPembiayaan || 0)} />
          </div>
        </SectionCard>
      </div>

      {editing && <EditModal ev={ev} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); reload(); onSaved?.(); }} />}
      {confirmDel && (
        <ConfirmModal
          title="Hapus event ini?"
          desc={`Apakah Anda yakin ingin menghapus data ini? Event "${ev.nama}" beserta seluruh data tenant, nasabah, dan transaksinya tidak akan tampil lagi di dashboard.`}
          busy={busy === 'delete'}
          onCancel={() => setConfirmDel(false)}
          onConfirm={handleDelete}
        />
      )}
      {recEdit && (
        <RecordEditModal
          record={recEdit.record}
          kind={recEdit.kind}
          onClose={() => setRecEdit(null)}
          onSaved={() => { setRecEdit(null); reload(); onSaved?.(); }}
        />
      )}
      {recDel && (
        <ConfirmModal
          title="Hapus data ini?"
          desc="Apakah Anda yakin ingin menghapus data ini? Data yang dihapus tidak akan tampil lagi di dashboard."
          busy={busy === 'recdel'}
          onCancel={() => setRecDel(null)}
          onConfirm={handleDeleteRecord}
        />
      )}
    </div>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div>
      <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400"><Icon size={12} /> {label}</p>
      <p className="mt-0.5 text-[13.5px] font-semibold text-slate-700">{value}</p>
    </div>
  );
}

function Metric({ icon: Icon, label, value, accent = 'teal' }) {
  const colors = { teal: 'text-bsi-600 bg-bsi-50', emerald: 'text-emerald-600 bg-emerald-50', gold: 'text-gold-600 bg-gold-50', red: 'text-red-500 bg-red-50' };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className={`mb-2 inline-grid h-8 w-8 place-items-center rounded-lg ${colors[accent]}`}><Icon size={16} /></div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-lg font-extrabold text-slate-800">{value}</p>
    </div>
  );
}

function Mini({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5">
      <p className="text-lg font-extrabold text-slate-800">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium text-slate-400">{label}</p>
    </div>
  );
}

function DataTable({ rows, cols, emptyText, onEdit, onDelete }) {
  if (!rows?.length) return <EmptyState title="Belum ada data" desc={emptyText} />;
  const fmt = (v, type) => {
    if (v == null || v === '') return '—';
    if (type === 'money') return formatRupiahShort(v);
    return v;
  };
  const actions = onEdit || onDelete;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-[12.5px]">
        <thead>
          <tr className="border-b border-slate-100 text-left text-[10.5px] font-bold uppercase tracking-wide text-slate-400">
            {cols.map(([h]) => <th key={h} className="px-2.5 py-2">{h}</th>)}
            {actions && <th className="px-2.5 py-2 text-right">Aksi</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id ?? i} className="group border-b border-slate-50 transition hover:bg-bsi-50/40">
              {cols.map(([h, key, type]) => (
                <td key={h} className={`px-2.5 py-2 ${type === 'mono' ? 'font-mono' : ''} ${type === 'money' ? 'text-right' : ''} text-slate-600`}>{fmt(r[key], type)}</td>
              ))}
              {actions && (
                <td className="px-2.5 py-2 text-right">
                  <div className="inline-flex gap-1 opacity-60 transition group-hover:opacity-100">
                    {onEdit && (
                      <button onClick={() => onEdit(r)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-bsi-50 hover:text-bsi-600" title="Edit"><Pencil size={13} /></button>
                    )}
                    {onDelete && (
                      <button onClick={() => onDelete(r)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500" title="Hapus"><Trash2 size={13} /></button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// modal edit satu baris rekening (tenant/nasabah)
function RecordEditModal({ record, kind, onClose, onSaved }) {
  const isTenant = kind === 'tenant';
  const [form, setForm] = useState({
    nama: record.nama || '', cif: record.cif || '', rekening: record.rekening || '',
    jenisUsaha: record.jenisUsaha || '', jenisTabungan: record.jenisTabungan || '',
    saldoAwal: record.saldoAwal ?? '', setoranAwal: record.setoranAwal ?? '',
    saldoUpdate: record.saldoUpdate ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setSaving(true); setErr(null);
    try {
      const patch = isTenant
        ? { nama_tenant: form.nama, jenis_usaha: form.jenisUsaha, no_cif_tenant: form.cif, no_rekening_tenant: form.rekening, saldo_awal: Number(form.saldoAwal) || 0, saldo_update: form.saldoUpdate === '' ? null : Number(form.saldoUpdate) }
        : { nama_nasabah: form.nama, no_cif_nasabah: form.cif, no_rekening_nasabah: form.rekening, jenis_tabungan: form.jenisTabungan, setoran_awal: Number(form.setoranAwal) || 0, saldo_update: form.saldoUpdate === '' ? null : Number(form.saldoUpdate) };
      await recordService.updateRecord(record.id, kind, patch);
      onSaved();
    } catch (e) { setErr(e.message); setSaving(false); }
  };

  return (
    <Modal title={`Edit ${isTenant ? 'Rekening Tenant' : 'Rekening Nasabah'}`} onClose={onClose}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><TextField label={isTenant ? 'Nama Tenant' : 'Nama Nasabah'} value={form.nama} onChange={set('nama')} /></div>
        <TextField label="No CIF" value={form.cif} onChange={set('cif')} helper="Boleh berawalan nol." />
        <TextField label="No Rekening" value={form.rekening} onChange={set('rekening')} helper="Boleh berawalan nol." />
        {isTenant ? (
          <>
            <TextField label="Jenis Usaha" value={form.jenisUsaha} onChange={set('jenisUsaha')} />
            <RupiahField label="Saldo Awal" value={form.saldoAwal} onChange={set('saldoAwal')} />
          </>
        ) : (
          <>
            <TextField label="Jenis Tabungan" value={form.jenisTabungan} onChange={set('jenisTabungan')} />
            <RupiahField label="Setoran Awal" value={form.setoranAwal} onChange={set('setoranAwal')} />
          </>
        )}
        <RupiahField label="Saldo Update" value={form.saldoUpdate} onChange={set('saldoUpdate')} helper="Kosongkan bila belum update." />
      </div>
      {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">{err}</p>}
      <div className="mt-4 flex gap-2">
        <button onClick={submit} disabled={saving} className="btn-primary !py-2.5 text-[13px] disabled:opacity-60">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Simpan
        </button>
        <button onClick={onClose} className="btn-secondary !py-2.5 text-[13px]">Batal</button>
      </div>
    </Modal>
  );
}

function EditModal({ ev, onClose, onSaved }) {
  const [form, setForm] = useState({
    nama: ev.nama || '', lokasi: ev.lokasi || '', provinsi: ev.provinsi || '', kota: ev.kota || '',
    tanggal: ev.tanggal || '', tanggalSelesai: ev.tanggalSelesai || '', instansi: ev.instansi || '',
    tagTema: ev.tagTema || '', cost: ev.metrics?.cost || '', catatan: ev.catatan || '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setSaving(true); setErr(null);
    try {
      await eventService.updateEvent(ev.id, form);
      onSaved();
    } catch (e) { setErr(e.message); setSaving(false); }
  };

  return (
    <Modal onClose={onClose} title="Edit Event">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><TextField label="Nama Event" value={form.nama} onChange={set('nama')} required /></div>
        <RupiahField label="Budget Event" value={form.cost} onChange={set('cost')} />
        <TextField label="Instansi / Brand" value={form.instansi} onChange={set('instansi')} />
        <DateField label="Tanggal Mulai" value={form.tanggal} onChange={set('tanggal')} />
        <DateField label="Tanggal Selesai" value={form.tanggalSelesai} onChange={set('tanggalSelesai')} />
        <TextField label="Lokasi" value={form.lokasi} onChange={set('lokasi')} />
        <TextField label="Tag / Tema" value={form.tagTema} onChange={set('tagTema')} />
        <TextField label="Provinsi" value={form.provinsi} onChange={set('provinsi')} />
        <TextField label="Kota" value={form.kota} onChange={set('kota')} />
        <div className="sm:col-span-2"><TextArea label="Catatan" value={form.catatan} onChange={set('catatan')} /></div>
      </div>
      {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">{err}</p>}
      <div className="mt-4 flex gap-2">
        <button onClick={submit} disabled={saving} className="btn-primary !py-2.5 text-[13px] disabled:opacity-60">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Simpan Perubahan
        </button>
        <button onClick={onClose} className="btn-secondary !py-2.5 text-[13px]">Batal</button>
      </div>
    </Modal>
  );
}


