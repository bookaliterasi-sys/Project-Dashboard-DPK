// api/reset.js — reset SELURUH data (events, rekening, transaksi, riwayat).
// Tabel users TIDAK dihapus. Butuh konfirmasi { confirm: 'RESET' }.
import { supabase } from './_lib/db.js';
import { requireAuth } from './_lib/auth.js';

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { confirm } = req.body || {};
  if (confirm !== 'RESET') {
    return res.status(400).json({ error: 'Konfirmasi tidak valid. Ketik RESET untuk melanjutkan.' });
  }

  try {
    // hapus child dulu (walau ada cascade, eksplisit lebih aman), lalu events & history
    await supabase.from('financing_transactions').delete().neq('id', 0);
    await supabase.from('tenant_accounts').delete().neq('id', 0);
    await supabase.from('nasabah_event_accounts').delete().neq('id', 0);
    await supabase.from('events').delete().neq('id', 0);
    await supabase.from('upload_history').delete().neq('id', 0);

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'Reset gagal', detail: e.message });
  }
}
