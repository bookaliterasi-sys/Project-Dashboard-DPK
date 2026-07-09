// api/auth/seed.js — seed 1 akun admin SEKALI, aman.
// Dipanggil sekali setelah tabel dibuat. Dilindungi SEED_TOKEN agar
// tidak bisa dipakai sembarang orang. Menolak jika user sudah ada.
//   POST /api/auth/seed
//   body: { token, username, password, role? }
import { supabase } from '../_lib/db.js';
import { hashPassword } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const seedToken = process.env.SEED_TOKEN;
  const { token, username, password, role } = req.body || {};

  if (!seedToken) return res.status(500).json({ error: 'SEED_TOKEN belum di-set di environment' });
  if (token !== seedToken) return res.status(401).json({ error: 'Seed token salah' });
  if (!username || !password) return res.status(400).json({ error: 'username & password wajib' });

  try {
    const { data: existing } = await supabase
      .from('users').select('id').eq('username', username).maybeSingle();
    if (existing) return res.status(409).json({ error: 'User sudah ada' });

    const password_hash = await hashPassword(password);
    const { error } = await supabase.from('users').insert({
      username, password_hash, role: role || 'admin',
    });
    if (error) return res.status(500).json({ error: 'Gagal seed', detail: error.message });

    return res.status(201).json({ ok: true, username });
  } catch (e) {
    return res.status(500).json({ error: 'Kesalahan server', detail: e.message });
  }
}
