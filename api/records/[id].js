// api/records/[id].js — edit / hapus satu baris rekening (tenant/nasabah/financing).
// Query: ?kind=tenant|nasabah|financing (menentukan tabel target).
import { supabase } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';

const TABLES = {
  tenant: 'tenant_accounts',
  nasabah: 'nasabah_event_accounts',
  financing: 'financing_transactions',
};

// kolom yang boleh di-update per jenis (whitelist, cegah kolom generated)
const EDITABLE = {
  tenant: ['nama_tenant', 'jenis_usaha', 'no_cif_tenant', 'no_rekening_tenant', 'saldo_awal', 'saldo_update', 'tanggal_update_saldo', 'status_dpk', 'catatan'],
  nasabah: ['nama_nasabah', 'no_cif_nasabah', 'no_rekening_nasabah', 'jenis_tabungan', 'setoran_awal', 'saldo_update', 'tanggal_pembukaan', 'tanggal_update_saldo', 'sumber_pembukaan', 'nama_staf_cabang_input', 'status_rekening', 'catatan'],
  financing: ['jenis_pembiayaan', 'jumlah_pembiayaan', 'nominal_pembiayaan', 'jumlah_transaksi_qris', 'sales_volume_qris', 'jumlah_transaksi_edc', 'sales_volume_edc', 'oto', 'hasanah_card', 'catatan'],
};

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;

  const { id, kind } = req.query;
  const table = TABLES[kind];
  if (!table) return res.status(400).json({ error: 'Parameter kind tidak valid' });

  try {
    if (req.method === 'PUT') {
      const body = req.body || {};
      const patch = {};
      for (const key of EDITABLE[kind]) {
        if (key in body) patch[key] = body[key];
      }
      // recompute status_dpk tenant bila saldo berubah
      if (kind === 'tenant' && ('saldo_update' in patch || 'saldo_awal' in patch)) {
        const { data: cur } = await supabase.from(table).select('saldo_awal, saldo_update').eq('id', id).maybeSingle();
        const awal = Number(patch.saldo_awal ?? cur?.saldo_awal ?? 0);
        const upd = patch.saldo_update ?? cur?.saldo_update;
        patch.status_dpk = upd == null ? 'Belum Update' : Number(upd) > awal ? 'Tumbuh' : Number(upd) === awal ? 'Tetap' : 'Turun';
      }
      if (!Object.keys(patch).length) return res.status(400).json({ error: 'Tidak ada field yang diubah' });

      const { error } = await supabase.from(table).update(patch).eq('id', id);
      if (error) return res.status(500).json({ error: 'Gagal update', detail: error.message });
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) return res.status(500).json({ error: 'Gagal hapus', detail: error.message });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: 'Kesalahan server', detail: e.message });
  }
}
