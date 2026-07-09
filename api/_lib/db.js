// api/_lib/db.js — koneksi Supabase (server-side, service role) + perakit event
//
// PENTING: file ini HANYA berjalan di serverless function (server).
// Service role key mem-bypass RLS dan TIDAK PERNAH dikirim ke browser.
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  // biar pesan errornya jelas saat env belum di-set
  console.warn('[db] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum di-set.');
}

// Lazy init: JANGAN panggil createClient saat import. Bila SUPABASE_URL kosong,
// createClient akan throw "supabaseUrl is required" dan membuat SELURUH serverless
// function crash 500 sebelum sempat mengembalikan pesan yang jelas (termasuk
// /api/health). Dengan lazy, client baru dibuat saat pertama kali dipakai.
let _client;
function getClient() {
  if (_client) return _client;
  if (!url || !serviceKey) {
    const err = new Error(
      'Konfigurasi Supabase belum di-set (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).',
    );
    err.code = 'ENV_MISSING';
    throw err;
  }
  _client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

// Proxy: pemakaian `supabase.from(...)` di seluruh kode tetap sama, namun client
// hanya dibuat saat pertama diakses (bukan saat modul di-import). Fungsi di-bind
// ke client asli agar `this` tetap benar.
export const supabase = new Proxy(
  {},
  {
    get(_t, prop) {
      const client = getClient();
      const val = client[prop];
      return typeof val === 'function' ? val.bind(client) : val;
    },
  },
);

// -------- rakit satu event lengkap dari beberapa tabel --------
export async function assembleEvent(eventId) {
  const [{ data: ev }, { data: tenants }, { data: nasabah }, { data: fin }] = await Promise.all([
    supabase.from('events').select('*').eq('id', eventId).maybeSingle(),
    supabase.from('tenant_accounts').select('*').eq('event_id', eventId),
    supabase.from('nasabah_event_accounts').select('*').eq('event_id', eventId),
    supabase.from('financing_transactions').select('*').eq('event_id', eventId),
  ]);
  if (!ev) return null;

  // agregasi financing (bisa banyak baris) -> total EDC/QRIS/pembiayaan
  const f = (fin || []).reduce(
    (a, r) => ({
      edcSalesVolume: a.edcSalesVolume + Number(r.sales_volume_edc || 0),
      edcTrx: a.edcTrx + Number(r.jumlah_transaksi_edc || 0),
      qrisSalesVolume: a.qrisSalesVolume + Number(r.sales_volume_qris || 0),
      qrisTrx: a.qrisTrx + Number(r.jumlah_transaksi_qris || 0),
      nominalPembiayaan: a.nominalPembiayaan + Number(r.nominal_pembiayaan || 0),
      jumlahPembiayaan: a.jumlahPembiayaan + Number(r.jumlah_pembiayaan || 0),
    }),
    { edcSalesVolume: 0, edcTrx: 0, qrisSalesVolume: 0, qrisTrx: 0, nominalPembiayaan: 0, jumlahPembiayaan: 0 },
  );

  return {
    id: ev.id,
    nama: ev.nama_event,
    jenis: ev.jenis_event,
    tanggal: ev.tanggal_mulai,
    tanggalSelesai: ev.tanggal_selesai,
    lokasi: ev.lokasi,
    provinsi: ev.provinsi,
    kota: ev.kota,
    instansi: ev.instansi,
    tagTema: ev.tag_tema,
    jumlahTenant: ev.jumlah_tenant,
    cost: Number(ev.budget_event || 0),
    catatan: ev.catatan,
    tenants: (tenants || []).map((t) => ({
      id: t.id,
      nama: t.nama_tenant,
      jenisUsaha: t.jenis_usaha,
      cif: t.no_cif_tenant,
      rekening: t.no_rekening_tenant,
      saldoAwal: Number(t.saldo_awal || 0),
      saldoUpdate: Number(t.saldo_update || 0),
    })),
    nasabah: (nasabah || []).map((n) => ({
      id: n.id,
      nama: n.nama_nasabah,
      cif: n.no_cif_nasabah,
      rekening: n.no_rekening_nasabah,
      jenisTabungan: n.jenis_tabungan,
      jenisPembiayaan: null,
      setoranAwal: Number(n.setoran_awal || 0),
      saldoUpdate: Number(n.saldo_update || 0),
    })),
    akuisisi: {
      edcSalesVolume: f.edcSalesVolume,
      edcTrx: f.edcTrx,
      qrisSalesVolume: f.qrisSalesVolume,
      qrisTrx: f.qrisTrx,
      nominalPembiayaan: f.nominalPembiayaan,
      jumlahPembiayaan: f.jumlahPembiayaan,
    },
    // snapshot memakai saldo_update terkini per rekening
    snapshots: buildSnapshotFromUpdates(tenants || [], nasabah || []),
    createdAt: ev.created_at,
  };
}

// bentuk 1 snapshot "terkini" dari kolom saldo_update (bila ada yang terisi)
function buildSnapshotFromUpdates(tenants, nasabah) {
  const saldoPerRekening = {};
  let ada = false;
  for (const t of tenants) {
    if (t.saldo_update != null && Number(t.saldo_update) > 0) {
      saldoPerRekening[t.no_rekening_tenant || `t-${t.id}`] = Number(t.saldo_update);
      ada = true;
    }
  }
  for (const n of nasabah) {
    if (n.saldo_update != null && Number(n.saldo_update) > 0) {
      saldoPerRekening[n.no_rekening_nasabah || `n-${n.id}`] = Number(n.saldo_update);
      ada = true;
    }
  }
  if (!ada) return [];
  const tgl = new Date().toISOString().slice(0, 10);
  return [{ tanggal: tgl, saldoPerRekening }];
}

export async function listEventIds() {
  const { data } = await supabase.from('events').select('id').order('created_at', { ascending: false });
  return (data || []).map((r) => r.id);
}
