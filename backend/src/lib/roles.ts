import type { DB } from './db';

export type ScopeType = 'GLOBAL' | 'DEPARTMENT' | 'LOCATION';
export type AssignmentStatus = 'AKTIF' | 'DITAMATKAN';

/** Dua dimensi peranan: jawatan hakiki (HR) berbanding lantikan bertempoh. */
export type RoleKategori = 'JAWATAN' | 'LANTIKAN';

export interface RoleDefinition {
  id: string;
  nama: string;
  scopeType: ScopeType;
  defaultTenureMonths: number | null;
  kategori: RoleKategori;
}

/** Kamus peranan sistem — selaras dengan benih jadual `roles` dalam schema.sql. */
export const ROLE_DEFINITIONS: RoleDefinition[] = [
  // --- JAWATAN: satu per pegawai, kekal sehingga tukar jawatan ---
  {
    id: 'KETUA_JABATAN',
    nama: 'Ketua Jabatan / Unit (KJ/KU)',
    scopeType: 'DEPARTMENT',
    defaultTenureMonths: null,
    kategori: 'JAWATAN',
  },
  {
    id: 'KETUA_PROGRAM',
    nama: 'Ketua Program (KP)',
    scopeType: 'DEPARTMENT',
    defaultTenureMonths: null,
    kategori: 'JAWATAN',
  },
  {
    id: 'PEGAWAI_ASET',
    nama: 'Pegawai Aset (PA)',
    scopeType: 'DEPARTMENT',
    defaultTenureMonths: null,
    kategori: 'JAWATAN',
  },
  {
    id: 'PENOLONG_PEGAWAI_ASET',
    nama: 'Penolong Pegawai Aset Jabatan/Unit (PPAJ/PPAU)',
    scopeType: 'DEPARTMENT',
    defaultTenureMonths: null,
    kategori: 'JAWATAN',
  },
  {
    id: 'PENYELIA_LOKASI',
    nama: 'Penyelia Lokasi (PL)',
    scopeType: 'LOCATION',
    defaultTenureMonths: null,
    kategori: 'JAWATAN',
  },
  {
    id: 'PENSYARAH',
    nama: 'Pensyarah / Pegawai Akademik',
    scopeType: 'DEPARTMENT',
    defaultTenureMonths: null,
    kategori: 'JAWATAN',
  },

  // --- LANTIKAN: kuasa bertempoh, boleh 0..n per pegawai ---
  {
    id: 'PEMERIKSA',
    nama: 'Pegawai Pemeriksa (PP)',
    scopeType: 'GLOBAL',
    defaultTenureMonths: 24,
    kategori: 'LANTIKAN',
  },
  {
    id: 'PENTADBIR_SISTEM',
    nama: 'Pentadbir Sistem',
    scopeType: 'GLOBAL',
    defaultTenureMonths: null,
    kategori: 'LANTIKAN',
  },
];

/** Jawatan sah untuk pendaftaran pegawai (PP dikecualikan — melalui lantikan). */
export const JAWATAN_ROLES = ROLE_DEFINITIONS.filter((role) => role.kategori === 'JAWATAN');

/** Id jawatan lalai bagi staf akademik tanpa jawatan pentadbiran aset. */
export const DEFAULT_JAWATAN_ID = 'PENSYARAH';

export function roleKategori(roleId: string): RoleKategori | null {
  return roleDefinition(roleId)?.kategori ?? null;
}

/** Nama peranan lama (`officers.peranan`) kepada id peranan PBAC. */
const LEGACY_ROLE_MAP: Record<string, string> = {
  pemeriksa: 'PEMERIKSA',
  'pegawai pemeriksa': 'PEMERIKSA',
  'pegawai pemeriksa (pp)': 'PEMERIKSA',
  pp: 'PEMERIKSA',
  'penyelia lokasi': 'PENYELIA_LOKASI',
  'penyelia lokasi (pl)': 'PENYELIA_LOKASI',
  pl: 'PENYELIA_LOKASI',
  'penolong pegawai aset': 'PENOLONG_PEGAWAI_ASET',
  'penolong pegawai aset jabatan/unit': 'PENOLONG_PEGAWAI_ASET',
  'penolong pegawai aset jabatan/unit (ppaj/ppau)': 'PENOLONG_PEGAWAI_ASET',
  'penolong pegawai aset (ppa)': 'PENOLONG_PEGAWAI_ASET',
  ppaj: 'PENOLONG_PEGAWAI_ASET',
  ppau: 'PENOLONG_PEGAWAI_ASET',
  'pegawai aset': 'PEGAWAI_ASET',
  'pegawai aset (pa)': 'PEGAWAI_ASET',
  pa: 'PEGAWAI_ASET',
  pensyarah: 'PENSYARAH',
  'pensyarah / pegawai akademik': 'PENSYARAH',
  'pegawai akademik': 'PENSYARAH',
  'pensyarah (p)': 'PENSYARAH',
  'ketua jabatan': 'KETUA_JABATAN',
  'ketua jabatan / unit': 'KETUA_JABATAN',
  'ketua jabatan / unit (kj/ku)': 'KETUA_JABATAN',
  kj: 'KETUA_JABATAN',
  ku: 'KETUA_JABATAN',
  'ketua program': 'KETUA_PROGRAM',
  'ketua program (kp)': 'KETUA_PROGRAM',
  kp: 'KETUA_PROGRAM',
  'pentadbir sistem': 'PENTADBIR_SISTEM',
  ps: 'PENTADBIR_SISTEM',
};

export function resolveRoleId(value?: string | null): string | null {
  const key = (value ?? '').trim().toLowerCase();
  if (!key) return null;

  const byId = ROLE_DEFINITIONS.find((role) => role.id.toLowerCase() === key);
  if (byId) return byId.id;

  return LEGACY_ROLE_MAP[key] ?? null;
}

export function roleDefinition(roleId: string): RoleDefinition | null {
  return ROLE_DEFINITIONS.find((role) => role.id === roleId) ?? null;
}

export interface AssignmentRow {
  id: string;
  officerId: string;
  roleId: string;
  roleName: string;
  scopeType: ScopeType;
  scopeId: string | null;
  validFrom: string;
  validTo: string | null;
  status: AssignmentStatus;
  notes: string | null;
  createdAt: string;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * Keutamaan label jawatan utama. Label dipaparkan HANYA jika lantikan aktif menyokongnya,
 * supaya paparan tidak boleh menyimpang daripada `role_assignments` (satu sumber kebenaran).
 */
export const PRIMARY_ROLE_PRECEDENCE = [
  'PENTADBIR_SISTEM',
  'KETUA_JABATAN',
  'KETUA_PROGRAM',
  'PEGAWAI_ASET',
  'PENOLONG_PEGAWAI_ASET',
  'PENYELIA_LOKASI',
  'PENSYARAH',
  'PEMERIKSA',
] as const;

export type RoleLabelSource = { roleId: string; roleName: string };

/** Label jawatan utama daripada senarai lantikan aktif mengikut keutamaan tetap. */
export function derivePrimaryRole(roles: RoleLabelSource[], fallback = ''): string {
  for (const roleId of PRIMARY_ROLE_PRECEDENCE) {
    const found = roles.find((role) => role.roleId === roleId);
    if (found) return found.roleName;
  }
  return roles[0]?.roleName ?? fallback;
}

/**
 * Label yang dipaparkan bagi pegawai: pilihan manual (`officers.peranan`, jika masih sah)
 * atau keutamaan lantikan aktif. Nilai lapuk tidak boleh terpapar.
 */
export function resolveDisplayRole(
  roles: RoleLabelSource[],
  preferred?: string | null,
  fallback = ''
): string {
  const wanted = (preferred ?? '').trim().toLowerCase();
  if (wanted) {
    const match = roles.find(
      (role) => role.roleName.toLowerCase() === wanted || role.roleId.toLowerCase() === wanted
    );
    if (match) return match.roleName;
  }
  return derivePrimaryRole(roles, fallback);
}

export function addMonths(dateIso: string, months: number): string {
  const date = new Date(`${dateIso}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

/** Lantikan aktif pada tarikh rujukan (bukan `now()`), supaya rekod lama boleh disemak semula. */
export function isActiveOn(
  assignment: { status: string; validFrom: string; validTo?: string | null },
  date: string
): boolean {
  return (
    assignment.status === 'AKTIF' &&
    assignment.validFrom <= date &&
    (!assignment.validTo || assignment.validTo >= date)
  );
}

export interface AssignRoleInput {
  officerId: string;
  roleId: string;
  scopeType?: ScopeType;
  scopeId?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  createdById?: string | null;
  notes?: string | null;
}

/**
 * Cipta satu baris lantikan peranan. Lantikan sedia ada yang aktif bagi
 * peranan + skop yang sama tidak diduplikasi (pembaharuan = baris baharu
 * selepas lantikan lama ditamatkan).
 */
export async function assignRole(
  db: DB,
  input: AssignRoleInput
): Promise<{ id: string; created: boolean; assignment: AssignmentRow | null }> {
  const definition = roleDefinition(input.roleId);
  if (!definition) {
    throw new Error(`Peranan '${input.roleId}' tidak sah`);
  }

  const scopeType = input.scopeType ?? definition.scopeType;
  const scopeId = scopeType === 'GLOBAL' ? null : (input.scopeId ?? null);

  if (scopeType !== 'GLOBAL' && !scopeId) {
    throw new Error(`Skop ${scopeType} memerlukan scopeId`);
  }

  const validFrom = input.validFrom?.trim() || todayIso();
  const validTo =
    input.validTo?.trim() ||
    (definition.defaultTenureMonths ? addMonths(validFrom, definition.defaultTenureMonths) : null);

  const existing = await db
    .prepare(
      `SELECT id FROM role_assignments
       WHERE officer_id = ? AND role_id = ? AND status = 'AKTIF'
         AND COALESCE(scope_id, '') = COALESCE(?, '')
       LIMIT 1`
    )
    .bind(input.officerId, definition.id, scopeId)
    .first<{ id: string }>();

  if (existing) {
    return { id: existing.id, created: false, assignment: await getAssignment(db, existing.id) };
  }

  const id = `RA-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;

  await db
    .prepare(
      `INSERT INTO role_assignments
         (id, officer_id, role_id, scope_type, scope_id, valid_from, valid_to, status, notes, created_by_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'AKTIF', ?, ?)`
    )
    .bind(
      id,
      input.officerId,
      definition.id,
      scopeType,
      scopeId,
      validFrom,
      validTo,
      input.notes ?? null,
      input.createdById ?? null
    )
    .run();

  return { id, created: true, assignment: await getAssignment(db, id) };
}

const ASSIGNMENT_SELECT = `
  SELECT
    ra.id,
    ra.officer_id AS officerId,
    ra.role_id AS roleId,
    r.nama AS roleName,
    ra.scope_type AS scopeType,
    ra.scope_id AS scopeId,
    ra.valid_from AS validFrom,
    ra.valid_to AS validTo,
    ra.status,
    ra.notes,
    ra.created_at AS createdAt
  FROM role_assignments ra
  JOIN roles r ON r.id = ra.role_id
`;

export async function getAssignment(db: DB, id: string): Promise<AssignmentRow | null> {
  return db.prepare(`${ASSIGNMENT_SELECT} WHERE ra.id = ? LIMIT 1`).bind(id).first<AssignmentRow>();
}

export async function listAssignmentsForOfficer(db: DB, officerId: string): Promise<AssignmentRow[]> {
  const { results } = await db
    .prepare(`${ASSIGNMENT_SELECT} WHERE ra.officer_id = ? ORDER BY ra.valid_from DESC, ra.created_at DESC`)
    .bind(officerId)
    .all<AssignmentRow>();

  return results ?? [];
}

export async function listAssignments(
  db: DB,
  filters: { officerId?: string; roleId?: string; status?: string } = {}
): Promise<AssignmentRow[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.officerId) {
    clauses.push('ra.officer_id = ?');
    params.push(filters.officerId);
  }
  if (filters.roleId) {
    clauses.push('ra.role_id = ?');
    params.push(filters.roleId);
  }
  if (filters.status) {
    clauses.push('ra.status = ?');
    params.push(filters.status);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const { results } = await db
    .prepare(`${ASSIGNMENT_SELECT} ${where} ORDER BY ra.valid_from DESC, ra.created_at DESC LIMIT 500`)
    .bind(...params)
    .all<AssignmentRow>();

  return results ?? [];
}

/** Semakan pantas bagi middleware: pegawai memegang peranan aktif pada `date`. */
export async function hasActiveRole(
  db: DB,
  officerId: string,
  roleId: string,
  date: string = todayIso()
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT 1 AS ok FROM role_assignments
       WHERE officer_id = ? AND role_id = ? AND status = 'AKTIF'
         AND valid_from <= ? AND (valid_to IS NULL OR valid_to >= ?)
       LIMIT 1`
    )
    .bind(officerId, roleId, date, date)
    .first<{ ok: number }>();

  return Boolean(row);
}

/**
 * Lantikan awal apabila pegawai didaftarkan. Peranan berskop LOCATION (Penyelia)
 * bermula dengan skop jabatan sehingga pentadbir menetapkan ruang sebenar.
 */
export async function assignDefaultRoleForOfficer(
  db: DB,
  params: {
    officerId: string;
    roleValue?: string | null;
    departmentId: string;
    createdById?: string | null;
  }
): Promise<{ id: string; created: boolean } | null> {
  const roleId = resolveRoleId(params.roleValue) ?? DEFAULT_JAWATAN_ID;
  const definition = roleDefinition(roleId);
  if (!definition) return null;

  const scopeType: ScopeType =
    definition.scopeType === 'LOCATION' ? 'DEPARTMENT' : definition.scopeType;
  const scopeId = scopeType === 'GLOBAL' ? null : params.departmentId;

  const result = await assignRole(db, {
    officerId: params.officerId,
    roleId,
    scopeType,
    scopeId,
    createdById: params.createdById ?? null,
    notes:
      definition.kategori === 'JAWATAN'
        ? 'Jawatan hakiki pegawai (kekal sehingga ditukar)'
        : definition.scopeType === 'LOCATION'
        ? 'Lantikan awal berperingkat jabatan (ruang belum ditetapkan)'
        : 'Lantikan awal semasa pendaftaran pegawai',
  });

  return { id: result.id, created: result.created };
}
