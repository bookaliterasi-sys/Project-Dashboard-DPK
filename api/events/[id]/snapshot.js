// api/events/[id]/snapshot.js — update saldo terkini rekening (perkembangan DPK)
// Model: memperbarui kolom saldo_update pada tenant_accounts / nasabah_event_accounts
// berdasar nomor rekening. Data awal (saldo_awal/setoran_awal) TIDAK diubah,
// sehingga pertumbuhan_dpk (kolom generated) selalu bisa dihitung.
import { supabase, assembleEvent } from '../../_lib/db.js';
import { requireAuth } from '../../_lib/auth.js';
import { deriveEventMetrics } from '../../_lib/metrics.js';

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  try {
    const b = req.body || {};
    const tanggal = b.tanggal || new Date().toISOString().slice(0, 10);
    const saldoPerRekening = b.saldoPerRekening || {};

    let updated = 0;
    for (const [rekening, saldo] of Object.entries(saldoPerRekening)) {
      const nilai = Number(saldo) || 0;
      // coba update di tenant, lalu nasabah (rekening bisa ada di salah satunya)
      const { data: t } = await supabase
        .from('tenant_accounts')
        .update({ saldo_update: nilai, tanggal_update_saldo: tanggal })
        .eq('event_id', id)
        .eq('no_rekening_tenant', rekening)
        .select('id');
      if (t && t.length) { updated += t.length; continue; }

      const { data: n } = await supabase
        .from('nasabah_event_accounts')
        .update({ saldo_update: nilai, tanggal_update_saldo: tanggal })
        .eq('event_id', id)
        .eq('no_rekening_nasabah', rekening)
        .select('id');
      if (n && n.length) updated += n.length;
    }

    const ev = await assembleEvent(id);
    if (!ev) return res.status(404).json({ error: 'Event tidak ditemukan' });
    return res.status(201).json({ updated, ...ev, metrics: deriveEventMetrics(ev) });
  } catch (e) {
    return res.status(500).json({ error: 'Kesalahan server', detail: e.message });
  }
}
