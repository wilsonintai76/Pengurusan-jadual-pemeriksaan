import { describe, expect, it } from 'vitest';
import { BASE_PERMISSIONS, PERMISSION_CATALOG, resolvePermissions } from './access';

const kunci = (roles: Parameters<typeof resolvePermissions>[0]) =>
  resolvePermissions(roles).map((item) => item.kunci);

describe('resolvePermissions', () => {
  it('memberi kebenaran asas walaupun tiada lantikan', () => {
    expect(kunci([])).toEqual([...BASE_PERMISSIONS]);
  });

  it('Pentadbir Sistem memperoleh seluruh katalog kebenaran', () => {
    const hasil = kunci([{ roleId: 'PENTADBIR_SISTEM', scopeType: 'GLOBAL', scopeId: null }]);
    expect(hasil).toHaveLength(PERMISSION_CATALOG.length);
    expect(hasil).toContain('tetapan.urus');
    expect(hasil).toContain('lantikan.urus');
  });

  it('Penyelia Lokasi boleh mengurus ruang tetapi tidak mendaftar pegawai', () => {
    const hasil = kunci([{ roleId: 'PENYELIA_LOKASI', scopeType: 'LOCATION', scopeId: 'LOK-01' }]);
    expect(hasil).toContain('lokasi.urus');
    expect(hasil).not.toContain('pegawai.urus');
    expect(hasil).not.toContain('tetapan.urus');
  });

  it('Pegawai Pemeriksa boleh menuntut slot dan mengesahkan dapatan', () => {
    const hasil = kunci([{ roleId: 'PEMERIKSA', scopeType: 'DEPARTMENT', scopeId: 'JKM' }]);
    expect(hasil).toContain('jadual.tuntut');
    expect(hasil).toContain('pemeriksaan.sah');
    expect(hasil).not.toContain('jadual.urus');
  });

  it('merekod peranan punca bagi setiap kebenaran', () => {
    const hasil = resolvePermissions([
      { roleId: 'PENOLONG_PEGAWAI_ASET', scopeType: 'DEPARTMENT', scopeId: 'JKM' },
      { roleId: 'PEMERIKSA', scopeType: 'DEPARTMENT', scopeId: 'JKM' },
    ]);
    const urus = hasil.find((item) => item.kunci === 'pegawai.urus');
    expect(urus?.melalui).toEqual(['PENOLONG_PEGAWAI_ASET']);

    const asas = hasil.find((item) => item.kunci === 'lokasi.lihat');
    expect(asas?.melalui).toEqual([]);
  });

  it('menggabungkan kebenaran daripada berbilang peranan tanpa pendua', () => {
    const hasil = kunci([
      { roleId: 'KETUA_JABATAN', scopeType: 'DEPARTMENT', scopeId: 'JKM' },
      { roleId: 'PEMERIKSA', scopeType: 'DEPARTMENT', scopeId: 'JKM' },
    ]);
    expect(new Set(hasil).size).toBe(hasil.length);
    expect(hasil).toContain('pemeriksaan.sah');
    expect(hasil).toContain('jadual.urus');
  });

  it('peranan tanpa pemetaan hanya menerima kebenaran asas', () => {
    expect(kunci([{ roleId: 'PENSYARAH', scopeType: 'DEPARTMENT', scopeId: 'JKM' }])).toEqual([
      ...BASE_PERMISSIONS,
    ]);
  });
});
