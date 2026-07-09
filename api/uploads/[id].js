// api/uploads/[id].js — Batalkan satu sesi upload.
// DELETE menghapus SEMUA baris data (tenant, nasabah, transaksi) yang berasal
// dari upload ini (ditandai upload_id), lalu membersihkan event yang lahir dari
// upload ini bila menjadi kosong. Riwayat upload ditandai "Dibatalkan".
import { supabase } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;

  const { id } = req.query;
  const uploadId = Number(id);
  if (!uploadId) return res.status(400).json({ error: 'ID upload tidak valid' });

  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // pastikan upload ada
    const { data: hist, error: histErr } = await supabase
      .from('upload_history').select('*').eq('id', uploadId).maybeSingle();
    if (histErr) return res.status(500).json({ error: histErr.message });
    if (!hist) return res.status(404).json({ error: 'Riwayat upload tidak ditemukan' });

    const removed = { tenant: 0, nasabah: 0, financing: 0, events: 0 };

    // 1) Hapus baris data bertanda upload_id ini. Bila kolom upload_id belum
    //    ada (migrasi belum jalan), operasi akan error -> tangani sebagai
    //    "fitur belum aktif" agar pesan jelas ke user.
    const delCount = async (table) => {
      const { data, error } = await supabase.from(table).delete().eq('upload_id', uploadId).select('id');
      if (error) throw Object.assign(new Error(error.message), { code: error.code });
      return data?.length || 0;
    };

    try {
      removed.tenant = await delCount('tenant_accounts');
      removed.nasabah = await delCount('nasabah_event_accounts');
      removed.financing = await delCount('financing_transactions');
    } catch (e) {
      // 42703 = undefined_column
      const notMigrated = e.code === '42703' || /column .*upload_id.* does not exist/i.test(e.message || '');
      if (notMigrated) {
        return res.status(409).json({
          error: 'Fitur batalkan upload belum aktif. Jalankan migrasi schema_sesi14_undo_upload.sql di Supabase terlebih dahulu.',
        });
      }
      throw e;
    }

    // 2) Bersihkan event yang DIBUAT oleh upload ini bila kini tak punya data lagi.
    try {
      const { data: bornEvents } = await supabase
        .from('events').select('id').eq('created_by_upload_id', uploadId);
      for (const ev of bornEvents || []) {
        const [{ count: tC }, { count: nC }, { count: fC }] = await Promise.all([
          supabase.from('tenant_accounts').select('id', { count: 'exact', head: true }).eq('event_id', ev.id),
          supabase.from('nasabah_event_accounts').select('id', { count: 'exact', head: true }).eq('event_id', ev.id),
          supabase.from('financing_transactions').select('id', { count: 'exact', head: true }).eq('event_id', ev.id),
        ]);
        if ((tC || 0) + (nC || 0) + (fC || 0) === 0) {
          await supabase.from('events').delete().eq('id', ev.id);
          removed.events += 1;
        }
      }
    } catch {
      // kolom created_by_upload_id belum ada -> lewati pembersihan event
    }

    // 3) Tandai riwayat sebagai dibatalkan (tetap tersimpan sebagai jejak audit)
    await supabase.from('upload_history').update({
      status: 'Dibatalkan',
      error_message: `Dibatalkan oleh ${user?.username || 'pengguna'} pada ${new Date().toISOString()}`,
    }).eq('id', uploadId);

    return res.status(200).json({ ok: true, removed });
  } catch (e) {
    return res.status(500).json({ error: 'Gagal membatalkan upload', detail: e.message });
  }
}
