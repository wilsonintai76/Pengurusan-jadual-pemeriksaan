import type { D1Database } from '@cloudflare/workers-types';

export type DB = D1Database;

async function firstId(db: DB, sql: string, ...values: unknown[]): Promise<string | null> {
  const row = await db
    .prepare(sql)
    .bind(...values)
    .first<{ id: string }>();
  return row?.id ?? null;
}

/** Resolves a department by id (e.g. `JTMK`) or exact display name. */
export async function resolveDepartmentId(
  db: DB,
  value?: string | null
): Promise<string | null> {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  // Padanan tepat sahaja: padanan kabur pernah menghalakan `PENTADBIRAN` ke unit
  // lain yang namanya mengandungi perkataan yang sama.
  return (
    (await firstId(db, 'SELECT id FROM departments WHERE id = ? COLLATE NOCASE LIMIT 1', trimmed)) ??
    (await firstId(db, 'SELECT id FROM departments WHERE nama = ? COLLATE NOCASE LIMIT 1', trimmed))
  );
}

/** Resolves an inspection status by id (e.g. `BELUM_MULA`) or display name. */
export async function resolveStatusId(
  db: DB,
  value?: string | null,
  fallback = 'BELUM_MULA'
): Promise<string> {
  const trimmed = value?.trim();
  if (trimmed) {
    const found =
      (await firstId(db, 'SELECT id FROM inspection_statuses WHERE id = ? LIMIT 1', trimmed)) ??
      (await firstId(
        db,
        'SELECT id FROM inspection_statuses WHERE nama = ? COLLATE NOCASE LIMIT 1',
        trimmed
      ));
    if (found) return found;
  }
  return fallback;
}

/** Resolves a room category by id (e.g. `MAKMAL_KOMPUTER`) or display name. */
export async function resolveRoomCategoryId(
  db: DB,
  value?: string | null,
  fallback = 'MAKMAL_KOMPUTER'
): Promise<string> {
  const trimmed = value?.trim();
  if (trimmed) {
    const found =
      (await firstId(db, 'SELECT id FROM room_categories WHERE id = ? LIMIT 1', trimmed)) ??
      (await firstId(
        db,
        'SELECT id FROM room_categories WHERE nama = ? COLLATE NOCASE LIMIT 1',
        trimmed
      ));
    if (found) return found;
  }
  return fallback;
}

/** Resolves an asset category by id (e.g. `SEMUA`) or display name. */
export async function resolveAssetCategoryId(
  db: DB,
  value?: string | null,
  fallback = 'SEMUA'
): Promise<string> {
  const trimmed = value?.trim();
  if (trimmed) {
    const found =
      (await firstId(db, 'SELECT id FROM asset_categories WHERE id = ? LIMIT 1', trimmed)) ??
      (await firstId(
        db,
        'SELECT id FROM asset_categories WHERE nama = ? COLLATE NOCASE LIMIT 1',
        trimmed
      ));
    if (found) return found;
  }
  return fallback;
}

/** Resolves a building by id, code or name, creating one when it is new. */
export async function ensureBuildingId(
  db: DB,
  value: string | null | undefined,
  latitude: number,
  longitude: number
): Promise<string> {
  const trimmed = value?.trim();
  if (trimmed) {
    const found =
      (await firstId(db, 'SELECT id FROM buildings WHERE id = ? LIMIT 1', trimmed)) ??
      (await firstId(db, 'SELECT id FROM buildings WHERE kod = ? COLLATE NOCASE LIMIT 1', trimmed)) ??
      (await firstId(
        db,
        'SELECT id FROM buildings WHERE nama = ? COLLATE NOCASE LIMIT 1',
        trimmed
      ));
    if (found) return found;
  }

  const id = `BGN-${Date.now().toString(36).toUpperCase()}`;
  await db
    .prepare(
      `INSERT INTO buildings (id, kod, nama, kampus_zon, default_latitude, default_longitude)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(id, id, trimmed || 'Bangunan Tidak Dinyatakan', 'Zon Lain', latitude, longitude)
    .run();

  return id;
}

export interface OfficerInput {
  id?: string | null;
  nama?: string | null;
  emel?: string | null;
  jawatan?: string | null;
  gred?: string | null;
  tel?: string | null;
}

/**
 * Resolves an officer by id, email or name, creating the record when the person
 * does not exist yet so `inspection_schedules` / `location_custodians` keep
 * valid foreign keys.
 */
export async function ensureOfficerId(
  db: DB,
  input: OfficerInput,
  departmentId: string
): Promise<string | null> {
  const id = input.id?.trim();
  const emel = input.emel?.trim();
  const nama = input.nama?.trim();

  if (id) {
    const found = await firstId(db, 'SELECT id FROM officers WHERE id = ? LIMIT 1', id);
    if (found) return found;
  }

  if (emel) {
    const found = await firstId(
      db,
      'SELECT id FROM officers WHERE emel = ? COLLATE NOCASE LIMIT 1',
      emel
    );
    if (found) return found;
  }

  if (nama) {
    const found = await firstId(
      db,
      'SELECT id FROM officers WHERE nama = ? COLLATE NOCASE LIMIT 1',
      nama
    );
    if (found) return found;
  }

  if (!emel && !nama) return null;

  const newId = `PEG-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 5)
    .toUpperCase()}`;

  await db
    .prepare(
      `INSERT INTO officers (id, nama, emel, jawatan, gred, telefon, department_id, peranan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      newId,
      nama || emel!,
      emel || `${newId.toLowerCase()}@poliku.edu.my`,
      input.jawatan?.trim() || 'Pegawai Pemeriksa (PP)',
      input.gred?.trim() || 'DH41',
      input.tel?.trim() || null,
      departmentId,
      'Pegawai Pemeriksa (PP)'
    )
    .run();

  return newId;
}

/** Returns the inspection session for the year of `tarikhMula`, creating it if needed. */
export async function ensureSessionId(db: DB, tarikhMula?: string | null): Promise<string> {
  const year = Number(String(tarikhMula ?? '').slice(0, 4)) || new Date().getFullYear();

  const existing = await firstId(
    db,
    'SELECT id FROM inspection_sessions WHERE tahun = ? LIMIT 1',
    year
  );
  if (existing) return existing;

  const id = `SESI-${year}`;
  await db
    .prepare(
      `INSERT INTO inspection_sessions (id, tahun, tarikh_mula, tarikh_tamat, tarikh_pra_jkpak)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(id, year, `${year}-01-01`, `${year}-12-31`, `${year}-10-15`)
    .run();

  return id;
}
