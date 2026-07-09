// src/components/Modal.jsx — modal & konfirmasi bersama (reusable)
import { X, Loader2, Trash2, AlertTriangle } from 'lucide-react';

export function Modal({ title, children, onClose, narrow }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" />
      <div className={`relative w-full ${narrow ? 'max-w-md' : 'max-w-2xl'} max-h-[88vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl animate-scale-in`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-extrabold text-bsi-950">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmModal({ title, desc, confirmLabel = 'Ya, Hapus', busy, danger = true, onCancel, onConfirm, children }) {
  return (
    <Modal onClose={onCancel} title={title} narrow>
      {danger && (
        <div className="mb-3 flex items-start gap-2.5 rounded-xl bg-red-50 px-3 py-2.5 ring-1 ring-red-100">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-500" />
          <p className="text-[12.5px] leading-relaxed text-red-600">{desc}</p>
        </div>
      )}
      {!danger && <p className="text-[13px] text-slate-500">{desc}</p>}
      {children}
      <div className="mt-4 flex gap-2">
        <button
          onClick={onConfirm}
          disabled={busy}
          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white transition disabled:opacity-60 ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-bsi-600 hover:bg-bsi-700'}`}
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : danger ? <Trash2 size={15} /> : null}
          {confirmLabel}
        </button>
        <button onClick={onCancel} disabled={busy} className="btn-secondary !py-2.5 text-[13px]">Batal</button>
      </div>
    </Modal>
  );
}
