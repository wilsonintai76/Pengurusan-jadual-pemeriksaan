import { describe, expect, it } from 'vitest';
import { detectConflictCodes, isActiveOn, type AssignmentLike } from './conflicts';

const TODAY = '2026-10-29';

const assignment = (overrides: Partial<AssignmentLike>): AssignmentLike => ({
  roleId: 'PEMERIKSA',
  scopeType: 'GLOBAL',
  scopeId: null,
  validFrom: '2026-01-01',
  validTo: '2028-01-01',
  ...overrides,
});

/** Pegawai dengan PPAJ (jabatan JTMK) + Penyelia Lokasi (2 ruang) + lantikan PP. */
const multiRoleOfficer: AssignmentLike[] = [
  assignment({
    roleId: 'PENOLONG_PEGAWAI_ASET',
    scopeType: 'DEPARTMENT',
    scopeId: 'JTMK',
    validTo: null,
  }),
  assignment({ roleId: 'PENYELIA_LOKASI', scopeType: 'LOCATION', scopeId: 'MK-01', validTo: null }),
  assignment({ roleId: 'PENYELIA_LOKASI', scopeType: 'LOCATION', scopeId: 'MK-02', validTo: null }),
  assignment({ roleId: 'PEMERIKSA', scopeType: 'GLOBAL', scopeId: null }),
];

describe('detectConflictCodes — pegawai berbilang peranan', () => {
  it('menyekat jabatan sendiri kerana PPAJ (walaupun jawatan utama lain)', () => {
    const codes = detectConflictCodes(
      multiRoleOfficer,
      { locationId: 'MK-99', departmentId: 'JTMK', officerDepartmentId: 'JTMK' },
      TODAY
    );
    expect(codes).toContain('ASSET_OFFICER_CONFLICT');
  });

  it('menyekat setiap ruang yang diselia (dua baris LOCATION)', () => {
    const first = detectConflictCodes(
      multiRoleOfficer,
      { locationId: 'MK-01', departmentId: 'JKE', officerDepartmentId: 'JTMK' },
      TODAY
    );
    const second = detectConflictCodes(
      multiRoleOfficer,
      { locationId: 'MK-02', departmentId: 'JKE', officerDepartmentId: 'JTMK' },
      TODAY
    );
    expect(first).toContain('SUPERVISOR_CONFLICT');
    expect(second).toContain('SUPERVISOR_CONFLICT');
  });

  it('membenarkan ruang jabatan pasangan yang tidak diselia', () => {
    const codes = detectConflictCodes(
      multiRoleOfficer,
      { locationId: 'MK-77', departmentId: 'JKE', officerDepartmentId: 'JTMK' },
      TODAY
    );
    expect(codes).toEqual([]);
  });

  it('mengesan penjaga ruang KEW.PA-7', () => {
    const codes = detectConflictCodes(
      multiRoleOfficer,
      { locationId: 'MK-77', departmentId: 'JKE', isCustodian: true },
      TODAY
    );
    expect(codes).toContain('CUSTODIAN_CONFLICT');
  });

  it('mod timbal balik menyekat jabatan sendiri', () => {
    const codes = detectConflictCodes(
      [{ roleId: 'PEMERIKSA', scopeType: 'GLOBAL', scopeId: null, validFrom: '2026-01-01', validTo: null }],
      {
        locationId: 'MK-01',
        departmentId: 'JTMK',
        officerDepartmentId: 'JTMK',
        enforceCrossInspection: true,
      },
      TODAY
    );
    expect(codes).toContain('CROSS_DEPARTMENT_REQUIRED');
  });

  it('mengabaikan peranan yang sudah luput', () => {
    const expired: AssignmentLike[] = [
      assignment({
        roleId: 'PENYELIA_LOKASI',
        scopeType: 'LOCATION',
        scopeId: 'MK-01',
        validTo: '2026-06-30',
      }),
      assignment({ roleId: 'PEMERIKSA', scopeType: 'GLOBAL', scopeId: null, validTo: null }),
    ];
    const codes = detectConflictCodes(
      expired,
      { locationId: 'MK-01', departmentId: 'JKE', officerDepartmentId: 'JTMK' },
      TODAY
    );
    expect(codes).toEqual([]);
  });

  it('Penyelia Lokasi berskop jabatan menyekat seluruh jabatan', () => {
    const deptSupervisor: AssignmentLike[] = [
      assignment({ roleId: 'PENYELIA_LOKASI', scopeType: 'DEPARTMENT', scopeId: 'JKE', validTo: null }),
    ];
    const codes = detectConflictCodes(
      deptSupervisor,
      { locationId: 'MK-99', departmentId: 'JKE' },
      TODAY
    );
    expect(codes).toContain('SUPERVISOR_CONFLICT');
  });
});

describe('isActiveOn', () => {
  it('menganggap tarikh tamat sebagai inklusif', () => {
    const row = assignment({ validTo: TODAY });
    expect(isActiveOn(row, TODAY)).toBe(true);
    expect(isActiveOn(row, '2026-10-30')).toBe(false);
  });

  it('lantikan kekal (validTo null) sentiasa aktif selepas tarikh mula', () => {
    const row = assignment({ validTo: null, validFrom: '2026-01-01' });
    expect(isActiveOn(row, '2030-01-01')).toBe(true);
  });
});
