-- ============================================================
-- Migrasi Sesi 9 — audit user pengupload + kolom "Diproses"
-- Jalankan di Supabase SQL Editor. Idempotent.
-- ============================================================

-- kolom user pengupload (audit sederhana: siapa & kapan)
ALTER TABLE upload_history ADD COLUMN IF NOT EXISTS uploaded_by TEXT;

-- (opsional) index untuk urutan riwayat tercepat
CREATE INDEX IF NOT EXISTS idx_upload_history_date ON upload_history(upload_date DESC);
