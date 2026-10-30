import type { DB } from './db';

/**
 * Peranan yang boleh mengurus lokasi (daftar/kemaskini) bagi jabatan/unit sendiri.
 * Pentadbir Sistem tidak terhad kepada jabatan tertentu.
 */
export const LOCATION_MANAGER_ROLES = [
  'PENTADBIR_SISTEM',
  'KETUA_JABATAN',
  'PENOLONG_PEGAWAI_ASET',
  'PENYELIA_LOKASI',
] as const;

export interface ManageScope {
  isAdmin: boolean;
  canManage: boolean;
  /** Jabatan yang boleh diurus sepenuhnya (cipta ruang baharu, daftar pegawai). */
  departmentIds: string[];
  /** Ruang tertentu yang boleh dikemaskini (Penyelia Lokasi bagi ruang itu). */
  locationIds: string[];
}

interface AssignmentRow {
  roleId: string;
  scopeType: string;
  scopeId: string | null;
}

/** Baca lantikan aktif pegawai dan terbitkan skop pengurusan lokasi. */
export async function loadManageScope(db: DB, officerId: string): Promise<ManageScope> {
  const { results } = await db
    .prepare(
      `SELECT role_id AS roleId, scope_type AS scopeType, scope_id AS scopeId
         FROM role_assignments
        WHERE officer_id = ? AND status = 'AKTIF'
          AND valid_from <= date('now') AND (valid_to IS NULL OR valid_to >= date('now'))`
    )
    .bind(officerId)
    .all<AssignmentRow>();

  const rows = results ?? [];
  const isAdmin = rows.some((row) => row.roleId === 'PENTADBIR_SISTEM');
  const managerRows = rows.filter((row) =>
    (LOCATION_MANAGER_ROLES as readonly string[]).includes(row.roleId)
  );

  const departmentIds = Array.from(
    new Set(
      managerRows
        .filter((row) => row.scopeType === 'DEPARTMENT' && row.scopeId)
        .map((row) => row.scopeId as string)
    )
  );

  const locationIds = Array.from(
    new Set(
      managerRows
        .filter((row) => row.scopeType === 'LOCATION' && row.scopeId)
        .map((row) => row.scopeId as string)
    )
  );

  return {
    isAdmin,
    canManage: isAdmin || departmentIds.length > 0 || locationIds.length > 0,
    departmentIds,
    locationIds,
  };
}

/** Pentadbir sistem boleh semua jabatan; lain-lain hanya jabatan dalam skop lantikan. */
export function canManageDepartment(scope: ManageScope, departmentId: string): boolean {
  return scope.isAdmin || scope.departmentIds.includes(departmentId);
}

/**
 * Kemaskini ruang: Pentadbir Sistem (semua), KJ/KU & PPAJ/PPAU (jabatan sendiri),
 * dan **Penyelia Lokasi** bagi ruang yang diselianya sendiri.
 */
export function canManageLocation(
  scope: ManageScope,
  target: { id: string; departmentId: string }
): boolean {
  return (
    scope.isAdmin ||
    scope.departmentIds.includes(target.departmentId) ||
    scope.locationIds.includes(target.id)
  );
}
