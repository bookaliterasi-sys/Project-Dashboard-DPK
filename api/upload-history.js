// api/upload-history.js — GET riwayat upload terbaru
import { supabase } from './_lib/db.js';
import { requireAuth } from './_lib/auth.js';

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { data, error } = await supabase
    .from('upload_history')
    .select('*')
    .order('upload_date', { ascending: false })
    .limit(20);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data || []);
}
