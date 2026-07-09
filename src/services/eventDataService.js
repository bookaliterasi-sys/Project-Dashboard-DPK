// ============================================================
// eventDataService — client data layer (memanggil /api/*)
//
// SESI 2: setiap fungsi memanggil Vercel Serverless Function
//   yang membaca/menulis ke Vercel Postgres (data permanen).
// Token JWT disimpan di localStorage HANYA sebagai kredensial
// akses (bukan data bisnis), dikirim via header Authorization.
// ============================================================

import { useEffect, useState, useCallback } from 'react';
import { deriveEventMetrics, buildOverview } from './metrics';

export { deriveEventMetrics, buildOverview };

// -------- konstanta domain (dari transkrip + sketsa) --------
export const EVENT_TYPES = {
  expo: { id: 'expo', label: 'Expo / Bazar', multiTenant: true },
  private: { id: 'private', label: 'Event Private', multiTenant: false },
};

export const JENIS_TABUNGAN = ['Easy', 'Haji', 'Tabis', 'Bisnis'];

// -------- token helper --------
const TOKEN_KEY = 'ise_token';
export const getStoredToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};
export const setStoredToken = (t) => {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* noop */ }
};

// -------- fetch wrapper --------
async function api(path, { method = 'GET', body } = {}) {
  const token = getStoredToken();
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request gagal (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// ============================================================
// AUTH
// ============================================================
export const authService = {
  login: async (username, password) => {
    const data = await api('/auth/login', { method: 'POST', body: { username, password } });
    if (data.token) setStoredToken(data.token);
    return data;
  },
  logout: () => setStoredToken(null),
};

// ============================================================
// EVENTS (semua permanen di Postgres)
// ============================================================
// ============================================================
// UPLOAD (kirim data hasil parse ke server -> Supabase)
// ============================================================
export const uploadService = {
  save: (payload) => api('/upload', { method: 'POST', body: payload }),
  history: () => api('/upload-history'),
  cancel: (uploadId) => api(`/uploads/${uploadId}`, { method: 'DELETE' }),
};

export const eventService = {
  getRecords: () => api('/records'),
  getOverview: () => api('/events?overview=1'),
  getEvents: () => api('/events'),
  getEvent: (id) => api(`/events/${id}`),
  createEvent: (payload) => api('/events', { method: 'POST', body: payload }),
  updateEvent: (id, patch) => api(`/events/${id}`, { method: 'PUT', body: patch }),
  deleteEvent: (id) => api(`/events/${id}`, { method: 'DELETE' }),
  addSnapshot: (id, snapshot) => api(`/events/${id}/snapshot`, { method: 'POST', body: snapshot }),
};

// -------- edit/hapus baris rekening + reset seluruh data --------
export const recordService = {
  updateRecord: (id, kind, patch) => api(`/records/${id}?kind=${kind}`, { method: 'PUT', body: patch }),
  deleteRecord: (id, kind) => api(`/records/${id}?kind=${kind}`, { method: 'DELETE' }),
  resetAll: () => api('/reset', { method: 'POST', body: { confirm: 'RESET' } }),
};

// -------- hook data (loading + error + refetch) --------
export function useServiceData(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    Promise.resolve(fetcher())
      .then((d) => { if (alive) { setData(d); setLoading(false); } })
      .catch((e) => { if (alive) { setError(e); setLoading(false); } });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => load(), [load]);

  return { data, loading, error, reload: load };
}
