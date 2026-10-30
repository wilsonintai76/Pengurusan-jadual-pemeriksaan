-- ====================================================================
-- Cloudflare D1 Database Schema - 3NF (Third Normal Form)
-- Database: poliku-aset-d1 (SQLite)
-- Pematuhan 1PP AM 2.4 & Sistem e-JAS Politeknik Kuching Sarawak
-- ====================================================================

-- PRAGMA Foreign Keys
PRAGMA foreign_keys = ON;

-- --------------------------------------------------------------------
-- 1. ENTITI INDUK & JADUAL RUJUKAN (LOOKUP TABLES - 3NF)
-- --------------------------------------------------------------------

-- 1.1 Jabatan & Unit (Menghapuskan pergantungan transitif nama/pasangan jabatan)
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,                       -- cth: 'JTMK', 'JKM', 'JKE', 'JKA'
  nama TEXT NOT NULL,                        -- cth: 'Jabatan Teknologi Maklumat & Komunikasi'
  cross_partner_id TEXT,                     -- cth: 'JKE' (Pasangan Pemeriksaan Silang PBAC)
  ketua_jabatan TEXT,
  penolong_pegawai_aset TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (cross_partner_id) REFERENCES departments(id)
);

-- 1.2 Bangunan & Blok Kampus (Menghapuskan pergantungan atribut blok/zon dalam lokasi)
CREATE TABLE IF NOT EXISTS buildings (
  id TEXT PRIMARY KEY,                       -- cth: 'BLOK-E', 'BLOK-C', 'BENGKEL-JKM'
  kod TEXT NOT NULL UNIQUE,                  -- cth: 'BGN-E'
  nama TEXT NOT NULL,                        -- cth: 'Blok E (Teknologi Maklumat)'
  kampus_zon TEXT NOT NULL,                  -- cth: 'Zon Akademik Timur'
  default_latitude REAL NOT NULL,            -- cth: 1.621810
  default_longitude REAL NOT NULL,           -- cth: 110.324100
  created_at TEXT DEFAULT (datetime('now'))
);

-- 1.3 Kategori Ruang Fizikal
CREATE TABLE IF NOT EXISTS room_categories (
  id TEXT PRIMARY KEY,                       -- cth: 'MAKMAL_KOMPUTER', 'BENGKEL_TEKNIKAL'
  nama TEXT NOT NULL UNIQUE,                 -- cth: 'Makmal Komputer'
  keterangan TEXT
);

-- 1.4 Status Pemeriksaan (1PP AM 2.4)
CREATE TABLE IF NOT EXISTS inspection_statuses (
  id TEXT PRIMARY KEY,                       -- cth: 'BELUM_MULA', 'SEDANG', 'SELESAI', 'TANGGUH'
  nama TEXT NOT NULL UNIQUE,                 -- cth: 'Belum Mula', 'Sedang Dijalankan', 'Selesai'
  warna_kod TEXT DEFAULT '#475569'
);

-- 1.5 Kategori Aset Alih Kerajaan
CREATE TABLE IF NOT EXISTS asset_categories (
  id TEXT PRIMARY KEY,                       -- cth: 'HARTA_MODAL', 'ASET_RENDAH', 'SEMUA'
  nama TEXT NOT NULL UNIQUE                  -- cth: 'Harta Modal Sahaja', 'Aset Alih Bernilai Rendah'
);

-- --------------------------------------------------------------------
-- 2. ENTITI PEGAWAI & PENGGUNA (OFFICERS & USERS - 3NF)
-- Memisahkan maklumat peribadi/jawatan pegawai dari entiti bilik/jadual
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS officers (
  id TEXT PRIMARY KEY,                       -- cth: 'PEG-001', 'OFF-WILSON'
  nama TEXT NOT NULL,
  emel TEXT NOT NULL UNIQUE,
  jawatan TEXT NOT NULL,                     -- cth: 'Penolong Pegawai Teknologi Maklumat'
  gred TEXT NOT NULL,                        -- cth: 'FA29', 'DH41', 'N32'
  telefon TEXT,                              -- cth: '082-845512'
  sambungan TEXT,                            -- cth: 'Ext 124'
  department_id TEXT NOT NULL,
  peranan TEXT NOT NULL DEFAULT 'Pegawai Pemeriksa', -- 'Ketua Jabatan', 'Pentadbir Sistem', dsb
  status TEXT DEFAULT 'Aktif',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE INDEX IF NOT EXISTS idx_officers_dept ON officers(department_id);
CREATE INDEX IF NOT EXISTS idx_officers_emel ON officers(emel);

-- --------------------------------------------------------------------
-- 3. ENTITI LOKASI & RUANG ASET (3NF NORMALIZED)
-- Hanya menyimpan kunci asing (FK). Tiada data bertindih penjaga/bangunan/jabatan.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,                       -- cth: 'LOK-001'
  kod_ruang TEXT NOT NULL UNIQUE,            -- cth: 'MAK-JTMK-01'
  nama TEXT NOT NULL,                        -- cth: 'Makmal Multimedia & Pengaturcaraan 1'
  department_id TEXT NOT NULL,               -- FK ke departments
  building_id TEXT NOT NULL,                 -- FK ke buildings
  aras TEXT NOT NULL,                        -- cth: 'Aras 2', 'Aras Bawah'
  category_id TEXT NOT NULL,                 -- FK ke room_categories
  status_id TEXT NOT NULL DEFAULT 'BELUM_MULA', -- FK ke inspection_statuses
  tarikh_terakhir_diperiksa TEXT,
  latitude REAL NOT NULL,                    -- Koordinat GPS tepat ruang
  longitude REAL NOT NULL,                   -- Koordinat GPS tepat ruang
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (building_id) REFERENCES buildings(id),
  FOREIGN KEY (category_id) REFERENCES room_categories(id),
  FOREIGN KEY (status_id) REFERENCES inspection_statuses(id)
);

CREATE INDEX IF NOT EXISTS idx_loc_dept ON locations(department_id);
CREATE INDEX IF NOT EXISTS idx_loc_building ON locations(building_id);
CREATE INDEX IF NOT EXISTS idx_loc_status ON locations(status_id);
CREATE INDEX IF NOT EXISTS idx_loc_kod ON locations(kod_ruang);

-- --------------------------------------------------------------------
-- 4. JADUAL PERHUBUNGAN PENJAGA RUANG (LOCATION CUSTODIANS - 3NF)
-- Menyokong hubungan N:M (Satu bilik boleh ada >1 pegawai bertanggungjawab KEW.PA-7)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS location_custodians (
  id TEXT PRIMARY KEY,
  location_id TEXT NOT NULL,
  officer_id TEXT NOT NULL,
  jenis_penjaga TEXT DEFAULT 'Pegawai Bertanggungjawab Utama', -- 'Utama', 'Pembantu', 'Pengesah'
  tarikh_lantikan TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (officer_id) REFERENCES officers(id) ON DELETE RESTRICT,
  UNIQUE(location_id, officer_id)
);

CREATE INDEX IF NOT EXISTS idx_loc_cust_loc ON location_custodians(location_id);
CREATE INDEX IF NOT EXISTS idx_loc_cust_off ON location_custodians(officer_id);

-- --------------------------------------------------------------------
-- 5. ENTITI INDIVIDU ASET ALIH (ASSETS - 3NF)
-- Memisahkan item inventori daripada bilik, membolehkan perpindahan lokasi
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  no_siri_pendaftaran TEXT NOT NULL UNIQUE,  -- cth: 'KPT/PKS/H/07/13'
  keterangan TEXT NOT NULL,
  kategori_id TEXT NOT NULL,                 -- FK ke asset_categories
  location_id TEXT NOT NULL,                 -- Lokasi penempatan fizikal semasa
  tarikh_penempatan TEXT,
  status_fizikal TEXT DEFAULT 'Baik',        -- 'Baik', 'Rosak', 'Usang', 'Hilang'
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE RESTRICT,
  FOREIGN KEY (kategori_id) REFERENCES asset_categories(id)
);

CREATE INDEX IF NOT EXISTS idx_assets_loc ON assets(location_id);
CREATE INDEX IF NOT EXISTS idx_assets_siri ON assets(no_siri_pendaftaran);

-- --------------------------------------------------------------------
-- 6. SESI & JADUAL PEMERIKSAAN FIZIKAL (1PP AM 2.4 - 3NF)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inspection_sessions (
  id TEXT PRIMARY KEY,                       -- cth: 'SESI-2026'
  tahun INTEGER NOT NULL UNIQUE,             -- cth: 2026
  tarikh_mula TEXT NOT NULL,
  tarikh_tamat TEXT NOT NULL,
  tarikh_pra_jkpak TEXT NOT NULL,
  sasaran_peratus INTEGER DEFAULT 100,
  status TEXT DEFAULT 'Aktif'
);

CREATE TABLE IF NOT EXISTS inspection_schedules (
  id TEXT PRIMARY KEY,                       -- cth: 'JAD-2026-001'
  session_id TEXT NOT NULL,                  -- FK ke inspection_sessions
  kod TEXT NOT NULL UNIQUE,                  -- cth: 'JAD/JTMK/2026/01'
  location_id TEXT NOT NULL,                 -- FK ke locations
  department_id TEXT NOT NULL,               -- FK ke departments
  asset_category_id TEXT NOT NULL,           -- FK ke asset_categories
  tarikh_mula TEXT NOT NULL,
  tarikh_tamat TEXT NOT NULL,
  pemeriksa1_id TEXT NOT NULL,               -- FK ke officers (Pemeriksa Silang 1)
  pemeriksa2_id TEXT NOT NULL,               -- FK ke officers (Pemeriksa Silang 2)
  status_id TEXT NOT NULL DEFAULT 'BELUM_MULA',
  catatan TEXT,
  kewpa11_r2_key TEXT,                       -- Kunci objek fail R2 untuk KEW.PA-11 bertandatangan
  created_by_id TEXT,                        -- FK ke officers
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES inspection_sessions(id),
  FOREIGN KEY (location_id) REFERENCES locations(id),
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (asset_category_id) REFERENCES asset_categories(id),
  FOREIGN KEY (pemeriksa1_id) REFERENCES officers(id),
  FOREIGN KEY (pemeriksa2_id) REFERENCES officers(id),
  FOREIGN KEY (status_id) REFERENCES inspection_statuses(id),
  FOREIGN KEY (created_by_id) REFERENCES officers(id)
);

CREATE INDEX IF NOT EXISTS idx_sched_loc ON inspection_schedules(location_id);
CREATE INDEX IF NOT EXISTS idx_sched_dept ON inspection_schedules(department_id);
CREATE INDEX IF NOT EXISTS idx_sched_status ON inspection_schedules(status_id);

-- --------------------------------------------------------------------
-- 7. LAPORAN PEMERIKSAAN & PRA-JKPAK (3NF)
-- Memisahkan metrik penemuan fizikal daripada jadual
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inspection_reports (
  id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL UNIQUE,
  kuantiti_diperiksa INTEGER NOT NULL DEFAULT 0,
  bil_elok INTEGER NOT NULL DEFAULT 0,
  bil_rosak INTEGER NOT NULL DEFAULT 0,
  bil_usang INTEGER NOT NULL DEFAULT 0,
  bil_hilang INTEGER NOT NULL DEFAULT 0,
  justifikasi_kerosakan TEXT,
  syor_tindakan TEXT,
  disahkan_oleh_id TEXT,
  tarikh_pengesahan TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (schedule_id) REFERENCES inspection_schedules(id) ON DELETE CASCADE,
  FOREIGN KEY (disahkan_oleh_id) REFERENCES officers(id)
);

-- --------------------------------------------------------------------
-- 8. LOG AUDIT PBAC & DOKUMEN R2 CLOUDFLARE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pbac_audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT DEFAULT (datetime('now')),
  actor_id TEXT,
  actor_name TEXT NOT NULL,
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  department_id TEXT NOT NULL,
  status TEXT NOT NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE INDEX IF NOT EXISTS idx_audit_time ON pbac_audit_logs(timestamp);

CREATE TABLE IF NOT EXISTS kewpa7_documents (
  id TEXT PRIMARY KEY,
  location_id TEXT,
  r2_file_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT DEFAULT 'application/pdf',
  extracted_json TEXT,
  ai_model_used TEXT DEFAULT '@cf/meta/llama-3.1-8b-instruct',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (location_id) REFERENCES locations(id)
);

-- --------------------------------------------------------------------
-- 8b. KREDENSIAL PEGAWAI (AUTH - PBKDF2-SHA256, TIADA KATA LALUAN MENTAH)
-- Satu baris bagi setiap pegawai yang telah mengaktifkan akaun portal.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS officer_credentials (
  officer_id TEXT PRIMARY KEY,
  emel TEXT NOT NULL UNIQUE,                 -- salinan untuk carian pantas
  password_hash TEXT NOT NULL,               -- hex PBKDF2-SHA256
  salt TEXT NOT NULL,                        -- hex 16 bait rawak
  iterations INTEGER NOT NULL DEFAULT 25000,
  activated_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (officer_id) REFERENCES officers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cred_emel ON officer_credentials(emel);

-- Bendera keselamatan kredensial (jadual sampingan supaya ALTER TABLE tidak diperlukan).
-- must_change = 1 apabila pentadbir menjana kata laluan sementara; pengguna wajib
-- menukarnya sebelum boleh menggunakan portal.
CREATE TABLE IF NOT EXISTS credential_flags (
  officer_id TEXT PRIMARY KEY,
  must_change INTEGER NOT NULL DEFAULT 1,
  issued_by TEXT,
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (officer_id) REFERENCES officers(id) ON DELETE CASCADE
);

-- --------------------------------------------------------------------
-- 9. PBAC: PERANAN (ROLES) & LANTIKAN BERSKOP (ROLE ASSIGNMENTS - 3NF)
-- Peranan = keupayaan; sekatan konteks disimpan sebagai lantikan berskop
-- dan bertempoh (valid_from/valid_to), bukan sebagai atribut pengguna.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,                       -- 'PEMERIKSA', 'PENYELIA_LOKASI', ...
  nama TEXT NOT NULL,
  scope_type TEXT NOT NULL DEFAULT 'GLOBAL', -- 'GLOBAL' | 'DEPARTMENT' | 'LOCATION'
  default_tenure_months INTEGER,             -- PEMERIKSA = 24 bulan, NULL = sehingga ditamatkan
  keterangan TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS role_assignments (
  id TEXT PRIMARY KEY,
  officer_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  scope_type TEXT NOT NULL DEFAULT 'GLOBAL',
  scope_id TEXT,                             -- department_id / location_id / NULL bagi GLOBAL
  valid_from TEXT NOT NULL,                  -- YYYY-MM-DD (tarikh lantikan)
  valid_to TEXT,                             -- NULL = sehingga ditamatkan
  status TEXT NOT NULL DEFAULT 'AKTIF',      -- 'AKTIF' | 'DITAMATKAN'
  notes TEXT,
  created_by_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (officer_id) REFERENCES officers(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (created_by_id) REFERENCES officers(id)
);

CREATE INDEX IF NOT EXISTS idx_role_assign_officer ON role_assignments(officer_id, role_id, valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_role_assign_scope ON role_assignments(scope_type, scope_id);

-- Kamus peranan sistem (idempotent: selamat dijalankan berulang kali)
-- `roles` menyimpan kedua-dua dimensi: JAWATAN (jawatan hakiki HR) dan LANTIKAN
-- (kuasa bertempoh). Kategori disimpan dalam jadual sampingan `role_category`
-- supaya tiada ALTER TABLE diperlukan.
INSERT INTO roles (id, nama, scope_type, default_tenure_months, keterangan) VALUES
  ('KETUA_JABATAN', 'Ketua Jabatan / Unit (KJ/KU)', 'DEPARTMENT', NULL, 'Ketua jabatan / unit pemilik aset.'),
  ('KETUA_PROGRAM', 'Ketua Program (KP)', 'DEPARTMENT', NULL, 'Ketua program pengajian.'),
  ('PEGAWAI_ASET', 'Pegawai Aset (PA)', 'DEPARTMENT', NULL, 'Pegawai aset jabatan/unit pemilik aset.'),
  ('PENOLONG_PEGAWAI_ASET', 'Penolong Pegawai Aset Jabatan/Unit (PPAJ/PPAU)', 'DEPARTMENT', NULL, 'Penolong pegawai aset jabatan/unit pemilik aset.'),
  ('PENYELIA_LOKASI', 'Penyelia Lokasi (PL)', 'LOCATION', NULL, 'Pegawai penjaga/pengawal ruang aset (KEW.PA-7).'),
  ('PENSYARAH', 'Pensyarah / Pegawai Akademik', 'DEPARTMENT', NULL, 'Jawatan lalai staf akademik tanpa jawatan pentadbiran aset.'),
  ('PEMERIKSA', 'Pegawai Pemeriksa (PP)', 'GLOBAL', 24, 'LANTIKAN pemeriksa fizikal aset (1PP AM 2.4). Tempoh 2 tahun, boleh diperbaharui.'),
  ('PENTADBIR_SISTEM', 'Pentadbir Sistem', 'GLOBAL', NULL, 'Pentadbir sistem (superadmin) — unit SISTEM, bukan unit operasi.')
ON CONFLICT(id) DO UPDATE SET
  nama = excluded.nama,
  scope_type = excluded.scope_type,
  default_tenure_months = excluded.default_tenure_months,
  keterangan = excluded.keterangan;

-- Kategori peranan: JAWATAN (1 pegawai = 1, kekal) vs LANTIKAN (0..n, bertempoh).
CREATE TABLE IF NOT EXISTS role_category (
  role_id TEXT PRIMARY KEY,
  kategori TEXT NOT NULL CHECK (kategori IN ('JAWATAN', 'LANTIKAN')),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

INSERT INTO role_category (role_id, kategori) VALUES
  ('KETUA_JABATAN', 'JAWATAN'),
  ('KETUA_PROGRAM', 'JAWATAN'),
  ('PEGAWAI_ASET', 'JAWATAN'),
  ('PENOLONG_PEGAWAI_ASET', 'JAWATAN'),
  ('PENYELIA_LOKASI', 'JAWATAN'),
  ('PENSYARAH', 'JAWATAN'),
  ('PEMERIKSA', 'LANTIKAN'),
  ('PENTADBIR_SISTEM', 'LANTIKAN')
ON CONFLICT(role_id) DO UPDATE SET kategori = excluded.kategori;

-- Migrasi data: officers.peranan -> role_assignments (idempotent).
-- Penjaga: (a) tiada baris RA-MIG dengan id sama, dan (b) tiada lantikan AKTIF lain
-- bagi peranan yang sama — supaya pegawai yang mendaftar melalui UI (yang sudah
-- menerima lantikan automatik) tidak menerima lantikan pendua apabila migrasi diulang.
-- Pegawai pemegang tempat (emel auto 'peg-…@poliku.edu.my') dikecualikan: mereka
-- hanyalah nama sementara pada jadual dan bukan pemeriksa yang dilantik.

-- Bersih: tutup lantikan RA-MIG yang bertindih dengan lantikan aktif lain.
UPDATE role_assignments
SET status = 'DITAMATKAN', valid_to = date('now'), updated_at = datetime('now')
WHERE id LIKE 'RA-MIG-%'
  AND status = 'AKTIF'
  AND EXISTS (
    SELECT 1 FROM role_assignments other
    WHERE other.officer_id = role_assignments.officer_id
      AND other.role_id = role_assignments.role_id
      AND other.id <> role_assignments.id
      AND other.id NOT LIKE 'RA-MIG-%'
      AND other.status = 'AKTIF'
      AND other.valid_from <= date('now')
      AND (other.valid_to IS NULL OR other.valid_to >= date('now'))
  );

-- Bersih: pegawai pemegang tempat (emel auto 'peg-…@poliku.edu.my') bukan pemeriksa
-- yang dilantik — tutup lantikan yang tercipta sebelum penapis ini diperkenalkan.
UPDATE role_assignments
SET status = 'DITAMATKAN', valid_to = date('now'), updated_at = datetime('now')
WHERE status = 'AKTIF'
  AND id LIKE 'RA-MIG-%'
  AND officer_id IN (SELECT id FROM officers WHERE emel LIKE 'peg-%@poliku.edu.my');

INSERT INTO role_assignments (id, officer_id, role_id, scope_type, scope_id, valid_from, valid_to, status, notes)
SELECT 'RA-MIG-' || o.id || '-PEMERIKSA', o.id, 'PEMERIKSA', 'GLOBAL', NULL,
       date('now'), date('now', '+24 months'), 'AKTIF',
       'Migrasi automatik daripada officers.peranan'
FROM officers o
WHERE o.peranan = 'Pegawai Pemeriksa'
  AND o.emel NOT LIKE 'peg-%@poliku.edu.my'
  AND NOT EXISTS (SELECT 1 FROM role_assignments ra WHERE ra.id = 'RA-MIG-' || o.id || '-PEMERIKSA')
  AND NOT EXISTS (
    SELECT 1 FROM role_assignments ra
    WHERE ra.officer_id = o.id AND ra.role_id = 'PEMERIKSA' AND ra.status = 'AKTIF'
  );

INSERT INTO role_assignments (id, officer_id, role_id, scope_type, scope_id, valid_from, valid_to, status, notes)
SELECT 'RA-MIG-' || o.id || '-PENYELIA-' || lc.location_id, o.id, 'PENYELIA_LOKASI', 'LOCATION', lc.location_id,
       date('now'), NULL, 'AKTIF', 'Migrasi automatik (penjaga ruang KEW.PA-7)'
FROM officers o
JOIN location_custodians lc ON lc.officer_id = o.id
WHERE o.peranan = 'Penyelia Lokasi'
  AND o.emel NOT LIKE 'peg-%@poliku.edu.my'
  AND NOT EXISTS (SELECT 1 FROM role_assignments ra WHERE ra.id = 'RA-MIG-' || o.id || '-PENYELIA-' || lc.location_id)
  AND NOT EXISTS (
    SELECT 1 FROM role_assignments ra
    WHERE ra.officer_id = o.id AND ra.role_id = 'PENYELIA_LOKASI' AND ra.status = 'AKTIF'
  );

INSERT INTO role_assignments (id, officer_id, role_id, scope_type, scope_id, valid_from, valid_to, status, notes)
SELECT 'RA-MIG-' || o.id || '-PENYELIA-JABATAN', o.id, 'PENYELIA_LOKASI', 'DEPARTMENT', o.department_id,
       date('now'), NULL, 'AKTIF', 'Migrasi automatik (tiada ruang didaftarkan)'
FROM officers o
WHERE o.peranan = 'Penyelia Lokasi'
  AND o.emel NOT LIKE 'peg-%@poliku.edu.my'
  AND NOT EXISTS (SELECT 1 FROM role_assignments ra WHERE ra.id = 'RA-MIG-' || o.id || '-PENYELIA-JABATAN')
  AND NOT EXISTS (SELECT 1 FROM location_custodians lc WHERE lc.officer_id = o.id)
  AND NOT EXISTS (
    SELECT 1 FROM role_assignments ra
    WHERE ra.officer_id = o.id AND ra.role_id = 'PENYELIA_LOKASI' AND ra.status = 'AKTIF'
  );

INSERT INTO role_assignments (id, officer_id, role_id, scope_type, scope_id, valid_from, valid_to, status, notes)
SELECT 'RA-MIG-' || o.id || '-PENOLONG-PEGAWAI-ASET', o.id, 'PENOLONG_PEGAWAI_ASET', 'DEPARTMENT', o.department_id,
       date('now'), NULL, 'AKTIF', 'Migrasi automatik daripada officers.peranan'
FROM officers o
WHERE o.peranan = 'Penolong Pegawai Aset Jabatan/Unit'
  AND o.emel NOT LIKE 'peg-%@poliku.edu.my'
  AND NOT EXISTS (SELECT 1 FROM role_assignments ra WHERE ra.id = 'RA-MIG-' || o.id || '-PENOLONG-PEGAWAI-ASET')
  AND NOT EXISTS (
    SELECT 1 FROM role_assignments ra
    WHERE ra.officer_id = o.id AND ra.role_id = 'PENOLONG_PEGAWAI_ASET' AND ra.status = 'AKTIF'
  );

INSERT INTO role_assignments (id, officer_id, role_id, scope_type, scope_id, valid_from, valid_to, status, notes)
SELECT 'RA-MIG-' || o.id || '-KETUA-JABATAN', o.id, 'KETUA_JABATAN', 'DEPARTMENT', o.department_id,
       date('now'), NULL, 'AKTIF', 'Migrasi automatik daripada officers.peranan'
FROM officers o
WHERE o.peranan = 'Ketua Jabatan'
  AND o.emel NOT LIKE 'peg-%@poliku.edu.my'
  AND NOT EXISTS (SELECT 1 FROM role_assignments ra WHERE ra.id = 'RA-MIG-' || o.id || '-KETUA-JABATAN')
  AND NOT EXISTS (
    SELECT 1 FROM role_assignments ra
    WHERE ra.officer_id = o.id AND ra.role_id = 'KETUA_JABATAN' AND ra.status = 'AKTIF'
  );

INSERT INTO role_assignments (id, officer_id, role_id, scope_type, scope_id, valid_from, valid_to, status, notes)
SELECT 'RA-MIG-' || o.id || '-KETUA-PROGRAM', o.id, 'KETUA_PROGRAM', 'DEPARTMENT', o.department_id,
       date('now'), NULL, 'AKTIF', 'Migrasi automatik daripada officers.peranan'
FROM officers o
WHERE o.peranan = 'Ketua Program'
  AND o.emel NOT LIKE 'peg-%@poliku.edu.my'
  AND NOT EXISTS (SELECT 1 FROM role_assignments ra WHERE ra.id = 'RA-MIG-' || o.id || '-KETUA-PROGRAM')
  AND NOT EXISTS (
    SELECT 1 FROM role_assignments ra
    WHERE ra.officer_id = o.id AND ra.role_id = 'KETUA_PROGRAM' AND ra.status = 'AKTIF'
  );

INSERT INTO role_assignments (id, officer_id, role_id, scope_type, scope_id, valid_from, valid_to, status, notes)
SELECT 'RA-MIG-' || o.id || '-PENTADBIR-SISTEM', o.id, 'PENTADBIR_SISTEM', 'GLOBAL', NULL,
       date('now'), NULL, 'AKTIF', 'Migrasi automatik daripada officers.peranan'
FROM officers o
WHERE o.peranan = 'Pentadbir Sistem'
  AND o.emel NOT LIKE 'peg-%@poliku.edu.my'
  AND NOT EXISTS (SELECT 1 FROM role_assignments ra WHERE ra.id = 'RA-MIG-' || o.id || '-PENTADBIR-SISTEM')
  AND NOT EXISTS (
    SELECT 1 FROM role_assignments ra
    WHERE ra.officer_id = o.id AND ra.role_id = 'PENTADBIR_SISTEM' AND ra.status = 'AKTIF'
  );

-- --------------------------------------------------------------------
-- 9b. KITARAN PEMERIKSAAN & AGIHAN (INSPECTION CYCLES & ASSIGNMENTS)
-- Kitaran dijana setiap sesi; senarai lokasi layak dijana untuk tuntutan
-- oleh pegawai pemeriksa (model tuntutan kendiri yang sedia ada).
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inspection_cycles (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  kod TEXT NOT NULL UNIQUE,
  mode TEXT NOT NULL DEFAULT 'SEHALA',        -- 'SEHALA' | 'TIMBAL_BALIK'
  tarikh_mula TEXT NOT NULL,
  tarikh_tamat TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAF',        -- 'DRAF' | 'AKTIF' | 'SELESAI'
  snapshot_at TEXT,                           -- masa pasangan timbal balik dikunci
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES inspection_sessions(id)
);

CREATE TABLE IF NOT EXISTS inspection_assignments (
  id TEXT PRIMARY KEY,
  cycle_id TEXT NOT NULL,
  schedule_id TEXT,                           -- diisi apabila slot dituntut
  location_id TEXT NOT NULL,
  asset_id TEXT,                              -- agihan per-aset (pilihan)
  inspector_id TEXT,                          -- NULL = masih dalam kolam layak
  slot INTEGER,                               -- 1 atau 2 apabila dituntut
  status TEXT NOT NULL DEFAULT 'DITAWARKAN',  -- 'DITAWARKAN' | 'DITUNTUT' | 'DIBATALKAN'
  claimed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (cycle_id) REFERENCES inspection_cycles(id) ON DELETE CASCADE,
  FOREIGN KEY (schedule_id) REFERENCES inspection_schedules(id) ON DELETE SET NULL,
  FOREIGN KEY (location_id) REFERENCES locations(id),
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL,
  FOREIGN KEY (inspector_id) REFERENCES officers(id)
);

CREATE INDEX IF NOT EXISTS idx_assign_cycle ON inspection_assignments(cycle_id, status);
CREATE INDEX IF NOT EXISTS idx_assign_inspector ON inspection_assignments(inspector_id, cycle_id);
CREATE INDEX IF NOT EXISTS idx_assign_location ON inspection_assignments(location_id);

-- Satu slot (1/2) bagi setiap lokasi dalam sesuatu kitaran tidak boleh dituntut dua kali.
CREATE UNIQUE INDEX IF NOT EXISTS ux_assign_slot ON inspection_assignments(cycle_id, location_id, slot)
  WHERE slot IS NOT NULL;

-- Snapshot pasangan timbal balik yang dikunci semasa kitaran bermula (rujukan §6.5).
CREATE TABLE IF NOT EXISTS inspection_cycle_snapshots (
  id TEXT PRIMARY KEY,
  cycle_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_by_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (cycle_id) REFERENCES inspection_cycles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cycle_snapshot ON inspection_cycle_snapshots(cycle_id);

-- Jejak penugasan semula: apabila pegawai tamat lantikan/bertukar jabatan, pentadbir
-- mesti menugaskan semula secara eksplisit (tiada perubahan senyap).
CREATE TABLE IF NOT EXISTS inspection_reassignments (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL,
  cycle_id TEXT NOT NULL,
  from_officer_id TEXT,
  to_officer_id TEXT,
  reason TEXT NOT NULL,
  note TEXT,
  created_by_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (assignment_id) REFERENCES inspection_assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (cycle_id) REFERENCES inspection_cycles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reassign_cycle ON inspection_reassignments(cycle_id);

-- --------------------------------------------------------------------
-- 9c. NOTIFIKASI LANTIKAN (peringatan luput 60 hari + lantikan tamat)
-- Ditulis oleh Cron Trigger (`scheduled`) dan/atau imbasan manual pentadbir.
-- UNIQUE(assignment_id, jenis) memastikan notifikasi tidak berulang.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenure_notices (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL,
  officer_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  jenis TEXT NOT NULL,                       -- 'LUPUT_60_HARI' | 'TAMAT'
  tarikh_luput TEXT,
  mesej TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',  -- 'info' | 'warning' | 'critical'
  status TEXT NOT NULL DEFAULT 'BARU',       -- 'BARU' | 'DIBACA'
  created_at TEXT DEFAULT (datetime('now')),
  read_at TEXT,
  FOREIGN KEY (assignment_id) REFERENCES role_assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (officer_id) REFERENCES officers(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_notice_assignment ON tenure_notices(assignment_id, jenis);
CREATE INDEX IF NOT EXISTS idx_notice_status ON tenure_notices(status, created_at);

-- --------------------------------------------------------------------
-- 9d. PENJANAAN MOD PEMERIKSAAN (UNIT PAIRING & GROUP TARGETS)
-- Mod ditentukan per pasangan unit (bukan per kitaran). Parameter Q/τ/1.25/1.5
-- boleh dilaras setiap kitaran dan setiap pelarasan dicatat dalam audit.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cycle_parameters (
  cycle_id TEXT PRIMARY KEY,
  quota_q REAL NOT NULL DEFAULT 120,
  tolerance_tau REAL NOT NULL DEFAULT 0.2,
  overload_factor REAL NOT NULL DEFAULT 1.25,
  split_factor REAL NOT NULL DEFAULT 1.5,
  odd_unit_policy TEXT NOT NULL DEFAULT 'SIMPANAN', -- 'SIMPANAN' | 'TIGA'
  plan_version INTEGER NOT NULL DEFAULT 0,
  locked_at TEXT,
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (cycle_id) REFERENCES inspection_cycles(id) ON DELETE CASCADE
);

-- Snapshot kiraan aset/pemeriksa bagi setiap unit pada masa pelan dikunci
CREATE TABLE IF NOT EXISTS cycle_unit_stats (
  id TEXT PRIMARY KEY,
  cycle_id TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  asset_count INTEGER NOT NULL DEFAULT 0,
  inspector_count INTEGER NOT NULL DEFAULT 0,
  group_count INTEGER NOT NULL DEFAULT 0,
  reserve_count INTEGER NOT NULL DEFAULT 0,
  plan_version INTEGER NOT NULL DEFAULT 0,
  computed_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (cycle_id) REFERENCES inspection_cycles(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id) REFERENCES departments(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_unit_stats ON cycle_unit_stats(cycle_id, unit_id, plan_version);

CREATE TABLE IF NOT EXISTS inspector_groups (
  id TEXT PRIMARY KEY,
  cycle_id TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  label TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 2,
  plan_version INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (cycle_id) REFERENCES inspection_cycles(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id) REFERENCES departments(id)
);

CREATE INDEX IF NOT EXISTS idx_group_cycle ON inspector_groups(cycle_id, plan_version);

CREATE TABLE IF NOT EXISTS group_members (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  officer_id TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 1,
  is_reserve INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (group_id) REFERENCES inspector_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (officer_id) REFERENCES officers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_group_member_officer ON group_members(officer_id);

CREATE TABLE IF NOT EXISTS unit_pairings (
  id TEXT PRIMARY KEY,
  cycle_id TEXT NOT NULL,
  unit_a TEXT NOT NULL,
  unit_b TEXT,
  mode TEXT NOT NULL DEFAULT 'SEHALA',       -- 'TIMBAL_BALIK' | 'SEHALA'
  weight_ab REAL,
  weight_ba REAL,
  reason TEXT,
  plan_version INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (cycle_id) REFERENCES inspection_cycles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pairing_cycle ON unit_pairings(cycle_id, plan_version);

CREATE TABLE IF NOT EXISTS group_targets (
  id TEXT PRIMARY KEY,
  cycle_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  target_unit_id TEXT,
  asset_count INTEGER NOT NULL DEFAULT 0,
  direction TEXT NOT NULL DEFAULT 'SEHALA',  -- 'TIMBAL_BALIK' | 'SEHALA'
  split_index INTEGER NOT NULL DEFAULT 0,
  schedule_id TEXT,
  plan_version INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (cycle_id) REFERENCES inspection_cycles(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES inspector_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_group_target_cycle ON group_targets(cycle_id, plan_version);
CREATE INDEX IF NOT EXISTS idx_group_target_group ON group_targets(group_id);



-- --------------------------------------------------------------------
-- 10. PANDANGAN BERGABUNG 3NF (DENORMALIZED SQL VIEWS FOR PERFORMANCE)
-- Memudahkan pertanyaan API tanpa perlu menulis JOIN yang berulang
-- Views are recreated on every migration so their columns stay in sync.
-- --------------------------------------------------------------------
DROP VIEW IF EXISTS v_locations_full;
CREATE VIEW v_locations_full AS
SELECT 
  l.id,
  l.kod_ruang AS kodRuang,
  l.nama,
  l.department_id AS jabatan,
  d.nama AS namaJabatan,
  rc.nama AS kategoriRuang,
  b.nama AS bangunan,
  l.aras,
  l.latitude,
  l.longitude,
  s.nama AS statusPemeriksaan,
  l.tarikh_terakhir_diperiksa AS tarikhTerakhirDiperiksa,
  (SELECT COUNT(*) FROM assets a WHERE a.location_id = l.id) AS anggaranAset,
  -- Pegawai penjaga disegerakkan dengan Direktori Pegawai: lantikan aktif PENYELIA_LOKASI
  -- (skop LOCATION) mengatasi rekod penjaga; jika tiada, guna location_custodians.
  COALESCE(
    (SELECT o.nama FROM role_assignments ra
       JOIN officers o ON o.id = ra.officer_id
      WHERE ra.scope_type = 'LOCATION' AND ra.scope_id = l.id
        AND ra.role_id = 'PENYELIA_LOKASI' AND ra.status = 'AKTIF'
        AND (ra.valid_to IS NULL OR ra.valid_to >= date('now'))
      ORDER BY ra.valid_from DESC LIMIT 1),
    (SELECT o.nama FROM location_custodians lc JOIN officers o ON lc.officer_id = o.id WHERE lc.location_id = l.id LIMIT 1),
    'Belum Dilantik'
  ) AS penjaga,
  COALESCE(
    (SELECT o.jawatan FROM role_assignments ra
       JOIN officers o ON o.id = ra.officer_id
      WHERE ra.scope_type = 'LOCATION' AND ra.scope_id = l.id
        AND ra.role_id = 'PENYELIA_LOKASI' AND ra.status = 'AKTIF'
        AND (ra.valid_to IS NULL OR ra.valid_to >= date('now'))
      ORDER BY ra.valid_from DESC LIMIT 1),
    (SELECT o.jawatan FROM location_custodians lc JOIN officers o ON lc.officer_id = o.id WHERE lc.location_id = l.id LIMIT 1),
    ''
  ) AS penjagaJawatan,
  COALESCE(
    (SELECT o.emel FROM role_assignments ra
       JOIN officers o ON o.id = ra.officer_id
      WHERE ra.scope_type = 'LOCATION' AND ra.scope_id = l.id
        AND ra.role_id = 'PENYELIA_LOKASI' AND ra.status = 'AKTIF'
        AND (ra.valid_to IS NULL OR ra.valid_to >= date('now'))
      ORDER BY ra.valid_from DESC LIMIT 1),
    (SELECT o.emel FROM location_custodians lc JOIN officers o ON lc.officer_id = o.id WHERE lc.location_id = l.id LIMIT 1),
    ''
  ) AS penjagaEmel,
  COALESCE(
    (SELECT o.telefon FROM role_assignments ra
       JOIN officers o ON o.id = ra.officer_id
      WHERE ra.scope_type = 'LOCATION' AND ra.scope_id = l.id
        AND ra.role_id = 'PENYELIA_LOKASI' AND ra.status = 'AKTIF'
        AND (ra.valid_to IS NULL OR ra.valid_to >= date('now'))
      ORDER BY ra.valid_from DESC LIMIT 1),
    (SELECT o.telefon FROM location_custodians lc JOIN officers o ON lc.officer_id = o.id WHERE lc.location_id = l.id LIMIT 1),
    ''
  ) AS penjagaTel,
  (SELECT s.id FROM inspection_schedules s WHERE s.location_id = l.id ORDER BY s.tarikh_mula DESC LIMIT 1) AS jadualId,
  (SELECT k.id FROM kewpa7_documents k WHERE k.location_id = l.id ORDER BY k.created_at DESC LIMIT 1) AS kewpa7TerkiniId,
  (SELECT k.created_at FROM kewpa7_documents k WHERE k.location_id = l.id ORDER BY k.created_at DESC LIMIT 1) AS tarikhKemaskiniKewpa7
FROM locations l
JOIN departments d ON l.department_id = d.id
JOIN buildings b ON l.building_id = b.id
JOIN room_categories rc ON l.category_id = rc.id
JOIN inspection_statuses s ON l.status_id = s.id;

DROP VIEW IF EXISTS v_schedules_full;
CREATE VIEW v_schedules_full AS
SELECT
  s.id,
  s.kod,
  s.department_id AS jabatan,
  loc.nama AS lokasi,
  loc.kod_ruang AS kodRuang,
  ac.nama AS kategori,
  (SELECT COUNT(*) FROM assets a WHERE a.location_id = s.location_id) AS kuantiti,
  s.tarikh_mula AS tarikhMula,
  s.tarikh_tamat AS tarikhTamat,
  p1.nama AS pemeriksa1,
  p1.emel AS pemeriksa1Email,
  p2.nama AS pemeriksa2,
  p2.emel AS pemeriksa2Email,
  COALESCE(
    (SELECT o.nama FROM location_custodians lc JOIN officers o ON o.id = lc.officer_id WHERE lc.location_id = s.location_id LIMIT 1),
    'Belum Dilantik'
  ) AS penjaga,
  st.nama AS status,
  s.catatan,
  s.kewpa11_r2_key AS kewpa11DocKey,
  cb.nama AS createdBy,
  s.created_at AS createdAt,
  r.bil_elok AS bilElok,
  r.bil_rosak AS bilRosak,
  r.bil_usang AS bilUsang,
  r.bil_hilang AS bilHilang,
  r.syor_tindakan AS syorTindakan,
  r.tarikh_pengesahan AS tarikhPengesahan
FROM inspection_schedules s
JOIN locations loc ON loc.id = s.location_id
JOIN asset_categories ac ON ac.id = s.asset_category_id
JOIN inspection_statuses st ON st.id = s.status_id
JOIN officers p1 ON p1.id = s.pemeriksa1_id
JOIN officers p2 ON p2.id = s.pemeriksa2_id
LEFT JOIN officers cb ON cb.id = s.created_by_id
LEFT JOIN inspection_reports r ON r.schedule_id = s.id;

-- ====================================================================
-- SEED DATA 3NF: POLITEKNIK KUCHING SARAWAK
-- ====================================================================

-- 1. Departments
-- Benih jabatan: HANYA semasa pemasangan baharu (jadual kosong).
-- Selepas direktori diuruskan oleh pentadbir, migrasi tidak menambah semula baris yang dipadam.
CREATE TABLE IF NOT EXISTS _seed_departments (id TEXT PRIMARY KEY, nama TEXT NOT NULL, cp TEXT);
DELETE FROM _seed_departments;
INSERT INTO _seed_departments (id, nama, cp) VALUES
  ('JTMK', 'Jabatan Teknologi Maklumat & Komunikasi', 'JKE'),
  ('JKE', 'Jabatan Kejuruteraan Elektrik', 'JTMK'),
  ('JKM', 'Jabatan Kejuruteraan Mekanikal', 'JKA'),
  ('JKA', 'Jabatan Kejuruteraan Awam', 'JKM'),
  ('JP', 'Jabatan Perdagangan', 'PENTADBIRAN'),
  ('JMSK', 'Jabatan Matematik, Sains & Komputer', 'PENTADBIRAN'),
  ('PENTADBIRAN', 'Unit Pentadbiran & Pengurusan Aset POLIKU', 'JMSK'),
  ('PSA', 'Pusat Sumber & Perpustakaan POLIKU', 'HEP'),
  ('HEP', 'Jabatan Hal Ehwal Pelajar', 'PSA'),
  ('CISEC', 'Unit CISEC & Pembelajaran Digital', 'ULPL'),
  ('ULPL', 'Unit Latihan & Pendidikan Lanjutan', 'CISEC');

CREATE TABLE IF NOT EXISTS _seed_guard (kosong INTEGER);
DELETE FROM _seed_guard;
INSERT INTO _seed_guard (kosong) SELECT CASE WHEN COUNT(*) = 0 THEN 1 ELSE 0 END FROM departments;

INSERT INTO departments (id, nama, cross_partner_id)
SELECT s.id, s.nama, s.cp FROM _seed_departments s, _seed_guard g WHERE g.kosong = 1;

DROP TABLE IF EXISTS _seed_guard;
DROP TABLE IF EXISTS _seed_departments;

-- --------------------------------------------------------------------
-- 1.1b UNIT SISTEM (bukan operasi) & TANDA OPERASI JABATAN
-- Akaun pentadbir sistem memerlukan jabatan (FK officers.department_id)
-- tetapi bukan unit operasi: tiada aset, tiada kumpulan pemeriksa, dan
-- dikecualikan daripada pasangan silang / penjanaan kitaran.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS department_settings (
  department_id TEXT PRIMARY KEY,
  is_operational INTEGER NOT NULL DEFAULT 1,   -- 0 = unit sistem/pentadbiran
  keterangan TEXT,
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

INSERT INTO departments (id, nama, cross_partner_id)
SELECT 'SISTEM', 'Pentadbiran Sistem (Bukan Unit Operasi)', NULL
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE id = 'SISTEM');

INSERT INTO department_settings (department_id, is_operational, keterangan)
VALUES ('SISTEM', 0, 'Akaun pentadbir sistem; dikecualikan daripada pasangan silang dan penjanaan kitaran.')
ON CONFLICT(department_id) DO UPDATE SET
  is_operational = 0,
  keterangan = excluded.keterangan;

-- Pindahkan akaun pentadbir "tulen" (tiada peranan operasi) ke unit SISTEM.
UPDATE officers
SET department_id = 'SISTEM', updated_at = datetime('now')
WHERE department_id <> 'SISTEM'
  AND EXISTS (
    SELECT 1 FROM role_assignments ra
    WHERE ra.officer_id = officers.id AND ra.role_id = 'PENTADBIR_SISTEM' AND ra.status = 'AKTIF'
  )
  AND NOT EXISTS (
    SELECT 1 FROM role_assignments ro
    WHERE ro.officer_id = officers.id
      AND ro.role_id IN ('PEMERIKSA','PENYELIA_LOKASI','PENOLONG_PEGAWAI_ASET')
      AND ro.status = 'AKTIF'
  );

-- 2. Buildings
INSERT OR IGNORE INTO buildings (id, kod, nama, kampus_zon, default_latitude, default_longitude) VALUES
('BLOK-E', 'BGN-E', 'Blok E (Teknologi Maklumat)', 'Zon ICT & Multimedia', 1.621810, 110.324100),
('BLOK-C', 'BGN-C', 'Blok C (Kejuruteraan Elektrik)', 'Zon Elektrik', 1.621050, 110.322900),
('BLOK-B', 'BGN-B', 'Blok B (Kejuruteraan Awam)', 'Zon Awam', 1.620800, 110.324500),
('BENGKEL-JKM', 'BGN-JKM', 'Kompleks Bengkel Kejuruteraan Mekanikal', 'Zon Mekanikal', 1.621425, 110.323580),
('BLOK-D', 'BGN-D', 'Blok D (Perdagangan)', 'Zon Perdagangan', 1.622100, 110.323800),
('BLOK-A', 'BGN-A', 'Blok A (Sains Gunaan & JMSK)', 'Zon Sains', 1.621650, 110.322300),
('BGN-PENT', 'BGN-ADM', 'Bangunan Pentadbiran Utama & UAP', 'Zon Pentadbiran', 1.622500, 110.323000),
('BGN-PSA', 'BGN-LIB', 'Kompleks Perpustakaan POLIKU', 'Zon Pusat Sumber', 1.622350, 110.324400),
('BGN-HEP', 'BGN-STU', 'Pusat Aktiviti Pelajar', 'Zon Pelajar', 1.621200, 110.324800),
('BGN-STOR', 'BGN-STR', 'Gudang Stor Pusat Pelupusan', 'Zon Logistik', 1.620300, 110.323200);

-- 3. Room Categories
INSERT OR IGNORE INTO room_categories (id, nama) VALUES
('MAKMAL_KOMPUTER', 'Makmal Komputer'),
('BENGKEL_TEKNIKAL', 'Bengkel Teknikal'),
('BILIK_KULIAH', 'Bilik Kuliah'),
('BILIK_PELAYAN', 'Bilik Pelayan'),
('STOR_ARKIB', 'Stor & Arkib'),
('STUDIO', 'Studio'),
('PUSAT_SUMBER', 'Pusat Sumber'),
('PEJABAT', 'Pejabat Pentadbiran');

-- 4. Inspection Statuses
INSERT OR IGNORE INTO inspection_statuses (id, nama, warna_kod) VALUES
('BELUM_MULA', 'Belum Mula', '#475569'),
('SEDANG', 'Sedang Dijalankan', '#d97706'),
('SELESAI', 'Selesai', '#059669'),
('TANGGUH', 'Tertangguh', '#dc2626');

-- 5. Asset Categories
INSERT OR IGNORE INTO asset_categories (id, nama) VALUES
('SEMUA', 'Semua (Harta Modal & Aset Bernilai Rendah)'),
('HARTA_MODAL', 'Harta Modal Sahaja'),
('ASET_RENDAH', 'Aset Alih Bernilai Rendah Sahaja');

-- 6. Takwim Perancangan Tahunan (Tetapan)
-- Perancangan setahun: banyak tarikh bagi satu sesi (mesyuarat Pra-JKPAK Bil. 1..n,
-- tempoh pemeriksaan, lain-lain). Tiada data contoh — pentadbir menambah sendiri.
CREATE TABLE IF NOT EXISTS annual_calendar (
  id TEXT PRIMARY KEY,
  tahun INTEGER NOT NULL,
  tarikh TEXT NOT NULL,                       -- YYYY-MM-DD
  tajuk TEXT NOT NULL,                        -- cth. 'Mesyuarat Pra-JKPAK Bil. 1'
  kategori TEXT NOT NULL DEFAULT 'LAIN',      -- MESYUARAT_PRA_JKPAK | PEMERIKSAAN | LAIN
  catatan TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE (tahun, tajuk, tarikh)
);

CREATE INDEX IF NOT EXISTS idx_annual_calendar_year ON annual_calendar(tahun, tarikh);

-- ====================================================================
-- NOTA: Skema ini hanya menyemai data rujukan sistem (jabatan, bangunan,
-- kategori ruang, status pemeriksaan, kategori aset). Tiada data contoh.
-- Pegawai, lokasi, jadual pemeriksaan dan aset didaftarkan melalui UI/API.
-- ====================================================================
