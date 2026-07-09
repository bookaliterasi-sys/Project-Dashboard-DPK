// api/events/[id].js — GET / PUT / DELETE satu event
import { supabase, assembleEvent } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';
import { deriveEventMetrics } from '../_lib/metrics.js';

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;

  const { id } = req.query;

  try {
    if (req.method === 'GET') {
      const ev = await assembleEvent(id);
      if (!ev) return res.status(404).json({ error: 'Event tidak ditemukan' });
      return res.status(200).json({ ...ev, metrics: deriveEventMetrics(ev) });
    }

    if (req.method === 'PUT') {
      const b = req.body || {};
      const patch = {};
      if (b.nama != null) patch.nama_event = b.nama;
      if (b.lokasi != null) patch.lokasi = b.lokasi;
      if (b.tanggal != null) patch.tanggal_mulai = b.tanggal;
      if (b.tanggalSelesai != null) patch.tanggal_selesai = b.tanggalSelesai;
      if (b.provinsi != null) patch.provinsi = b.provinsi;
      if (b.kota != null) patch.kota = b.kota;
      if (b.instansi != null) patch.instansi = b.instansi;
      if (b.tagTema != null) patch.tag_tema = b.tagTema;
      if (b.cost != null) patch.budget_event = Number(b.cost);
      if (b.jenis != null) patch.jenis_event = b.jenis;
      if (b.jumlahTenant != null) patch.jumlah_tenant = Number(b.jumlahTenant);
      if (b.catatan != null) patch.catatan = b.catatan;

      if (Object.keys(patch).length) {
        const { error } = await supabase.from('events').update(patch).eq('id', id);
        if (error) return res.status(500).json({ error: 'Gagal update', detail: error.message });
      }

      if (b.akuisisi) {
        const a = b.akuisisi;
        // hapus baris financing lama, ganti dengan agregat baru (sederhana & konsisten)
        await supabase.from('financing_transactions').delete().eq('event_id', id);
        await supabase.from('financing_transactions').insert({
          event_id: id,
          sales_volume_edc: Number(a.edcSalesVolume) || 0,
          jumlah_transaksi_edc: Number(a.edcTrx) || 0,
          sales_volume_qris: Number(a.qrisSalesVolume) || 0,
          jumlah_transaksi_qris: Number(a.qrisTrx) || 0,
          nominal_pembiayaan: Number(a.nominalPembiayaan) || 0,
          jumlah_pembiayaan: Number(a.jumlahPembiayaan) || 0,
        });
      }

      const ev = await assembleEvent(id);
      if (!ev) return res.status(404).json({ error: 'Event tidak ditemukan' });
      return res.status(200).json({ ...ev, metrics: deriveEventMetrics(ev) });
    }

    if (req.method === 'DELETE') {
      const { error } = await supabase.from('events').delete().eq('id', id); // cascade
      if (error) return res.status(500).json({ error: 'Gagal hapus', detail: error.message });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: 'Kesalahan server', detail: e.message });
  }
}
