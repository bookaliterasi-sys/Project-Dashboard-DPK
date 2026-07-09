// api/auth/login.js — validasi kredensial dari tabel users -> JWT + cookie
import { supabase } from '../_lib/db.js';
import { verifyPassword, signToken } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    // --- Cek konfigurasi server dulu, agar 500 tidak "buta" ---
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        error: 'Konfigurasi server belum lengkap',
        detail:
          'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum di-set di Environment Variables Vercel. Set lalu redeploy.',
      });
    }

    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, password_hash, role')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      // Bedakan "tabel belum dibuat" dari error database lain
      const missingTable =
        error.code === '42P01' || /relation .*users.* does not exist/i.test(error.message || '');
      return res.status(500).json({
        error: missingTable ? 'Tabel database belum dibuat' : 'Kesalahan database',
        detail: missingTable
          ? 'Tabel "users" belum ada. Jalankan isi schema.sql lalu schema_sesi9.sql di Supabase SQL Editor.'
          : error.message,
      });
    }
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    const token = signToken({ id: user.id, username: user.username, role: user.role });
    res.setHeader(
      'Set-Cookie',
      `ise_token=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=28800; SameSite=Lax; Secure`,
    );
    return res.status(200).json({
      token,
      user: { username: user.username, role: user.role },
    });
  } catch (e) {
    return res.status(500).json({ error: 'Kesalahan server', detail: e.message });
  }
}
