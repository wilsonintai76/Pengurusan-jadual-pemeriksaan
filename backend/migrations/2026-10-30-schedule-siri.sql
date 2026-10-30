-- =============================================================================
-- Migrasi: Siri pemeriksaan + tarikh/pemeriksa boleh kosong
-- =============================================================================
-- Dijalankan SEKALI oleh `scripts/deploy.mjs` apabila lajur `siri` belum wujud
-- (SQLite tidak menyokong ALTER COLUMN untuk membuang NOT NULL, jadi jadual
-- dibina semula). Setiap ruang hanya boleh ada SATU jadual per sesi.
--
-- Keselamatan: semua baris sedia ada disalin; `siri` dianggar daripada bulan
-- `tarikh_mula` (Jan–Apr = 1, Mei–Ogos = 2, Sep–Dis = 3).

DROP VIEW IF EXISTS v_schedules_full;
-- v_locations_full turut merujuk inspection_schedules (subkueri jadualId), jadi ia
-- mesti dibuang sebelum jadual lama digugurkan; schema.sql menciptanya semula.
DROP VIEW IF EXISTS v_locations_full;

DROP TABLE IF EXISTS inspection_schedules_migrasi;

CREATE TABLE inspection_schedules_migrasi (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  kod TEXT NOT NULL UNIQUE,
  location_id TEXT NOT NULL,
  department_id TEXT NOT NULL,
  asset_category_id TEXT NOT NULL,
  siri INTEGER NOT NULL DEFAULT 1,
  tarikh_mula TEXT,
  tarikh_tamat TEXT,
  pemeriksa1_id TEXT,
  pemeriksa2_id TEXT,
  status_id TEXT NOT NULL DEFAULT 'BELUM_MULA',
  catatan TEXT,
  kewpa11_r2_key TEXT,
  created_by_id TEXT,
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

INSERT INTO inspection_schedules_migrasi (
  id, session_id, kod, location_id, department_id, asset_category_id, siri,
  tarikh_mula, tarikh_tamat, pemeriksa1_id, pemeriksa2_id, status_id,
  catatan, kewpa11_r2_key, created_by_id, created_at, updated_at
)
SELECT
  id, session_id, kod, location_id, department_id, asset_category_id,
  CASE
    WHEN tarikh_mula IS NULL OR tarikh_mula = '' THEN 1
    WHEN CAST(strftime('%m', tarikh_mula) AS INTEGER) <= 4 THEN 1
    WHEN CAST(strftime('%m', tarikh_mula) AS INTEGER) <= 8 THEN 2
    ELSE 3
  END,
  NULLIF(tarikh_mula, ''),
  NULLIF(tarikh_tamat, ''),
  pemeriksa1_id,
  pemeriksa2_id,
  status_id,
  catatan,
  kewpa11_r2_key,
  created_by_id,
  created_at,
  updated_at
FROM inspection_schedules;

DROP TABLE inspection_schedules;

ALTER TABLE inspection_schedules_migrasi RENAME TO inspection_schedules;

CREATE INDEX IF NOT EXISTS idx_sched_loc ON inspection_schedules(location_id);
CREATE INDEX IF NOT EXISTS idx_sched_dept ON inspection_schedules(department_id);
CREATE INDEX IF NOT EXISTS idx_sched_status ON inspection_schedules(status_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sched_session_loc ON inspection_schedules(session_id, location_id);
