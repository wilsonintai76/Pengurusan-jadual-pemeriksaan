import { describe, expect, it } from 'vitest';
import { canManageDepartment, canManageLocation, deriveManageScope } from './manageScope';
import type { RoleAssignment } from './types';

function assignment(over: Partial<RoleAssignment>): RoleAssignment {
  return {
    id: 'RA-1',
    officerId: 'PEG-1',
    roleId: 'PENYELIA_LOKASI',
    roleName: 'Penyelia Lokasi',
    scopeType: 'LOCATION',
    scopeId: 'LOK-2189',
    validFrom: '2026-01-01',
    validTo: null,
    status: 'AKTIF',
    ...over,
  } as RoleAssignment;
}

const TODAY = '2026-10-30';

describe('deriveManageScope', () => {
  it('pentadbir sistem mengurus semua', () => {
    const scope = deriveManageScope(
      [assignment({ roleId: 'PENTADBIR_SISTEM', scopeType: 'GLOBAL', scopeId: null })],
      TODAY
    );

    expect(scope.isAdmin).toBe(true);
    expect(canManageDepartment(scope, 'JKM')).toBe(true);
    expect(canManageLocation(scope, { id: 'LOK-ANY', jabatan: 'JTMK' })).toBe(true);
  });

  it('PPAJ mendapat skop jabatan sahaja', () => {
    const scope = deriveManageScope(
      [
        assignment({
          roleId: 'PENOLONG_PEGAWAI_ASET',
          scopeType: 'DEPARTMENT',
          scopeId: 'JKM',
        }),
      ],
      TODAY
    );

    expect(scope.departmentIds).toEqual(['JKM']);
    expect(scope.locationIds).toEqual([]);
    expect(canManageDepartment(scope, 'JKM')).toBe(true);
    expect(canManageDepartment(scope, 'JTMK')).toBe(false);
    expect(canManageLocation(scope, { id: 'LOK-1', jabatan: 'JKM' })).toBe(
      true
    );
    expect(canManageLocation(scope, { id: 'LOK-2', jabatan: 'JTMK' })).toBe(false);
  });

  it('Penyelia Lokasi hanya boleh mengemas kini ruang sendiri', () => {
    const scope = deriveManageScope([assignment({})], TODAY);

    expect(scope.locationIds).toEqual(['LOK-2189']);
    expect(canManageLocation(scope, { id: 'LOK-2189', jabatan: 'JKM' })).toBe(true);
    expect(canManageLocation(scope, { id: 'LOK-4778', jabatan: 'JKM' })).toBe(false);
    expect(canManageDepartment(scope, 'JKM')).toBe(false);
  });

  it('mengabaikan lantikan yang tamat tempoh atau tidak aktif', () => {
    const scope = deriveManageScope(
      [
        assignment({ validTo: '2026-06-30' }),
        assignment({ id: 'RA-2', scopeId: 'LOK-4778', status: 'DITAMATKAN' }),
      ],
      TODAY
    );

    expect(scope.canManage).toBe(false);
    expect(scope.locationIds).toEqual([]);
  });

  it('pegawai tanpa peranan pengurus tidak boleh apa-apa', () => {
    const scope = deriveManageScope(
      [assignment({ roleId: 'PEMERIKSA', scopeType: 'GLOBAL', scopeId: null })],
      TODAY
    );

    expect(scope.canManage).toBe(false);
    expect(canManageLocation(scope, { id: 'LOK-2189', jabatan: 'JKM' })).toBe(false);
  });
});
