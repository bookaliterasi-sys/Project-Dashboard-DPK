import { useMemo, useState } from 'react';
import {
  History, Clock, Trash2, AlertTriangle, Loader2, RotateCcw,
  Database, FileWarning, ShieldAlert, CheckCircle2, Undo2,
} from 'lucide-react';
import { PageHeader, SectionCard, TableSkeleton, EmptyState, ErrorState } from '../components/ui';
import { Modal, ConfirmModal } from '../components/Modal';
import { eventService, uploadService, recordService, useServiceData } from '../services/eventDataService';
import { formatNumber, formatDateTime } from '../utils/formatters';

const STATUS_STYLE = {
  Sukses: 'bg-emerald-50 text-emerald-600',
  Berhasil: 'bg-emerald-50 text-emerald-600',
  Sebagian: 'bg-amber-50 text-amber-600',
  'Berhasil Sebagian': 'bg-amber-50 text-amber-600',
  Gagal: 'bg-red-50 text-red-500',
  Diproses: 'bg-slate-100 text-slate-500',
  Dibatalkan: 'bg-slate-100 text-slate-400 line-through',
};

// jenis upload yang benar-benar memasukkan baris data baru (bisa dibatalkan).
// 'dpkUpdate' hanya memperbarui saldo, tidak menambah baris -> tidak dibatalkan.
const CANCELABLE = new Set(['gabungan', 'dpkTenant', 'nasabah', 'akuisisi']);

export default function DataManagement({ onNavigate, onSaved }) {
  const { data: uploads, loading, error, reload } = useServiceData(uploadService.history);
  const { data: events } = useServiceData(eventService.getEvents);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetText, setResetText] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null); // baris upload yang mau dibatalkan
  const [cancelBusy, setCancelBusy] = useState(false);

  const lastUpdate = useMemo(() => {
    const t = (uploads || []).map((u) => u.upload_date).filter(Boolean);
    return t.length ? t[0] : null;
  }, [uploads]);

  const eventCount = (events || []).length;

  const notify = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const doReset = async () => {
    if (resetText !== 'RESET') return;
    setBusy(true);
    try {
      await recordService.resetAll();
      setResetOpen(false);
      setResetText('');
      notify('Seluruh data berhasil direset.');
      reload();
      onSaved?.();
    } catch (e) {
      notify(e.message || 'Reset gagal.', false);
    } finally {
      setBusy(false);
    }
  };

  const doCancelUpload = async () => {
    if (!cancelTarget) return;
    setCancelBusy(true);
    try {
      const res = await uploadService.cancel(cancelTarget.id);
      const r = res?.removed || {};
      const total = (r.tenant || 0) + (r.nasabah || 0) + (r.financing || 0);
      notify(
        `Upload dibatalkan. ${total} baris data dihapus` +
        (r.events ? `, ${r.events} event kosong ikut dibersihkan.` : '.')
      );
      setCancelTarget(null);
      reload();
      onSaved?.();
    } catch (e) {
      notify(e.message || 'Gagal membatalkan upload.', false);
    } finally {
      setCancelBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Manajemen Data" microcopy="Kelola data event, riwayat upload, dan reset dashboard. Semua aksi hapus memerlukan konfirmasi." />

      {/* ringkasan */}
      <div className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <InfoCard icon={Database} label="Total Event" value={formatNumber(eventCount)} tone="teal" />
        <InfoCard icon={History} label="Total Upload" value={formatNumber((uploads || []).length)} tone="gold" />
        <InfoCard icon={Clock} label="Update Terakhir" value={lastUpdate ? formatDateTime(lastUpdate) : '—'} tone="emerald" small />
      </div>

      {/* kelola event cepat */}
      <SectionCard title="Kelola Event" subtitle="Edit atau hapus event dilakukan di halaman detail" action={<Database size={16} className="text-bsi-500" />}>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => onNavigate?.('database')} className="btn-secondary !py-2.5 text-[13px]"><Database size={15} /> Buka Database Event</button>
          <button onClick={() => onNavigate?.('input')} className="btn-secondary !py-2.5 text-[13px]">+ Input Event Baru</button>
          <button onClick={() => onNavigate?.('upload')} className="btn-secondary !py-2.5 text-[13px]"><RotateCcw size={14} /> Re-upload / Update DPK</button>
        </div>
        <p className="mt-3 text-[12px] text-slate-400">
          Untuk edit/hapus event beserta rekening tenant & nasabahnya, buka Database Event lalu klik salah satu baris untuk masuk ke Detail Event.
        </p>
      </SectionCard>

      {/* riwayat upload */}
      <div className="mt-4">
        <SectionCard
          title="Riwayat Upload"
          subtitle={uploads ? `${uploads.length} upload tercatat` : ''}
          action={<History size={16} className="text-bsi-500" />}
        >
          {loading ? (
            <TableSkeleton rows={6} />
          ) : error ? (
            <ErrorState error={error} onRetry={reload} />
          ) : !uploads?.length ? (
            <EmptyState title="Belum ada riwayat upload" desc="Riwayat muncul setelah Anda mengunggah file Excel." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[940px] text-[12.5px]">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[10.5px] font-bold uppercase tracking-wide text-slate-400">
                    <th className="px-3 py-2.5">Nama File</th>
                    <th className="px-3 py-2.5">Jenis</th>
                    <th className="px-3 py-2.5">Tanggal Upload</th>
                    <th className="px-3 py-2.5 text-right">Baris</th>
                    <th className="px-3 py-2.5 text-right">Berhasil</th>
                    <th className="px-3 py-2.5 text-right">Gagal</th>
                    <th className="px-3 py-2.5 text-center">Status</th>
                    <th className="px-3 py-2.5">User</th>
                    <th className="px-3 py-2.5">Catatan Error</th>
                    <th className="px-3 py-2.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {uploads.map((u) => {
                    const bisaBatal =
                      CANCELABLE.has(u.file_type) &&
                      ['Sukses', 'Berhasil', 'Sebagian', 'Berhasil Sebagian'].includes(u.status) &&
                      (u.success_rows || 0) > 0;
                    return (
                      <tr key={u.id} className="border-b border-slate-50 transition hover:bg-bsi-50/40">
                        <td className="max-w-[180px] truncate px-3 py-2.5 font-medium text-slate-700" title={u.file_name}>{u.file_name || '—'}</td>
                        <td className="px-3 py-2.5 text-slate-500">{u.file_type}</td>
                        <td className="px-3 py-2.5 text-slate-500">{formatDateTime(u.upload_date)}</td>
                        <td className="px-3 py-2.5 text-right text-slate-600">{formatNumber(u.total_rows)}</td>
                        <td className="px-3 py-2.5 text-right text-emerald-600">{formatNumber(u.success_rows)}</td>
                        <td className="px-3 py-2.5 text-right text-red-500">{formatNumber(u.failed_rows)}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`badge ${STATUS_STYLE[u.status] || 'bg-slate-100 text-slate-500'}`}>{u.status || '—'}</span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-500">{u.uploaded_by || '—'}</td>
                        <td className="max-w-[180px] truncate px-3 py-2.5 text-red-400" title={u.error_message || ''}>{u.error_message || '—'}</td>
                        <td className="px-3 py-2.5 text-center">
                          {bisaBatal ? (
                            <button
                              onClick={() => setCancelTarget(u)}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-[11.5px] font-semibold text-red-500 transition hover:bg-red-50"
                              title="Batalkan upload ini & hapus datanya"
                            >
                              <Undo2 size={13} /> Batalkan
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      {/* zona bahaya: reset */}
      <div className="mt-4">
        <SectionCard title="Zona Bahaya" action={<ShieldAlert size={16} className="text-red-500" />}>
          <div className="flex flex-col gap-3 rounded-xl border border-red-100 bg-red-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5">
              <FileWarning size={20} className="mt-0.5 shrink-0 text-red-500" />
              <div>
                <p className="text-[13.5px] font-bold text-red-700">Reset Seluruh Data</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-red-500">
                  Menghapus semua event, rekening, transaksi, dan riwayat dashboard. Akun login tidak terhapus. Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>
            <button
              onClick={() => setResetOpen(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-red-500 px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-red-600"
            >
              <Trash2 size={15} /> Reset Data
            </button>
          </div>
        </SectionCard>
      </div>

      {/* modal reset serius */}
      {cancelTarget && (
        <ConfirmModal
          title="Batalkan Upload Ini?"
          desc={
            `Semua data yang masuk dari file "${cancelTarget.file_name || 'upload ini'}" akan dihapus permanen` +
            ` (${formatNumber(cancelTarget.success_rows)} baris). Event yang dibuat oleh upload ini dan menjadi kosong akan ikut dihapus. Tindakan ini tidak dapat dibatalkan.`
          }
          confirmLabel="Ya, Batalkan Upload"
          busy={cancelBusy}
          onCancel={() => !cancelBusy && setCancelTarget(null)}
          onConfirm={doCancelUpload}
        />
      )}

      {resetOpen && (
        <Modal title="Reset Seluruh Data" onClose={() => !busy && setResetOpen(false)} narrow>
          <div className="flex items-start gap-2.5 rounded-xl bg-red-50 px-3 py-3 ring-1 ring-red-100">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-500" />
            <p className="text-[12.5px] leading-relaxed text-red-600">
              Reset seluruh data akan menghapus <span className="font-bold">semua event, rekening, transaksi, dan riwayat dashboard</span>. Ketik <span className="font-mono font-bold">RESET</span> untuk melanjutkan.
            </p>
          </div>
          <input
            value={resetText}
            onChange={(e) => setResetText(e.target.value)}
            placeholder="Ketik RESET"
            className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center text-[14px] font-bold tracking-widest outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
          />
          <div className="mt-4 flex gap-2">
            <button
              onClick={doReset}
              disabled={resetText !== 'RESET' || busy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-500 px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Reset Sekarang
            </button>
            <button onClick={() => setResetOpen(false)} disabled={busy} className="btn-secondary !py-2.5 text-[13px]">Batal</button>
          </div>
        </Modal>
      )}

      {toast && (
        <div className={`fixed bottom-5 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold text-white shadow-2xl animate-fade-in-up ${toast.ok ? 'bg-emerald-600' : 'bg-red-500'}`}>
          {toast.ok ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />} {toast.msg}
        </div>
      )}
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, tone, small }) {
  const tones = { teal: 'text-bsi-600 bg-bsi-50', gold: 'text-gold-600 bg-gold-50', emerald: 'text-emerald-600 bg-emerald-50' };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className={`mb-2 inline-grid h-9 w-9 place-items-center rounded-lg ${tones[tone]}`}><Icon size={17} /></div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-0.5 font-extrabold text-slate-800 ${small ? 'text-[13px]' : 'text-lg'}`}>{value}</p>
    </div>
  );
}
