-- ---------------------------------------------------------------------------
-- Bersihkan `jawatan` & `peranan` daripada jadual `officers`.
--
-- Peranan kini HANYA disimpan dalam `role_assignments` (peranan + skop + tempoh).
-- Sebelum lajur dibuang, label lama dalam `officers.peranan` di-backfill menjadi
-- lantikan supaya tiada pegawai kehilangan capaian.
--
-- Langkah:
--   1. Backfill lantikan daripada label `peranan` (semua varian label).
--   2. Cipta semula `v_locations_full` supaya `penjagaJawatan` diterbitkan daripada
--      `roles` + `role_assignments` (bukan `officers.jawatan`).
--   3. ALTER TABLE ... DROP COLUMN `jawatan` dan `peranan`.
--
-- Idempotent: DROP COLUMN hanya dijalankan jika lajur masih ada (lihat
-- `scripts/deploy.mjs`, yang memeriksa `PRAGMA table_info(officers)`).
-- ---------------------------------------------------------------------------

-- 1. BACKFILL: Pegawai Pemeriksa -------------------------------------------
INSERT INTO role_assignments (id, officer_id, role_id, scope_type, scope_id, valid_from, valid_to, status, notes)
SELECT 'RA-MIG-' || o.id || '-PEMERIKSA', o.id, 'PEMERIKSA', 'GLOBAL', NULL,
       date('now'), date('now', '+24 months'), 'AKTIF', 'Backfill daripada officers.peranan'
FROM officers o
WHERE lower(trim(o.peranan)) IN ('pegawai pemeriksa (pp)', 'pegawai pemeriksa', 'pp', 'pemeriksa')
  AND o.emel NOT LIKE 'peg-%@poliku.edu.my'
  AND NOT EXISTS (
    SELECT 1 FROM role_assignments ra
    WHERE ra.officer_id = o.id AND ra.role_id = 'PEMERIKSA' AND ra.status = 'AKTIF'
  );

-- 2. BACKFILL: Ketua Jabatan / Unit ----------------------------------------
INSERT INTO role_assignments (id, officer_id, role_id, scope_type, scope_id, valid_from, valid_to, status, notes)
SELECT 'RA-MIG-' || o.id || '-KETUA_JABATAN', o.id, 'KETUA_JABATAN', 'DEPARTMENT', o.department_id,
       date('now'), NULL, 'AKTIF', 'Backfill daripada officers.peranan'
FROM officers o
WHERE lower(trim(o.peranan)) IN ('ketua jabatan / unit (kj/ku)', 'ketua jabatan / unit', 'ketua jabatan', 'kj/ku', 'kj', 'ku')
  AND NOT EXISTS (
    SELECT 1 FROM role_assignments ra
    WHERE ra.officer_id = o.id AND ra.role_id = 'KETUA_JABATAN' AND ra.status = 'AKTIF'
  );

-- 3. BACKFILL: Ketua Program ----------------------------------------------
INSERT INTO role_assignments (id, officer_id, role_id, scope_type, scope_id, valid_from, valid_to, status, notes)
SELECT 'RA-MIG-' || o.id || '-KETUA_PROGRAM', o.id, 'KETUA_PROGRAM', 'DEPARTMENT', o.department_id,
       date('now'), NULL, 'AKTIF', 'Backfill daripada officers.peranan'
FROM officers o
WHERE lower(trim(o.peranan)) IN ('ketua program (kp)', 'ketua program', 'kp')
  AND NOT EXISTS (
    SELECT 1 FROM role_assignments ra
    WHERE ra.officer_id = o.id AND ra.role_id = 'KETUA_PROGRAM' AND ra.status = 'AKTIF'
  );

-- 4. BACKFILL: Pegawai Aset -----------------------------------------------
INSERT INTO role_assignments (id, officer_id, role_id, scope_type, scope_id, valid_from, valid_to, status, notes)
SELECT 'RA-MIG-' || o.id || '-PEGAWAI_ASET', o.id, 'PEGAWAI_ASET', 'DEPARTMENT', o.department_id,
       date('now'), NULL, 'AKTIF', 'Backfill daripada officers.peranan'
FROM officers o
WHERE lower(trim(o.peranan)) IN ('pegawai aset (pa)', 'pegawai aset', 'pa')
  AND NOT EXISTS (
    SELECT 1 FROM role_assignments ra
    WHERE ra.officer_id = o.id AND ra.role_id = 'PEGAWAI_ASET' AND ra.status = 'AKTIF'
  );

-- 5. BACKFILL: Penolong Pegawai Aset (PPAJ/PPAU) --------------------------
INSERT INTO role_assignments (id, officer_id, role_id, scope_type, scope_id, valid_from, valid_to, status, notes)
SELECT 'RA-MIG-' || o.id || '-PPAJ', o.id, 'PENOLONG_PEGAWAI_ASET', 'DEPARTMENT', o.department_id,
       date('now'), NULL, 'AKTIF', 'Backfill daripada officers.peranan'
FROM officers o
WHERE lower(trim(o.peranan)) IN (
        'penolong pegawai aset jabatan/unit (ppaj/ppau)',
        'penolong pegawai aset jabatan/unit',
        'penolong pegawai aset',
        'ppaj/ppau', 'ppaj', 'ppau'
      )
  AND NOT EXISTS (
    SELECT 1 FROM role_assignments ra
    WHERE ra.officer_id = o.id AND ra.role_id = 'PENOLONG_PEGAWAI_ASET' AND ra.status = 'AKTIF'
  );

-- 6. BACKFILL: Pentadbir Sistem ------------------------------------------
INSERT INTO role_assignments (id, officer_id, role_id, scope_type, scope_id, valid_from, valid_to, status, notes)
SELECT 'RA-MIG-' || o.id || '-PENTADBIR', o.id, 'PENTADBIR_SISTEM', 'GLOBAL', NULL,
       date('now'), NULL, 'AKTIF', 'Backfill daripada officers.peranan'
FROM officers o
WHERE lower(trim(o.peranan)) IN ('pentadbir sistem', 'pentadbir')
  AND NOT EXISTS (
    SELECT 1 FROM role_assignments ra
    WHERE ra.officer_id = o.id AND ra.role_id = 'PENTADBIR_SISTEM' AND ra.status = 'AKTIF'
  );

-- 7. BACKFILL: Penyelia Lokasi (skop ruang jika ada penjaga ruang) --------
INSERT INTO role_assignments (id, officer_id, role_id, scope_type, scope_id, valid_from, valid_to, status, notes)
SELECT 'RA-MIG-' || o.id || '-PENYELIA-' || lc.location_id, o.id, 'PENYELIA_LOKASI', 'LOCATION', lc.location_id,
       date('now'), NULL, 'AKTIF', 'Backfill daripada officers.peranan / penjaga ruang'
FROM officers o
JOIN location_custodians lc ON lc.officer_id = o.id
WHERE lower(trim(o.peranan)) IN ('penyelia lokasi (pl)', 'penyelia lokasi', 'pl')
  AND NOT EXISTS (
    SELECT 1 FROM role_assignments ra
    WHERE ra.officer_id = o.id AND ra.role_id = 'PENYELIA_LOKASI'
      AND ra.scope_type = 'LOCATION' AND ra.scope_id = lc.location_id AND ra.status = 'AKTIF'
  );

INSERT INTO role_assignments (id, officer_id, role_id, scope_type, scope_id, valid_from, valid_to, status, notes)
SELECT 'RA-MIG-' || o.id || '-PENYELIA-DEPT', o.id, 'PENYELIA_LOKASI', 'DEPARTMENT', o.department_id,
       date('now'), NULL, 'AKTIF', 'Backfill daripada officers.peranan (tiada penjaga ruang)'
FROM officers o
WHERE lower(trim(o.peranan)) IN ('penyelia lokasi (pl)', 'penyelia lokasi', 'pl')
  AND NOT EXISTS (
    SELECT 1 FROM role_assignments ra
    WHERE ra.officer_id = o.id AND ra.role_id = 'PENYELIA_LOKASI' AND ra.status = 'AKTIF'
  );

-- 8. Bersihkan baki label legacy (peranan kini kosong; paparan dari role_assignments)
UPDATE officers
SET peranan = '', jawatan = '', updated_at = datetime('now')
WHERE COALESCE(peranan, '') <> '' OR COALESCE(jawatan, '') <> '';

-- 9. Cipta semula v_locations_full (definisi terkini) supaya tiada rujukan
--    kepada lajur officers.jawatan yang akan dibuang.
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
  l.kumpulan_aras AS kumpulanAras,
  l.kumpulan_nama AS kumpulanNama,
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
    (SELECT r.nama FROM role_assignments ra
       JOIN roles r ON r.id = ra.role_id
      WHERE ra.scope_type = 'LOCATION' AND ra.scope_id = l.id
        AND ra.role_id = 'PENYELIA_LOKASI' AND ra.status = 'AKTIF'
        AND (ra.valid_to IS NULL OR ra.valid_to >= date('now'))
      ORDER BY ra.valid_from DESC LIMIT 1),
    (SELECT r.nama FROM location_custodians lc
       JOIN role_assignments ra ON ra.officer_id = lc.officer_id AND ra.status = 'AKTIF'
       JOIN roles r ON r.id = ra.role_id
      WHERE lc.location_id = l.id LIMIT 1),
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
