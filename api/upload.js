// api/upload.js — terima data hasil parse (dari browser) & simpan ke Supabase.
// Mencocokkan event by nama_event (find-or-create), lalu insert baris ke tabel
// terkait. Mode 'append' (default) atau 'overwrite' (hapus data event dulu).
// Setiap baris ditandai upload_id agar upload bisa DIBATALKAN belakangan.
// Semua tulis dilakukan server (service role).
import { supabase } from './_lib/db.js';
import { requireAuth } from './_lib/auth.js';

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { type, data, fileName, mode = 'append', summary } = req.body || {};
  if (!type || !data) return res.status(400).json({ error: 'Payload tidak lengkap' });

  const result = { inserted: 0, events: 0, updated: 0, notMatched: [] };
  let status = 'Sukses';
  let errorMessage = null;

  // 1) Buat baris riwayat upload LEBIH DULU agar dapat uploadId untuk menandai
  //    setiap baris data. Kalau kolom upload_id belum ada (migrasi belum
  //    dijalankan), insert tetap jalan tanpa menandai (fallback aman).
  let uploadId = null;
  try {
    const { data: hist } = await supabase
      .from('upload_history')
      .insert({
        file_name: fileName || null,
        file_type: type,
        total_rows: summary?.totalRows || 0,
        success_rows: 0,
        failed_rows: summary?.failedRows || 0,
        status: 'Diproses',
        uploaded_by: user?.username || null,
      })
      .select('id')
      .single();
    uploadId = hist?.id ?? null;
  } catch {
    uploadId = null;
  }

  const createdEventIds = []; // event yang LAHIR dari upload ini

  try {
    // cache nama_event -> id
    const eventCache = new Map();
    const findOrCreateEvent = async (namaEvent, extra = {}) => {
      const key = namaEvent.toLowerCase();
      if (eventCache.has(key)) return eventCache.get(key);

      const { data: found } = await supabase
        .from('events').select('id').ilike('nama_event', namaEvent).maybeSingle();

      let id;
      if (found) {
        id = found.id;
        if (Object.keys(extra).length) await supabase.from('events').update(extra).eq('id', id);
      } else {
        const insertPayload = { nama_event: namaEvent, ...extra };
        // tandai event ini dibuat oleh upload sekarang (kalau kolomnya ada)
        const withStamp = uploadId != null
          ? { ...insertPayload, created_by_upload_id: uploadId }
          : insertPayload;
        let created;
        let error;
        ({ data: created, error } = await supabase
          .from('events').insert(withStamp).select('id').single());
        // fallback bila kolom created_by_upload_id belum ada (migrasi belum jalan)
        if (error && uploadId != null) {
          ({ data: created, error } = await supabase
            .from('events').insert(insertPayload).select('id').single());
        }
        if (error) throw new Error(`Gagal membuat event "${namaEvent}": ${error.message}`);
        id = created.id;
        result.events += 1;
        createdEventIds.push(id);
      }
      eventCache.set(key, id);
      return id;
    };

    // ---------- GABUNGAN ----------
    if (type === 'gabungan') {
      for (const ev of data.events || []) {
        await findOrCreateEvent(ev.nama_event, {
          jenis_event: ev.jenis_event, tanggal_mulai: ev.tanggal_mulai,
          tanggal_selesai: ev.tanggal_selesai, lokasi: ev.lokasi, provinsi: ev.provinsi,
          kota: ev.kota, instansi: ev.instansi, tag_tema: ev.tag_tema,
          jumlah_tenant: ev.jumlah_tenant, budget_event: ev.budget_event, catatan: ev.catatan,
        });
      }
      result.inserted += await insertTenants(data.tenant || [], findOrCreateEvent, mode, uploadId);
      result.inserted += await insertNasabah(data.nasabah || [], findOrCreateEvent, mode, uploadId);
    }

    // ---------- DPK TENANT ----------
    else if (type === 'dpkTenant') {
      result.inserted += await insertTenants(data.tenant || [], findOrCreateEvent, mode, uploadId);
    }

    // ---------- NASABAH ----------
    else if (type === 'nasabah') {
      result.inserted += await insertNasabah(data.nasabah || [], findOrCreateEvent, mode, uploadId);
    }

    // ---------- AKUISISI ----------
    else if (type === 'akuisisi') {
      for (const a of data.akuisisi || []) {
        const eventId = await findOrCreateEvent(a.namaEvent);
        const payload = {
          event_id: eventId,
          jenis_pembiayaan: a.jenis_pembiayaan, jumlah_pembiayaan: a.jumlah_pembiayaan,
          nominal_pembiayaan: a.nominal_pembiayaan,
          jumlah_transaksi_qris: a.jumlah_transaksi_qris, sales_volume_qris: a.sales_volume_qris,
          jumlah_transaksi_edc: a.jumlah_transaksi_edc, sales_volume_edc: a.sales_volume_edc,
          oto: a.oto, hasanah_card: a.hasanah_card, catatan: a.catatan,
        };
        if (await insertWithStamp('financing_transactions', payload, uploadId)) result.inserted += 1;
      }
    }

    // ---------- DPK UPDATE ----------
    else if (type === 'dpkUpdate') {
      for (const u of data.updates || []) {
        const table = u.target === 'tenant' ? 'tenant_accounts' : 'nasabah_event_accounts';
        const rekCol = u.target === 'tenant' ? 'no_rekening_tenant' : 'no_rekening_nasabah';
        const cifCol = u.target === 'tenant' ? 'no_cif_tenant' : 'no_cif_nasabah';

        let q = supabase.from(table).update({
          saldo_update: u.saldo_update,
          tanggal_update_saldo: u.tanggal_update_saldo,
        });
        if (u.no_rekening) q = q.eq(rekCol, u.no_rekening);
        else q = q.eq(cifCol, u.no_cif);

        const { data: upd, error } = await q.select('id');
        if (error) continue;
        if (upd && upd.length) result.updated += upd.length;
        else result.notMatched.push(u.no_rekening || u.no_cif);
      }
      await refreshStatusDpk();
    } else {
      // hapus riwayat "Diproses" yang telanjur dibuat untuk jenis tak dikenal
      if (uploadId != null) await supabase.from('upload_history').delete().eq('id', uploadId);
      return res.status(400).json({ error: `Jenis upload '${type}' tidak dikenal` });
    }

    if (summary?.failedRows > 0 || result.notMatched.length) status = 'Sebagian';
  } catch (e) {
    status = 'Gagal';
    errorMessage = e.message;
  }

  // 2) Perbarui baris riwayat dengan hasil akhir
  const successRows = (result.inserted || 0) + (result.updated || 0);
  if (uploadId != null) {
    await supabase.from('upload_history').update({
      success_rows: successRows,
      failed_rows: summary?.failedRows || 0,
      status,
      error_message: errorMessage,
    }).eq('id', uploadId);
  }

  if (status === 'Gagal') {
    return res.status(500).json({ error: errorMessage || 'Upload gagal', result });
  }
  return res.status(200).json({ ok: true, status, uploadId, result });
}

// ---------- helper insert dengan penanda upload_id (fallback aman) ----------
async function insertWithStamp(table, payload, uploadId) {
  if (uploadId != null) {
    const { error } = await supabase.from(table).insert({ ...payload, upload_id: uploadId });
    if (!error) return true;
    // fallback: kolom upload_id belum ada -> insert tanpa penanda
  }
  const { error: e2 } = await supabase.from(table).insert(payload);
  return !e2;
}

async function insertTenants(list, findOrCreateEvent, mode, uploadId) {
  let count = 0;
  const clearedEvents = new Set();
  for (const t of list) {
    const eventId = await findOrCreateEvent(t.namaEvent);
    if (mode === 'overwrite' && !clearedEvents.has(`t-${eventId}`)) {
      await supabase.from('tenant_accounts').delete().eq('event_id', eventId);
      clearedEvents.add(`t-${eventId}`);
    }
    const payload = {
      event_id: eventId, nama_tenant: t.nama_tenant, jenis_usaha: t.jenis_usaha,
      no_cif_tenant: t.no_cif_tenant, no_rekening_tenant: t.no_rekening_tenant,
      saldo_awal: t.saldo_awal, saldo_update: t.saldo_update ?? 0,
      tanggal_update_saldo: t.tanggal_update_saldo, status_dpk: t.status_dpk, catatan: t.catatan,
    };
    if (await insertWithStamp('tenant_accounts', payload, uploadId)) count += 1;
  }
  return count;
}

async function insertNasabah(list, findOrCreateEvent, mode, uploadId) {
  let count = 0;
  const clearedEvents = new Set();
  for (const n of list) {
    const eventId = await findOrCreateEvent(n.namaEvent);
    if (mode === 'overwrite' && !clearedEvents.has(`n-${eventId}`)) {
      await supabase.from('nasabah_event_accounts').delete().eq('event_id', eventId);
      clearedEvents.add(`n-${eventId}`);
    }
    const payload = {
      event_id: eventId, nama_nasabah: n.nama_nasabah, no_cif_nasabah: n.no_cif_nasabah,
      no_rekening_nasabah: n.no_rekening_nasabah, jenis_tabungan: n.jenis_tabungan,
      setoran_awal: n.setoran_awal, saldo_update: n.saldo_update ?? 0,
      tanggal_pembukaan: n.tanggal_pembukaan, tanggal_update_saldo: n.tanggal_update_saldo,
      sumber_pembukaan: n.sumber_pembukaan, nama_staf_cabang_input: n.nama_staf_cabang_input,
      status_rekening: n.status_rekening, catatan: n.catatan,
    };
    if (await insertWithStamp('nasabah_event_accounts', payload, uploadId)) count += 1;
  }
  return count;
}

// set label status_dpk teks di tenant_accounts berdasar pertumbuhan_dpk
async function refreshStatusDpk() {
  const { data } = await supabase.from('tenant_accounts')
    .select('id, saldo_awal, saldo_update');
  for (const t of data || []) {
    let status = 'Belum Update';
    if (t.saldo_update != null) {
      if (Number(t.saldo_update) > Number(t.saldo_awal)) status = 'Tumbuh';
      else if (Number(t.saldo_update) === Number(t.saldo_awal)) status = 'Tetap';
      else status = 'Turun';
    }
    await supabase.from('tenant_accounts').update({ status_dpk: status }).eq('id', t.id);
  }
}
