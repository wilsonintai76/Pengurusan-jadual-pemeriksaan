/**
 * Peraturan konflik kepentingan pemeriksaan aset (1PP AM 2.4), tulen tanpa I/O
 * supaya boleh diuji secara unit.
 *
 * Seorang pegawai boleh memegang **berbilang peranan serentak** (contoh:
 * PPAJ/PPAU + Penyelia Lokasi + lantikan Pegawai Pemeriksa). Setiap peranan
 * disemak secara berasingan di sini — bukan hanya "jawatan utama".
 */

export type ConflictCode =
  | 'SUPERVISOR_CONFLICT'
  | 'ASSET_OFFICER_CONFLICT'
  | 'CUSTODIAN_CONFLICT'
  | 'CROSS_DEPARTMENT_REQUIRED';

export interface AssignmentLike {
  roleId: string;
  scopeType: string;
  scopeId: string | null;
  validFrom: string;
  validTo: string | null;
}

export interface InspectionTarget {
  locationId: string;
  departmentId: string;
  /** Jabatan pegawai pemeriksa (untuk mod silang). */
  officerDepartmentId?: string;
  /** Pegawai penjaga ruang mengikut KEW.PA-7. */
  isCustodian?: boolean;
  /** Mod timbal balik: pemeriksa mesti dari jabatan berbeza. */
  enforceCrossInspection?: boolean;
}

/** Lantikan aktif pada tarikh rujukan (inklusif). */
export function isActiveOn(assignment: AssignmentLike, date: string): boolean {
  return assignment.validFrom <= date && (!assignment.validTo || assignment.validTo >= date);
}

/**
 * Kod konflik bagi seorang pegawai terhadap satu lokasi/jadual.
 * Peranan yang disemak: `PENYELIA_LOKASI` (ruang atau jabatan) dan
 * `PENOLONG_PEGAWAI_ASET` (jabatan pemilik aset).
 */
export function detectConflictCodes(
  assignments: AssignmentLike[],
  target: InspectionTarget,
  date: string
): ConflictCode[] {
  const codes: ConflictCode[] = [];
  const active = assignments.filter((assignment) => isActiveOn(assignment, date));

  const supervises = active.some(
    (assignment) =>
      assignment.roleId === 'PENYELIA_LOKASI' &&
      ((assignment.scopeType === 'LOCATION' && assignment.scopeId === target.locationId) ||
        (assignment.scopeType === 'DEPARTMENT' && assignment.scopeId === target.departmentId))
  );
  if (supervises) codes.push('SUPERVISOR_CONFLICT');

  const isAssetOfficer = active.some(
    (assignment) =>
      assignment.roleId === 'PENOLONG_PEGAWAI_ASET' &&
      assignment.scopeType === 'DEPARTMENT' &&
      assignment.scopeId === target.departmentId
  );
  if (isAssetOfficer) codes.push('ASSET_OFFICER_CONFLICT');

  if (target.isCustodian) codes.push('CUSTODIAN_CONFLICT');

  if (
    target.enforceCrossInspection &&
    target.officerDepartmentId &&
    target.officerDepartmentId === target.departmentId
  ) {
    codes.push('CROSS_DEPARTMENT_REQUIRED');
  }

  return codes;
}

/** Mesej penolakan bagi setiap kod konflik. */
export function conflictMessage(code: ConflictCode): string {
  switch (code) {
    case 'SUPERVISOR_CONFLICT':
      return 'Anda Penyelia Lokasi bagi ruang ini — pemeriksaan ruang sendiri tidak dibenarkan (1PP AM 2.4).';
    case 'ASSET_OFFICER_CONFLICT':
      return 'Anda Penolong Pegawai Aset bagi jabatan pemilik aset ini — pemisahan tugas diperlukan.';
    case 'CUSTODIAN_CONFLICT':
      return 'Anda pegawai penjaga (KEW.PA-7) bagi ruang ini.';
    case 'CROSS_DEPARTMENT_REQUIRED':
      return 'Mod timbal balik: pemeriksa mesti dari jabatan lain (bukan jabatan pemilik aset).';
  }
}
