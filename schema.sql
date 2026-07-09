-- ============================================================
-- ISE BSI Event Monitoring Dashboard — Skema Database (Supabase / PostgreSQL)
-- Jalankan di: Supabase Dashboard > SQL Editor > New query > Run.
-- Idempotent (aman dijalankan ulang). TIDAK ada data dummy.
-- ============================================================

-- ---------- USERS (login internal) ----------
CREATE TABLE IF NOT EXISTS users (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'admin'
                CHECK (role IN ('admin', 'staff', 'viewer')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- EVENTS ----------
CREATE TABLE IF NOT EXISTS events (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nama_event     TEXT NOT NULL,
  jenis_event    TEXT CHECK (jenis_event IN ('expo', 'private')) DEFAULT 'expo',
  tanggal_mulai  DATE,
  tanggal_selesai DATE,
  lokasi         TEXT,
  provinsi       TEXT,
  kota           TEXT,
  instansi       TEXT,
  tag_tema       TEXT,
  jumlah_tenant  INTEGER DEFAULT 0,
  budget_event   NUMERIC(18,2) DEFAULT 0,   -- pembagi Rasio Efektivitas
  catatan        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- TENANT ACCOUNTS (rekening tenant, khusus expo/bazar) ----------
CREATE TABLE IF NOT EXISTS tenant_accounts (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id            BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  nama_tenant         TEXT,
  jenis_usaha         TEXT,
  no_cif_tenant       TEXT,
  no_rekening_tenant  TEXT,
  saldo_awal          NUMERIC(18,2) DEFAULT 0,
  saldo_update        NUMERIC(18,2) DEFAULT 0,
  pertumbuhan_dpk     NUMERIC(18,2) GENERATED ALWAYS AS (saldo_update - saldo_awal) STORED,
  tanggal_update_saldo DATE,
  status_dpk          TEXT,   -- Naik / Stagnan / Turun (diisi saat update)
  catatan             TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tenant_event ON tenant_accounts(event_id);

-- ---------- NASABAH EVENT ACCOUNTS (rekening pengunjung/perorangan) ----------
CREATE TABLE IF NOT EXISTS nasabah_event_accounts (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id              BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  nama_nasabah          TEXT,
  no_cif_nasabah        TEXT,
  no_rekening_nasabah   TEXT,
  jenis_tabungan        TEXT,   -- Easy / Haji / Tabis / Bisnis
  setoran_awal          NUMERIC(18,2) DEFAULT 0,
  saldo_update          NUMERIC(18,2) DEFAULT 0,
  pertumbuhan_dpk       NUMERIC(18,2) GENERATED ALWAYS AS (saldo_update - setoran_awal) STORED,
  tanggal_pembukaan     DATE,
  tanggal_update_saldo  DATE,
  sumber_pembukaan      TEXT,
  nama_staf_cabang_input TEXT,
  status_rekening       TEXT,
  catatan               TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_nasabah_event ON nasabah_event_accounts(event_id);

-- ---------- FINANCING TRANSACTIONS (pembiayaan + QRIS + EDC) ----------
CREATE TABLE IF NOT EXISTS financing_transactions (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id              BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  jenis_pembiayaan      TEXT,
  jumlah_pembiayaan     INTEGER DEFAULT 0,        -- NOA pembiayaan
  nominal_pembiayaan    NUMERIC(18,2) DEFAULT 0,
  jumlah_transaksi_qris INTEGER DEFAULT 0,
  sales_volume_qris     NUMERIC(18,2) DEFAULT 0,
  jumlah_transaksi_edc  INTEGER DEFAULT 0,
  sales_volume_edc      NUMERIC(18,2) DEFAULT 0,
  oto                   INTEGER DEFAULT 0,        -- cicilan OTO
  hasanah_card          INTEGER DEFAULT 0,        -- masalah/hasanah card
  catatan               TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_financing_event ON financing_transactions(event_id);

-- ---------- UPLOAD HISTORY (jejak audit unggahan Excel) ----------
CREATE TABLE IF NOT EXISTS upload_history (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  file_name     TEXT,
  file_type     TEXT,
  upload_date   TIMESTAMPTZ DEFAULT now(),
  total_rows    INTEGER DEFAULT 0,
  success_rows  INTEGER DEFAULT 0,
  failed_rows   INTEGER DEFAULT 0,
  status        TEXT,          -- Sukses / Sebagian / Gagal
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Trigger updated_at otomatis
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['events','tenant_accounts','nasabah_event_accounts','financing_transactions']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated ON %s;', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION set_updated_at();', t, t);
  END LOOP;
END $$;

-- ============================================================
-- Row Level Security: aktifkan & tutup akses publik.
-- Semua akses lewat server (service role key) yang mem-bypass RLS,
-- sehingga browser tidak pernah bisa membaca tabel langsung.
-- ============================================================
ALTER TABLE users                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE events                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_accounts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE nasabah_event_accounts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE financing_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_history          ENABLE ROW LEVEL SECURITY;
-- (tanpa policy = default deny untuk anon/authenticated; service_role bypass RLS)
