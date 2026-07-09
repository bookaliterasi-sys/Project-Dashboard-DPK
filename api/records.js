// api/records.js — data ter-flatten untuk tabel Database Event.
// Satu baris = satu rekening (tenant atau nasabah) + info event + akuisisi event.
import { supabase } from './_lib/db.js';
import { requireAuth } from './_lib/auth.js';

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const [{ data: events }, { data: tenants }, { data: nasabah }, { data: fin }] = await Promise.all([
      supabase.from('events').select('*').order('created_at', { ascending: false }),
      supabase.from('tenant_accounts').select('*'),
      supabase.from('nasabah_event_accounts').select('*'),
      supabase.from('financing_transactions').select('*'),
    ]);

    const evMap = new Map((events || []).map((e) => [e.id, e]));

    // agregasi akuisisi per event
    const finByEvent = new Map();
    for (const f of fin || []) {
      const cur = finByEvent.get(f.event_id) || {
        qrisTrx: 0, edcTrx: 0, qrisSales: 0, edcSales: 0, jmlPembiayaan: 0, nominalPembiayaan: 0, jenisPembiayaan: [],
      };
      cur.qrisTrx += Number(f.jumlah_transaksi_qris || 0);
      cur.edcTrx += Number(f.jumlah_transaksi_edc || 0);
      cur.qrisSales += Number(f.sales_volume_qris || 0);
      cur.edcSales += Number(f.sales_volume_edc || 0);
      cur.jmlPembiayaan += Number(f.jumlah_pembiayaan || 0);
      cur.nominalPembiayaan += Number(f.nominal_pembiayaan || 0);
      if (f.jenis_pembiayaan) cur.jenisPembiayaan.push(f.jenis_pembiayaan);
      finByEvent.set(f.event_id, cur);
    }

    const rows = [];
    const evInfo = (id) => {
      const e = evMap.get(id) || {};
      const f = finByEvent.get(id) || {};
      return {
        event_id: id,
        nama_event: e.nama_event, jenis_event: e.jenis_event,
        tanggal_event: e.tanggal_mulai, lokasi: e.lokasi, provinsi: e.provinsi, kota: e.kota,
        jumlah_tenant: e.jumlah_tenant, budget_event: Number(e.budget_event || 0),
        qris_trx: f.qrisTrx || 0, edc_trx: f.edcTrx || 0,
        qris_sales: f.qrisSales || 0, edc_sales: f.edcSales || 0,
        sales_volume: (f.qrisSales || 0) + (f.edcSales || 0),
        jumlah_transaksi: (f.qrisTrx || 0) + (f.edcTrx || 0),
        jenis_pembiayaan: (f.jenisPembiayaan || []).join(', '),
        nominal_pembiayaan: f.nominalPembiayaan || 0,
      };
    };

    for (const t of tenants || []) {
      const saldoAwal = Number(t.saldo_awal || 0);
      const saldoUpdate = t.saldo_update != null ? Number(t.saldo_update) : null;
      rows.push({
        kind: 'tenant',
        ...evInfo(t.event_id),
        no_cif: t.no_cif_tenant, no_rekening: t.no_rekening_tenant,
        nama: t.nama_tenant, jenis_tabungan: '-',
        saldo_awal: saldoAwal, setoran_awal: null,
        saldo_update: saldoUpdate,
        pertumbuhan_dpk: saldoUpdate != null ? saldoUpdate - saldoAwal : 0,
        status_dpk: t.status_dpk || statusDpk(saldoAwal, saldoUpdate),
        catatan: t.catatan,
      });
    }
    for (const n of nasabah || []) {
      const setoran = Number(n.setoran_awal || 0);
      const saldoUpdate = n.saldo_update != null ? Number(n.saldo_update) : null;
      rows.push({
        kind: 'nasabah',
        ...evInfo(n.event_id),
        no_cif: n.no_cif_nasabah, no_rekening: n.no_rekening_nasabah,
        nama: n.nama_nasabah, jenis_tabungan: n.jenis_tabungan,
        saldo_awal: null, setoran_awal: setoran,
        saldo_update: saldoUpdate,
        pertumbuhan_dpk: saldoUpdate != null ? saldoUpdate - setoran : 0,
        status_dpk: statusDpk(setoran, saldoUpdate),
        catatan: n.catatan,
      });
    }

    return res.status(200).json(rows);
  } catch (e) {
    return res.status(500).json({ error: 'Kesalahan server', detail: e.message });
  }
}

function statusDpk(awal, update) {
  if (update == null) return 'Belum Update';
  if (update > awal) return 'Tumbuh';
  if (update === awal) return 'Tetap';
  return 'Turun';
}
