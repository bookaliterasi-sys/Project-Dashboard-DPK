-- ============================================================
-- Migrasi Sesi 14 — Fitur "Batalkan Upload"
-- Menambah kolom upload_id ke tabel data agar setiap baris tahu
-- berasal dari sesi upload yang mana. Dengan ini, satu upload bisa
-- dibatalkan (baris-barisnya dihapus) tanpa mengganggu data lain.
-- Jalankan di Supabase SQL Editor. Idempotent (aman diulang).
-- ============================================================

-- Tandai setiap baris data dengan id upload asalnya.
-- ON DELETE SET NULL: kalau riwayat upload dihapus, data tetap ada (upload_id jadi NULL).
ALTER TABLE tenant_accounts
  ADD COLUMN IF NOT EXISTS upload_id BIGINT REFERENCES upload_history(id) ON DELETE SET NULL;

ALTER TABLE nasabah_event_accounts
  ADD COLUMN IF NOT EXISTS upload_id BIGINT REFERENCES upload_history(id) ON DELETE SET NULL;

ALTER TABLE financing_transactions
  ADD COLUMN IF NOT EXISTS upload_id BIGINT REFERENCES upload_history(id) ON DELETE SET NULL;

-- Tandai event yang DIBUAT oleh sebuah upload (bukan lewat form manual).
-- Berguna agar saat membatalkan upload, event yang jadi kosong & memang
-- lahir dari upload itu bisa ikut dibersihkan.
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS created_by_upload_id BIGINT REFERENCES upload_history(id) ON DELETE SET NULL;

-- Index untuk pencarian cepat saat membatalkan upload
CREATE INDEX IF NOT EXISTS idx_tenant_upload   ON tenant_accounts(upload_id);
CREATE INDEX IF NOT EXISTS idx_nasabah_upload  ON nasabah_event_accounts(upload_id);
CREATE INDEX IF NOT EXISTS idx_finance_upload  ON financing_transactions(upload_id);
CREATE INDEX IF NOT EXISTS idx_events_upload   ON events(created_by_upload_id);
