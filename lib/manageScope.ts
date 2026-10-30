import type { LocationInfo, RoleAssignment } from './types';

/** Selaras dengan `LOCATION_MANAGER_ROLES` pada Worker. */
export const LOCATION_MANAGER_ROLES = [
  'PENTADBIR_SISTEM',
  'KETUA_JABATAN',
  'PENOLONG_PEGAWAI_ASET',
  'PENYELIA_LOKASI',
] as const;

export interface ManageScope {
  isAdmin: boolean;
  canManage: boolean;
  /** Jabatan yang boleh diurus sepenuhnya (cipta ruang baharu). */
  departmentIds: string[];
  /** Ruang tertentu yang boleh dikemaskini (Penyelia Lokasi bagi ruang itu). */
  locationIds: string[];
}

export const EMPTY_MANAGE_SCOPE: ManageScope = {
  isAdmin: false,
  canManage: false,
  departmentIds: [],
  locationIds: [],
};

function isActiveToday(assignment: RoleAssignment, today: string): boolean {
  if (assignment.status !== 'AKTIF') return false;
  if (assignment.validFrom && assignment.validFrom.slice(0, 10) > today) return false;
  if (assignment.validTo && assignment.validTo.slice(0, 10) < today) return false;
  return true;
}

/**
 * Terbitkan skop pengurusan lokasi daripada lantikan aktif. Ini hanya untuk UI gating —
 * keputusan muktamad tetap dibuat oleh Worker (`backend/src/lib/permissions.ts`).
 */
export function deriveManageScope(
  assignments: RoleAssignment[],
  today: string = new Date().toISOString().slice(0, 10)
): ManageScope {
  const managerRows = assignments.filter(
    (row) =>
      (LOCATION_MANAGER_ROLES as readonly string[]).includes(row.roleId) && isActiveToday(row, today)
  );

  const isAdmin = managerRows.some((row) => row.roleId === 'PENTADBIR_SISTEM');
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

/** Daftar lokasi baharu memerlukan skop jabatan (atau Pentadbir Sistem). */
export function canManageDepartment(scope: ManageScope, departmentId: string): boolean {
  return scope.isAdmin || scope.departmentIds.includes(departmentId);
}

/** Kemaskini ruang: skop jabatan, atau Penyelia Lokasi bagi ruang itu sendiri. */
export function canManageLocation(
  scope: ManageScope,
  target: Pick<LocationInfo, 'id' | 'jabatan'>
): boolean {
  return (
    scope.isAdmin ||
    scope.departmentIds.includes(target.jabatan) ||
    scope.locationIds.includes(target.id)
  );
}
