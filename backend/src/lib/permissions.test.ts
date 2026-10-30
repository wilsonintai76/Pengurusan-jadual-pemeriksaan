import { describe, expect, it } from 'vitest';
import { canManageDepartment, canManageLocation, type ManageScope } from './permissions';

const admin: ManageScope = { isAdmin: true, canManage: true, departmentIds: [], locationIds: [] };
const ppaj: ManageScope = { isAdmin: false, canManage: true, departmentIds: ['JKM'], locationIds: [] };
const penyelia: ManageScope = { isAdmin: false, canManage: true, departmentIds: [], locationIds: ['LOK-0146'] };
const none: ManageScope = { isAdmin: false, canManage: false, departmentIds: [], locationIds: [] };

describe('canManageDepartment', () => {
  it('pentadbir sistem boleh semua jabatan', () => {
    expect(canManageDepartment(admin, 'JKM')).toBe(true);
    expect(canManageDepartment(admin, 'SISTEM')).toBe(true);
  });

  it('PPAJ hanya jabatan dalam lantikannya', () => {
    expect(canManageDepartment(ppaj, 'JKM')).toBe(true);
    expect(canManageDepartment(ppaj, 'JTMK')).toBe(false);
  });

  it('Penyelia Lokasi tidak boleh cipta ruang baharu bagi jabatan', () => {
    expect(canManageDepartment(penyelia, 'JKM')).toBe(false);
  });

  it('pegawai tanpa peranan pengurus tidak boleh apa-apa', () => {
    expect(canManageDepartment(none, 'JKM')).toBe(false);
  });
});

describe('canManageLocation', () => {
  it('pentadbir sistem boleh semua ruang', () => {
    expect(canManageLocation(admin, { id: 'LOK-X', departmentId: 'JTMK' })).toBe(true);
  });

  it('PPAJ boleh semua ruang dalam jabatannya', () => {
    expect(canManageLocation(ppaj, { id: 'LOK-1', departmentId: 'JKM' })).toBe(true);
    expect(canManageLocation(ppaj, { id: 'LOK-2', departmentId: 'JTMK' })).toBe(false);
  });

  it('Penyelia Lokasi boleh kemaskini ruang yang diselianya sahaja', () => {
    expect(canManageLocation(penyelia, { id: 'LOK-0146', departmentId: 'JKM' })).toBe(true);
    expect(canManageLocation(penyelia, { id: 'LOK-2189', departmentId: 'JKM' })).toBe(false);
  });

  it('pegawai tanpa peranan tidak boleh kemaskini ruang', () => {
    expect(canManageLocation(none, { id: 'LOK-0146', departmentId: 'JKM' })).toBe(false);
  });
});

