// api/health.js — cek kesehatan konfigurasi & database (AMAN, tanpa secret).
// Buka di browser: https://<domain>/api/health
// Gunakan untuk mendiagnosa kenapa login gagal (500).
import { supabase } from './_lib/db.js';

export default async function handler(req, res) {
  const report = {
    ok: false,
    env: {
      SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      JWT_SECRET: Boolean(process.env.JWT_SECRET),
      SEED_TOKEN: Boolean(process.env.SEED_TOKEN),
    },
    database: 'belum dicek',
    usersTable: 'belum dicek',
    adminCount: null,
    hint: null,
  };

  // 1) Env wajib
  if (!report.env.SUPABASE_URL || !report.env.SUPABASE_SERVICE_ROLE_KEY) {
    report.hint =
      'Set SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY di Environment Variables Vercel, lalu redeploy.';
    return res.status(200).json(report);
  }

  // 2) Koneksi + tabel users + jumlah akun
  try {
    const { count, error } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });

    if (error) {
      report.database = 'error';
      const missingTable =
        error.code === '42P01' || /relation .*users.* does not exist/i.test(error.message || '');
      report.usersTable = missingTable ? 'belum dibuat' : 'error';
      report.hint = missingTable
        ? 'Jalankan schema.sql lalu schema_sesi9.sql di Supabase SQL Editor.'
        : `Cek koneksi/kunci Supabase. Detail: ${error.message}`;
      return res.status(200).json(report);
    }

    report.database = 'terhubung';
    report.usersTable = 'ada';
    report.adminCount = count ?? 0;

    if (!count) {
      report.hint =
        'Database siap, tapi belum ada akun. Buat admin: npm run hash <user> <pass> lalu jalankan SQL-nya, atau POST /api/auth/seed.';
      return res.status(200).json(report);
    }

    if (!report.env.JWT_SECRET) {
      report.hint =
        'Semua siap, TAPI JWT_SECRET belum di-set — token bisa dipalsukan. Set JWT_SECRET (string acak >=32 char) lalu redeploy.';
    }

    report.ok = true;
    return res.status(200).json(report);
  } catch (e) {
    report.database = 'error';
    report.hint = `Gagal terhubung ke Supabase. Detail: ${e.message}`;
    return res.status(200).json(report);
  }
}
