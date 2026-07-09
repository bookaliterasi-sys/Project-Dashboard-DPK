// api/events/index.js — GET (list + metrik / overview) & POST (create)
import { supabase, assembleEvent, listEventIds } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';
import { deriveEventMetrics, buildOverview } from '../_lib/metrics.js';

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;

  try {
    if (req.method === 'GET') {
      const ids = await listEventIds();
      const events = [];
      for (const id of ids) {
        const ev = await assembleEvent(id);
        if (ev) events.push({ ...ev, metrics: deriveEventMetrics(ev) });
      }
      if (req.query?.overview) return res.status(200).json(buildOverview(events));
      return res.status(200).json(events);
    }

    if (req.method === 'POST') {
      const b = req.body || {};
      const jenis = b.jenis === 'private' ? 'private' : 'expo';

      const { data: ev, error } = await supabase
        .from('events')
        .insert({
          nama_event: b.nama || '',
          jenis_event: jenis,
          tanggal_mulai: b.tanggal || null,
          tanggal_selesai: b.tanggalSelesai || null,
          lokasi: b.lokasi || null,
          provinsi: b.provinsi || null,
          kota: b.kota || null,
          instansi: b.instansi || null,
          tag_tema: b.tagTema || null,
          jumlah_tenant: Number(b.jumlahTenant) || 0,
          budget_event: Number(b.cost) || 0,
          catatan: b.catatan || null,
        })
        .select('id')
        .single();

      if (error) return res.status(500).json({ error: 'Gagal membuat event', detail: error.message });
      const id = ev.id;

      // baris financing (akuisisi) bila dikirim
      const a = b.akuisisi || {};
      await supabase.from('financing_transactions').insert({
        event_id: id,
        sales_volume_edc: Number(a.edcSalesVolume) || 0,
        jumlah_transaksi_edc: Number(a.edcTrx) || 0,
        sales_volume_qris: Number(a.qrisSalesVolume) || 0,
        jumlah_transaksi_qris: Number(a.qrisTrx) || 0,
        nominal_pembiayaan: Number(a.nominalPembiayaan) || 0,
        jumlah_pembiayaan: Number(a.jumlahPembiayaan) || 0,
      });

      // tenants & nasabah bila dikirim (mis. dari upload Excel)
      if ((b.tenants || []).length) {
        await supabase.from('tenant_accounts').insert(
          b.tenants.map((t) => ({
            event_id: id,
            nama_tenant: t.nama || null,
            jenis_usaha: t.jenisUsaha || null,
            no_cif_tenant: t.cif || null,
            no_rekening_tenant: t.rekening || null,
            saldo_awal: Number(t.saldoAwal) || 0,
          })),
        );
      }
      if ((b.nasabah || []).length) {
        await supabase.from('nasabah_event_accounts').insert(
          b.nasabah.map((n) => ({
            event_id: id,
            nama_nasabah: n.nama || null,
            no_cif_nasabah: n.cif || null,
            no_rekening_nasabah: n.rekening || null,
            jenis_tabungan: n.jenisTabungan || null,
            setoran_awal: Number(n.setoranAwal) || 0,
          })),
        );
      }

      const full = await assembleEvent(id);
      return res.status(201).json({ ...full, metrics: deriveEventMetrics(full) });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: 'Kesalahan server', detail: e.message });
  }
}
