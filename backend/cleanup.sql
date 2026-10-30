-- ============================================================================
-- Bersih data operasi ujian sebelum input data sebenar.
--
-- KEKALKAN:
--   • akaun permit: superadmin@poliku.edu.my (+ lantikan PENTADBIR_SISTEM)
--   • jabatan PENTADBIRAN (dirujuk oleh FK officers.department_id)
--   • jadual rujukan: roles, buildings, room_categories,
--     inspection_statuses, asset_categories
--
-- PERINGATAN: operasi tidak boleh dibatalkan. Sandarkan dahulu:
--   npx wrangler d1 export poliku-aset-d1 --remote \
--     --config backend/wrangler.jsonc --output backup-d1.sql
--
-- Guna:
--   npx wrangler d1 execute poliku-aset-d1 --remote \
--     --config backend/wrangler.jsonc --file=backend/cleanup.sql
-- ============================================================================

-- 1. Notifikasi & jejak penugasan semula
DELETE FROM tenure_notices;
DELETE FROM inspection_reassignments;
DELETE FROM inspection_cycle_snapshots;

-- 2. Struktur kitaran pemeriksaan
DELETE FROM group_targets;
DELETE FROM group_members;
DELETE FROM inspector_groups;
DELETE FROM unit_pairings;
DELETE FROM cycle_unit_stats;
DELETE FROM cycle_parameters;
DELETE FROM inspection_assignments;
DELETE FROM inspection_cycles;

-- 3. Jadual, laporan & sesi pemeriksaan
DELETE FROM inspection_reports;
DELETE FROM inspection_schedules;
DELETE FROM inspection_sessions;

-- 4. Aset, lokasi & dokumen
DELETE FROM location_custodians;
DELETE FROM assets;
DELETE FROM kewpa7_documents;
DELETE FROM locations;

-- 5. Jejak audit ujian
DELETE FROM pbac_audit_logs;

-- 6. Akaun pegawai ujian (kecuali superadmin)
DELETE FROM officer_credentials
WHERE officer_id IN (
  SELECT id FROM officers WHERE emel <> 'superadmin@poliku.edu.my'
);

DELETE FROM role_assignments
WHERE officer_id IN (
  SELECT id FROM officers WHERE emel <> 'superadmin@poliku.edu.my'
);

DELETE FROM officers WHERE emel <> 'superadmin@poliku.edu.my';

-- 7. Direktori jabatan — kosongkan kecuali PENTADBIRAN
UPDATE departments SET cross_partner_id = NULL;
DELETE FROM departments WHERE id <> 'PENTADBIRAN';
