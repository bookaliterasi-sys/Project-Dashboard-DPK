import { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Table2,
  Users,
  Layers,
  CreditCard,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { PageHeader, SectionCard } from '../components/ui';
import { TEMPLATE_LIST, downloadTemplate } from '../services/excelTemplates';
import UploadPanel from '../components/UploadPanel';

const ICONS = {
  dpkTenant: Table2,
  nasabah: Users,
  gabungan: Layers,
  akuisisi: CreditCard,
};

const DESC = {
  dpkTenant: 'Opsional — hanya rekening tenant. Sheet: DATA_DPK_TENANT.',
  nasabah: 'Opsional — hanya rekening nasabah/pengunjung. Sheet: DATA_NASABAH_EVENT.',
  gabungan: 'Cukup ini saja untuk mulai: info event + tenant + nasabah dalam 1 file (3 sheet).',
  akuisisi: 'Opsional — hanya jika mau catat pembiayaan, QRIS & EDC.',
};

const RECOMMENDED_KEY = 'gabungan';

export default function UploadExcel({ onSaved }) {
  const [busy, setBusy] = useState(null);
  const [done, setDone] = useState(null);
  const [error, setError] = useState(null);

  const handleDownload = async (key) => {
    setError(null);
    setBusy(key);
    try {
      await downloadTemplate(key);
      setDone(key);
      setTimeout(() => setDone(null), 2500);
    } catch (e) {
      setError(e.message || 'Gagal membuat file template.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Upload Excel"
        microcopy="Untuk mulai, cukup unduh & isi Template Gabungan Event (bertanda 'Mulai di sini'). Template lain sifatnya opsional untuk kebutuhan tambahan. Jangan mengubah nama kolom agar upload berhasil."
      />

      <SectionCard
        title="Download Template Excel"
        subtitle="Template resmi ISE BSI — header hijau, format rupiah & tanggal, dropdown, dan filter aktif"
        action={<Download size={16} className="text-bsi-500" />}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {TEMPLATE_LIST.map((tpl) => {
            const Icon = ICONS[tpl.key] || FileSpreadsheet;
            const isBusy = busy === tpl.key;
            const isDone = done === tpl.key;
            return (
              <div
                key={tpl.key}
                className={`group flex items-center gap-3.5 rounded-xl border p-3.5 transition-all duration-300 hover:shadow-md hover:shadow-bsi-900/5 ${
                  tpl.key === RECOMMENDED_KEY
                    ? 'border-bsi-300 bg-bsi-50/40 hover:border-bsi-400'
                    : 'border-slate-200 bg-white hover:border-bsi-300'
                }`}
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-bsi-600 to-bsi-500 text-white shadow-sm">
                  <Icon size={20} strokeWidth={2.1} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-[13.5px] font-bold text-bsi-950">
                    {tpl.label}
                    {tpl.key === RECOMMENDED_KEY && (
                      <span className="badge shrink-0 bg-bsi-600 text-white">Mulai di sini</span>
                    )}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-slate-400">
                    {DESC[tpl.key]}
                  </p>
                </div>
                <button
                  onClick={() => handleDownload(tpl.key)}
                  disabled={isBusy}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-semibold transition-all duration-300 active:scale-[0.97] ${
                    isDone
                      ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200'
                      : 'bg-bsi-50 text-bsi-700 hover:bg-bsi-100'
                  } disabled:opacity-60`}
                >
                  {isBusy ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : isDone ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <Download size={14} />
                  )}
                  {isBusy ? 'Membuat…' : isDone ? 'Terunduh' : 'Download'}
                </button>
              </div>
            );
          })}
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] font-medium text-red-600 ring-1 ring-red-100">
            {error}
          </p>
        )}

        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2.5 text-[11.5px] leading-relaxed text-amber-700 ring-1 ring-amber-100">
          Catatan: Isi data sesuai format. <span className="font-semibold">Jangan mengubah nama kolom</span> agar
          proses upload ke dashboard berhasil.
        </p>
      </SectionCard>

      <div className="mt-4">
        <SectionCard
          title="Upload Data Event"
          subtitle="Unggah file Excel yang sudah diisi — sistem memvalidasi, menampilkan preview, lalu menyimpan ke database"
          action={<FileSpreadsheet size={16} className="text-emerald-500" />}
        >
          <UploadPanel onSaved={onSaved} />
        </SectionCard>
      </div>
    </div>
  );
}
